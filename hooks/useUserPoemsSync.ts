import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { syncUserPoems, type UserPoemsSyncResult } from '../lib/supabase/userPoemsSync';

interface UseUserPoemsSyncOptions {
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  isDatabaseReady: boolean;
  onSynced?: () => void;
}

interface UseUserPoemsSyncResult {
  syncNow: () => Promise<UserPoemsSyncResult | null>;
}

export function useUserPoemsSync({
  session,
  user,
  isConfigured,
  isDatabaseReady,
  onSynced,
}: UseUserPoemsSyncOptions): UseUserPoemsSyncResult {
  const inFlightRef = useRef<Promise<UserPoemsSyncResult | null> | null>(null);
  const contextRef = useRef({ session, user, isConfigured, isDatabaseReady, onSynced });

  useEffect(() => {
    contextRef.current = { session, user, isConfigured, isDatabaseReady, onSynced };
  }, [isConfigured, isDatabaseReady, onSynced, session, user]);

  const syncNow = useCallback(async () => {
    const context = contextRef.current;
    if (!context.isDatabaseReady || !context.isConfigured || !context.session) {
      return null;
    }

    if (inFlightRef.current) {
      return inFlightRef.current;
    }

    inFlightRef.current = syncUserPoems({
      session: context.session,
      user: context.user,
    })
      .then((result) => {
        if (result.applied > 0 || result.pushed > 0) {
          contextRef.current.onSynced?.();
        }
        return result;
      })
      .catch((error) => {
        console.warn('User poems sync failed', error);
        return null;
      })
      .finally(() => {
        inFlightRef.current = null;
      });

    return inFlightRef.current;
  }, []);

  useEffect(() => {
    void syncNow();
  }, [syncNow, isDatabaseReady, session?.access_token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncNow();
      }
    });

    return () => subscription.remove();
  }, [syncNow]);

  return { syncNow };
}
