import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, TouchableWithoutFeedback, View } from 'react-native';

import type { Poem } from '../lib/types';
import type { SavedPoemScope } from '../lib/poems';
import { styles } from '../styles/styles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PoemReaderViewProps {
  poem: Poem;
  onSecretTap?: () => void;
  isSaved?: boolean;
  onToggleSaved?: (poemId: string, poemScope?: SavedPoemScope) => void;
  canSave?: boolean;
  onOpenLibrary?: () => void;
  showLibraryButton?: boolean;
}

export function PoemReaderView({
  poem,
  onSecretTap,
  isSaved = false,
  onToggleSaved,
  canSave = false,
  onOpenLibrary,
  showLibraryButton = false,
}: PoemReaderViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isUrdu = poem.language === 'ur';
  const titleStyle = isUrdu ? styles.titleUrdu : styles.title;
  const authorStyle = isUrdu ? styles.authorUrdu : styles.author;
  const lineStyle = isUrdu ? styles.lineUrdu : styles.line;
  const authorLabel = isUrdu ? poem.author : `by ${poem.author}`;
  const poemScope: SavedPoemScope = poem.source === 'user' ? 'user' : 'catalogue';

  const headerHeight = 120;
  const paginationHeight = 40;
  const availableHeight = screenHeight - headerHeight - paginationHeight - 120;

  const measureStanzasHeight = useCallback((stanzas: string[]): number => {
    const textWidth = screenWidth - 70;
    const avgCharWidth = 8;
    let totalHeight = 0;

    stanzas.forEach((stanza) => {
      const lines = stanza.split('\n');
      lines.forEach((line) => {
        const wrappedLines = Math.max(1, Math.ceil((line.length * avgCharWidth) / textWidth));
        totalHeight += wrappedLines * 28 + 2;
      });
      totalHeight += 24;
    });

    return totalHeight;
  }, []);

  const buildPages = useCallback((): string[][] => {
    const allStanzas = poem.content.split('\n\n');
    const nextPages: string[][] = [];
    let currentStanzas: string[] = [];

    allStanzas.forEach((stanza) => {
      const candidate = [...currentStanzas, stanza];
      const height = measureStanzasHeight(candidate);
      if (height <= availableHeight || currentStanzas.length === 0) {
        currentStanzas.push(stanza);
      } else {
        if (currentStanzas.length > 0) {
          nextPages.push([...currentStanzas]);
        }
        currentStanzas = [stanza];
      }
    });

    if (currentStanzas.length > 0) {
      nextPages.push(currentStanzas);
    }

    if (nextPages.length === 0) {
      nextPages.push(allStanzas);
    }

    return nextPages;
  }, [availableHeight, measureStanzasHeight, poem.content]);

  const [pages, setPages] = useState<string[][]>(() => buildPages());

  useEffect(() => {
    setCurrentPage(0);
    setPages(buildPages());
  }, [buildPages]);

  if (pages.length === 0) {
    return (
      <View style={styles.poemContainer}>
        <TouchableWithoutFeedback onPress={onSecretTap}>
          <View style={styles.poemHeader}>
            <Text style={titleStyle}>{poem.title}</Text>
            <Text style={authorStyle}>{authorLabel}</Text>
          </View>
        </TouchableWithoutFeedback>
        <Text style={styles.loadingText}>
          {isUrdu ? 'کوئی مواد دستیاب نہیں' : 'No verses available.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.poemContainer}>
      {showLibraryButton && onOpenLibrary && (
        <Pressable
          onPress={onOpenLibrary}
          style={({ pressed }) => [styles.libraryButton, pressed && styles.saveButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open My Library"
          accessibilityHint="Shows your saved poems and personal poems."
          hitSlop={12}
        >
          <Text style={styles.libraryButtonText}>Library</Text>
        </Pressable>
      )}

      {canSave && onToggleSaved && (
        <Pressable
          onPress={() => onToggleSaved(poem.id, poemScope)}
          style={({ pressed }) => [
            styles.saveButton,
            isSaved && styles.saveButtonActive,
            pressed && styles.saveButtonPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? 'Unsave poem' : 'Save poem'}
          accessibilityHint={isSaved ? 'Removes this poem from your saved poems.' : 'Adds this poem to your saved poems.'}
          accessibilityState={{ selected: isSaved }}
          hitSlop={12}
        >
          <Text style={[styles.saveButtonIcon, isSaved && styles.saveButtonIconActive]}>
            {isSaved ? '★' : '☆'}
          </Text>
        </Pressable>
      )}

      <TouchableWithoutFeedback onPress={onSecretTap}>
        <View style={styles.poemHeader}>
          <Text style={titleStyle}>{poem.title}</Text>
          <Text style={authorStyle}>{authorLabel}</Text>
        </View>
      </TouchableWithoutFeedback>

      {pages.length > 1 ? (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const pageIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
              setCurrentPage(pageIndex);
            }}
          >
            {pages.map((pageStanzas, pageIndex) => (
              <View key={pageIndex} style={[styles.pagerPage, { width: screenWidth - 70 }]}>
                <View style={styles.poemBody}>
                  {pageStanzas.map((stanza, stanzaIndex) => (
                    <View key={stanzaIndex} style={styles.stanza}>
                      {stanza.split('\n').map((line, lineIndex) => (
                        <Text key={lineIndex} style={lineStyle}>
                          {line}
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.pagination}>
            {Array.from({ length: pages.length }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentPage && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.poemBody} showsVerticalScrollIndicator={false}>
          {pages[0].map((stanza, stanzaIndex) => (
            <View key={stanzaIndex} style={styles.stanza}>
              {stanza.split('\n').map((line, lineIndex) => (
                <Text key={lineIndex} style={lineStyle}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export function LoadingPoemReaderView({
  language,
  onSecretTap,
}: {
  language: 'en' | 'ur';
  onSecretTap: () => void;
}) {
  const message = language === 'ur' ? 'نظم لوڈ ہو رہی ہے...' : 'Loading poem...';
  return (
    <TouchableWithoutFeedback onPress={onSecretTap}>
      <View style={styles.poemContainer}>
        <View style={styles.poemHeader}>
          <Text style={styles.loadingText}>{message}</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
