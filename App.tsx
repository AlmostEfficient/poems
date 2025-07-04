import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import PagerView from 'react-native-pager-view';
import { initDB, getRandomPoems, seedPoems, getTotalPoemsCount } from './lib/poems';
import { poetryAPI, createHybridSession, PoemSession } from './lib/poetry-api';
import { styles } from './styles/styles';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Poem {
  id: number;
  title: string;
  author: string;
  content: string;
}

// Virtual slot that can contain a poem or be empty
interface VirtualSlot {
  poem: Poem | null;
  isLoading: boolean;
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

// Loading placeholder component
function LoadingPoemView() {
  return (
    <View style={styles.poemContainer}>
      <View style={styles.poemHeader}>
        <Text style={styles.loadingText}>Loading poem...</Text>
      </View>
    </View>
  );
}

export default function App() {
  // Virtual scrolling constants
  const VIRTUAL_SIZE = 2000; // Large virtual array size
  const LOAD_AHEAD = 5; // Load 5 poems ahead
  const LOAD_BEHIND = 3; // Keep 3 poems behind
  const CLEANUP_DISTANCE = 20; // Clean up poems > 20 positions away
  
  // State for virtual infinite scrolling
  const [virtualSlots, setVirtualSlots] = useState<VirtualSlot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [usedPoemIds, setUsedPoemIds] = useState<Set<number>>(new Set());
  const [availablePoems, setAvailablePoems] = useState<Poem[]>([]);
  const [totalPoemsCount, setTotalPoemsCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [poemSource, setPoemSource] = useState<'local' | 'hybrid' | 'api'>('hybrid');
  
  const verticalPagerRef = useRef<PagerView>(null);

  // Initialize virtual slots array
  useEffect(() => {
    const initVirtualSlots = () => {
      const slots: VirtualSlot[] = Array(VIRTUAL_SIZE).fill(null).map(() => ({
        poem: null,
        isLoading: false
      }));
      setVirtualSlots(slots);
    };

    initVirtualSlots();
  }, []);

  // Initialize database and load initial poems
  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB();
        await seedPoems();
        
        const count = getTotalPoemsCount();
        setTotalPoemsCount(count);
        
        // Try to load initial poems from hybrid source (API + local)
        let initialPoems: any[] = [];
        
        try {
          if (poemSource === 'hybrid') {
            initialPoems = await poetryAPI.getHybridRandomPoems(100);
            setIsOnline(true);
          } else if (poemSource === 'api') {
            const apiResult = await poetryAPI.getRandomPoems(50);
            initialPoems = apiResult.poems.map(poem => poetryAPI.convertToLocalFormat(poem));
            setIsOnline(true);
          } else {
            // Local only
            initialPoems = getRandomPoems(100);
          }
        } catch (error) {
          console.warn('API failed, using local poems:', error);
          initialPoems = getRandomPoems(100);
          setIsOnline(false);
          setPoemSource('local');
        }
        
        // Add IDs to API poems if they don't have them
        initialPoems = initialPoems.map((poem, index) => ({
          ...poem,
          id: poem.id || `api_${index}_${Date.now()}`
        }));
        
        setAvailablePoems(initialPoems);
        
        // Load first few poems into virtual slots with unique poems
        const firstPoems = initialPoems.slice(0, 5);
        const initialSlots: VirtualSlot[] = Array(VIRTUAL_SIZE).fill(null).map((_, index) => {
          if (index < 5 && firstPoems[index]) {
            return { poem: firstPoems[index], isLoading: false };
          }
          return { poem: null, isLoading: false };
        });
        
        setVirtualSlots(initialSlots);
        setUsedPoemIds(new Set(firstPoems.map(p => p.id)));
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initApp();
  }, [poemSource]);

  // Enhanced poem loading with API integration
  const loadPoemsIntoSlots = async (slotIndices: number[]) => {
    if (!isInitialized) return;
    
    // Get current state
    const currentSlots = virtualSlots;
    const currentPoems = availablePoems;
    const currentUsedIds = usedPoemIds;
    
    const updates: { [key: number]: VirtualSlot } = {};
    let newUsedIds = new Set(currentUsedIds);
    let poemsToAdd: Poem[] = [];
    
    for (const slotIndex of slotIndices) {
      // Skip if already loaded or loading
      if (currentSlots[slotIndex]?.poem || currentSlots[slotIndex]?.isLoading) {
        continue;
      }
      
      // Find an unused poem
      const availablePoem = currentPoems.find(poem => 
        poem && !newUsedIds.has(poem.id)
      );
      
      if (availablePoem) {
        // Mark poem as used
        newUsedIds.add(availablePoem.id);
        updates[slotIndex] = { poem: availablePoem, isLoading: false };
      } else {
        // Need to load more poems
        try {
          let newPoems: any[] = [];
          
          if (poemSource === 'hybrid' && isOnline) {
            newPoems = await poetryAPI.getHybridRandomPoems(50);
          } else if (poemSource === 'api' && isOnline) {
            const apiResult = await poetryAPI.getRandomPoems(25);
            newPoems = apiResult.poems.map(poem => poetryAPI.convertToLocalFormat(poem));
          } else {
            newPoems = getRandomPoems(50);
          }
          
          // Add IDs to API poems if they don't have them
          newPoems = newPoems.map((poem, index) => ({
            ...poem,
            id: poem.id || `api_${slotIndex}_${index}_${Date.now()}`
          }));
          
          poemsToAdd = [...poemsToAdd, ...newPoems];
          
          const freshPoem = newPoems.find(poem => 
            poem && !newUsedIds.has(poem.id)
          );
          if (freshPoem) {
            newUsedIds.add(freshPoem.id);
            updates[slotIndex] = { poem: freshPoem, isLoading: false };
          } else {
            updates[slotIndex] = { poem: null, isLoading: false };
          }
        } catch (error) {
          console.warn('Failed to load more poems:', error);
          // Fallback to local poems
          const localPoems = getRandomPoems(50);
          poemsToAdd = [...poemsToAdd, ...localPoems];
          
          const freshPoem = localPoems.find(poem => 
            poem && !newUsedIds.has(poem.id)
          );
          if (freshPoem) {
            newUsedIds.add(freshPoem.id);
            updates[slotIndex] = { poem: freshPoem, isLoading: false };
          } else {
            updates[slotIndex] = { poem: null, isLoading: false };
          }
        }
      }
    }
    
    // Update available poems if we added new ones
    if (poemsToAdd.length > 0) {
      setAvailablePoems(prev => [...prev, ...poemsToAdd]);
    }
    
    // Update used IDs
    setUsedPoemIds(newUsedIds);
    
    // Apply slot updates
    if (Object.keys(updates).length > 0) {
      setVirtualSlots(prev => {
        const newSlots = [...prev];
        Object.entries(updates).forEach(([index, slot]) => {
          newSlots[parseInt(index)] = slot;
        });
        return newSlots;
      });
    }
  };

