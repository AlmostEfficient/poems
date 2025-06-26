import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Dimensions, ScrollView } from 'react-native';
import PagerView from 'react-native-pager-view';
import { initDB, getPoems, seedPoems } from './lib/poems';
import { styles } from './styles/styles';

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
  const [pages, setPages] = useState<string[][]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  // Calculate available height for poem content
  const headerHeight = 120;
  const paginationHeight = 40;
  const availableHeight = screenHeight - headerHeight - paginationHeight - 120;

  // Measure actual height of stanzas by rendering them off-screen
  const measureStanzasHeight = (stanzas: string[]): Promise<number> => {
    return new Promise((resolve) => {
      const MeasurementComponent = ({ onMeasured }: { onMeasured: (height: number) => void }) => (
        <View 
          style={{ 
            position: 'absolute', 
            left: -9999, 
            top: -9999, 
            width: screenWidth - 80,
            opacity: 0 
          }}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            onMeasured(height);
          }}
        >
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
      );

             // We need to actually render this component to get the measurement
       // For now, fallback to estimation but with better logic
       const textWidth = screenWidth - 70;
      const avgCharWidth = 8; // More conservative estimate
      
      let totalHeight = 0;
      stanzas.forEach(stanza => {
        const lines = stanza.split('\n');
        lines.forEach(line => {
          // Account for line wrapping more accurately
          const wrappedLines = Math.max(1, Math.ceil((line.length * avgCharWidth) / textWidth));
          totalHeight += wrappedLines * 28 + 2; // line height + margin
        });
        totalHeight += 24; // stanza margin
      });

      resolve(totalHeight);
    });
  };

  // Paginate stanzas based on actual height
  const paginateStanzas = async () => {
    const allStanzas = poem.content.split('\n\n');
    const newPages: string[][] = [];
    let currentPageStanzas: string[] = [];
    
    for (const stanza of allStanzas) {
      // Test if adding this stanza would fit
      const testStanzas = [...currentPageStanzas, stanza];
      const testHeight = await measureStanzasHeight(testStanzas);
      
      if (testHeight <= availableHeight || currentPageStanzas.length === 0) {
        // Fits! Add to current page
        currentPageStanzas.push(stanza);
      } else {
        // Doesn't fit, start new page
        if (currentPageStanzas.length > 0) {
          newPages.push([...currentPageStanzas]);
        }
        currentPageStanzas = [stanza];
      }
    }

    // Add the last page
    if (currentPageStanzas.length > 0) {
      newPages.push(currentPageStanzas);
    }

    // Ensure we have at least one page
    if (newPages.length === 0) {
      newPages.push(allStanzas);
    }

    setPages(newPages);
    setIsCalculating(false);
  };

  useEffect(() => {
    setIsCalculating(true);
    paginateStanzas();
  }, [poem.content]);

  if (isCalculating || pages.length === 0) {
    return (
      <View style={styles.poemContainer}>
        <View style={styles.poemHeader}>
          <Text style={styles.title}>{poem.title}</Text>
          <Text style={styles.author}>by {poem.author}</Text>
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
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
              <View key={pageIndex} style={[styles.pagerPage, { width: screenWidth - 70 }]}>
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
        <ScrollView 
          contentContainerStyle={styles.poemBody} 
          showsVerticalScrollIndicator={false}
        >
          {pages[0].map((stanza, stanzaIndex) => (
            <View key={stanzaIndex} style={styles.stanza}>
              {stanza.split('\n').map((line, lineIndex) => (
                <Text key={lineIndex} style={styles.line}>
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


