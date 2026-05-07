import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

function normalizeUrl(raw?: string) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    new URL(withProtocol);
    return withProtocol;
  } catch {
    return undefined;
  }
}

const supabaseUrl = normalizeUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseKey = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

export default supabase;
