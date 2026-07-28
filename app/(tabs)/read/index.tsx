import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import React, { useCallback, useRef } from 'react';
import { Share, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { LoadingPoemReaderView, PoemReaderView } from '../../../components/PoemReaderView';
import { usePoemsApp } from '../../../providers/poems-app-provider';

export default function ReadScreen() {
  const { feed, toggleSavedPoem } = usePoemsApp();
  const pagerRef = useRef<PagerView>(null);
  const poem = feed.slots[feed.currentIndex]?.poem ?? null;
  const poemScope = poem?.source === 'user' ? 'user' : 'catalogue';
  const saved = poem ? feed.isPoemSaved(poem.id, poemScope) : false;
  const toolbarPlacement =
    Constants.executionEnvironment === 'storeClient' ? 'left' : 'right';

  const changeLanguage = useCallback(
    (language: 'en' | 'ur') => {
      if (language === feed.language) return;
      if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
      feed.setLanguage(language);
      pagerRef.current?.setPageWithoutAnimation(0);
    },
    [feed]
  );

  const sharePoem = useCallback(() => {
    if (!poem) return;
    void Share.share({
      title: poem.title,
      message: `${poem.title}\n${poem.author}\n\n${poem.content}`,
    });
  }, [poem]);

  return (
    <>
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        orientation="vertical"
        initialPage={0}
        onPageSelected={(event) => feed.handlePageSelected(event.nativeEvent.position)}
        scrollEnabled
        accessibilityLabel="Poem reader"
      >
        {feed.slots.map((slot, index) => (
          <View key={`feed-slot-${index}`} style={{ flex: 1 }} collapsable={false}>
            {slot.poem ? (
              <PoemReaderView poem={slot.poem} showSwipeHint respectTabBar />
            ) : (
              <LoadingPoemReaderView
                language={feed.language}
                onSecretTap={() => undefined}
                respectTabBar
              />
            )}
          </View>
        ))}
      </PagerView>

      <Stack.Toolbar placement={toolbarPlacement}>
        <Stack.Toolbar.Button
          hidden={!poem || !feed.isDatabaseReady}
          selected={saved}
          onPress={() => {
            if (poem) void toggleSavedPoem(poem.id, poemScope);
          }}
        >
          {process.env.EXPO_OS === 'ios' ? (
            <Stack.Toolbar.Icon sf={saved ? 'heart.fill' : 'heart'} />
          ) : null}
          <Stack.Toolbar.Label>{saved ? 'Saved' : 'Save'}</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu>
          {process.env.EXPO_OS === 'ios' ? <Stack.Toolbar.Icon sf="ellipsis" /> : null}
          <Stack.Toolbar.Label>More</Stack.Toolbar.Label>
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            disabled={!poem}
            onPress={sharePoem}
          >
            Share poem
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu title="Reading language" icon="character.book.closed">
            <Stack.Toolbar.MenuAction
              isOn={feed.language === 'en'}
              onPress={() => changeLanguage('en')}
            >
              English
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction
              isOn={feed.language === 'ur'}
              onPress={() => changeLanguage('ur')}
            >
              Urdu
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
