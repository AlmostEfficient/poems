import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

let db: SQLite.SQLiteDatabase;

async function initDatabase() {
  // Always copy the latest database from assets to ensure we have the most recent version
  const dbPath = `${FileSystem.documentDirectory}SQLite/poems.db`;
  
  // Copy prepopulated database from assets (overwrite if exists)
  const asset = Asset.fromModule(require('../assets/poems.db'));
  await asset.downloadAsync();
  await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`, { intermediates: true });
  await FileSystem.copyAsync({
    from: asset.localUri!,
    to: dbPath,
  });
  
  db = SQLite.openDatabaseSync('poems.db');
  return db;
}

export async function initDB() {
  await initDatabase();
  // Table already exists in prepopulated database, but create if needed
  db.execSync(
    `CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
    );`
  );
}

export function getPoems(): any[] {
  const result = db.getAllSync('SELECT * FROM poems;');
  return result;
}

export function addPoem(title: string, author: string, content: string): void {
  // Check if poem already exists
  const existing = db.getFirstSync(
    'SELECT id FROM poems WHERE title = ? AND author = ?;',
    [title, author]
  );
  
  if (!existing) {
    db.runSync(
      'INSERT INTO poems (title, author, content) VALUES (?, ?, ?);',
      [title, author, content]
    );
  }
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