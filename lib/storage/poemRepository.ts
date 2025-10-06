import { Poem } from '../types';
import { getDatabase } from './database';

function mapRowToPoem(row: any, defaultSource: Poem['source'] = 'local'): Poem {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    content: row.content,
    source: row.source ?? defaultSource,
  };
}

export function getAllPoems(): Poem[] {
  const db = getDatabase();
  const rows = db.getAllSync('SELECT id, title, author, content FROM poems;');
  return rows.map((row) => mapRowToPoem(row));
}

export function getPoemsPage(offset = 0, limit = 20): Poem[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    'SELECT id, title, author, content FROM poems LIMIT ? OFFSET ?;',
    [limit, offset]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function getRandomPoems(limit = 20): Poem[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    'SELECT id, title, author, content FROM poems ORDER BY RANDOM() LIMIT ?;',
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

export function getPoemsByAuthor(author: string, limit = 20): Poem[] {
  const db = getDatabase();
  const rows = db.getAllSync(
    'SELECT id, title, author, content FROM poems WHERE author = ? LIMIT ?;',
    [author, limit]
  );
  return rows.map((row) => mapRowToPoem(row));
}

export function searchPoems(
  query: string,
  field: 'title' | 'author' | 'content' = 'title',
  limit = 10
): Poem[] {
  const db = getDatabase();
  const wildcard = `%${query}%`;
  const sql = `SELECT id, title, author, content FROM poems WHERE ${field} LIKE ? LIMIT ?;`;
  const rows = db.getAllSync(sql, [wildcard, limit]);
  return rows.map((row) => mapRowToPoem(row));
}

export interface CreatePoemInput {
  title: string;
  author: string;
  content: string;
  source?: Poem['source'];
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

  db.runSync(
    'INSERT INTO poems (title, author, content) VALUES (?, ?, ?);',
    [input.title, input.author, input.content]
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
      db.runSync(
        'INSERT OR IGNORE INTO poems (title, author, content) VALUES (?, ?, ?);',
        [poem.title, poem.author, poem.content]
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
    'SELECT id, title, author, content FROM poems WHERE title = ? AND author = ? LIMIT 1;',
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
