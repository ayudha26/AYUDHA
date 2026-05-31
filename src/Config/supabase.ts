import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage';

function normalizeUrlMaybe(raw?: string) {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  // If protocol missing, assume https
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    // Validate using URL constructor
    // eslint-disable-next-line no-new
    new URL(withProto);
    return withProto;
  } catch (err) {
    return undefined;
  }
}

const rawSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawSupabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;

const supabaseUrl = normalizeUrlMaybe(rawSupabaseUrl);
const supabaseKey = rawSupabaseKey ? rawSupabaseKey.trim() : undefined;
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] Missing or invalid config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your root .env file. EXPO_PUBLIC_SUPABASE_URL must include a valid host (protocol will be added if missing).'
  );
}

// Never throw during module import, otherwise the React Native root component
// cannot register and you'll see "main has not been registered".
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackKey = 'placeholder-anon-key';

const supabase = createClient(supabaseUrl || fallbackUrl, supabaseKey || fallbackKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Runtime diagnostics to help debug network/fetch issues in Expo/dev
// Log once to avoid flooding Metro (can be noisy on hot reload)
try {
  // eslint-disable-next-line no-undef
  if (typeof global !== 'undefined' && !(global as any).__SUPABASE_RUNTIME_LOGGED) {
    // eslint-disable-next-line no-console
    console.log('[supabase] runtime config', {
      usedUrl: supabaseUrl || fallbackUrl,
      usingFallback: !supabaseUrl,
      keyPresent: Boolean(supabaseKey),
      keyPreview: supabaseKey ? `${supabaseKey.slice(0, 6)}...` : undefined,
    });
    // eslint-disable-next-line no-undef
    (global as any).__SUPABASE_RUNTIME_LOGGED = true;
  }
} catch (e) {
  // ignore
}

export { isSupabaseConfigured, supabaseKey, supabaseUrl };
export default supabase
