import * as SQLite from 'expo-sqlite';
import { Paths, File, Directory } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { createPoemId, ensureUniquePoemId } from '../utils/poemId';

const DB_NAME = 'poems.db';
const DB_VERSION = 3;
const SQLITE_DIRECTORY = new Directory(Paths.document, 'SQLite');

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDatabaseFile(): File {
  return new File(SQLITE_DIRECTORY, DB_NAME);
}

function ensureDirectoryExists(): void {
  if (!SQLITE_DIRECTORY.exists) {
    SQLITE_DIRECTORY.create({ intermediates: true, idempotent: true });
  }
}

async function copyBundledDatabase(): Promise<void> {
  const asset = Asset.fromModule(require('../../assets/poems.db'));
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw new Error('Unable to locate bundled poems.db asset');
  }

  ensureDirectoryExists();

  const sourceFile = new File(asset.localUri);
  const destFile = getDatabaseFile();
  if (destFile.exists) {
    destFile.delete();
  }
  sourceFile.copy(destFile);
}

function closeDatabase(db: SQLite.SQLiteDatabase) {
  const maybeCloseSync = (db as any).closeSync;
  const maybeCloseAsync = (db as any).closeAsync || (db as any).close;

  try {
    if (typeof maybeCloseSync === 'function') {
      maybeCloseSync.call(db);
      return;
    }

    if (typeof maybeCloseAsync === 'function') {
      maybeCloseAsync.call(db);
    }
  } catch (error) {
    console.warn('Failed to close database instance', error);
  }
}

function shouldReplaceExistingDatabase(): boolean {
  ensureDirectoryExists();
  const dbFile = getDatabaseFile();

  if (!dbFile.exists) {
    return true;
  }

  try {
    const existingDb = SQLite.openDatabaseSync(DB_NAME);
    existingDb.execSync(
      `CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );`
    );

    const row = existingDb.getFirstSync(
      'SELECT value FROM metadata WHERE key = ?;',
      ['db_version']
    ) as { value: string } | undefined;

    const currentVersion = row ? Number(row.value) : 0;
    closeDatabase(existingDb);

    if (Number.isNaN(currentVersion) || currentVersion < DB_VERSION) {
      dbFile.delete();
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to inspect existing database, copying bundled version', error);
    try {
      dbFile.delete();
    } catch (deleteError) {
      // Ignore delete errors
    }
    return true;
  }
}

function tableHasColumn(database: SQLite.SQLiteDatabase, tableName: string, columnName: string): boolean {
  const columns = database.getAllSync(`PRAGMA table_info(${tableName});`) as Array<{ name: string }>;
  return columns.some((column) => column.name === columnName);
}

function populateMissingPoemIds(database: SQLite.SQLiteDatabase) {
  const existingIds = new Set<string>();
  const rows = database.getAllSync('SELECT id, poem_id, title, author, content, language FROM poems;') as Array<{
    id: number;
    poem_id: string | null;
    title: string;
    author: string;
    content: string;
    language: 'en' | 'ur' | null;
  }>;

  rows.forEach((row) => {
    if (row.poem_id) {
      existingIds.add(row.poem_id);
    }
  });

  rows
    .filter((row) => !row.poem_id)
    .forEach((row) => {
      const baseId = createPoemId({
        title: row.title,
        author: row.author,
        content: row.content,
        language: row.language ?? 'en',
      });

      const poemId = ensureUniquePoemId(baseId, (candidate) => existingIds.has(candidate));
      existingIds.add(poemId);
      database.runSync('UPDATE poems SET poem_id = ? WHERE id = ?;', [poemId, row.id]);
    });

  database.execSync('CREATE UNIQUE INDEX IF NOT EXISTS idx_poems_poem_id ON poems (poem_id);');
}

function applyMigrations(database: SQLite.SQLiteDatabase): void {
  database.execSync(
    `CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poem_id TEXT UNIQUE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      source TEXT NOT NULL DEFAULT 'bundled',
      CHECK(language IN ('en','ur'))
    );`
  );

  if (!tableHasColumn(database, 'poems', 'source')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN source TEXT NOT NULL DEFAULT 'bundled';`);
  }

  database.runSync(`UPDATE poems SET source = 'bundled' WHERE source IS NULL OR source = '';`);

  if (!tableHasColumn(database, 'poems', 'poem_id')) {
    database.execSync('ALTER TABLE poems ADD COLUMN poem_id TEXT;');
  }

  populateMissingPoemIds(database);

  database.execSync(
    `CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`
  );

  database.runSync(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
    ['db_version', String(DB_VERSION)]
  );
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      ensureDirectoryExists();
      const needsReplacement = shouldReplaceExistingDatabase();
      if (needsReplacement) {
        await copyBundledDatabase();
      }

      const database = SQLite.openDatabaseSync(DB_NAME);
      applyMigrations(database);
      dbInstance = database;
      return database;
    })().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database not initialised. Call initializeDatabase() first.');
  }

  return dbInstance;
}

export function resetDatabaseInstanceForTesting() {
  dbInstance = null;
  initializationPromise = null;
}

export { DB_NAME, DB_VERSION };
