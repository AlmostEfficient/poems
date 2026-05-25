import { initializeDatabase, getDatabase } from './storage/database';
import {
  getAllPoems,
  getPoemsPage,
  getRandomPoems as repoGetRandomPoems,
  getTotalPoemsCount,
  getPoemsByAuthor,
  searchPoems,
  insertPoem,
  createLocalUserPoem,
  getLocalUserPoems,
  listDirtyUserPoems,
  markUserPoemSynced,
  applyRemoteUserPoem,
  updateLocalUserPoem,
  deleteLocalUserPoem,
  getUserPoemsSyncCheckpoint,
  setUserPoemsSyncCheckpoint,
  insertPoemsInBatch,
  getPoemByTitleAndAuthor as repoGetPoemByTitleAndAuthor,
  getDistinctAuthors,
  savePoem,
  unsavePoem,
  isPoemSaved,
  getSavedPoemIds,
  getSavedPoems,
  listDirtySavedPoems,
  markSavedPoemSynced,
  applyRemoteSavedPoem,
  getSavedPoemsSyncCheckpoint,
  setSavedPoemsSyncCheckpoint,
  type CreatePoemInput,
  type CreateLocalUserPoemInput,
  type RemoteSavedPoemRow,
  type RemoteUserPoemRow,
  type SavedPoemScope,
  type SavedPoemSyncRow,
  type SavedPoemSyncStatus,
  type UserPoemSyncRow,
  type UserPoemSyncStatus,
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

export function getRandomPoems(options?: { limit?: number; language?: 'en' | 'ur' } | number): Poem[] {
  // Support backward compatibility with bare number parameter
  if (typeof options === 'number') {
    return repoGetRandomPoems({ limit: options });
  }
  return repoGetRandomPoems(options);
}

export { getTotalPoemsCount, getPoemsByAuthor };

export function searchLocalPoems(
  query: string,
  field: 'title' | 'author' | 'content' = 'title',
  limit = 10,
  options?: { language?: 'en' | 'ur' }
): Poem[] {
  return searchPoems(query, field, limit, options);
}

export { getDistinctAuthors as getLocalAuthors };

export {
  createLocalUserPoem,
  getLocalUserPoems,
  listDirtyUserPoems as listDirtyLocalUserPoems,
  markUserPoemSynced as markLocalUserPoemSynced,
  applyRemoteUserPoem as applyRemoteUserPoemLocally,
  updateLocalUserPoem,
  deleteLocalUserPoem,
  getUserPoemsSyncCheckpoint as getLocalUserPoemsSyncCheckpoint,
  setUserPoemsSyncCheckpoint as setLocalUserPoemsSyncCheckpoint,
  savePoem as saveLocalPoem,
  unsavePoem as unsaveLocalPoem,
  isPoemSaved as isLocalPoemSaved,
  getSavedPoemIds as getLocalSavedPoemIds,
  getSavedPoems as getLocalSavedPoems,
  listDirtySavedPoems as listDirtyLocalSavedPoems,
  markSavedPoemSynced as markLocalSavedPoemSynced,
  applyRemoteSavedPoem as applyRemoteSavedPoemLocally,
  getSavedPoemsSyncCheckpoint as getLocalSavedPoemsSyncCheckpoint,
  setSavedPoemsSyncCheckpoint as setLocalSavedPoemsSyncCheckpoint,
};

export function addPoem(
  title: string,
  author: string,
  content: string,
  language: 'en' | 'ur' = 'en'
): void {
  insertPoem({ title, author, content, language, source: 'user' });
}

export function addPoemsInBatch(poems: CreatePoemInput[]): void {
  // Ensure language is propagated through
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
    const payload: CreatePoemInput[] = STARTER_POEMS.map(({ title, author, content, language, id }) => ({
      title,
      author,
      content,
      language,
      id,
      source: 'bundled',
    }));
    insertPoemsInBatch(payload);
  }

  db.runSync(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?);',
    ['last_seeded_at', new Date().toISOString()]
  );
}

export type { Poem };
export type {
  CreateLocalUserPoemInput,
  RemoteSavedPoemRow,
  RemoteUserPoemRow,
  SavedPoemScope,
  SavedPoemSyncRow,
  SavedPoemSyncStatus,
  UserPoemSyncRow,
  UserPoemSyncStatus,
};
