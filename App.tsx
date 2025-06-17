import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Dimensions, ScrollView } from 'react-native';
import PagerView from 'react-native-pager-view';
import { initDB, getPoems, seedPoems } from './lib/poems';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Poem {
  id: number;
  title: string;
  author: string;
  content: string;
}

interface PoemPageProps {
  stanzas: string[];
  title: string;
  author: string;
  currentPage: number;
  totalPages: number;
}

function PoemPage({ stanzas, title, author, currentPage, totalPages }: PoemPageProps) {
  return (
    <View style={styles.poemPage}>
      <View style={styles.poemHeader}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.author}>by {author}</Text>
      </View>
      
      <View style={styles.poemBody}>
        {stanzas.map((stanza, stanzaIndex) => (
          <View key={stanzaIndex} style={styles.stanza}>
            {stanza.split('\n').map((line, lineIndex) => (
              <Text key={lineIndex} style={styles.line}>
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
                i === currentPage && styles.paginationDotActive
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
}

function PoemView({ poem }: PoemViewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Calculate available height for poem content
  const headerHeight = 120; // approximate height for title + author
  const paginationHeight = 40; // height for pagination dots
  const availableHeight = screenHeight - headerHeight - paginationHeight - 120; // extra padding

  // Split content into stanzas and paginate
  const allStanzas = poem.content.split('\n\n');
  
  // Estimate how many stanzas fit per page
  const lineHeight = 30; // 28 line height + 2 margin
  const stanzaSpacing = 24;
  const averageLinesPerStanza = 4;
  const averageStanzaHeight = (averageLinesPerStanza * lineHeight) + stanzaSpacing;
  const stanzasPerPage = Math.floor(availableHeight / averageStanzaHeight) || 1;

  // Create pages of stanzas
  const pages: string[][] = [];
  for (let i = 0; i < allStanzas.length; i += stanzasPerPage) {
    pages.push(allStanzas.slice(i, i + stanzasPerPage));
  }

  if (pages.length === 0) {
    pages.push([poem.content]); // fallback
  }

  return (
    <View style={styles.poemContainer}>
      <View style={styles.poemHeader}>
        <Text style={styles.title}>{poem.title}</Text>
        <Text style={styles.author}>by {poem.author}</Text>
      </View>
      
      {pages.length > 1 ? (
        <>
          <ScrollView
            ref={scrollRef}
            style={styles.pager}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const pageIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentPage(pageIndex);
            }}
          >
            {pages.map((pageStanzas, pageIndex) => (
              <View key={pageIndex} style={[styles.pagerPage, { width: screenWidth - 80 }]}>
                <View style={styles.poemBody}>
                  {pageStanzas.map((stanza, stanzaIndex) => (
                    <View key={stanzaIndex} style={styles.stanza}>
                      {stanza.split('\n').map((line, lineIndex) => (
                        <Text key={lineIndex} style={styles.line}>
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
            {Array.from({ length: pages.length }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.paginationDot,
                  i === currentPage && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </>
      ) : (
        <View style={styles.poemBody}>
          {pages[0].map((stanza, stanzaIndex) => (
            <View key={stanzaIndex} style={styles.stanza}>
              {stanza.split('\n').map((line, lineIndex) => (
                <Text key={lineIndex} style={styles.line}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [currentPoemIndex, setCurrentPoemIndex] = useState(0);
  const verticalPagerRef = useRef<PagerView>(null);

  useEffect(() => {
    initDB();
    seedPoems().then(() => {
      const poemsData = getPoems();
      setPoems(poemsData);
    });
  }, []);

  if (poems.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading poems...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PagerView
        ref={verticalPagerRef}
        style={styles.verticalPager}
        orientation="vertical"
        initialPage={0}
        onPageSelected={(e: any) => setCurrentPoemIndex(e.nativeEvent.position)}
        scrollEnabled={true}
      >
        {poems.map((poem) => (
          <View key={poem.id} style={styles.verticalPage} collapsable={false}>
            <PoemView poem={poem} />
          </View>
        ))}
      </PagerView>
      <StatusBar hidden />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fefefe',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
  },
  verticalPager: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  verticalPage: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
  },
  poemContainer: {
    flex: 1,
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    flex: 1,
  },
  poemPage: {
    flex: 1,
    justifyContent: 'space-between',
  },
  poemHeader: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2c2c2c',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'serif',
  },
  author: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  poemBody: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  stanza: {
    marginBottom: 24,
    width: '100%',
  },
  line: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
    marginBottom: 2,
    fontFamily: 'serif',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#666',
  },
});
