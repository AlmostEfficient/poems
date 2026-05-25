import type { Session, User } from '@supabase/supabase-js';

import { getSupabaseClient, isSupabaseConfigured, requireSupabaseClient } from './client';

export interface AuthSessionSnapshot {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  isConfigured: boolean;
  error: Error | null;
}

export async function getCurrentAuthSession(): Promise<AuthSessionSnapshot> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      session: null,
      user: null,
      isReady: true,
      isConfigured: false,
      error: null,
    };
  }

  const { data, error } = await supabase.auth.getSession();
  return {
    session: data.session,
    user: data.session?.user ?? null,
    isReady: true,
    isConfigured: isSupabaseConfigured,
    error,
  };
}

export function subscribeToAuthSession(
  onChange: (session: Session | null) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => undefined;
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string) {
  return requireSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  return requireSupabaseClient().auth.signUp({ email, password });
}

export async function signOut() {
  return requireSupabaseClient().auth.signOut();
}
