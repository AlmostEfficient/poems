import { createPoemId, ensureUniquePoemId } from '../utils/poemId';
import { Poem } from '../types';
import { getDatabase } from './database';

function mapRowToPoem(row: any, defaultSource: Poem['source'] = 'local'): Poem {
  return {
    id: String(row.poem_id ?? row.id),
    title: row.title,
    author: row.author,
    content: row.content,
    source: (row.source as Poem['source']) ?? defaultSource,
    language: row.language ?? 'en',
  };
}

export function getAllPoems(options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source FROM poems WHERE language = ?;',
      [language]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync('SELECT poem_id, title, author, content, language, source FROM poems;');
  return rows.map((row) => mapRowToPoem(row));
}

export function getPoemsPage(offset = 0, limit = 20, options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT poem_id, title, author, content, language, source FROM poems WHERE language = ? LIMIT ? OFFSET ?;',
      [language, limit, offset]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source FROM poems LIMIT ? OFFSET ?;',
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
      'SELECT poem_id, title, author, content, language, source FROM poems WHERE language = ? ORDER BY RANDOM() LIMIT ?;',
      [language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source FROM poems ORDER BY RANDOM() LIMIT ?;',
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
      'SELECT poem_id, title, author, content, language, source FROM poems WHERE author = ? AND language = ? LIMIT ?;',
      [author, language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT poem_id, title, author, content, language, source FROM poems WHERE author = ? LIMIT ?;',
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
    const sql = `SELECT poem_id, title, author, content, language, source FROM poems WHERE ${field} LIKE ? AND language = ? LIMIT ?;`;
    const rows = db.getAllSync(sql, [wildcard, language, limit]);
    return rows.map((row) => mapRowToPoem(row));
  }

  const sql = `SELECT poem_id, title, author, content, language, source FROM poems WHERE ${field} LIKE ? LIMIT ?;`;
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
    'INSERT INTO poems (poem_id, title, author, content, language, source) VALUES (?, ?, ?, ?, ?, ?);',
    [poemId, input.title, input.author, input.content, language, input.source ?? 'user']
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
        'INSERT OR IGNORE INTO poems (poem_id, title, author, content, language, source) VALUES (?, ?, ?, ?, ?, ?);',
        [poemId, poem.title, poem.author, poem.content, language, poem.source ?? 'user']
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
    'SELECT poem_id, title, author, content, language, source FROM poems WHERE title = ? AND author = ? LIMIT 1;',
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
