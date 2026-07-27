import type { PoemsAuthSession } from '../../hooks/useAuthSession';
import {
  applyRemoteUserPoemLocally,
  getLocalUserPoemsSyncCheckpoint,
  listDirtyLocalUserPoems,
  setLocalUserPoemsSyncCheckpoint,
  type RemoteUserPoemRow,
  type UserPoemSyncRow,
} from '../poems';
import { poemsApiRequest } from './api';

interface UserPoemsPage {
  items: RemoteUserPoemRow[];
  nextCursor: string | null;
}

export interface UserPoemsSyncResult {
  ok: boolean;
  skipped: boolean;
  reason?: 'signed-out';
  pushed: number;
  pulled: number;
  applied: number;
  skippedMarkSynced: number;
  errors: string[];
}

function emptyResult(reason?: UserPoemsSyncResult['reason']): UserPoemsSyncResult {
  return {
    ok: !reason,
    skipped: Boolean(reason),
    reason,
    pushed: 0,
    pulled: 0,
    applied: 0,
    skippedMarkSynced: 0,
    errors: [],
  };
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function pushRow(row: UserPoemSyncRow): Promise<RemoteUserPoemRow> {
  return poemsApiRequest<RemoteUserPoemRow>(
    `/user-poems/${encodeURIComponent(row.poemId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        title: row.title,
        author: row.author,
        content: row.content,
        language: row.language,
        metadata: row.metadata ?? {},
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    }
  );
}

export async function syncUserPoems(context: {
  session: PoemsAuthSession | null;
}): Promise<UserPoemsSyncResult> {
  if (!context.session) return emptyResult('signed-out');

  const result = emptyResult();
  const userId = context.session.user.id;

  for (const row of listDirtyLocalUserPoems()) {
    try {
      const canonical = await pushRow(row);
      if (applyRemoteUserPoemLocally(canonical)) {
        result.applied += 1;
      } else {
        result.skippedMarkSynced += 1;
      }
      result.pushed += 1;
    } catch (error) {
      result.errors.push(messageFromError(error));
    }
  }

  let cursor = getLocalUserPoemsSyncCheckpoint(userId);
  for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
    try {
      const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
      const page = await poemsApiRequest<UserPoemsPage>(`/user-poems${query}`);
      result.pulled += page.items.length;
      for (const row of page.items) {
        if (applyRemoteUserPoemLocally(row)) result.applied += 1;
      }

      if (page.nextCursor && page.items.length > 0) {
        cursor = page.nextCursor;
        setLocalUserPoemsSyncCheckpoint(userId, cursor);
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
