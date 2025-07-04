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
  const [isOnline, setIsOnline] = useState(false);
  const [poemSource, setPoemSource] = useState<'local' | 'hybrid' | 'api'>('local');
  
  // Embedded starter poems for instant first paint
  const STARTER_POEMS: Poem[] = [
    {
      id: -1,
      title: "The Road Not Taken",
      author: "Robert Frost",
      content: "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both\nAnd be one traveler, long I stood\nAnd looked down one as far as I could\nTo where it bent in the undergrowth;\n\nThen took the other, as just as fair,\nAnd having perhaps the better claim,\nBecause it was grassy and wanted wear;\nThough as for that the passing there\nHad worn them really about the same,\n\nAnd both that morning equally lay\nIn leaves no step had trodden black.\nOh, I kept the first for another day!\nYet knowing how way leads on to way,\nI doubted if I should ever be back.\n\nI shall be telling this with a sigh\nSomewhere ages and ages hence:\nTwo roads diverged in a wood, and I—\nI took the one less traveled by,\nAnd that has made all the difference."
    },
    {
      id: -2,
      title: "Fire and Ice",
      author: "Robert Frost",
      content: "Some say the world will end in fire,\nSome say in ice.\nFrom what I've tasted of desire\nI hold with those who favor fire.\nBut if it had to perish twice,\nI think I know enough of hate\nTo say that for destruction ice\nIs also great\nAnd would suffice."
    },
    {
      id: -3,
      title: "Stopping by Woods on a Snowy Evening",
      author: "Robert Frost",
      content: "Whose woods these are I think I know.\nHis house is in the village though;\nHe will not see me stopping here\nTo watch his woods fill up with snow.\n\nMy little horse must think it queer\nTo stop without a farmhouse near\nBetween the woods and frozen lake\nThe darkest evening of the year.\n\nHe gives his harness bells a shake\nTo ask if there is some mistake.\nThe only other sound's the sweep\nOf easy wind and downy flake.\n\nThe woods are lovely, dark and deep,\nBut I have promises to keep,\nAnd miles to go before I sleep,\nAnd miles to go before I sleep."
    },
    {
      id: -4,
      title: "Nothing Gold Can Stay",
      author: "Robert Frost",
      content: "Nature's first green is gold,\nHer hardest hue to hold.\nHer early leaf's a flower;\nBut only so an hour.\nThen leaf subsides to leaf.\nSo Eden sank to grief,\nSo dawn goes down to day.\nNothing gold can stay."
    },
    {
      id: -5,
      title: "The Guest House",
      author: "Rumi",
      content: "This being human is a guest house.\nEvery morning a new arrival.\n\nA joy, a depression, a meanness,\nsome momentary awareness comes\nas an unexpected visitor.\n\nWelcome and entertain them all!\nEven if they're a crowd of sorrows,\nwho violently sweep your house\nempty of its furniture,\nstill, treat each guest honorably.\nHe may be clearing you out\nfor some new delight.\n\nThe dark thought, the shame, the malice,\nmeet them at the door laughing,\nand invite them in.\n\nBe grateful for whoever comes,\nbecause each has been sent\nas a guide from beyond."
    }
  ];
  
  const verticalPagerRef = useRef<PagerView>(null);

  // Initialize virtual slots array with starter poems for instant first paint
  useEffect(() => {
    const initVirtualSlots = () => {
      // Shuffle starter poems for variety on each app launch
      const shuffled = [...STARTER_POEMS].sort(() => Math.random() - 0.5);
      
      const slots: VirtualSlot[] = Array(VIRTUAL_SIZE).fill(null).map((_, index) => {
        if (index < shuffled.length) {
          return { poem: shuffled[index], isLoading: false };
        }
        return { poem: null, isLoading: false };
      });
      setVirtualSlots(slots);
      setAvailablePoems(shuffled);
      setUsedPoemIds(new Set(shuffled.map(p => p.id)));
      setIsInitialized(true); // Ready to show content immediately
    };

    initVirtualSlots();
  }, []);

  // Background database initialization (doesn't block UI)
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize database (happens in background while starter poems show)
        await initDB();
        await seedPoems();
        
        const count = getTotalPoemsCount();
        setTotalPoemsCount(count);
        
        // Load poems from selected source
        let newPoems: any[] = [];
        
        try {
          if (poemSource === 'hybrid') {
            newPoems = await poetryAPI.getHybridRandomPoems(100);
            setIsOnline(true);
          } else if (poemSource === 'api') {
            const apiResult = await poetryAPI.getRandomPoems(50);
            newPoems = apiResult.poems.map(poem => poetryAPI.convertToLocalFormat(poem));
            setIsOnline(true);
          } else {
            // Local only
            newPoems = getRandomPoems(100);
          }
        } catch (error) {
          console.warn('API failed, using local poems:', error);
          newPoems = getRandomPoems(100);
          setIsOnline(false);
          setPoemSource('local');
        }
        
        // Add IDs to API poems if they don't have them
        newPoems = newPoems.map((poem, index) => ({
          ...poem,
          id: poem.id || `api_${index}_${Date.now()}`
        }));
        
        // Enhance available poems (keep starters + add new ones)
        setAvailablePoems(prev => {
          const starterIds = new Set(STARTER_POEMS.map(p => p.id));
          const filteredNew = newPoems.filter(p => !starterIds.has(p.id));
          return [...prev, ...filteredNew];
        });
        
        console.log(`Background loading complete: ${newPoems.length} new poems loaded`);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initApp();
  }, [poemSource]);

  // Enhanced poem loading with API integration
  const loadPoemsIntoSlots = async (slotIndices: number[]) => {
    if (!isInitialized) return;
    
    console.log(`Loading poems into slots: ${slotIndices.join(', ')}`);
    console.log(`Current available poems: ${availablePoems.length}, used: ${usedPoemIds.size}`);
    
    const updates: { [key: number]: VirtualSlot } = {};
    let poemsToAdd: Poem[] = [];
    
    // Get current used IDs from actual slots to avoid stale state
    const currentUsedIds = new Set<any>();
    virtualSlots.forEach((slot, index) => {
      if (slot && slot.poem && slot.poem.id) {
        currentUsedIds.add(slot.poem.id);
      }
    });
    
    for (const slotIndex of slotIndices) {
      // Skip if already loaded or loading
      if (virtualSlots[slotIndex]?.poem || virtualSlots[slotIndex]?.isLoading) {
        continue;
      }
      
      // Find an unused poem that's not already assigned to any slot
      const availablePoem = availablePoems.find(poem => 
        poem && !currentUsedIds.has(poem.id) && !Object.values(updates).some(slot => slot.poem?.id === poem.id)
      );
      
      if (!availablePoem) {
        console.log(`DEBUG: No available poem found for slot ${slotIndex}`);
        console.log(`- Available poems count: ${availablePoems.length}`);
        console.log(`- Current used IDs count: ${currentUsedIds.size}`);
        console.log(`- Updates in progress: ${Object.keys(updates).length}`);
        console.log(`- Sample available poem IDs: ${availablePoems.slice(0, 5).map(p => p?.id)}`);
        console.log(`- Current used IDs: ${Array.from(currentUsedIds).slice(0, 10)}`);
      }
      
      if (availablePoem) {
        // Mark poem as used in our local tracking
        currentUsedIds.add(availablePoem.id);
        updates[slotIndex] = { poem: availablePoem, isLoading: false };
        console.log(`Loaded poem "${availablePoem.title}" into slot ${slotIndex}`);
      } else {
        console.log(`No available poem for slot ${slotIndex}, need to load more`);
        // Need to load more poems
        try {
          let newPoems: any[] = [];
          
          if (poemSource === 'hybrid' && isOnline) {
            newPoems = await poetryAPI.getHybridRandomPoems(20);
          } else if (poemSource === 'api' && isOnline) {
            const apiResult = await poetryAPI.getRandomPoems(20);
            newPoems = apiResult.poems.map(poem => poetryAPI.convertToLocalFormat(poem));
          } else {
            newPoems = getRandomPoems(20);
          }
          
          // Add unique IDs to API poems
          newPoems = newPoems.map((poem, index) => ({
            ...poem,
            id: poem.id || `dynamic_${slotIndex}_${index}_${Date.now()}_${Math.random()}`
          }));
          
          poemsToAdd = [...poemsToAdd, ...newPoems];
          
          const freshPoem = newPoems.find(poem => 
            poem && !currentUsedIds.has(poem.id) && !Object.values(updates).some(slot => slot.poem?.id === poem.id)
          );
          if (freshPoem) {
            currentUsedIds.add(freshPoem.id);
            updates[slotIndex] = { poem: freshPoem, isLoading: false };
            console.log(`Loaded fresh poem "${freshPoem.title}" into slot ${slotIndex}`);
          } else {
            updates[slotIndex] = { poem: null, isLoading: false };
          }
        } catch (error) {
          console.warn('Failed to load more poems:', error);
          updates[slotIndex] = { poem: null, isLoading: false };
        }
      }
    }
    
    // Update available poems if we added new ones
    if (poemsToAdd.length > 0) {
      setAvailablePoems(prev => [...prev, ...poemsToAdd]);
    }
    
    // Update used IDs based on current reality
    setUsedPoemIds(currentUsedIds);
    
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
      
      for (let i = 0; i < newSlots.length; i++) {
        const distance = Math.abs(i - currentPos);
        if (distance > CLEANUP_DISTANCE && newSlots[i].poem) {
          console.log(`Cleaning up poem "${newSlots[i].poem?.title}" from slot ${i}`);
          newSlots[i] = { poem: null, isLoading: false };
        }
      }
      
      return newSlots;
    });
    
    // Update used IDs based on remaining poems in slots
    setUsedPoemIds(prev => {
      const currentUsedIds = new Set<any>();
      virtualSlots.forEach(slot => {
        if (slot.poem && slot.poem.id) {
          const distance = Math.abs(virtualSlots.indexOf(slot) - currentPos);
          if (distance <= CLEANUP_DISTANCE) {
            currentUsedIds.add(slot.poem.id);
          }
        }
      });
      return currentUsedIds;
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
    
    // Reset to starter poems immediately (no loading screen)
    const shuffled = [...STARTER_POEMS].sort(() => Math.random() - 0.5);
    const slots: VirtualSlot[] = Array(VIRTUAL_SIZE).fill(null).map((_, index) => {
      if (index < shuffled.length) {
        return { poem: shuffled[index], isLoading: false };
      }
      return { poem: null, isLoading: false };
    });
    setVirtualSlots(slots);
    setAvailablePoems(shuffled);
    setUsedPoemIds(new Set(shuffled.map(p => p.id)));
    setCurrentIndex(0);
    
    // Background loading will happen automatically via useEffect
  };

  // No loading screen needed - we start with embedded poems immediately

  return (
    <View style={styles.container}>
      {/* Optional source indicator */}
      <View style={{ position: 'absolute', bottom: 40, right: 20, zIndex: 1000 }}>
        <TouchableOpacity 
          onPress={() => {
            const sources: ('local' | 'hybrid' | 'api')[] = ['local', 'hybrid', 'api'];
            const currentIndex = sources.indexOf(poemSource);
            const nextSource = sources[(currentIndex + 1) % sources.length];
            switchPoemSource(nextSource);
          }}
          style={{ 
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
          <View key={`slot-${index}`} style={styles.verticalPage} collapsable={false}>
            {slot.poem ? (
              <PoemView key={`poem-${slot.poem.id}`} poem={slot.poem} />
            ) : (
              <LoadingPoemView key={`loading-${index}`} />
            )}
          </View>
        ))}
      </PagerView>
      <StatusBar hidden />
    </View>
  );
}


