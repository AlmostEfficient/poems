import { STARTER_POEMS } from '../data/starterPoems';
import type { Poem, VirtualSlot } from '../types';

export type PoemFeedSource = 'local' | 'hybrid' | 'api';

export interface PoemFeedOptions {
  virtualSize: number;
  cleanupDistance: number;
}

export interface PoemFetchers {
  fetchLocal: (limit: number) => Promise<Poem[]>;
  fetchHybrid?: (limit: number) => Promise<Poem[]>;
  fetchRemote?: (limit: number) => Promise<Poem[]>;
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function ensurePoemIdentity(poem: Poem, suffix: string): Poem {
  if (poem.id !== undefined && poem.id !== null) {
    return poem;
  }

  const generatedId = `${suffix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return {
    ...poem,
    id: generatedId,
  };
}

export class PoemFeedManager {
  private virtualSlots: VirtualSlot[];

  private availablePoems: Poem[] = [];

  private availablePoemIds = new Set<Poem['id']>();

  private usedPoemIds = new Set<Poem['id']>();

  private isInitialized = false;

  private isDatabaseReady = false;

  private isOnline = false;

  private isLoading = false;

  private poemSource: PoemFeedSource = 'local';

  constructor(
    private readonly fetchers: PoemFetchers,
    private readonly options: PoemFeedOptions
  ) {
    this.virtualSlots = Array.from({ length: options.virtualSize }, () => ({
      poem: null,
      isLoading: false,
    }));
  }

  initialiseWithStarterPoems(): VirtualSlot[] {
    const shuffled = shuffle(STARTER_POEMS).map((poem, index) =>
      ensurePoemIdentity(poem, `starter_${index}`)
    );

    this.availablePoems = [...shuffled];
    this.availablePoemIds = new Set(shuffled.map((poem) => poem.id));
    this.usedPoemIds = new Set(shuffled.map((poem) => poem.id));

    this.virtualSlots = Array.from({ length: this.options.virtualSize }, (_, index) => {
      if (index < shuffled.length) {
        return { poem: shuffled[index], isLoading: false };
      }
      return { poem: null, isLoading: false };
    });

    this.isInitialized = true;
    return this.virtualSlots;
  }

  getSlots(): VirtualSlot[] {
    if (!this.isInitialized) {
      return this.initialiseWithStarterPoems();
    }
    return this.virtualSlots;
  }

  setDatabaseReady(ready: boolean): void {
    this.isDatabaseReady = ready;
  }

  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  getSource(): PoemFeedSource {
    return this.poemSource;
  }

  setSource(source: PoemFeedSource): VirtualSlot[] {
    if (this.poemSource === source) {
      return this.virtualSlots;
    }

    this.poemSource = source;
    return this.initialiseWithStarterPoems();
  }

  cleanupAround(index: number): VirtualSlot[] {
    const { cleanupDistance } = this.options;
    const updatedSlots = this.virtualSlots.map((slot, slotIndex) => {
      if (!slot.poem) {
        return slot;
      }

      const distance = Math.abs(slotIndex - index);
      if (distance > cleanupDistance) {
        return { poem: null, isLoading: false };
      }

      return slot;
    });

    const nextUsedIds = new Set<Poem['id']>();
    updatedSlots.forEach((slot) => {
      if (slot.poem) {
        nextUsedIds.add(slot.poem.id);
      }
    });

    this.virtualSlots = updatedSlots;
    this.usedPoemIds = nextUsedIds;
    return this.virtualSlots;
  }

  async loadSlots(indices: number[]): Promise<VirtualSlot[]> {
    if (!this.isInitialized) {
      this.initialiseWithStarterPoems();
    }

    if (!this.isDatabaseReady || this.isLoading) {
      return this.virtualSlots;
    }

    const uniqueIndices = Array.from(new Set(indices)).filter((index) =>
      index >= 0 && index < this.virtualSlots.length
    );

    if (uniqueIndices.length === 0) {
      return this.virtualSlots;
    }

    const targetIndices = uniqueIndices.filter((index) => {
      const slot = this.virtualSlots[index];
      return !slot.poem && !slot.isLoading;
    });

    if (targetIndices.length === 0) {
      return this.virtualSlots;
    }

    this.isLoading = true;

    try {
      // Mark as loading
      targetIndices.forEach((index) => {
        this.virtualSlots[index] = { poem: null, isLoading: true };
      });

      const updates = new Map<number, VirtualSlot>();
      const workingUsedIds = new Set(this.usedPoemIds);
      const pendingIndices: number[] = [];

      const takeAvailablePoem = (): Poem | null => {
        for (const poem of this.availablePoems) {
          if (!workingUsedIds.has(poem.id)) {
            workingUsedIds.add(poem.id);
            return poem;
          }
        }
        return null;
      };

      targetIndices.forEach((index) => {
        const poem = takeAvailablePoem();
        if (poem) {
          updates.set(index, { poem, isLoading: false });
        } else {
          pendingIndices.push(index);
        }
      });

      if (pendingIndices.length > 0) {
        const fetched = await this.fetchAdditionalPoems(Math.max(20, pendingIndices.length * 2));
        this.absorbPoems(fetched);

        pendingIndices.forEach((index) => {
          const poem = takeAvailablePoem();
          if (poem) {
            updates.set(index, { poem, isLoading: false });
          } else {
            updates.set(index, { poem: null, isLoading: false });
          }
        });
      }

      updates.forEach((slot, index) => {
        this.virtualSlots[index] = slot;
      });

      this.usedPoemIds = workingUsedIds;
      return this.virtualSlots;
    } finally {
      this.isLoading = false;
    }
  }

  getPoolStats() {
    return {
      available: this.availablePoems.length,
      used: this.usedPoemIds.size,
    };
  }

  private absorbPoems(poems: Poem[]): void {
    poems.forEach((poem, index) => {
      const normalized = ensurePoemIdentity(poem, `dynamic_${index}`);
      const poemId = normalized.id;

      if (this.availablePoemIds.has(poemId)) {
        return;
      }

      this.availablePoemIds.add(poemId);
      this.availablePoems.push({ ...normalized });
    });
  }

  private async fetchAdditionalPoems(limit: number): Promise<Poem[]> {
    const { fetchLocal, fetchHybrid, fetchRemote } = this.fetchers;
    const source = this.poemSource;

    const attempt = async () => {
      if (source === 'hybrid' && this.isOnline && fetchHybrid) {
        return fetchHybrid(limit);
      }

      if (source === 'api' && this.isOnline && fetchRemote) {
        return fetchRemote(limit);
      }

      return fetchLocal(limit);
    };

    try {
      return await attempt();
    } catch (error) {
      console.warn('Falling back to local poems after fetch failure', error);
      return fetchLocal(limit);
    }
  }
}
