import { Stack, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '../../../components/empty-state';
import { PoemListRow } from '../../../components/poem-list-row';
import { getRandomPoems, searchLocalPoems } from '../../../lib/poems';
import type { Poem } from '../../../lib/types';
import { usePoemsApp } from '../../../providers/poems-app-provider';
import { type, useAppColors } from '../../../styles/theme';

function uniquePoems(poems: Poem[]): Poem[] {
  return Array.from(new Map(poems.map((poem) => [poem.id, poem])).values());
}

export default function SearchScreen() {
  const colors = useAppColors();
  const { feed, libraryRefreshKey } = usePoemsApp();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Poem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (feed.isDatabaseReady) {
        setSuggestions(getRandomPoems({ limit: 5, language: feed.language }));
      }
    }, [feed.isDatabaseReady, feed.language])
  );

  const normalizedQuery = query.trim();
  const results = useMemo(() => {
    if (!feed.isDatabaseReady || !normalizedQuery) return [];
    return uniquePoems([
      ...searchLocalPoems(normalizedQuery, 'title', 40),
      ...searchLocalPoems(normalizedQuery, 'author', 40),
      ...searchLocalPoems(normalizedQuery, 'content', 40),
    ]).slice(0, 80);
  }, [feed.isDatabaseReady, libraryRefreshKey, normalizedQuery]);

  const data = normalizedQuery ? results : suggestions;

  return (
    <>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.list, !data.length && styles.emptyList]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          data.length ? (
            <View style={styles.header}>
              <Text selectable style={[styles.sectionTitle, { color: colors.ink }]}>
                {normalizedQuery
                  ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
                  : 'A few places to begin'}
              </Text>
              <Text style={[styles.helper, { color: colors.secondary }]}>
                {normalizedQuery
                  ? 'Matching titles, poets, and lines.'
                  : 'A fresh handful from your offline collection.'}
              </Text>
            </View>
          ) : null
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
          <EmptyState
            symbol="⌕"
            title={normalizedQuery ? `No poems found for “${normalizedQuery}”` : 'Find the words again'}
            body={
              normalizedQuery
                ? 'Try a poet’s surname, a shorter title, or a memorable phrase.'
                : 'Search by title, poet, or any line you remember.'
            }
          />
        }
      />
      <Stack.SearchBar
        placeholder="Titles, poets, or lines"
        placement="automatic"
        hideWhenScrolling={false}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
      />
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
    gap: 4,
    paddingTop: 10,
    paddingBottom: 18,
  },
  sectionTitle: {
    fontFamily: type.display,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '600',
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
  },
});
