import { Poem } from '../types';
import { getDatabase } from './database';

function mapRowToPoem(row: any, defaultSource: Poem['source'] = 'local'): Poem {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    content: row.content,
    source: row.source ?? defaultSource,
    language: row.language ?? 'en',
  };
}

export function getAllPoems(options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT id, title, author, content, language FROM poems WHERE language = ?;',
      [language]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync('SELECT id, title, author, content, language FROM poems;');
  return rows.map((row) => mapRowToPoem(row));
}

export function getPoemsPage(offset = 0, limit = 20, options?: { language?: 'en' | 'ur' }): Poem[] {
  const db = getDatabase();
  const language = options?.language;

  if (language) {
    const rows = db.getAllSync(
      'SELECT id, title, author, content, language FROM poems WHERE language = ? LIMIT ? OFFSET ?;',
      [language, limit, offset]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT id, title, author, content, language FROM poems LIMIT ? OFFSET ?;',
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
      'SELECT id, title, author, content, language FROM poems WHERE language = ? ORDER BY RANDOM() LIMIT ?;',
      [language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT id, title, author, content, language FROM poems ORDER BY RANDOM() LIMIT ?;',
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
      'SELECT id, title, author, content, language FROM poems WHERE author = ? AND language = ? LIMIT ?;',
      [author, language, limit]
    );
    return rows.map((row) => mapRowToPoem(row));
  }

  const rows = db.getAllSync(
    'SELECT id, title, author, content, language FROM poems WHERE author = ? LIMIT ?;',
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
    const sql = `SELECT id, title, author, content, language FROM poems WHERE ${field} LIKE ? AND language = ? LIMIT ?;`;
    const rows = db.getAllSync(sql, [wildcard, language, limit]);
    return rows.map((row) => mapRowToPoem(row));
  }

  const sql = `SELECT id, title, author, content, language FROM poems WHERE ${field} LIKE ? LIMIT ?;`;
  const rows = db.getAllSync(sql, [wildcard, limit]);
  return rows.map((row) => mapRowToPoem(row));
}

export interface CreatePoemInput {
  title: string;
  author: string;
  content: string;
  source?: Poem['source'];
  language?: 'en' | 'ur';
}

export function insertPoem(input: CreatePoemInput): number {
  const db = getDatabase();
  const existing = db.getFirstSync(
    'SELECT id FROM poems WHERE title = ? AND author = ? LIMIT 1;',
    [input.title, input.author]
  ) as { id: number } | undefined;

  if (existing) {
    return existing.id;
  }

  const language = input.language ?? 'en';
  db.runSync(
    'INSERT INTO poems (title, author, content, language) VALUES (?, ?, ?, ?);',
    [input.title, input.author, input.content, language]
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
      db.runSync(
        'INSERT OR IGNORE INTO poems (title, author, content, language) VALUES (?, ?, ?, ?);',
        [poem.title, poem.author, poem.content, language]
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
    'SELECT id, title, author, content, language FROM poems WHERE title = ? AND author = ? LIMIT 1;',
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
