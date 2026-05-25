import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';

import { syncSavedPoems, type SavedPoemsSyncResult } from '../lib/supabase/savedPoemsSync';

interface UseSavedPoemsSyncOptions {
  session: Session | null;
  user: User | null;
  isConfigured: boolean;
  isDatabaseReady: boolean;
  onSynced?: () => void;
}

interface UseSavedPoemsSyncResult {
  syncNow: () => Promise<SavedPoemsSyncResult | null>;
}

export function useSavedPoemsSync({
  session,
  user,
  isConfigured,
  isDatabaseReady,
  onSynced,
}: UseSavedPoemsSyncOptions): UseSavedPoemsSyncResult {
  const inFlightRef = useRef<Promise<SavedPoemsSyncResult | null> | null>(null);
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

    inFlightRef.current = syncSavedPoems({
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
        console.warn('Saved poems sync failed', error);
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
