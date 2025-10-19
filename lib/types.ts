export type PoemSource = 'bundled' | 'local' | 'hybrid' | 'api' | 'user';

export type PoemLengthBucket = 'short' | 'medium' | 'long';

export interface PoemMetadata {
  tags?: string[];
  themes?: string[];
  moods?: string[];
  form?: string | null;
  era?: string | null;
  length?: PoemLengthBucket | null;
}

export interface Poem {
  id: string;
  title: string;
  author: string;
  content: string;
  source?: PoemSource;
  language: 'en' | 'ur';
  metadata?: PoemMetadata | null;
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
