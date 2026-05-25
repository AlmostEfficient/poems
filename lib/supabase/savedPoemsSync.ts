import type { Session, User } from '@supabase/supabase-js';

import {
  applyRemoteSavedPoemLocally,
  getLocalSavedPoemsSyncCheckpoint,
  listDirtyLocalSavedPoems,
  markLocalSavedPoemSynced,
  setLocalSavedPoemsSyncCheckpoint,
  type RemoteSavedPoemRow,
  type SavedPoemSyncRow,
} from '../poems';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { Database } from './database.types';

type RemoteSavedPoem = Database['public']['Tables']['saved_poems']['Row'];

export interface SavedPoemsSyncContext {
  session: Session | null;
  user?: User | null;
}

export interface SavedPoemsSyncResult {
  ok: boolean;
  skipped: boolean;
  reason?: 'unconfigured' | 'signed-out' | 'supabase-unavailable';
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

function resolveUserId(context: SavedPoemsSyncContext): string | null {
  return context.user?.id ?? context.session?.user.id ?? null;
}

function toRemoteUpsert(userId: string, row: SavedPoemSyncRow) {
  return {
    user_id: userId,
    poem_id: row.poemId,
    poem_scope: row.poemScope,
    saved_at: row.savedAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function toLocalRemoteRow(row: RemoteSavedPoem): RemoteSavedPoemRow {
  return {
    remoteId: row.id,
    poemId: row.poem_id,
    poemScope: row.poem_scope,
    savedAt: row.saved_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

function messageFromError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function pushDirtySavedPoems(userId: string): Promise<{ pushed: number; applied: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pushed: 0, applied: 0, errors: ['Supabase client unavailable.'] };
  }

  const dirtyRows = listDirtyLocalSavedPoems();
  let pushed = 0;
  let applied = 0;
  const errors: string[] = [];

  for (const row of dirtyRows) {
    const { data: remoteRow, error: remoteReadError } = await supabase
      .from('saved_poems')
      .select('id, user_id, poem_id, poem_scope, saved_at, updated_at, deleted_at')
      .eq('user_id', userId)
      .eq('poem_scope', row.poemScope)
      .eq('poem_id', row.poemId)
      .maybeSingle();

    if (remoteReadError) {
      errors.push(remoteReadError.message);
      continue;
    }

    const remoteWins =
      remoteRow &&
      (remoteRow.updated_at > row.updatedAt ||
        (remoteRow.updated_at === row.updatedAt && !remoteRow.deleted_at && row.deletedAt));

    if (remoteWins) {
      if (applyRemoteSavedPoemLocally(toLocalRemoteRow(remoteRow))) {
        applied += 1;
      }
      continue;
    }

    const { data, error } = await supabase
      .from('saved_poems')
      .upsert(toRemoteUpsert(userId, row), {
        onConflict: 'user_id,poem_scope,poem_id',
      })
      .select('id, user_id, poem_id, poem_scope, saved_at, updated_at, deleted_at')
      .single();

    if (error || !data) {
      errors.push(error?.message ?? `Failed to sync saved poem ${row.poemId}.`);
      continue;
    }

    markLocalSavedPoemSynced({
      poemId: row.poemId,
      poemScope: row.poemScope,
      remoteId: data.id,
      savedAt: data.saved_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      expectedLocalUpdatedAt: row.updatedAt,
    });
    pushed += 1;
  }

  return { pushed, applied, errors };
}

async function pullRemoteSavedPoems(userId: string): Promise<{ pulled: number; applied: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pulled: 0, applied: 0, errors: ['Supabase client unavailable.'] };
  }

  const checkpoint = getLocalSavedPoemsSyncCheckpoint(userId);
  let query = supabase
    .from('saved_poems')
    .select('id, user_id, poem_id, poem_scope, saved_at, updated_at, deleted_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })
    .limit(1000);

  if (checkpoint) {
    query = query.gt('updated_at', checkpoint);
  }

  const { data, error } = await query;
  if (error) {
    return { pulled: 0, applied: 0, errors: [error.message] };
  }

  const rows = data ?? [];
  let applied = 0;
  let nextCheckpoint = checkpoint;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      if (applyRemoteSavedPoemLocally(toLocalRemoteRow(row))) {
        applied += 1;
      }
      if (!nextCheckpoint || row.updated_at > nextCheckpoint) {
        nextCheckpoint = row.updated_at;
      }
    } catch (error) {
      errors.push(messageFromError(error));
    }
  }

  if (nextCheckpoint && nextCheckpoint !== checkpoint && errors.length === 0) {
    setLocalSavedPoemsSyncCheckpoint(userId, nextCheckpoint);
  }

  return { pulled: rows.length, applied, errors };
}

export async function syncSavedPoems(context: SavedPoemsSyncContext): Promise<SavedPoemsSyncResult> {
  if (!isSupabaseConfigured) {
    return emptyResult('unconfigured');
  }

  const userId = resolveUserId(context);
  if (!context.session || !userId) {
    return emptyResult('signed-out');
  }

  if (!getSupabaseClient()) {
    return emptyResult('supabase-unavailable');
  }

  const result = emptyResult();

  try {
    const pushed = await pushDirtySavedPoems(userId);
    result.pushed = pushed.pushed;
    result.applied = pushed.applied;
    result.errors.push(...pushed.errors);

    const pulled = await pullRemoteSavedPoems(userId);
    result.pulled = pulled.pulled;
    result.applied += pulled.applied;
    result.errors.push(...pulled.errors);
  } catch (error) {
    result.errors.push(messageFromError(error));
  }

  result.ok = result.errors.length === 0;
  return result;
}
