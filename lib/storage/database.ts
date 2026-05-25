import * as SQLite from 'expo-sqlite';
import { Paths, File, Directory } from 'expo-file-system';
import { Asset } from 'expo-asset';
import { createPoemId, ensureUniquePoemId } from '../utils/poemId';

const DB_NAME = 'poems.db';
const DB_VERSION = 7;
const SQLITE_DIRECTORY = new Directory(Paths.document, 'SQLite');
const BUNDLED_IMPORT_DB_NAME = 'bundled-poems-import.db';
const BUNDLED_IMPORT_DIRECTORY = new Directory(Paths.cache, 'SQLite');

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

function ensureBundledImportDirectoryExists(): void {
  if (!BUNDLED_IMPORT_DIRECTORY.exists) {
    BUNDLED_IMPORT_DIRECTORY.create({ intermediates: true, idempotent: true });
  }
}

async function getBundledDatabaseAssetFile(): Promise<File> {
  const asset = Asset.fromModule(require('../../assets/poems.db'));
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }

  if (!asset.localUri) {
    throw new Error('Unable to locate bundled poems.db asset');
  }

  return new File(asset.localUri);
}

async function copyBundledDatabase(): Promise<void> {
  ensureDirectoryExists();

  const sourceFile = await getBundledDatabaseAssetFile();
  const destFile = getDatabaseFile();
  if (destFile.exists) {
    return;
  }
  await sourceFile.copy(destFile);
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

function shouldCopyBundledDatabase(): boolean {
  ensureDirectoryExists();
  const dbFile = getDatabaseFile();
  return !dbFile.exists;
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
      metadata TEXT NOT NULL DEFAULT '{}',
      CHECK(language IN ('en','ur'))
    );`
  );

  if (!tableHasColumn(database, 'poems', 'source')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN source TEXT NOT NULL DEFAULT 'bundled';`);
  }

  database.runSync(`UPDATE poems SET source = 'bundled' WHERE source IS NULL OR source = '';`);

  if (!tableHasColumn(database, 'poems', 'metadata')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}';`);
  }

  database.runSync(`UPDATE poems SET metadata = '{}' WHERE metadata IS NULL OR metadata = '';`);

  if (!tableHasColumn(database, 'poems', 'created_at')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN created_at TEXT;`);
  }

  if (!tableHasColumn(database, 'poems', 'updated_at')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN updated_at TEXT;`);
  }

  if (!tableHasColumn(database, 'poems', 'sync_status')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'synced';`);
  }

  if (!tableHasColumn(database, 'poems', 'remote_id')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN remote_id TEXT;`);
  }

  if (!tableHasColumn(database, 'poems', 'deleted_at')) {
    database.execSync(`ALTER TABLE poems ADD COLUMN deleted_at TEXT;`);
  }

  const migrationTimestamp = new Date().toISOString();
  database.runSync(
    `UPDATE poems
     SET created_at = COALESCE(created_at, ?),
       updated_at = COALESCE(updated_at, created_at, ?)
     WHERE source = 'user';`,
    [migrationTimestamp, migrationTimestamp]
  );

  database.runSync(
    `UPDATE poems
     SET sync_status = 'dirty'
     WHERE source = 'user'
       AND (
         sync_status IS NULL
         OR sync_status = ''
         OR sync_status = 'local'
         OR (sync_status = 'synced' AND remote_id IS NULL)
       );`
  );

  database.execSync(
    'CREATE INDEX IF NOT EXISTS idx_poems_user_sync_status ON poems (source, sync_status, updated_at);'
  );

  database.execSync(
    'CREATE INDEX IF NOT EXISTS idx_poems_user_updated_at ON poems (source, updated_at);'
  );

  if (!tableHasColumn(database, 'poems', 'poem_id')) {
    database.execSync('ALTER TABLE poems ADD COLUMN poem_id TEXT;');
  }

  populateMissingPoemIds(database);

  database.execSync(
    `CREATE TABLE IF NOT EXISTS saved_poems (
      poem_id TEXT PRIMARY KEY,
      poem_scope TEXT NOT NULL DEFAULT 'catalogue',
      saved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'dirty',
      remote_id TEXT,
      deleted_at TEXT
    );`
  );

  if (!tableHasColumn(database, 'saved_poems', 'poem_scope')) {
    database.execSync(`ALTER TABLE saved_poems ADD COLUMN poem_scope TEXT NOT NULL DEFAULT 'catalogue';`);
  }

  database.runSync(
    `UPDATE saved_poems
     SET poem_scope = 'catalogue'
     WHERE poem_scope IS NULL OR poem_scope = '';`
  );

  database.runSync(
    `UPDATE saved_poems
     SET sync_status = 'dirty'
     WHERE sync_status IS NULL OR sync_status = '' OR sync_status = 'local';`
  );

  database.execSync(
    'CREATE INDEX IF NOT EXISTS idx_saved_poems_saved_at ON saved_poems (saved_at DESC);'
  );

  database.execSync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_poems_scope_poem_id ON saved_poems (poem_scope, poem_id);'
  );

  database.execSync(
    'CREATE INDEX IF NOT EXISTS idx_saved_poems_sync_status ON saved_poems (sync_status, updated_at);'
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

async function copyBundledDatabaseForImport(): Promise<File> {
  ensureBundledImportDirectoryExists();

  const sourceFile = await getBundledDatabaseAssetFile();
  const importFile = new File(BUNDLED_IMPORT_DIRECTORY, BUNDLED_IMPORT_DB_NAME);
  if (importFile.exists) {
    importFile.delete();
  }

  await sourceFile.copy(importFile);
  return importFile;
}

function readBundledPoems(database: SQLite.SQLiteDatabase) {
  return database.getAllSync(
    `SELECT poem_id, title, author, content, language, metadata
     FROM poems
     WHERE source = 'bundled' AND poem_id IS NOT NULL AND poem_id != '';`
  ) as Array<{
    poem_id: string;
    title: string;
    author: string;
    content: string;
    language: 'en' | 'ur';
    metadata: string | null;
  }>;
}

async function refreshBundledCatalogue(database: SQLite.SQLiteDatabase): Promise<void> {
  let bundledDb: SQLite.SQLiteDatabase | null = null;
  let importFile: File | null = null;

  try {
    importFile = await copyBundledDatabaseForImport();
    bundledDb = SQLite.openDatabaseSync(
      BUNDLED_IMPORT_DB_NAME,
      { useNewConnection: true },
      BUNDLED_IMPORT_DIRECTORY.uri
    );

    const bundledPoems = readBundledPoems(bundledDb);
    if (bundledPoems.length === 0) {
      return;
    }

    database.execSync('BEGIN');
    try {
      bundledPoems.forEach((poem) => {
        database.runSync(
          `INSERT INTO poems (poem_id, title, author, content, language, source, metadata)
           VALUES (?, ?, ?, ?, ?, 'bundled', ?)
           ON CONFLICT(poem_id) DO UPDATE SET
             title = excluded.title,
             author = excluded.author,
             content = excluded.content,
             language = excluded.language,
             metadata = excluded.metadata
           WHERE poems.source = 'bundled';`,
          [
            poem.poem_id,
            poem.title,
            poem.author,
            poem.content,
            poem.language,
            poem.metadata ?? '{}',
          ]
        );
      });
      database.execSync('COMMIT');
    } catch (error) {
      database.execSync('ROLLBACK');
      throw error;
    }
  } finally {
    if (bundledDb) {
      closeDatabase(bundledDb);
    }

    try {
      if (importFile?.exists) {
        importFile.delete();
      }
    } catch (error) {
      console.warn('Failed to remove temporary bundled poems import database', error);
    }
  }
}

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      ensureDirectoryExists();
      const shouldCopyBundled = shouldCopyBundledDatabase();
      if (shouldCopyBundled) {
        await copyBundledDatabase();
      }

      const database = SQLite.openDatabaseSync(DB_NAME);
      applyMigrations(database);
      if (!shouldCopyBundled) {
        await refreshBundledCatalogue(database);
      }
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
