import type { Session, User } from '@supabase/supabase-js';

import {
  applyRemoteUserPoemLocally,
  getLocalUserPoemsSyncCheckpoint,
  listDirtyLocalUserPoems,
  markLocalUserPoemSynced,
  setLocalUserPoemsSyncCheckpoint,
  type RemoteUserPoemRow,
  type UserPoemSyncRow,
} from '../poems';
import type { PoemMetadata } from '../types';
import { getSupabaseClient, isSupabaseConfigured } from './client';
import type { Database, Json } from './database.types';

type RemoteUserPoem = Database['public']['Tables']['user_poems']['Row'];

export interface UserPoemsSyncContext {
  session: Session | null;
  user?: User | null;
}

export interface UserPoemsSyncResult {
  ok: boolean;
  skipped: boolean;
  reason?: 'unconfigured' | 'signed-out' | 'supabase-unavailable';
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

function resolveUserId(context: UserPoemsSyncContext): string | null {
  return context.user?.id ?? context.session?.user.id ?? null;
}

function toJsonMetadata(metadata: PoemMetadata | null): Json {
  return metadata ? (JSON.parse(JSON.stringify(metadata)) as Json) : {};
}

function fromJsonMetadata(metadata: Json | null): PoemMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }
  return metadata as PoemMetadata;
}

function toRemoteUpsert(userId: string, row: UserPoemSyncRow) {
  return {
    user_id: userId,
    poem_id: row.poemId,
    title: row.title,
    author: row.author,
    content: row.content,
    language: row.language,
    metadata: toJsonMetadata(row.metadata),
    origin: 'manual' as const,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    deleted_at: row.deletedAt,
  };
}

function toLocalRemoteRow(row: RemoteUserPoem): RemoteUserPoemRow {
  return {
    remoteId: row.id,
    poemId: row.poem_id,
    title: row.title,
    author: row.author,
    content: row.content,
    language: row.language,
    metadata: fromJsonMetadata(row.metadata),
    createdAt: row.created_at,
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

async function pushDirtyUserPoems(
  userId: string
): Promise<{ pushed: number; applied: number; skippedMarkSynced: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pushed: 0, applied: 0, skippedMarkSynced: 0, errors: ['Supabase client unavailable.'] };
  }

  const dirtyRows = listDirtyLocalUserPoems();
  let pushed = 0;
  let applied = 0;
  let skippedMarkSynced = 0;
  const errors: string[] = [];

  for (const row of dirtyRows) {
    const { data: remoteRow, error: remoteReadError } = await supabase
      .from('user_poems')
      .select('id, user_id, poem_id, title, author, content, language, metadata, origin, created_at, updated_at, deleted_at')
      .eq('user_id', userId)
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
      if (applyRemoteUserPoemLocally(toLocalRemoteRow(remoteRow))) {
        applied += 1;
      }
      continue;
    }

    const { data, error } = await supabase
      .from('user_poems')
      .upsert(toRemoteUpsert(userId, row), {
        onConflict: 'user_id,poem_id',
      })
      .select('id, user_id, poem_id, title, author, content, language, metadata, origin, created_at, updated_at, deleted_at')
      .single();

    if (error || !data) {
      errors.push(error?.message ?? `Failed to sync user poem ${row.poemId}.`);
      continue;
    }

    const marked = markLocalUserPoemSynced({
      poemId: row.poemId,
      remoteId: data.id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      expectedLocalUpdatedAt: row.updatedAt,
    });

    if (marked) {
      pushed += 1;
    } else {
      skippedMarkSynced += 1;
    }
  }

  return { pushed, applied, skippedMarkSynced, errors };
}

async function pullRemoteUserPoems(userId: string): Promise<{ pulled: number; applied: number; errors: string[] }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { pulled: 0, applied: 0, errors: ['Supabase client unavailable.'] };
  }

  const checkpoint = getLocalUserPoemsSyncCheckpoint(userId);
  let query = supabase
    .from('user_poems')
    .select('id, user_id, poem_id, title, author, content, language, metadata, origin, created_at, updated_at, deleted_at')
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
      if (applyRemoteUserPoemLocally(toLocalRemoteRow(row))) {
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
    setLocalUserPoemsSyncCheckpoint(userId, nextCheckpoint);
  }

  return { pulled: rows.length, applied, errors };
}

export async function syncUserPoems(context: UserPoemsSyncContext): Promise<UserPoemsSyncResult> {
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
    const pushed = await pushDirtyUserPoems(userId);
    result.pushed = pushed.pushed;
    result.applied = pushed.applied;
    result.skippedMarkSynced = pushed.skippedMarkSynced;
    result.errors.push(...pushed.errors);

    const pulled = await pullRemoteUserPoems(userId);
    result.pulled = pulled.pulled;
    result.applied += pulled.applied;
    result.errors.push(...pulled.errors);
  } catch (error) {
    result.errors.push(messageFromError(error));
  }

  result.ok = result.errors.length === 0;
  return result;
}
