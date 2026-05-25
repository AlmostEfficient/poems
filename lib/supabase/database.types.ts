export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type EmptyRecord = Record<string, never>;

type SavedPoemScope = 'catalogue' | 'user';
type UserPoemLanguage = 'en' | 'ur';
type UserPoemOrigin = 'manual' | 'scanner' | 'import';

// Placeholder until Supabase migrations exist and generated types can replace it.
export type Database = {
  public: {
    Tables: {
      saved_poems: {
        Row: {
          id: string;
          user_id: string;
          poem_id: string;
          poem_scope: SavedPoemScope;
          saved_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          poem_id: string;
          poem_scope: SavedPoemScope;
          saved_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          poem_id?: string;
          poem_scope?: SavedPoemScope;
          saved_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      user_poems: {
        Row: {
          id: string;
          user_id: string;
          poem_id: string;
          title: string;
          author: string;
          content: string;
          language: UserPoemLanguage;
          metadata: Json;
          origin: UserPoemOrigin;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          poem_id: string;
          title: string;
          author: string;
          content: string;
          language: UserPoemLanguage;
          metadata?: Json;
          origin?: UserPoemOrigin;
          created_at: string;
          updated_at: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          poem_id?: string;
          title?: string;
          author?: string;
          content?: string;
          language?: UserPoemLanguage;
          metadata?: Json;
          origin?: UserPoemOrigin;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: EmptyRecord;
    Functions: EmptyRecord;
    Enums: EmptyRecord;
    CompositeTypes: EmptyRecord;
  };
};
