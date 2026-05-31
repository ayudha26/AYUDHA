// Print SQL UPDATE statements for given product name patterns and public image URLs
// Usage: node scripts/print_image_update_sql.js
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
    const sqls = [];
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
        sqls.push({ id: p.id, name: p.name, sql: `UPDATE products SET image_url = '${u.url}' WHERE id = '${p.id}';` });
      }
    }

    if (!sqls.length) {
      console.log('No SQL updates generated.');
      return;
    }

    console.log('-- Run the following statements in the Supabase SQL editor (requires authenticated DB user with write access):\n');
    for (const s of sqls) {
      console.log('--', s.name);
      console.log(s.sql);
    }
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
