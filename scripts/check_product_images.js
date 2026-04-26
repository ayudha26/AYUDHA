// Check image_url for specific product IDs and for products missing images
// Usage: node scripts/check_product_images.js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

const idsToCheck = [
  'f89e3d00-62b5-4d30-9cd7-5552c6ae344c', // Mat Chape
  '802876f8-4f25-4d45-943e-34295a4c3d6d', // Civil Wire Mesh
  '575adb8d-5b50-4c8c-9f10-ab5066c1b706', // Priya
  'ba342232-71b0-4366-93dd-0bc568460960', // Ramco
  '9c57f24b-d351-4efa-80b6-f85ef8f3d37f', // UltraTech
  '19cdef45-8890-4a98-aca2-11ea8dfda3fc', // ACC Suraksha (existing)
];

(async () => {
  try {
    console.log('Checking specific product IDs...');
    for (const id of idsToCheck) {
      const { data, error } = await supabase.from('products').select('id,name,image_url').eq('id', id).limit(1);
      if (error) console.error('Error fetching', id, error);
      else if (!data || data.length === 0) console.log('No product found for id', id);
      else console.log(data[0]);
    }

    console.log('\nListing first 20 products missing image_url...');
    const { data: missing, error: mErr } = await supabase.from('products').select('id,name').or('image_url.is.null,image_url.eq.').limit(20);
    if (mErr) console.error('Error fetching missing images', mErr);
    else {
      console.log('Products missing image_url:', missing.length);
      missing.forEach((p) => console.log('-', p.id, p.name));
    }
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