  // Clean up distant poems to manage memory
  const cleanupDistantSlots = (currentPos: number) => {
    setVirtualSlots(prev => {
      const newSlots = [...prev];
      const idsToRemove: any[] = [];
      
      for (let i = 0; i < newSlots.length; i++) {
        const distance = Math.abs(i - currentPos);
        if (distance > CLEANUP_DISTANCE && newSlots[i].poem) {
          // Collect IDs to remove from used set
          if (newSlots[i].poem?.id) {
            idsToRemove.push(newSlots[i].poem!.id);
          }
          newSlots[i] = { poem: null, isLoading: false };
        }
      }
      
      // Remove from used set
      if (idsToRemove.length > 0) {
        setUsedPoemIds(prevUsed => {
          const newUsed = new Set(prevUsed);
          idsToRemove.forEach(id => newUsed.delete(id));
          return newUsed;
        });
      }
      
      return newSlots;
    });
  };

  // Handle page changes and preload content
  const handlePageSelected = (e: any) => {
    if (!isInitialized) return;
    
    const newIndex = e.nativeEvent.position;
    setCurrentIndex(newIndex);
    
    // Calculate which slots need to be loaded
    const slotsToLoad: number[] = [];
    
    // Load current if not loaded
    if (!virtualSlots[newIndex]?.poem && !virtualSlots[newIndex]?.isLoading) {
      slotsToLoad.push(newIndex);
    }
    
    // Load ahead
    for (let i = 1; i <= LOAD_AHEAD; i++) {
      const ahead = newIndex + i;
      if (ahead < VIRTUAL_SIZE && !virtualSlots[ahead]?.poem && !virtualSlots[ahead]?.isLoading) {
        slotsToLoad.push(ahead);
      }
    }
    
    // Load behind
    for (let i = 1; i <= LOAD_BEHIND; i++) {
      const behind = newIndex - i;
      if (behind >= 0 && !virtualSlots[behind]?.poem && !virtualSlots[behind]?.isLoading) {
        slotsToLoad.push(behind);
      }
    }
    
    // Load the slots
    if (slotsToLoad.length > 0) {
      loadPoemsIntoSlots(slotsToLoad);
    }
    
    // Clean up distant poems periodically
    if (newIndex % 10 === 0) {
      cleanupDistantSlots(newIndex);
    }
    
    // Refresh poem pool when getting low on unused poems
    const unusedCount = availablePoems.length - usedPoemIds.size;
    if (unusedCount < 20) {
      // Load more poems in background
      loadPoemsIntoSlots([]);
    }
  };

  // Source switching function
  const switchPoemSource = async (newSource: 'local' | 'hybrid' | 'api') => {
    if (newSource === poemSource) return;
    
    setPoemSource(newSource);
    setIsInitialized(false);
    
    // Reset state
    setVirtualSlots(Array(VIRTUAL_SIZE).fill(null).map(() => ({
      poem: null,
      isLoading: false
    })));
    setUsedPoemIds(new Set());
    setAvailablePoems([]);
    setCurrentIndex(0);
    
    // This will trigger the useEffect to reinitialize
  };

  if (!isInitialized || virtualSlots.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading poems...</Text>
        {!isOnline && (
          <Text style={styles.author}>Offline mode - using local poems</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Optional source indicator */}
      <View style={{ position: 'absolute', top: 40, right: 20, zIndex: 1000 }}>
        <TouchableOpacity 
          onPress={() => {
            const sources: ('local' | 'hybrid' | 'api')[] = ['local', 'hybrid', 'api'];
            const currentIndex = sources.indexOf(poemSource);
            const nextSource = sources[(currentIndex + 1) % sources.length];
            switchPoemSource(nextSource);
          }}
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            padding: 8, 
            borderRadius: 4,
            opacity: 0.8
          }}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>
            {poemSource === 'hybrid' ? '🌐+💾' : poemSource === 'api' ? '🌐' : '💾'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <PagerView
        ref={verticalPagerRef}
        style={styles.verticalPager}
        orientation="vertical"
        initialPage={0}
        onPageSelected={handlePageSelected}
        scrollEnabled={true}
      >
        {virtualSlots.map((slot, index) => (
          <View key={index} style={styles.verticalPage} collapsable={false}>
            {slot.poem ? (
              <PoemView poem={slot.poem} />
            ) : (
              <LoadingPoemView />
            )}
          </View>
        ))}
      </PagerView>
      <StatusBar hidden />
    </View>
  );
}


