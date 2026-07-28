import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Poem } from '../lib/types';
import { type, useAppColors } from '../styles/theme';

export function PoemListRow({
  poem,
  saved,
  badge,
}: {
  poem: Poem;
  saved?: boolean;
  badge?: string;
}) {
  const colors = useAppColors();
  const preview = poem.content.replace(/\s+/g, ' ').trim();

  const openPoem = () => {
    if (process.env.EXPO_OS === 'ios') {
      void Haptics.selectionAsync();
    }
    router.push({ pathname: '/poem/[id]', params: { id: poem.id } });
  };

  return (
    <Pressable
      onPress={openPoem}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderColor: colors.border,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${poem.title} by ${poem.author}`}
      accessibilityHint="Opens the poem"
    >
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text
            selectable
            numberOfLines={2}
            style={[styles.title, { color: colors.ink }]}
          >
            {poem.title}
          </Text>
          {saved ? <Text style={[styles.saved, { color: colors.accent }]}>♥</Text> : null}
        </View>
        <Text selectable numberOfLines={1} style={[styles.author, { color: colors.secondary }]}>
          {poem.author}
        </Text>
        <Text numberOfLines={2} style={[styles.preview, { color: colors.secondary }]}>
          {preview}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: colors.surfaceMuted }]}>
            <Text style={[styles.badgeText, { color: colors.secondary }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.chevron, { color: colors.tertiary }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 126,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: type.display,
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  saved: {
    paddingTop: 2,
    fontSize: 14,
  },
  author: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  preview: {
    paddingTop: 4,
    fontFamily: type.prose,
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 27,
    fontWeight: '300',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
  },
});

