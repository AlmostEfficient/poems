import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Dimensions, ScrollView, TouchableWithoutFeedback } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useFonts, NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import Toast from 'react-native-toast-message';

import { usePoemFeed } from './hooks/usePoemFeed';
import type { Poem } from './lib/types';
import { styles } from './styles/styles';
import { toastConfig } from './components/Toast';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PoemPageProps {
  stanzas: string[];
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
  language: 'en' | 'ur';
}

function PoemPage({ stanzas, title, author, currentPage, totalPages, language }: PoemPageProps) {
  const isUrdu = language === 'ur';
  const titleStyle = isUrdu ? styles.titleUrdu : styles.title;
  const authorStyle = isUrdu ? styles.authorUrdu : styles.author;
  const lineStyle = isUrdu ? styles.lineUrdu : styles.line;
  const authorLabel = isUrdu ? author : `by ${author}`;

  return (
    <View style={styles.poemPage}>
      <View style={styles.poemHeader}>
        <Text style={titleStyle}>{title}</Text>
        <Text style={authorStyle}>{authorLabel}</Text>
      </View>

      <View style={styles.poemBody}>
        {stanzas.map((stanza, stanzaIndex) => (
          <View key={stanzaIndex} style={styles.stanza}>
            {stanza.split('\n').map((line, lineIndex) => (
              <Text key={lineIndex} style={lineStyle}>
                {line}
              </Text>
            ))}
          </View>
        ))}
      </View>

      {totalPages > 1 && (
        <View style={styles.pagination}>
          {Array.from({ length: totalPages }, (_, i) => (
            <View
              key={i}
              style={[
                styles.paginationDot,
                i === currentPage && styles.paginationDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface PoemViewProps {
  poem: Poem;
  onSecretTap: () => void;
}

function PoemView({ poem, onSecretTap }: PoemViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[][]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const isUrdu = poem.language === 'ur';
  const titleStyle = isUrdu ? styles.titleUrdu : styles.title;
  const authorStyle = isUrdu ? styles.authorUrdu : styles.author;
  const lineStyle = isUrdu ? styles.lineUrdu : styles.line;
  const authorLabel = isUrdu ? poem.author : `by ${poem.author}`;

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

  const paginateStanzas = useCallback(() => {
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

    setPages(nextPages);
    setIsCalculating(false);
  }, [availableHeight, measureStanzasHeight, poem.content]);

  useEffect(() => {
    setIsCalculating(true);
    setCurrentPage(0);
    paginateStanzas();
  }, [paginateStanzas]);

  if (isCalculating || pages.length === 0) {
    return (
      <View style={styles.poemContainer}>
        <TouchableWithoutFeedback onPress={onSecretTap}>
          <View style={styles.poemHeader}>
            <Text style={titleStyle}>{poem.title}</Text>
            <Text style={authorStyle}>{authorLabel}</Text>
          </View>
        </TouchableWithoutFeedback>
        <Text style={styles.loadingText}>
          {isUrdu ? 'نظم لوڈ ہو رہی ہے...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.poemContainer}>
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

function LoadingPoemView({ language, onSecretTap }: { language: 'en' | 'ur'; onSecretTap: () => void }) {
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

export default function App() {
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
  } = usePoemFeed();

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

  useEffect(() => {
    if (verticalPagerRef.current && typeof verticalPagerRef.current.setPageWithoutAnimation === 'function') {
      verticalPagerRef.current.setPageWithoutAnimation(0);
    }
  }, [poemSource]);

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
              <PoemView poem={slot.poem} onSecretTap={handleSecretTap} />
            ) : (
              <LoadingPoemView language={language} onSecretTap={handleSecretTap} />
            )}
          </View>
        ))}
      </PagerView>
      <StatusBar hidden />
      <Toast config={toastConfig} />
    </View>
  );
}
