import { useCallback, useEffect, useRef } from 'react';
import * as Network from 'expo-network';
import { AppState } from 'react-native';

import type { PoemsAuthSession, PoemsAuthUser } from './useAuthSession';
import { syncSavedPoems, type SavedPoemsSyncResult } from '../lib/nexus/savedPoemsSync';

interface UseSavedPoemsSyncOptions {
  session: PoemsAuthSession | null;
  user: PoemsAuthUser | null;
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
  }, [syncNow, isDatabaseReady, session?.session.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncNow();
      }
    });

    return () => subscription.remove();
  }, [syncNow]);

  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) {
        void syncNow();
      }
    });

    return () => subscription.remove();
  }, [syncNow]);

  return { syncNow };
}
