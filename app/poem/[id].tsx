import Constants from 'expo-constants';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Share, View } from 'react-native';

import { LoadingPoemReaderView, PoemReaderView } from '../../components/PoemReaderView';
import { deleteLocalUserPoem, getPoemById } from '../../lib/poems';
import type { Poem } from '../../lib/types';
import { usePoemsApp } from '../../providers/poems-app-provider';
import { useAppColors } from '../../styles/theme';

export default function PoemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useAppColors();
  const { feed, toggleSavedPoem, notifyUserPoemChanged } = usePoemsApp();
  const [poem, setPoem] = useState<Poem | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (feed.isDatabaseReady && id) {
        setPoem(getPoemById(id));
      }
    }, [feed.isDatabaseReady, id])
  );

  const poemScope = poem?.source === 'user' ? 'user' : 'catalogue';
  const saved = poem ? feed.isPoemSaved(poem.id, poemScope) : false;
  const toolbarPlacement =
    Constants.executionEnvironment === 'storeClient' && process.env.EXPO_OS === 'ios'
      ? 'bottom'
      : 'right';

  const sharePoem = () => {
    if (!poem) return;
    void Share.share({
      title: poem.title,
      message: `${poem.title}\n${poem.author}\n\n${poem.content}`,
    });
  };

  const deletePoem = () => {
    if (!poem || poem.source !== 'user') return;
    Alert.alert(
      'Delete this poem?',
      'It will be removed from this device and from synced devices. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete poem',
          style: 'destructive',
          onPress: () => {
            if (saved) void toggleSavedPoem(poem.id, 'user');
            deleteLocalUserPoem(poem.id);
            notifyUserPoemChanged();
            router.back();
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ contentStyle: { backgroundColor: colors.canvas } }} />
      {poem ? (
        <PoemReaderView poem={poem} />
      ) : (
        <View style={{ flex: 1 }}>
          <LoadingPoemReaderView language={feed.language} onSecretTap={() => undefined} />
        </View>
      )}
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
          {poem?.source === 'user' ? (
            <>
              <Stack.Toolbar.MenuAction
                icon="pencil"
                onPress={() =>
                  router.push({ pathname: '/add-poem', params: { id: poem.id } })
                }
              >
                Edit poem
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction icon="trash" destructive onPress={deletePoem}>
                Delete poem
              </Stack.Toolbar.MenuAction>
            </>
          ) : null}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </>
  );
}
