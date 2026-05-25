import { useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import {
  getCurrentAuthSession,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  subscribeToAuthSession,
} from '../lib/supabase/auth';
import { isSupabaseConfigured, registerSupabaseAppStateListener } from '../lib/supabase/client';

interface UseAuthSessionResult {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  isConfigured: boolean;
  isGuest: boolean;
  error: Error | null;
  signInWithEmail: typeof signInWithEmail;
  signUpWithEmail: typeof signUpWithEmail;
  signOut: typeof signOut;
}

export function useAuthSession(): UseAuthSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isReady, setIsReady] = useState(!isSupabaseConfigured);

  useEffect(() => {
    let cancelled = false;

    const cleanupAppState = registerSupabaseAppStateListener();
    const cleanupAuth = subscribeToAuthSession((nextSession) => {
      setSession(nextSession);
      setError(null);
      setIsReady(true);
    });

    getCurrentAuthSession()
      .then((snapshot) => {
        if (cancelled) {
          return;
        }
        setSession(snapshot.session);
        setError(snapshot.error);
        setIsReady(snapshot.isReady);
      })
      .catch((nextError: unknown) => {
        if (cancelled) {
          return;
        }
        setError(nextError instanceof Error ? nextError : new Error('Failed to load auth session.'));
        setIsReady(true);
      });

    return () => {
      cancelled = true;
      cleanupAuth();
      cleanupAppState();
    };
  }, []);

  const user = session?.user ?? null;

  return useMemo(
    () => ({
      session,
      user,
      isReady,
      isConfigured: isSupabaseConfigured,
      isGuest: isReady && !session,
      error,
      signInWithEmail,
      signUpWithEmail,
      signOut,
    }),
    [error, isReady, session, user]
  );
}
