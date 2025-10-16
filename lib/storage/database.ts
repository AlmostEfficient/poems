import * as SQLite from 'expo-sqlite';
import { Paths, File } from 'expo-file-system';
import { Asset } from 'expo-asset';

const DB_NAME = 'poems.db';
const DB_VERSION = 2;

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initializationPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function copyBundledDatabase(): Promise<void> {
  const asset = Asset.fromModule(require('../../assets/poems.db'));
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw new Error('Unable to locate bundled poems.db asset');
  }

  // Copy using new File API
  const sourceFile = new File(asset.localUri);
  const destFile = new File(Paths.document, 'SQLite', DB_NAME);
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
  const dbFile = new File(Paths.document, 'SQLite', DB_NAME);

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

function applyMigrations(database: SQLite.SQLiteDatabase): void {
  database.execSync(
    `CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      CHECK(language IN ('en','ur'))
    );`
  );

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
