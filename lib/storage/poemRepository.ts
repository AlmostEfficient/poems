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

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source, metadata FROM poems WHERE language = ? ORDER BY RANDOM() LIMIT ?;',
      [language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source, metadata FROM poems ORDER BY RANDOM() LIMIT ?;',
    [limit]
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

export function insertPoem(input: CreatePoemInput): number {
  const db = getDatabase();
  const language = input.language ?? 'en';
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
    'INSERT INTO poems (poem_id, title, author, content, language, source, metadata) VALUES (?, ?, ?, ?, ?, ?, ?);',
    [poemId, input.title, input.author, input.content, language, input.source ?? 'user', serializeMetadata(input.metadata)]
  );

  const row = db.getFirstSync('SELECT last_insert_rowid() as id;') as { id: number };
  return row.id;
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

      db.runSync(
        'INSERT OR IGNORE INTO poems (poem_id, title, author, content, language, source, metadata) VALUES (?, ?, ?, ?, ?, ?, ?);',
        [poemId, poem.title, poem.author, poem.content, language, poem.source ?? 'user', serializeMetadata(poem.metadata)]
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
