import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  initDB,
  seedPoems,
  getRandomPoems,
  getTotalPoemsCount,
  getLocalSavedPoemIds,
  saveLocalPoem,
  unsaveLocalPoem,
} from '../lib/poems';
import { poetryAPI } from '../lib/poetry-api';
import type { Poem, VirtualSlot } from '../lib/types';
import type { SavedPoemScope } from '../lib/poems';
import { PoemFeedManager, type PoemFeedSource } from '../lib/services/poemFeedManager';

const VIRTUAL_SIZE = 2000;
const LOAD_AHEAD = 5;
const LOAD_BEHIND = 3;
const CLEANUP_DISTANCE = 20;

export interface UsePoemFeedResult {
  slots: VirtualSlot[];
  currentIndex: number;
  poemSource: PoemFeedSource;
  isDatabaseReady: boolean;
  isOnline: boolean;
  totalPoemsCount: number;
  language: 'en' | 'ur';
  savedPoemIds: Set<string>;
  handlePageSelected: (index: number) => void;
  cyclePoemSource: () => void;
  setPoemSource: (source: PoemFeedSource) => void;
  toggleLanguage: () => void;
  setLanguage: (language: 'en' | 'ur') => void;
  refreshVisibleWindow: () => void;
  refreshSavedPoemIds: () => void;
  isPoemSaved: (poemId: string, poemScope?: SavedPoemScope) => boolean;
  toggleSavedPoem: (poemId: string, poemScope?: SavedPoemScope) => Promise<boolean>;
}

const POEM_SOURCES: PoemFeedSource[] = ['local', 'hybrid', 'api'];

function asLocalPoems(
  poems: Array<Pick<Poem, 'title' | 'author' | 'content'> & Partial<Poem>>,
  source: PoemFeedSource
): Poem[] {
  return poems.map((poem, index) => ({
    ...poem,
    id: poem.id ? String(poem.id) : `${source}_${Date.now()}_${index}_${Math.random().toString(16).slice(2)}`,
    source,
    language: poem.language ?? 'en',
  }));
}

function savedPoemKey(poemId: string, poemScope: SavedPoemScope): string {
  return `${poemScope}:${poemId}`;
}

