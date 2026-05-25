import { STARTER_POEMS, FEATURED_STARTER_IDS } from '../data/starterPoems';
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

  private poemCursor = 0;

  private isInitialized = false;

  private isDatabaseReady = false;

  private isOnline = false;

  private isLoading = false;

  private pendingLoadIndices = new Set<number>();

  private poemSource: PoemFeedSource = 'local';

  private fetchers: PoemFetchers;

  private activeLanguage: Poem['language'];

  constructor(
    fetchers: PoemFetchers,
    private readonly options: PoemFeedOptions,
    initialLanguage: Poem['language'] = 'en'
  ) {
    this.fetchers = fetchers;
    this.activeLanguage = initialLanguage;
    this.virtualSlots = Array.from({ length: options.virtualSize }, () => ({
      poem: null,
      isLoading: false,
    }));
  }

  initialiseWithStarterPoems(language: Poem['language'] = this.activeLanguage): VirtualSlot[] {
    const starters = STARTER_POEMS.filter((poem) => poem.language === language);
    const featuredSet = new Set(FEATURED_STARTER_IDS);
    const featured = FEATURED_STARTER_IDS.map((id) => starters.find((poem) => poem.id === id)).filter(
      (poem): poem is Poem => Boolean(poem)
    );
    const remaining = starters.filter((poem) => !featuredSet.has(poem.id));
    const ordered = [...featured, ...shuffle(remaining)];
    const normalised = ordered.map((poem, index) => ensurePoemIdentity(poem, `starter_${index}`));

    this.availablePoems = [...normalised];
    this.availablePoemIds = new Set(normalised.map((poem) => poem.id));
    this.usedPoemIds = new Set(normalised.map((poem) => poem.id));

    this.virtualSlots = Array.from({ length: this.options.virtualSize }, (_, index) => {
      if (index < normalised.length) {
        return { poem: normalised[index], isLoading: false };
      }
      return { poem: null, isLoading: false };
    });

    this.isInitialized = true;
    this.poemCursor = 0;
    return this.virtualSlots;
  }

  getSlots(): VirtualSlot[] {
    if (!this.isInitialized) {
      return this.initialiseWithStarterPoems(this.activeLanguage);
    }
    return this.virtualSlots;
  }

  updateFetchers(fetchers: PoemFetchers): void {
    this.fetchers = fetchers;
  }

  setLanguage(language: Poem['language']): VirtualSlot[] {
    if (this.activeLanguage === language) {
      return this.virtualSlots;
    }

    this.activeLanguage = language;
    return this.initialiseWithStarterPoems(this.activeLanguage);
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
    return this.initialiseWithStarterPoems(this.activeLanguage);
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

    const uniqueIndices = this.normalizeLoadIndices(indices);

    if (uniqueIndices.length === 0 || !this.isDatabaseReady) {
      return this.virtualSlots;
    }

    if (this.isLoading) {
      uniqueIndices.forEach((index) => this.pendingLoadIndices.add(index));
      return this.virtualSlots;
    }

    this.isLoading = true;

    try {
      let nextIndices = uniqueIndices;

      while (nextIndices.length > 0) {
        await this.loadSlotBatch(nextIndices);
        nextIndices = this.consumePendingLoadIndices();
      }

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

  private normalizeLoadIndices(indices: number[]): number[] {
    return Array.from(new Set(indices)).filter((index) => index >= 0 && index < this.virtualSlots.length);
  }

  private consumePendingLoadIndices(): number[] {
    const indices = this.normalizeLoadIndices(Array.from(this.pendingLoadIndices));
    this.pendingLoadIndices.clear();
    return indices;
  }

  private async loadSlotBatch(indices: number[]): Promise<void> {
    const targetIndices = indices.filter((index) => {
      const slot = this.virtualSlots[index];
      return !slot.poem && !slot.isLoading;
    });

    if (targetIndices.length === 0) {
      return;
    }

    targetIndices.forEach((index) => {
      this.virtualSlots[index] = { poem: null, isLoading: true };
    });

    const updates = new Map<number, VirtualSlot>();
    const workingUsedIds = new Set(this.usedPoemIds);
    const pendingIndices: number[] = [];

    targetIndices.forEach((index) => {
      const poem = this.takeNextPoem(workingUsedIds);
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
        const poem = this.takeNextPoem(workingUsedIds);
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

  private refreshCursor(): void {
    if (this.availablePoems.length === 0) {
      this.poemCursor = 0;
      return;
    }

    const normalizedCursor = this.poemCursor % this.availablePoems.length;
    this.poemCursor = normalizedCursor >= 0 ? normalizedCursor : normalizedCursor + this.availablePoems.length;
  }

  private takeNextPoem(workingUsedIds: Set<Poem['id']>): Poem | null {
    if (this.availablePoems.length === 0) {
      return null;
    }

    this.refreshCursor();

    const total = this.availablePoems.length;

    for (let offset = 0; offset < total; offset += 1) {
      const index = (this.poemCursor + offset) % total;
      const candidate = this.availablePoems[index];
      if (!workingUsedIds.has(candidate.id)) {
        workingUsedIds.add(candidate.id);
        this.poemCursor = (index + 1) % total;
        return candidate;
      }
    }

    // All poems are currently marked as in use. Rebuild the working set from active slots
    workingUsedIds.clear();
    this.virtualSlots.forEach((slot) => {
      if (slot.poem) {
        workingUsedIds.add(slot.poem.id);
      }
    });

    for (let offset = 0; offset < total; offset += 1) {
      const index = (this.poemCursor + offset) % total;
      const candidate = this.availablePoems[index];
      if (!workingUsedIds.has(candidate.id)) {
        workingUsedIds.add(candidate.id);
        this.poemCursor = (index + 1) % total;
        return candidate;
      }
    }

    // Still no available poems (all visible) — loop anyway using next in sequence
    const fallback = this.availablePoems[this.poemCursor % total];
    workingUsedIds.add(fallback.id);
    this.poemCursor = (this.poemCursor + 1) % total;
    return fallback;
  }
}
