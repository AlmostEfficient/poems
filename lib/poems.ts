import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const DB_DIRECTORY = `${FileSystem.documentDirectory}SQLite`;
const DB_NAME = 'poems.db';
const DB_PATH = `${DB_DIRECTORY}/${DB_NAME}`;

let db: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function ensureDatabaseFile(): Promise<void> {
  await FileSystem.makeDirectoryAsync(DB_DIRECTORY, { intermediates: true });

  const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
  if (fileInfo.exists) {
    return;
  }

  const asset = Asset.fromModule(require('../assets/poems.db'));
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw new Error('Failed to resolve poems.db asset location');
  }

  await FileSystem.copyAsync({
    from: asset.localUri,
    to: DB_PATH,
  });
}

function getDbInstance(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDB() before using helpers.');
  }
  return db;
}

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  if (!initPromise) {
    initPromise = (async () => {
      await ensureDatabaseFile();
      const database = SQLite.openDatabaseSync(DB_NAME);
      database.execSync(
        `CREATE TABLE IF NOT EXISTS poems (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          author TEXT NOT NULL,
          content TEXT NOT NULL
        );`
      );
      db = database;
      return database;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

export function getPoems(): any[] {
  const database = getDbInstance();
  const result = database.getAllSync('SELECT * FROM poems;');
  return result;
}

export function getPoemsPage(offset: number = 0, limit: number = 20): any[] {
  const database = getDbInstance();
  const result = database.getAllSync('SELECT * FROM poems LIMIT ? OFFSET ?;', [limit, offset]);
  return result;
}

export function getTotalPoemsCount(): number {
  const database = getDbInstance();
  const result = database.getFirstSync('SELECT COUNT(*) as count FROM poems;') as { count: number };
  return result.count;
}

export function getRandomPoems(limit: number = 20): any[] {
  const database = getDbInstance();
  const result = database.getAllSync('SELECT * FROM poems ORDER BY RANDOM() LIMIT ?;', [limit]);
  return result;
}

export function searchLocalPoems(query: string, field: 'title' | 'author' | 'content' = 'title', limit: number = 10): any[] {
  const searchQuery = `%${query}%`;
  const sql = `SELECT * FROM poems WHERE ${field} LIKE ? LIMIT ?;`;
  const database = getDbInstance();
  const result = database.getAllSync(sql, [searchQuery, limit]);
  return result;
}

export function getPoemsByAuthor(author: string, limit: number = 20): any[] {
  const database = getDbInstance();
  const result = database.getAllSync('SELECT * FROM poems WHERE author = ? LIMIT ?;', [author, limit]);
  return result;
}

export function getLocalAuthors(): string[] {
  const database = getDbInstance();
  const result = database.getAllSync('SELECT DISTINCT author FROM poems ORDER BY author;');
  return result.map((row: any) => row.author);
}

export function addPoem(title: string, author: string, content: string): void {
  const database = getDbInstance();
  // Check if poem already exists
  const existing = database.getFirstSync(
    'SELECT id FROM poems WHERE title = ? AND author = ?;',
    [title, author]
  );
  
  if (!existing) {
    database.runSync(
      'INSERT INTO poems (title, author, content) VALUES (?, ?, ?);',
      [title, author, content]
    );
  }
}

// Batch insert for API poems
export function addPoemsInBatch(poems: { title: string; author: string; content: string }[]): void {
  poems.forEach(poem => {
    addPoem(poem.title, poem.author, poem.content);
  });
}

// Get poem by exact title and author (useful for checking duplicates)
export function getPoemByTitleAndAuthor(title: string, author: string): any | null {
  const database = getDbInstance();
  const result = database.getFirstSync(
    'SELECT * FROM poems WHERE title = ? AND author = ? LIMIT 1;',
    [title, author]
  );
  return result || null;
}

export async function seedPoems(): Promise<void> {
  // No longer needed! Database comes prepopulated with poems
  // Just check if we have poems and report the count
  const poems = getPoems();
  console.log(`Database loaded with ${poems.length} poems`);
  
  // Debug: Let's see what's actually in the database
  console.log('Sample poems:', poems.slice(0, 3).map(p => ({ title: p.title, author: p.author })));
  
  // Only add fallback if somehow the database is completely empty
  if (poems.length === 0) {
    console.warn('Database empty! Adding fallback poems...');
    const fallbackPoems = [
      {
        title: 'The Road Not Taken',
        author: 'Robert Frost',
        content: `Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever be back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference.`
      }
    ];
    
    fallbackPoems.forEach((poem) => {
      addPoem(poem.title, poem.author, poem.content);
    });
  }
}
