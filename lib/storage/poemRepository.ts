import { createPoemId, ensureUniquePoemId } from '../utils/poemId';
import { Poem, PoemMetadata, PoemLengthBucket } from '../types';
import { getDatabase } from './database';

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return entries.length ? entries : undefined;
}

function normalizeLength(value: unknown): PoemLengthBucket | null {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'short' || normalized === 'medium' || normalized === 'long'
    ? normalized
    : null;
}

function normalizeMetadata(raw: unknown): PoemMetadata | null {
  if (!raw) {
    return null;
  }

  let payload: any = raw;

  if (typeof raw === 'string') {
    try {
      payload = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const metadata: PoemMetadata = {};

  const tags = normalizeStringArray(payload.tags);
  if (tags) {
    metadata.tags = tags;
  }

  const themes = normalizeStringArray(payload.themes);
  if (themes) {
    metadata.themes = themes;
  }

  const moods = normalizeStringArray(payload.moods);
  if (moods) {
    metadata.moods = moods;
  }

  const form = typeof payload.form === 'string' ? payload.form.trim() : '';
  if (form) {
    metadata.form = form;
  }

  const era = typeof payload.era === 'string' ? payload.era.trim() : '';
  if (era) {
    metadata.era = era;
  }

  const length = normalizeLength(payload.length);
  if (length) {
    metadata.length = length;
  }

  return Object.keys(metadata).length ? metadata : null;
}

function serializeMetadata(metadata: Poem['metadata']): string {
  if (!metadata || (typeof metadata === 'object' && Object.keys(metadata).length === 0)) {
    return '{}';
  }
  return JSON.stringify(metadata);
}

function mapRowToPoem(row: any, defaultSource: Poem['source'] = 'local'): Poem {
  return {
    id: String(row.poem_id ?? row.id),
    title: row.title,
    author: row.author,
    content: row.content,
    source: (row.source as Poem['source']) ?? defaultSource,
    language: row.language ?? 'en',
    metadata: normalizeMetadata(row.metadata),
  };
}

function getTimestamp(): string {
  return new Date().toISOString();
}

export type SavedPoemScope = 'catalogue' | 'user';
export type SavedPoemSyncStatus = 'dirty' | 'synced' | 'error';
export type UserPoemSyncStatus = 'dirty' | 'synced' | 'error';

export interface SavedPoemSyncRow {
  poemId: string;
  poemScope: SavedPoemScope;
  savedAt: string;
  updatedAt: string;
  syncStatus: SavedPoemSyncStatus;
  remoteId: string | null;
  deletedAt: string | null;
}

export interface RemoteSavedPoemRow {
  poemId: string;
  poemScope?: SavedPoemScope;
  savedAt: string;
  updatedAt: string;
  remoteId: string;
  deletedAt?: string | null;
}

export interface UserPoemSyncRow {
  poemId: string;
  title: string;
  author: string;
  content: string;
  language: 'en' | 'ur';
  metadata: PoemMetadata | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: UserPoemSyncStatus;
  remoteId: string | null;
  deletedAt: string | null;
}

export interface RemoteUserPoemRow {
  poemId: string;
  title: string;
  author: string;
  content: string;
  language: 'en' | 'ur';
  metadata?: PoemMetadata | null;
  createdAt: string;
  updatedAt: string;
  remoteId: string;
  deletedAt?: string | null;
}

function mapRowToSavedPoemSyncRow(row: any): SavedPoemSyncRow {
  return {
    poemId: row.poem_id,
    poemScope: (row.poem_scope ?? 'catalogue') as SavedPoemScope,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status as SavedPoemSyncStatus,
    remoteId: row.remote_id ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

function mapRowToUserPoemSyncRow(row: any): UserPoemSyncRow {
  const timestamp = row.updated_at ?? row.created_at ?? getTimestamp();
  return {
    poemId: row.poem_id,
    title: row.title,
    author: row.author,
    content: row.content,
    language: row.language ?? 'en',
    metadata: normalizeMetadata(row.metadata),
    createdAt: row.created_at ?? timestamp,
    updatedAt: row.updated_at ?? timestamp,
    syncStatus: row.sync_status as UserPoemSyncStatus,
    remoteId: row.remote_id ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

function metadataKeyForSavedPoemsCheckpoint(userId: string): string {
  return `saved_poems_sync_checkpoint:${userId}`;
}

function metadataKeyForUserPoemsCheckpoint(userId: string): string {
  return `user_poems_sync_checkpoint:${userId}`;
}

const LAST_NEXUS_USER_ID_KEY = 'last_nexus_user_id';

export function getAllPoems(options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE language = ?;',
      [language]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync('SELECT poem_id, title, author, content, language, source, metadata FROM poems;');
  return rows.map((row) => mapRowToPoem(row));
}

export function getPoemsPage(offset = 0, limit = 20, options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE language = ? LIMIT ? OFFSET ?;',
      [language, limit, offset]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems LIMIT ? OFFSET ?;',
    [limit, offset]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function getRandomPoems(options?: { limit?: number; language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const limit = options?.limit ?? 20;
  const language = options?.language;
  const where = language ? "source != 'user' AND language = ?" : "source != 'user'";
  const whereParams = language ? [language] : [];

  const countRow = db.getFirstSync(
    `SELECT COUNT(*) as count FROM poems WHERE ${where};`,
    whereParams
  ) as { count: number } | undefined;
  const count = countRow?.count ?? 0;
  if (count === 0) {
    return [];
  }

  const normalizedLimit = Math.max(1, Math.min(limit, count));
  const offset = count > normalizedLimit ? Math.floor(Math.random() * (count - normalizedLimit + 1)) : 0;
  const rows = db.getAllSync(
    `SELECT poem_id, title, author, content, language, source, metadata
     FROM poems
     WHERE ${where}
     ORDER BY id
     LIMIT ? OFFSET ?;`,
    [...whereParams, normalizedLimit, offset]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function getTotalPoemsCount(): number {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT COUNT(*) as count FROM poems;'
  ) as { count: number } | undefined;
  return row?.count ?? 0;
}

export function getPoemsByAuthor(author: string, limit = 20, options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE author = ? AND language = ? LIMIT ?;',
      [author, language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE author = ? LIMIT ?;',
    [author, limit]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function searchPoems(
  query: string,
  field: 'title' | 'author' | 'content' = 'title',
  limit = 10,
  options?: { language?: 'en' | 'ur' }
): Poem[] {
  const db = getDatabase();
  const wildcard = `%${query}%`;
  const language = options?.language;

  if (language) {
    const sql = `SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE ${field} LIKE ? AND language = ? LIMIT ?;`;
    const rows = db.getAllSync(sql, [wildcard, language, limit]);
    return rows.map((row) => mapRowToPoem(row));
  }

  const sql = `SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE ${field} LIKE ? LIMIT ?;`;
  const rows = db.getAllSync(sql, [wildcard, limit]);
  return rows.map((row) => mapRowToPoem(row));
}

export interface CreatePoemInput {
  title: string;
  author: string;
  content: string;
  source?: Poem['source'];
  language?: 'en' | 'ur';
  id?: string;
  metadata?: PoemMetadata | null;
}

export interface CreateLocalUserPoemInput {
  title?: string;
  author?: string;
  content: string;
  language?: 'en' | 'ur';
}

export function insertPoem(input: CreatePoemInput): number {
  const db = getDatabase();
  const language = input.language ?? 'en';
  const source = input.source ?? 'user';
  const timestamp = source === 'user' ? getTimestamp() : null;
  const baseId = input.id ?? createPoemId({
    title: input.title,
    author: input.author,
    content: input.content,
    language,
  });

  const existing = db.getFirstSync(
    'SELECT id FROM poems WHERE poem_id = ? LIMIT 1;',
    [baseId]
  ) as { id: number } | undefined;

  if (existing) {
    return existing.id;
  }

  const poemId = ensureUniquePoemId(baseId, (candidate) => {
    const row = db.getFirstSync('SELECT 1 FROM poems WHERE poem_id = ? LIMIT 1;', [candidate]);
    return Boolean(row);
  });

  db.runSync(
    `INSERT INTO poems
       (poem_id, title, author, content, language, source, metadata, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      poemId,
      input.title,
      input.author,
      input.content,
      language,
      source,
      serializeMetadata(input.metadata),
      timestamp,
      timestamp,
      source === 'user' ? 'dirty' : 'synced',
    ]
  );

  const row = db.getFirstSync('SELECT last_insert_rowid() as id;') as { id: number };
  return row.id;
}

function getPoemByLocalRowId(id: number): Poem | null {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE id = ? LIMIT 1;',
    [id]
  );

  return row ? mapRowToPoem(row) : null;
}

export function createLocalUserPoem(input: CreateLocalUserPoemInput): Poem {
  const title = input.title?.trim() || 'Untitled';
  const author = input.author?.trim() || 'Anonymous';
  const content = input.content.trim();
  const language = input.language ?? 'en';

  if (!content) {
    throw new Error('Poem content is required.');
  }

  const id = `user-${createPoemId({ title, author, content, language })}`;
  const rowId = insertPoem({
    id,
    title,
    author,
    content,
    language,
    source: 'user',
  });
  const poem = getPoemByLocalRowId(rowId);

  if (!poem) {
    throw new Error('Created poem could not be loaded.');
  }

  return poem;
}

export function getLocalUserPoems(options?: { limit?: number; offset?: number }): Poem[] {
  const db = getDatabase();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  const rows = db.getAllSync(
    `SELECT poem_id, title, author, content, language, source, metadata
     FROM poems
     WHERE source = 'user' AND deleted_at IS NULL
     ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
     LIMIT ? OFFSET ?;`,
    [limit, offset]
  );

  return rows.map((row) => mapRowToPoem(row));
}

export function listDirtyUserPoems(): UserPoemSyncRow[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    `SELECT poem_id, title, author, content, language, metadata, created_at, updated_at, sync_status, remote_id, deleted_at
     FROM poems
     WHERE source = 'user' AND sync_status IN ('dirty', 'error')
     ORDER BY COALESCE(updated_at, created_at) ASC;`
  );
  return rows.map((row) => mapRowToUserPoemSyncRow(row));
}

export function markUserPoemSynced(input: {
  poemId: string;
  remoteId: string;
  createdAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
  expectedLocalUpdatedAt?: string;
}): boolean {
  const db = getDatabase();
  const updatedAtGuard = input.expectedLocalUpdatedAt ? ' AND updated_at = ?' : '';

  db.runSync(
    `UPDATE poems
     SET remote_id = ?,
       created_at = COALESCE(?, created_at),
       updated_at = ?,
       deleted_at = ?,
       sync_status = 'synced'
     WHERE source = 'user' AND poem_id = ?${updatedAtGuard};`,
    [
      input.remoteId,
      input.createdAt ?? null,
      input.updatedAt,
      input.deletedAt ?? null,
      input.poemId,
      ...(input.expectedLocalUpdatedAt ? [input.expectedLocalUpdatedAt] : []),
    ]
  );

  const row = db.getFirstSync(
    `SELECT 1
     FROM poems
     WHERE source = 'user'
       AND poem_id = ?
       AND remote_id = ?
       AND updated_at = ?
       AND sync_status = 'synced'
     LIMIT 1;`,
    [input.poemId, input.remoteId, input.updatedAt]
  );
  return Boolean(row);
}

export function applyRemoteUserPoem(input: RemoteUserPoemRow): boolean {
  const db = getDatabase();
  const deletedAt = input.deletedAt ?? null;
  const metadata = serializeMetadata(input.metadata);
  const current = db.getFirstSync(
    `SELECT poem_id, source, created_at, updated_at, deleted_at
     FROM poems
     WHERE poem_id = ?
     LIMIT 1;`,
    [input.poemId]
  ) as any | undefined;

  if (current?.source && current.source !== 'user') {
    return false;
  }

  if (current) {
    const currentUpdatedAt = current.updated_at ?? current.created_at ?? '';
    if (currentUpdatedAt > input.updatedAt) {
      return false;
    }

    const localDeletionWinsTie = currentUpdatedAt === input.updatedAt && current.deleted_at && !deletedAt;
    if (localDeletionWinsTie) {
      return false;
    }
  }

  db.runSync(
    `INSERT INTO poems
       (poem_id, title, author, content, language, source, metadata, created_at, updated_at, sync_status, remote_id, deleted_at)
     VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, 'synced', ?, ?)
     ON CONFLICT(poem_id) DO UPDATE SET
       title = excluded.title,
       author = excluded.author,
       content = excluded.content,
       language = excluded.language,
       source = 'user',
       metadata = excluded.metadata,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at,
       sync_status = 'synced',
       remote_id = excluded.remote_id,
       deleted_at = excluded.deleted_at;`,
    [
      input.poemId,
      input.title,
      input.author,
      input.content,
      input.language,
      metadata,
      input.createdAt,
      input.updatedAt,
      input.remoteId,
      deletedAt,
    ]
  );

  return true;
}

export function updateLocalUserPoem(input: {
  poemId: string;
  title?: string;
  author?: string;
  content?: string;
  language?: 'en' | 'ur';
  metadata?: PoemMetadata | null;
}): Poem | null {
  const db = getDatabase();
  const current = db.getFirstSync(
    `SELECT poem_id, title, author, content, language, source, metadata
     FROM poems
     WHERE source = 'user' AND poem_id = ? AND deleted_at IS NULL
     LIMIT 1;`,
    [input.poemId]
  ) as any | undefined;

  if (!current) {
    return null;
  }

  const title = input.title === undefined ? current.title : input.title.trim() || 'Untitled';
  const author = input.author === undefined ? current.author : input.author.trim() || 'Anonymous';
  const content = input.content === undefined ? current.content : input.content.trim();
  const language = input.language ?? current.language ?? 'en';
  const metadata = input.metadata === undefined ? current.metadata : serializeMetadata(input.metadata);

  if (!content) {
    throw new Error('Poem content is required.');
  }

  const timestamp = getTimestamp();
  db.runSync(
    `UPDATE poems
     SET title = ?,
       author = ?,
       content = ?,
       language = ?,
       metadata = ?,
       updated_at = ?,
       sync_status = 'dirty',
       deleted_at = NULL
     WHERE source = 'user' AND poem_id = ?;`,
    [title, author, content, language, metadata, timestamp, input.poemId]
  );

  const row = db.getFirstSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE poem_id = ? LIMIT 1;',
    [input.poemId]
  );
  return row ? mapRowToPoem(row) : null;
}

export function deleteLocalUserPoem(poemId: string): void {
  const db = getDatabase();
  const timestamp = getTimestamp();

  db.runSync(
    `UPDATE poems
     SET updated_at = ?,
       deleted_at = ?,
       sync_status = 'dirty'
     WHERE source = 'user' AND poem_id = ?;`,
    [timestamp, timestamp, poemId]
  );
}

export function insertPoemsInBatch(poems: CreatePoemInput[]): void {
  if (poems.length === 0) {
    return;
  }

  const db = getDatabase();
  db.execSync('BEGIN');
  try {
    poems.forEach((poem) => {
      const language = poem.language ?? 'en';
      const baseId = poem.id ?? createPoemId({
        title: poem.title,
        author: poem.author,
        content: poem.content,
        language,
      });

      const existing = db.getFirstSync('SELECT 1 FROM poems WHERE poem_id = ? LIMIT 1;', [baseId]);
      if (existing) {
        return;
      }

      const poemId = ensureUniquePoemId(baseId, (candidate) => {
        const row = db.getFirstSync('SELECT 1 FROM poems WHERE poem_id = ? LIMIT 1;', [candidate]);
        return Boolean(row);
      });

      const source = poem.source ?? 'user';
      const timestamp = source === 'user' ? getTimestamp() : null;

      db.runSync(
        `INSERT OR IGNORE INTO poems
           (poem_id, title, author, content, language, source, metadata, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          poemId,
          poem.title,
          poem.author,
          poem.content,
          language,
          source,
          serializeMetadata(poem.metadata),
          timestamp,
          timestamp,
          source === 'user' ? 'dirty' : 'synced',
        ]
      );
    });
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}

export function getPoemByTitleAndAuthor(title: string, author: string): Poem | null {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE title = ? AND author = ? LIMIT 1;',
    [title, author]
  );

  return row ? mapRowToPoem(row) : null;
}

export function getDistinctAuthors(): string[] {
  const db = getDatabase();
  const rows = db.getAllSync('SELECT DISTINCT author FROM poems ORDER BY author;') as Array<{
    author: string;
  }>;
  return rows.map((row) => row.author);
}

export function savePoem(poemId: string, poemScope: SavedPoemScope = 'catalogue'): void {
  const db = getDatabase();
  const timestamp = getTimestamp();

  db.runSync(
    `INSERT INTO saved_poems (poem_id, poem_scope, saved_at, updated_at, sync_status, remote_id, deleted_at)
     VALUES (?, ?, ?, ?, 'dirty', NULL, NULL)
     ON CONFLICT(poem_scope, poem_id) DO UPDATE SET
       saved_at = excluded.saved_at,
       updated_at = excluded.updated_at,
       sync_status = 'dirty',
       remote_id = saved_poems.remote_id,
       deleted_at = NULL;`,
    [poemId, poemScope, timestamp, timestamp]
  );
}

export function unsavePoem(poemId: string, poemScope: SavedPoemScope = 'catalogue'): void {
  const db = getDatabase();
  const timestamp = getTimestamp();

  db.runSync(
    `INSERT INTO saved_poems (poem_id, poem_scope, saved_at, updated_at, sync_status, remote_id, deleted_at)
     VALUES (?, ?, ?, ?, 'dirty', NULL, ?)
     ON CONFLICT(poem_scope, poem_id) DO UPDATE SET
       updated_at = excluded.updated_at,
       sync_status = 'dirty',
       remote_id = saved_poems.remote_id,
       deleted_at = excluded.deleted_at;`,
    [poemId, poemScope, timestamp, timestamp, timestamp]
  );
}

export function isPoemSaved(poemId: string, poemScope: SavedPoemScope = 'catalogue'): boolean {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT 1 FROM saved_poems WHERE poem_scope = ? AND poem_id = ? AND deleted_at IS NULL LIMIT 1;',
    [poemScope, poemId]
  );
  return Boolean(row);
}

export function getSavedPoemIds(poemScope: SavedPoemScope = 'catalogue'): string[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    'SELECT poem_id FROM saved_poems WHERE poem_scope = ? AND deleted_at IS NULL ORDER BY saved_at DESC;',
    [poemScope]
  ) as Array<{ poem_id: string }>;
  return rows.map((row) => row.poem_id);
}

export function getSavedPoems(options?: { limit?: number; offset?: number; poemScope?: SavedPoemScope }): Poem[] {
  const db = getDatabase();
  const limit = options?.limit ?? 100;
  const offset = options?.offset ?? 0;
  const poemScope = options?.poemScope ?? 'catalogue';
  const rows = db.getAllSync(
    `SELECT poems.poem_id, poems.title, poems.author, poems.content, poems.language, poems.source, poems.metadata
     FROM saved_poems
     INNER JOIN poems ON poems.poem_id = saved_poems.poem_id
     WHERE saved_poems.poem_scope = ? AND saved_poems.deleted_at IS NULL
     ORDER BY saved_poems.saved_at DESC
     LIMIT ? OFFSET ?;`,
    [poemScope, limit, offset]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function listDirtySavedPoems(): SavedPoemSyncRow[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    `SELECT poem_id, poem_scope, saved_at, updated_at, sync_status, remote_id, deleted_at
     FROM saved_poems
     WHERE sync_status IN ('dirty', 'error')
     ORDER BY updated_at ASC;`
  );
  return rows.map((row) => mapRowToSavedPoemSyncRow(row));
}

export function markSavedPoemSynced(input: {
  poemId: string;
  poemScope?: SavedPoemScope;
  remoteId: string;
  savedAt?: string;
  updatedAt: string;
  deletedAt?: string | null;
  expectedLocalUpdatedAt?: string;
}): void {
  const db = getDatabase();
  const poemScope = input.poemScope ?? 'catalogue';
  const updatedAtGuard = input.expectedLocalUpdatedAt ? ' AND updated_at = ?' : '';

  db.runSync(
    `UPDATE saved_poems
     SET remote_id = ?,
       saved_at = COALESCE(?, saved_at),
       updated_at = ?,
       deleted_at = ?,
       sync_status = 'synced'
     WHERE poem_scope = ? AND poem_id = ?${updatedAtGuard};`,
    [
      input.remoteId,
      input.savedAt ?? null,
      input.updatedAt,
      input.deletedAt ?? null,
      poemScope,
      input.poemId,
      ...(input.expectedLocalUpdatedAt ? [input.expectedLocalUpdatedAt] : []),
    ]
  );
}

export function applyRemoteSavedPoem(input: RemoteSavedPoemRow): boolean {
  const db = getDatabase();
  const poemScope = input.poemScope ?? 'catalogue';
  const deletedAt = input.deletedAt ?? null;
  const current = db.getFirstSync(
    `SELECT poem_id, poem_scope, saved_at, updated_at, sync_status, remote_id, deleted_at
     FROM saved_poems
     WHERE poem_scope = ? AND poem_id = ?
     LIMIT 1;`,
    [poemScope, input.poemId]
  ) as any | undefined;

  if (current) {
    if (current.updated_at > input.updatedAt) {
      return false;
    }

    const localDeletionWinsTie = current.updated_at === input.updatedAt && current.deleted_at && !deletedAt;
    if (localDeletionWinsTie) {
      return false;
    }
  }

  db.runSync(
    `INSERT INTO saved_poems (poem_id, poem_scope, saved_at, updated_at, sync_status, remote_id, deleted_at)
     VALUES (?, ?, ?, ?, 'synced', ?, ?)
     ON CONFLICT(poem_scope, poem_id) DO UPDATE SET
       saved_at = excluded.saved_at,
       updated_at = excluded.updated_at,
       sync_status = 'synced',
       remote_id = excluded.remote_id,
       deleted_at = excluded.deleted_at;`,
    [input.poemId, poemScope, input.savedAt, input.updatedAt, input.remoteId, deletedAt]
  );

  return true;
}

export function getSavedPoemsSyncCheckpoint(userId: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT value FROM metadata WHERE key = ? LIMIT 1;',
    [metadataKeyForSavedPoemsCheckpoint(userId)]
  ) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSavedPoemsSyncCheckpoint(userId: string, checkpoint: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
    [metadataKeyForSavedPoemsCheckpoint(userId), checkpoint]
  );
}

export function getUserPoemsSyncCheckpoint(userId: string): string | null {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT value FROM metadata WHERE key = ? LIMIT 1;',
    [metadataKeyForUserPoemsCheckpoint(userId)]
  ) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setUserPoemsSyncCheckpoint(userId: string, checkpoint: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
    [metadataKeyForUserPoemsCheckpoint(userId), checkpoint]
  );
}

export function getLastNexusUserId(): string | null {
  const db = getDatabase();
  const row = db.getFirstSync(
    'SELECT value FROM metadata WHERE key = ? LIMIT 1;',
    [LAST_NEXUS_USER_ID_KEY]
  ) as { value: string } | undefined;
  return row?.value ?? null;
}

export function prepareLocalDataForNexusUser(userId: string): 'merge' | 'resume' | 'switch' {
  const db = getDatabase();
  const previousUserId = getLastNexusUserId();

  if (previousUserId === userId) return 'resume';

  db.execSync('BEGIN');
  try {
    if (previousUserId) {
      db.runSync('DELETE FROM saved_poems;');
      db.runSync(`DELETE FROM poems WHERE source = 'user';`);
      db.runSync(
        `DELETE FROM metadata
         WHERE key LIKE 'saved_poems_sync_checkpoint:%'
            OR key LIKE 'user_poems_sync_checkpoint:%';`
      );
    }
    db.runSync(
      'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
      [LAST_NEXUS_USER_ID_KEY, userId]
    );
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }

  return previousUserId ? 'switch' : 'merge';
}

export function clearLocalAccountData(): void {
  const db = getDatabase();
  db.execSync('BEGIN');
  try {
    db.runSync('DELETE FROM saved_poems;');
    db.runSync(`DELETE FROM poems WHERE source = 'user';`);
    db.runSync(
      `DELETE FROM metadata
       WHERE key = ?
          OR key LIKE 'saved_poems_sync_checkpoint:%'
          OR key LIKE 'user_poems_sync_checkpoint:%';`,
      [LAST_NEXUS_USER_ID_KEY]
    );
    db.execSync('COMMIT');
  } catch (error) {
    db.execSync('ROLLBACK');
    throw error;
  }
}
