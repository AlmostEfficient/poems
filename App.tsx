import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useFonts, NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import Toast from 'react-native-toast-message';

import { LibraryView } from './components/LibraryView';
import { AccountScreen } from './components/AccountScreen';
import { LoadingPoemReaderView, PoemReaderView } from './components/PoemReaderView';
import { toastConfig } from './components/Toast';
import { useAuthSession } from './hooks/useAuthSession';
import { usePoemFeed } from './hooks/usePoemFeed';
import { useSavedPoemsSync } from './hooks/useSavedPoemsSync';
import { useUserPoemsSync } from './hooks/useUserPoemsSync';
import type { SavedPoemScope } from './lib/poems';
import { clearLocalAccountData, prepareLocalDataForNexusUser } from './lib/poems';
import { styles } from './styles/styles';

export default function App() {
  const auth = useAuthSession();
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [libraryRefreshKey, setLibraryRefreshKey] = useState(0);
  const [preparedUserId, setPreparedUserId] = useState<string | null>(null);

  const [fontsLoaded] = useFonts({
    NotoNastaliqUrdu_400Regular,
  });

  const verticalPagerRef = useRef<PagerView>(null);
  const tapTimestampsRef = useRef<number[]>([]);
  const {
    slots,
    poemSource,
    language,
    handlePageSelected,
    toggleLanguage,
    isDatabaseReady,
    isPoemSaved,
    toggleSavedPoem,
    refreshSavedPoemIds,
  } = usePoemFeed();

  const refreshSavedState = useCallback(() => {
    refreshSavedPoemIds();
    setLibraryRefreshKey((key) => key + 1);
  }, [refreshSavedPoemIds]);

  const syncSession = auth.user?.id === preparedUserId ? auth.session : null;

  const { syncNow: syncSavedPoemsNow } = useSavedPoemsSync({
    session: syncSession,
    user: auth.user,
    isConfigured: auth.isConfigured,
    isDatabaseReady,
    onSynced: refreshSavedState,
  });

  const refreshUserPoemsState = useCallback(() => {
    setLibraryRefreshKey((key) => key + 1);
  }, []);

  const { syncNow: syncUserPoemsNow } = useUserPoemsSync({
    session: syncSession,
    user: auth.user,
    isConfigured: auth.isConfigured,
    isDatabaseReady,
    onSynced: refreshUserPoemsState,
  });

  const handleSecretTap = useCallback(() => {
    const now = Date.now();
    const WINDOW_MS = 3000;
    const TAP_TARGET = 5;

    tapTimestampsRef.current = tapTimestampsRef.current.filter((timestamp) => now - timestamp <= WINDOW_MS);
    tapTimestampsRef.current.push(now);

    if (tapTimestampsRef.current.length < TAP_TARGET) {
      return;
    }

    tapTimestampsRef.current = [];
    const nextLanguage = language === 'en' ? 'ur' : 'en';
    toggleLanguage();
    Toast.show({
      type: 'info',
      text1: nextLanguage === 'ur' ? 'Switched to Urdu' : 'Switched to English',
      text2:
        nextLanguage === 'ur'
          ? 'Tap the title 5 times again to go back to English.'
          : 'Tap the title 5 times again to return to Urdu.',
      position: 'bottom',
      visibilityTime: 3000,
    });
  }, [language, toggleLanguage]);

  const handleToggleSavedPoem = useCallback(
    async (poemId: string, poemScope: SavedPoemScope = 'catalogue') => {
      try {
        const saved = await toggleSavedPoem(poemId, poemScope);
        Toast.show({
          type: 'success',
          text1: saved ? 'Saved' : 'Removed from saved',
          position: 'bottom',
          visibilityTime: 1600,
        });
        setLibraryRefreshKey((key) => key + 1);
        void syncSavedPoemsNow();
      } catch (error) {
        console.warn('Failed to update saved poem state', error);
        Toast.show({
          type: 'error',
          text1: 'Could not update saved poem',
          position: 'bottom',
          visibilityTime: 2200,
        });
      }
    },
    [syncSavedPoemsNow, toggleSavedPoem]
  );

  const openLibrary = useCallback(() => {
    setLibraryRefreshKey((key) => key + 1);
    setIsLibraryOpen(true);
  }, []);

  const handleUserPoemCreated = useCallback(() => {
    setLibraryRefreshKey((key) => key + 1);
    void syncUserPoemsNow();
  }, [syncUserPoemsNow]);

  useEffect(() => {
    if (verticalPagerRef.current && typeof verticalPagerRef.current.setPageWithoutAnimation === 'function') {
      verticalPagerRef.current.setPageWithoutAnimation(0);
    }
  }, [poemSource]);

  useEffect(() => {
    if (!isDatabaseReady || !auth.user) return;

    try {
      prepareLocalDataForNexusUser(auth.user.id);
      setPreparedUserId(auth.user.id);
      refreshSavedState();
      refreshUserPoemsState();
    } catch (error) {
      console.warn('Failed to prepare local account data', error);
    }
  }, [auth.user?.id, isDatabaseReady, refreshSavedState, refreshUserPoemsState]);

  const handleAccountDeleted = useCallback(() => {
    clearLocalAccountData();
    setPreparedUserId(null);
    setLibraryRefreshKey((key) => key + 1);
    refreshSavedPoemIds();
    void auth.refresh();
  }, [auth, refreshSavedPoemIds]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={verticalPagerRef}
        style={styles.verticalPager}
        orientation="vertical"
        initialPage={0}
        onPageSelected={(event) => handlePageSelected(event.nativeEvent.position)}
        scrollEnabled
      >
        {slots.map((slot, index) => (
          <View key={`slot-${index}`} style={styles.verticalPage} collapsable={false}>
            {slot.poem ? (
              <PoemReaderView
                poem={slot.poem}
                onSecretTap={handleSecretTap}
                isSaved={isPoemSaved(slot.poem.id, slot.poem.source === 'user' ? 'user' : 'catalogue')}
                onToggleSaved={handleToggleSavedPoem}
                canSave={isDatabaseReady && ['local', 'bundled', 'user'].includes(slot.poem.source ?? 'local')}
                onOpenLibrary={openLibrary}
                showLibraryButton
              />
            ) : (
              <LoadingPoemReaderView language={language} onSecretTap={handleSecretTap} />
            )}
          </View>
        ))}
      </PagerView>
      {isLibraryOpen && (
        <LibraryView
          isDatabaseReady={isDatabaseReady}
          isPoemSaved={isPoemSaved}
          onClose={() => setIsLibraryOpen(false)}
          onToggleSaved={handleToggleSavedPoem}
          onUserPoemCreated={handleUserPoemCreated}
          onOpenAccount={() => setIsAccountOpen(true)}
          refreshKey={libraryRefreshKey}
        />
      )}
      {isAccountOpen && (
        <AccountScreen
          auth={auth}
          onClose={() => setIsAccountOpen(false)}
          onAccountDeleted={handleAccountDeleted}
        />
      )}
      <StatusBar hidden />
      <Toast config={toastConfig} />
    </View>
  );
}
