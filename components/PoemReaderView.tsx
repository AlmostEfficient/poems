import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SavedPoemScope } from '../lib/poems';
import type { Poem } from '../lib/types';
import { type, useAppColors } from '../styles/theme';

interface PoemReaderViewProps {
  poem: Poem;
  onSecretTap?: () => void;
  isSaved?: boolean;
  onToggleSaved?: (poemId: string, poemScope?: SavedPoemScope) => void;
  canSave?: boolean;
  onOpenLibrary?: () => void;
  showLibraryButton?: boolean;
  showSwipeHint?: boolean;
  respectTabBar?: boolean;
}

export function PoemReaderView({
  poem,
  onSecretTap,
  isSaved = false,
  onToggleSaved,
  canSave = false,
  onOpenLibrary,
  showLibraryButton = false,
  showSwipeHint = false,
  respectTabBar = false,
}: PoemReaderViewProps) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [currentPage, setCurrentPage] = useState(0);
  const horizontalRef = useRef<ScrollView>(null);

  const isUrdu = poem.language === 'ur';
  const poemScope: SavedPoemScope = poem.source === 'user' ? 'user' : 'catalogue';
  const pageWidth = Math.min(width - 48, 680);
  const topInset = Math.max(insets.top, 20) + 54;
  const bottomInset = Math.max(insets.bottom, 18) + (respectTabBar ? 58 : 0);
  const availableHeight = Math.max(260, height - topInset - bottomInset - 150);

  const measureStanzasHeight = useCallback(
    (stanzas: string[]): number => {
      const textWidth = Math.max(pageWidth, 260);
      const averageCharacterWidth = isUrdu ? 10 : 8.2;
      return stanzas.reduce((total, stanza) => {
        const lineHeight = isUrdu ? 36 : 30;
        const lineHeightTotal = stanza.split('\n').reduce((lineTotal, line) => {
          const wrappedLines = Math.max(1, Math.ceil((line.length * averageCharacterWidth) / textWidth));
          return lineTotal + wrappedLines * lineHeight;
        }, 0);
        return total + lineHeightTotal + 24;
      }, 0);
    },
    [isUrdu, pageWidth]
  );

  const pages = useMemo(() => {
    const stanzas = poem.content.split(/\n\s*\n/).filter(Boolean);
    const nextPages: string[][] = [];
    let current: string[] = [];

    stanzas.forEach((stanza) => {
      const candidate = [...current, stanza];
      if (measureStanzasHeight(candidate) <= availableHeight || current.length === 0) {
        current = candidate;
      } else {
        nextPages.push(current);
        current = [stanza];
      }
    });

    if (current.length) nextPages.push(current);
    return nextPages.length ? nextPages : [[]];
  }, [availableHeight, measureStanzasHeight, poem.content]);

  useEffect(() => {
    setCurrentPage(0);
    horizontalRef.current?.scrollTo({ x: 0, animated: false });
  }, [poem.id]);

  const renderStanzas = (stanzas: string[]) => (
    <View style={styles.poemBody}>
      {stanzas.map((stanza, stanzaIndex) => (
        <View key={`${poem.id}-stanza-${stanzaIndex}`} style={styles.stanza}>
          {stanza.split('\n').map((line, lineIndex) => (
            <Text
              key={`${poem.id}-line-${stanzaIndex}-${lineIndex}`}
              selectable
              style={[
                styles.line,
                {
                  color: colors.ink,
                  textAlign: isUrdu ? 'right' : 'left',
                  writingDirection: isUrdu ? 'rtl' : 'ltr',
                  fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : type.prose,
                  lineHeight: isUrdu ? 36 : 30,
                },
              ]}
            >
              {line || ' '}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.canvas }]}>
      <View
        pointerEvents="none"
        style={[styles.ambientShape, { backgroundColor: colors.accentSoft }]}
      />

      {showLibraryButton && onOpenLibrary ? (
        <Pressable
          onPress={onOpenLibrary}
          style={({ pressed }) => [
            styles.legacyLibraryButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open library"
          hitSlop={10}
        >
          <Text style={[styles.legacyButtonText, { color: colors.ink }]}>Library</Text>
        </Pressable>
      ) : null}

      {canSave && onToggleSaved ? (
        <Pressable
          onPress={() => onToggleSaved(poem.id, poemScope)}
          style={({ pressed }) => [
            styles.legacySaveButton,
            {
              backgroundColor: isSaved ? colors.accent : colors.surface,
              borderColor: isSaved ? colors.accent : colors.border,
            },
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Remove from saved poems' : 'Save poem'}
          accessibilityState={{ selected: isSaved }}
          hitSlop={10}
        >
          <Text style={{ color: isSaved ? '#FFFFFF' : colors.ink, fontSize: 19 }}>
            {isSaved ? '♥' : '♡'}
          </Text>
        </Pressable>
      ) : null}

      <View
        style={[
          styles.content,
          {
            paddingTop: topInset,
            paddingBottom: bottomInset,
            width: Math.min(width, 760),
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={onSecretTap}>
          <View style={styles.header}>
            <Text
              selectable
              style={[
                styles.title,
                {
                  color: colors.ink,
                  textAlign: isUrdu ? 'right' : 'center',
                  writingDirection: isUrdu ? 'rtl' : 'ltr',
                  fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : type.display,
                  lineHeight: isUrdu ? 47 : 39,
                },
              ]}
            >
              {poem.title}
            </Text>
            <Text
              selectable
              style={[
                styles.author,
                {
                  color: colors.secondary,
                  textAlign: isUrdu ? 'right' : 'center',
                  writingDirection: isUrdu ? 'rtl' : 'ltr',
                  fontFamily: isUrdu ? 'NotoNastaliqUrdu_400Regular' : undefined,
                },
              ]}
            >
              {isUrdu ? poem.author : poem.author}
            </Text>
          </View>
        </TouchableWithoutFeedback>

        <View style={styles.reader}>
          {pages.length > 1 ? (
            <ScrollView
              ref={horizontalRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              contentContainerStyle={{ alignItems: 'flex-start' }}
              onMomentumScrollEnd={(event) => {
                setCurrentPage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
              }}
            >
              {pages.map((page, index) => (
                <View key={`${poem.id}-page-${index}`} style={{ width: pageWidth }}>
                  {renderStanzas(page)}
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              contentInsetAdjustmentBehavior="never"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.singlePage}
            >
              {renderStanzas(pages[0])}
            </ScrollView>
          )}
        </View>

        <View style={styles.footer}>
          {pages.length > 1 ? (
            <View style={styles.pagination} accessibilityLabel={`Page ${currentPage + 1} of ${pages.length}`}>
              {pages.map((_, index) => (
                <View
                  key={`${poem.id}-dot-${index}`}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: index === currentPage ? colors.ink : colors.border,
                      width: index === currentPage ? 18 : 5,
                    },
                  ]}
                />
              ))}
            </View>
          ) : showSwipeHint ? (
            <Text style={[styles.hint, { color: colors.tertiary }]}>Swipe up for another</Text>
          ) : (
            <View />
          )}
        </View>
      </View>
    </View>
  );
}

export function LoadingPoemReaderView({
  language,
  onSecretTap,
  respectTabBar = false,
}: {
  language: 'en' | 'ur';
  onSecretTap: () => void;
  respectTabBar?: boolean;
}) {
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  return (
    <TouchableWithoutFeedback onPress={onSecretTap}>
      <View
        style={[
          styles.loadingContainer,
          {
            backgroundColor: colors.canvas,
            paddingTop: insets.top,
            paddingBottom: insets.bottom + (respectTabBar ? 58 : 0),
          },
        ]}
      >
        <View style={[styles.loadingLine, { backgroundColor: colors.surfaceMuted }]} />
        <View style={[styles.loadingLineShort, { backgroundColor: colors.surfaceMuted }]} />
        <Text style={[styles.loadingText, { color: colors.tertiary }]}>
          {language === 'ur' ? 'نظم لوڈ ہو رہی ہے…' : 'Finding a poem…'}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  ambientShape: {
    position: 'absolute',
    top: -140,
    right: -110,
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.62,
  },
  content: {
    flex: 1,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  header: {
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  title: {
    width: '100%',
    fontSize: 31,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  author: {
    width: '100%',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
  },
  reader: {
    flex: 1,
  },
  singlePage: {
    flexGrow: 1,
    paddingBottom: 14,
  },
  poemBody: {
    width: '100%',
  },
  stanza: {
    gap: 1,
    paddingBottom: 22,
  },
  line: {
    fontSize: 18,
    letterSpacing: 0.05,
  },
  footer: {
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  hint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  legacyLibraryButton: {
    position: 'absolute',
    top: 52,
    left: 22,
    zIndex: 2,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  legacySaveButton: {
    position: 'absolute',
    top: 52,
    right: 22,
    zIndex: 2,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
  },
  legacyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.68,
    transform: [{ scale: 0.97 }],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 44,
  },
  loadingLine: {
    width: '66%',
    height: 18,
    borderRadius: 9,
  },
  loadingLineShort: {
    width: '36%',
    height: 12,
    borderRadius: 6,
  },
  loadingText: {
    paddingTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
});
