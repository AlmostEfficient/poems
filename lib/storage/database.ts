import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

const DB_DIRECTORY = `${FileSystem.documentDirectory}SQLite`;
const DB_NAME = 'poems.db';
const DB_PATH = `${DB_DIRECTORY}/${DB_NAME}`;
const DB_VERSION = 1;

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

  await FileSystem.copyAsync({ from: asset.localUri, to: DB_PATH });
}

async function ensureDirectoryExists(): Promise<void> {
  await FileSystem.makeDirectoryAsync(DB_DIRECTORY, { intermediates: true });
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

async function shouldReplaceExistingDatabase(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(DB_PATH);
  if (!info.exists) {
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
      await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
      return true;
    }

    return false;
  } catch (error) {
    console.warn('Failed to inspect existing database, copying bundled version', error);
    await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
    return true;
  }
}

function applyMigrations(database: SQLite.SQLiteDatabase): void {
  database.execSync(
    `CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
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
      await ensureDirectoryExists();

      const needsReplacement = await shouldReplaceExistingDatabase();
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

export { DB_NAME, DB_PATH, DB_VERSION };
