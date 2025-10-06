import { initializeDatabase, getDatabase } from './storage/database';
import {
  getAllPoems,
  getPoemsPage,
  getRandomPoems as repoGetRandomPoems,
  getTotalPoemsCount,
  getPoemsByAuthor,
  searchPoems,
  insertPoem,
  insertPoemsInBatch,
  getPoemByTitleAndAuthor as repoGetPoemByTitleAndAuthor,
  getDistinctAuthors,
  type CreatePoemInput,
} from './storage/poemRepository';
import { STARTER_POEMS } from './data/starterPoems';
import type { Poem } from './types';

export async function initDB() {
  return initializeDatabase();
}

export function getPoems(): Poem[] {
  return getAllPoems();
}

export { getPoemsPage };

export function getRandomPoems(limit = 20): Poem[] {
  return repoGetRandomPoems(limit);
}

export { getTotalPoemsCount, getPoemsByAuthor };

export function searchLocalPoems(
  query: string,
  field: 'title' | 'author' | 'content' = 'title',
  limit = 10
): Poem[] {
  return searchPoems(query, field, limit);
}

export { getDistinctAuthors as getLocalAuthors };

export function addPoem(title: string, author: string, content: string): void {
  insertPoem({ title, author, content });
}

export function addPoemsInBatch(poems: CreatePoemInput[]): void {
  insertPoemsInBatch(poems);
}

export function getPoemByTitleAndAuthor(title: string, author: string): Poem | null {
  return repoGetPoemByTitleAndAuthor(title, author);
}

export async function seedPoems(): Promise<void> {
  const db = getDatabase();
  const poems = getAllPoems();
  console.log(`Database loaded with ${poems.length} poems`);
  console.log(
    'Sample poems:',
    poems.slice(0, 3).map((p) => ({ title: p.title, author: p.author }))
  );

  if (poems.length === 0) {
    console.warn('Database empty! Adding bundled starter poems.');
    const payload: CreatePoemInput[] = STARTER_POEMS.map(({ title, author, content }) => ({
      title,
      author,
      content,
    }));
    insertPoemsInBatch(payload);
  }

  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
    ['last_seeded_at', new Date().toISOString()]
  );
}

export type { Poem };
