import type { PoemsAuthSession } from '../../hooks/useAuthSession';
import {
  applyRemoteSavedPoemLocally,
  getLocalSavedPoemsSyncCheckpoint,
  listDirtyLocalSavedPoems,
  setLocalSavedPoemsSyncCheckpoint,
  type RemoteSavedPoemRow,
  type SavedPoemSyncRow,
} from '../poems';
import { poemsApiRequest } from './api';

interface SavedPoemsPage {
  items: RemoteSavedPoemRow[];
  nextCursor: string | null;
}

export interface SavedPoemsSyncResult {
  ok: boolean;
  skipped: boolean;
  reason?: 'signed-out';
  pushed: number;
  pulled: number;
  applied: number;
  errors: string[];
}

function emptyResult(reason?: SavedPoemsSyncResult['reason']): SavedPoemsSyncResult {
  return {
    ok: !reason,
    skipped: Boolean(reason),
    reason,
    pushed: 0,
    pulled: 0,
    applied: 0,
    errors: [],
  };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function pushRow(row: SavedPoemSyncRow): Promise<RemoteSavedPoemRow> {
  return poemsApiRequest<RemoteSavedPoemRow>(
    `/saved-poems/${encodeURIComponent(row.poemScope)}/${encodeURIComponent(row.poemId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        savedAt: row.savedAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    }
  );
}

export async function syncSavedPoems(context: {
  session: PoemsAuthSession | null;
}): Promise<SavedPoemsSyncResult> {
  if (!context.session) return emptyResult('signed-out');

  const result = emptyResult();
  const userId = context.session.user.id;

  for (const row of listDirtyLocalSavedPoems()) {
    try {
      const canonical = await pushRow(row);
      if (applyRemoteSavedPoemLocally(canonical)) {
        result.applied += 1;
      }
      result.pushed += 1;
    } catch (error) {
      result.errors.push(messageFromError(error));
    }
  }

  let cursor = getLocalSavedPoemsSyncCheckpoint(userId);
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const page = await poemsApiRequest<SavedPoemsPage>(`/saved-poems${query}`);
      result.pulled += page.items.length;
      for (const row of page.items) {
        if (applyRemoteSavedPoemLocally(row)) result.applied += 1;
      }

      if (page.nextCursor && page.items.length > 0) {
        cursor = page.nextCursor;
        setLocalSavedPoemsSyncCheckpoint(userId, cursor);
      }
      if (page.items.length < 100 || !page.nextCursor) break;
    } catch (error) {
      result.errors.push(messageFromError(error));
      break;
    }
  }

  result.ok = result.errors.length === 0;
  return result;
}
