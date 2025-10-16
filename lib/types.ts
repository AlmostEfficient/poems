export type PoemSource = 'bundled' | 'local' | 'hybrid' | 'api' | 'user';

export interface Poem {
  id: number | string;
  title: string;
  author: string;
  content: string;
  source?: PoemSource;
  language: 'en' | 'ur';
}

export interface VirtualSlot {
  poem: Poem | null;
  isLoading: boolean;
}

export interface PoemBatchOptions {
  source?: PoemSource;
  limit?: number;
  language?: 'en' | 'ur';
}
