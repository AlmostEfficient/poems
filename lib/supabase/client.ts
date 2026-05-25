import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient<Database> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export class SupabaseConfigError extends Error {
  constructor() {
    super('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
    this.name = 'SupabaseConfigError';
  }
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(supabaseUrl as string, supabasePublishableKey as string, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

export function requireSupabaseClient(): SupabaseClient<Database> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new SupabaseConfigError();
  }

  return supabase;
}

export function registerSupabaseAppStateListener(): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || appStateSubscription) {
    return () => undefined;
  }

  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });

  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }

  return () => {
    appStateSubscription?.remove();
    appStateSubscription = null;
  };
}