export function usePoemFeed(): UsePoemFeedResult {
  const [slots, setSlots] = useState<VirtualSlot[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [poemSource, setPoemSourceState] = useState<PoemFeedSource>('local');
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [totalPoemsCount, setTotalPoemsCount] = useState(0);
  const [language, setLanguageState] = useState<'en' | 'ur'>('en');
  const [savedPoemIds, setSavedPoemIds] = useState<Set<string>>(() => new Set());

  const managerRef = useRef<PoemFeedManager | null>(null);

  const fetchers = useMemo(() => ({
    fetchLocal: async (limit: number) => {
      const results = getRandomPoems({ limit, language });
      return asLocalPoems(results, 'local');
    },
    fetchHybrid: async (limit: number) => {
      try {
        const results = await poetryAPI.getHybridRandomPoems(limit);
        setIsOnline(true);
        const normalized = results.map((poem: any) => ({
          title: poem.title,
          author: poem.author,
          content: poem.content,
          id: poem.id ? String(poem.id) : undefined,
        }));
        return asLocalPoems(normalized, 'hybrid');
      } catch (error) {
        setIsOnline(false);
        throw error;
      }
    },
    fetchRemote: async (limit: number) => {
      try {
        const { poems } = await poetryAPI.getRandomPoems(limit);
        setIsOnline(true);
        return asLocalPoems(
          poems.map((poem) => ({
            title: poem.title,
            author: poem.author,
            content: poem.lines.join('\n'),
          })),
          'api'
        );
      } catch (error) {
        setIsOnline(false);
        throw error;
      }
    },
  }), [language]);

  if (!managerRef.current) {
    managerRef.current = new PoemFeedManager(fetchers, {
      virtualSize: VIRTUAL_SIZE,
      cleanupDistance: CLEANUP_DISTANCE,
    }, language);
  }
  const manager = managerRef.current;

  useEffect(() => {
    manager.updateFetchers(fetchers);
  }, [fetchers, manager]);

  const loadAroundIndex = useCallback(
    (anchorIndex: number) => {
      const indices = new Set<number>();
      indices.add(anchorIndex);
      for (let i = 1; i <= LOAD_AHEAD; i += 1) {
        indices.add(anchorIndex + i);
      }
      for (let i = 1; i <= LOAD_BEHIND; i += 1) {
        if (anchorIndex - i >= 0) {
          indices.add(anchorIndex - i);
        }
      }

      manager
        .loadSlots(Array.from(indices))
        .then((updated) => setSlots([...updated]))
        .catch((error) => console.warn('Failed to load poems into slots', error));
    },
    [manager]
  );

  const refreshVisibleWindow = useCallback(() => {
    loadAroundIndex(currentIndex);
  }, [currentIndex, loadAroundIndex]);

  const refreshSavedPoemIds = useCallback(() => {
    if (!isDatabaseReady) {
      return;
    }
    const nextIds = new Set<string>();
    getLocalSavedPoemIds('catalogue').forEach((poemId) => nextIds.add(savedPoemKey(poemId, 'catalogue')));
    getLocalSavedPoemIds('user').forEach((poemId) => nextIds.add(savedPoemKey(poemId, 'user')));
    setSavedPoemIds(nextIds);
  }, [isDatabaseReady]);

  useEffect(() => {
    let cancelled = false;
    const initialise = async () => {
      try {
        const initialSlots = manager.getSlots();
        if (!cancelled) {
          setSlots([...initialSlots]);
        }

        await initDB();
        await seedPoems();
        const count = getTotalPoemsCount();
        const savedIds = new Set<string>();
        getLocalSavedPoemIds('catalogue').forEach((poemId) => savedIds.add(savedPoemKey(poemId, 'catalogue')));
        getLocalSavedPoemIds('user').forEach((poemId) => savedIds.add(savedPoemKey(poemId, 'user')));
        if (cancelled) {
          return;
        }

        setTotalPoemsCount(count);
        setSavedPoemIds(savedIds);
        setIsDatabaseReady(true);
        manager.setDatabaseReady(true);
        loadAroundIndex(0);
      } catch (error) {
        console.error('Failed to initialise poem feed', error);
        setIsDatabaseReady(false);
      }
    };

    initialise();

    return () => {
      cancelled = true;
    };
  }, [loadAroundIndex, manager]);

  useEffect(() => {
    manager.setOnline(isOnline);
  }, [isOnline, manager]);

  useEffect(() => {
    const nextSlots = manager.setSource(poemSource);
    setSlots([...nextSlots]);
    setCurrentIndex(0);
    if (isDatabaseReady) {
      loadAroundIndex(0);
    }
  }, [isDatabaseReady, loadAroundIndex, manager, poemSource]);

  useEffect(() => {
    const nextSlots = manager.setLanguage(language);
    setSlots([...nextSlots]);
    setCurrentIndex(0);
    if (isDatabaseReady) {
      loadAroundIndex(0);
    }
  }, [language, isDatabaseReady, loadAroundIndex, manager]);

  useEffect(() => {
    if (!isDatabaseReady) {
      return;
    }
    loadAroundIndex(currentIndex);
  }, [currentIndex, isDatabaseReady, loadAroundIndex]);

  const handlePageSelected = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      if (index % 10 === 0) {
        const cleaned = manager.cleanupAround(index);
        setSlots([...cleaned]);
      }
    },
    [manager]
  );

  const cyclePoemSource = useCallback(() => {
    const currentIndexValue = POEM_SOURCES.indexOf(poemSource);
    const nextSource = POEM_SOURCES[(currentIndexValue + 1) % POEM_SOURCES.length];
    setPoemSourceState(nextSource);
  }, [poemSource]);

  const setPoemSource = useCallback((source: PoemFeedSource) => {
    setPoemSourceState(source);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => (prev === 'en' ? 'ur' : 'en'));
  }, []);

  const setLanguage = useCallback((lang: 'en' | 'ur') => {
    setLanguageState(lang);
  }, []);

  const isPoemSaved = useCallback(
    (poemId: string, poemScope: SavedPoemScope = 'catalogue') => savedPoemIds.has(savedPoemKey(poemId, poemScope)),
    [savedPoemIds]
  );

  const toggleSavedPoem = useCallback(
    async (poemId: string, poemScope: SavedPoemScope = 'catalogue') => {
      if (!isDatabaseReady) {
        return false;
      }

      const key = savedPoemKey(poemId, poemScope);
      const nextSaved = !savedPoemIds.has(key);
      if (nextSaved) {
        saveLocalPoem(poemId, poemScope);
      } else {
        unsaveLocalPoem(poemId, poemScope);
      }

      setSavedPoemIds((previous) => {
        const next = new Set(previous);
        if (nextSaved) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });

      return nextSaved;
    },
    [isDatabaseReady, savedPoemIds]
  );

  return {
    slots,
    currentIndex,
    poemSource,
    isDatabaseReady,
    isOnline,
    totalPoemsCount,
    language,
    savedPoemIds,
    handlePageSelected,
    cyclePoemSource,
    setPoemSource,
    toggleLanguage,
    setLanguage,
    refreshVisibleWindow,
    refreshSavedPoemIds,
    isPoemSaved,
    toggleSavedPoem,
  };
}
