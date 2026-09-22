// Supabase client. It is created only when the two EXPO_PUBLIC_ variables are
// set (see .env.example); without them the concept runs on local demo data.

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// `expo start --web` renders pages once in Node (static output), where there is
// no browser storage. There the client gets an empty in-memory storage and does
// not try to keep a session.
const isServer = typeof window === 'undefined';
const noStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: isServer ? noStorage : AsyncStorage,
          autoRefreshToken: !isServer,
          persistSession: !isServer,
          detectSessionInUrl: false,
        },
      })
    : null;

// True when the app talks to the real database.
export const CLOUD = supabase !== null;
