import { NotoNastaliqUrdu_400Regular, useFonts } from '@expo-google-fonts/noto-nastaliq-urdu';
import * as Haptics from 'expo-haptics';
import React, { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';
import Toast from 'react-native-toast-message';

import { toastConfig } from '../components/Toast';
import { useAuthSession, type UseAuthSessionResult } from '../hooks/useAuthSession';
import { usePoemFeed, type UsePoemFeedResult } from '../hooks/usePoemFeed';
import { useSavedPoemsSync } from '../hooks/useSavedPoemsSync';
import { useUserPoemsSync } from '../hooks/useUserPoemsSync';
import {
  clearLocalAccountData,
  prepareLocalDataForNexusUser,
  type SavedPoemScope,
} from '../lib/poems';
import type { ScannedPoem } from '../lib/scanner/poemScanner';
import type { Poem } from '../lib/types';

interface PoemsAppContextValue {
  auth: UseAuthSessionResult;
  feed: UsePoemFeedResult;
  libraryRefreshKey: number;
  pendingDraft: ScannedPoem | null;
  setPendingDraft: (draft: ScannedPoem | null) => void;
  refreshLibrary: () => void;
  toggleSavedPoem: (poemId: string, poemScope?: SavedPoemScope) => Promise<boolean>;
  notifyUserPoemChanged: (poem?: Poem) => void;
  handleAccountDeleted: () => void;
}

const PoemsAppContext = createContext<PoemsAppContextValue | null>(null);

export function PoemsAppProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthSession();
  const feed = usePoemFeed();
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [pendingDraft, setPendingDraft] = useState<ScannedPoem | null>(null);
  const [preparedUserId, setPreparedUserId] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({ NotoNastaliqUrdu_400Regular });

  const refreshLibrary = useCallback(() => {
    feed.refreshSavedPoemIds();
    setLibraryRefreshKey((key) => key + 1);
  }, [feed.refreshSavedPoemIds]);

  const syncSession = auth.user?.id === preparedUserId ? auth.session : null;

  const { syncNow: syncSavedPoemsNow } = useSavedPoemsSync({
    session: syncSession,
    user: auth.user,
    isConfigured: auth.isConfigured,
    isDatabaseReady: feed.isDatabaseReady,
    onSynced: refreshLibrary,
  });

  const { syncNow: syncUserPoemsNow } = useUserPoemsSync({
    session: syncSession,
    user: auth.user,
    isConfigured: auth.isConfigured,
    isDatabaseReady: feed.isDatabaseReady,
    onSynced: refreshLibrary,
  });

  useEffect(() => {
    if (!feed.isDatabaseReady || !auth.user) return;

    try {
      prepareLocalDataForNexusUser(auth.user.id);
      setPreparedUserId(auth.user.id);
      refreshLibrary();
    } catch (error) {
      console.warn('Failed to prepare local account data', error);
    }
  }, [auth.user?.id, feed.isDatabaseReady, refreshLibrary]);

  const toggleSavedPoem = useCallback(
    async (poemId: string, poemScope: SavedPoemScope = 'catalogue') => {
      try {
        const saved = await feed.toggleSavedPoem(poemId, poemScope);
        if (process.env.EXPO_OS === 'ios') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        Toast.show({
          type: 'success',
          text1: saved ? 'Saved to your library' : 'Removed from saved',
          position: 'bottom',
          visibilityTime: 1500,
        });
        setLibraryRefreshKey((key) => key + 1);
        void syncSavedPoemsNow();
        return saved;
      } catch (error) {
        console.warn('Failed to update saved poem state', error);
        Toast.show({
          type: 'error',
          text1: 'Could not update your library',
          text2: 'Your poem is still safe. Try again in a moment.',
          position: 'bottom',
          visibilityTime: 2400,
        });
        return false;
      }
    },
    [feed.toggleSavedPoem, syncSavedPoemsNow]
  );

  const notifyUserPoemChanged = useCallback(
    (_poem?: Poem) => {
      setLibraryRefreshKey((key) => key + 1);
      void syncUserPoemsNow();
    },
    [syncUserPoemsNow]
  );

  const handleAccountDeleted = useCallback(() => {
    clearLocalAccountData();
    setPreparedUserId(null);
    setLibraryRefreshKey((key) => key + 1);
    feed.refreshSavedPoemIds();
    void auth.refresh();
  }, [auth, feed.refreshSavedPoemIds]);

  const value = useMemo<PoemsAppContextValue>(
    () => ({
      auth,
      feed,
      libraryRefreshKey,
      pendingDraft,
      setPendingDraft,
      refreshLibrary,
      toggleSavedPoem,
      notifyUserPoemChanged,
      handleAccountDeleted,
    }),
    [
      auth,
      feed,
      handleAccountDeleted,
      libraryRefreshKey,
      notifyUserPoemChanged,
      pendingDraft,
      refreshLibrary,
      toggleSavedPoem,
    ]
  );

  if (!fontsLoaded) return null;

  return (
    <PoemsAppContext value={value}>
      {children}
      <Toast config={toastConfig} />
    </PoemsAppContext>
  );
}

export function usePoemsApp(): PoemsAppContextValue {
  const context = use(PoemsAppContext);
  if (!context) {
    throw new Error('usePoemsApp must be used inside PoemsAppProvider.');
  }
  return context;
}

