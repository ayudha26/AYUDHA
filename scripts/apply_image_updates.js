// Apply specific image URL updates to products by name matching
// Usage: node scripts/apply_image_updates.js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

const updates = [
  { nameLike: 'acc suraksha', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/ACC%20Suraksha.png' },
  { nameLike: 'mat chape', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/Mat%20chape.jpg' },
  { nameLike: 'civil wire mesh', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/Civil%20Wire%20Mesh.jpg' },
  { nameLike: 'priya', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/Priya%20cement%20.JPG' },
  { nameLike: 'ramco', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/Ramco%20cement.JPG' },
  { nameLike: 'ultra', url: 'https://crgifantdhqwenqypgey.supabase.co/storage/v1/object/public/civil/Ultra%20tech.JPG' },
];

(async () => {
  try {
    for (const u of updates) {
      const like = `%${u.nameLike}%`;
      const { data: products, error: pErr } = await supabase.from('products').select('id,name,image_url').ilike('name', like).limit(50);
      if (pErr) {
        console.error('Error querying products for', u.nameLike, pErr);
        continue;
      }
      if (!products || !products.length) {
        console.log('No products found matching', u.nameLike);
        continue;
      }

      for (const p of products) {
        const { error: upErr } = await supabase.from('products').update({ image_url: u.url }).eq('id', p.id);
        if (upErr) {
          console.error('Failed to update', p.name, upErr);
        } else {
          console.log('Updated', p.name, '->', u.url);
        }
      }
    }
    console.log('Done.');
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
