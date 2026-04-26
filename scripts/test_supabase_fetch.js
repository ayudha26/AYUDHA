// Quick Node script to test fetching categories and products from Supabase.
// Usage:
//   npm install @supabase/supabase-js dotenv
//   node scripts/test_supabase_fetch.js

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

(async () => {
  try {
    const { data: categories, error: catErr } = await supabase.from('categories').select('*').limit(10);
    console.log('categories error:', catErr ? JSON.stringify(catErr, Object.getOwnPropertyNames(catErr), 2) : 'none');
    console.log('categories rows:', categories?.length ?? 0);

    const { data: products, error: prodErr } = await supabase.from('products').select('*').limit(10);
    console.log('products error:', prodErr ? JSON.stringify(prodErr, Object.getOwnPropertyNames(prodErr), 2) : 'none');
    console.log('products rows:', products?.length ?? 0);
  } catch (err) {
    console.error('Unexpected error:', err && err.stack ? err.stack : String(err));
  }
})();
