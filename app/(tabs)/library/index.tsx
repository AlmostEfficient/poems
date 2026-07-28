import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { router, Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../../components/empty-state';
import { PoemListRow } from '../../../components/poem-list-row';
import { SegmentedPicker } from '../../../components/segmented-picker';
import { getLocalSavedPoems, getLocalUserPoems } from '../../../lib/poems';
import type { Poem } from '../../../lib/types';
import { usePoemsApp } from '../../../providers/poems-app-provider';
import { useAppColors } from '../../../styles/theme';

type LibrarySection = 'saved' | 'mine';

export default function LibraryScreen() {
  const colors = useAppColors();
  const { feed, libraryRefreshKey, setPendingDraft } = usePoemsApp();
  const [section, setSection] = useState<LibrarySection>('saved');
  const [savedPoems, setSavedPoems] = useState<Poem[]>([]);
  const [userPoems, setUserPoems] = useState<Poem[]>([]);

  const loadLibrary = useCallback(() => {
    if (!feed.isDatabaseReady) {
      setSavedPoems([]);
      setUserPoems([]);
      return;
    }
    setSavedPoems([
      ...getLocalSavedPoems({ limit: 200, poemScope: 'catalogue' }),
      ...getLocalSavedPoems({ limit: 200, poemScope: 'user' }),
    ]);
    setUserPoems(getLocalUserPoems({ limit: 200 }));
  }, [feed.isDatabaseReady]);

  useFocusEffect(
    useCallback(() => {
      loadLibrary();
    }, [libraryRefreshKey, loadLibrary])
  );

  const data = section === 'saved' ? savedPoems : userPoems;
  const toolbarPlacement =
    Constants.executionEnvironment === 'storeClient' ? 'left' : 'right';
  const counts = useMemo(
    () => ({ saved: savedPoems.length, mine: userPoems.length }),
    [savedPoems.length, userPoems.length]
  );

  const startWriting = () => {
    setPendingDraft(null);
    router.push('/add-poem');
  };

  const startScanning = () => {
    setPendingDraft(null);
    router.push('/scanner');
  };

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.list,
          !data.length && styles.emptyList,
        ]}
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.header}>
            <SegmentedPicker
              value={section}
              options={[
                { value: 'saved', label: `Saved · ${counts.saved}` },
                { value: 'mine', label: `My poems · ${counts.mine}` },
              ]}
              onChange={setSection}
            />
            {data.length ? (
              <Text style={[styles.helper, { color: colors.secondary }]}>
                {section === 'saved'
                  ? 'The poems you want to return to.'
                  : 'Written, pasted, or scanned by you.'}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PoemListRow
            poem={item}
            saved={feed.isPoemSaved(item.id, item.source === 'user' ? 'user' : 'catalogue')}
            badge={item.source === 'user' ? 'Yours' : undefined}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              symbol={section === 'saved' ? '♡' : '✦'}
              title={section === 'saved' ? 'Save what stays with you' : 'Make this library yours'}
              body={
                section === 'saved'
                  ? 'Tap the heart while reading and the poem will wait for you here.'
                  : 'Write a poem from scratch, paste one in, or scan it from a page.'
              }
            />
            {section === 'mine' ? (
              <Pressable
                onPress={startWriting}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: colors.accent },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Add your first poem"
              >
                <Text style={styles.primaryButtonText}>Add your first poem</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />

      <Stack.Toolbar placement={toolbarPlacement}>
        <Stack.Toolbar.Button
          onPress={() => {
            if (process.env.EXPO_OS === 'ios') void Haptics.selectionAsync();
            router.push('/account');
          }}
        >
          {process.env.EXPO_OS === 'ios' ? (
            <Stack.Toolbar.Icon sf="person.crop.circle" />
          ) : null}
          <Stack.Toolbar.Label>Account</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Menu>
          {process.env.EXPO_OS === 'ios' ? <Stack.Toolbar.Icon sf="plus" /> : null}
          <Stack.Toolbar.Label>Add</Stack.Toolbar.Label>
          <Stack.Toolbar.MenuAction icon="square.and.pencil" onPress={startWriting}>
            Write or paste
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="doc.viewfinder" onPress={startScanning}>
            Scan from a page
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 18,
    paddingBottom: 110,
  },
  emptyList: {
    flexGrow: 1,
  },
  header: {
    gap: 13,
    paddingTop: 10,
    paddingBottom: 18,
  },
  helper: {
    paddingHorizontal: 3,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyWrap: {
    minHeight: 470,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    borderRadius: 24,
    marginTop: -38,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.97 }],
  },
});
