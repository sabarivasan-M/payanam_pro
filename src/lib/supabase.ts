import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { config } from '@/constants/config';

/**
 * Supabase client — created only when DEMO_MODE is off and public credentials exist.
 * The anon key is public by design; Row Level Security (supabase/migrations) protects the data.
 */
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (config.DEMO_MODE) {
    throw new Error('Supabase is disabled in DEMO MODE. Set EXPO_PUBLIC_DEMO_MODE=false and add credentials.');
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  }
  return client;
}
