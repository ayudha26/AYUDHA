// Sync civil storage files to product.image_url fields
// Usage:
//   npm install @supabase/supabase-js dotenv
//   node scripts/sync_civil_images.js        # preview SQL
//   node scripts/sync_civil_images.js --apply  # apply updates (will run updates via anon key)

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

(async () => {
  const apply = process.argv.includes('--apply');
  try {
    // list files in civil bucket (public objects)
    const { data: files, error: listErr } = await supabase.storage.from('civil').list('', { limit: 1000 });
    if (listErr) throw listErr;
    if (!files || !files.length) {
      console.log('No files found in `civil` bucket.');
      return;
    }

    const fileMap = files.map((f) => ({ name: f.name, normalized: normalize(f.name.replace(/\.[^.]+$/, '')) }));

    // fetch products - narrow to likely civil products by name match or by category if available
    const { data: products, error: prodErr } = await supabase.from('products').select('id,name,image_url,category_id');
    if (prodErr) throw prodErr;

    const updates = [];

    for (const p of products) {
      const pnorm = normalize(p.name);

      // skip if image_url already points to supabase public civil object
      if (typeof p.image_url === 'string' && p.image_url.includes('/storage/v1/object/public/civil/')) continue;

      // try exact match first
      let matched = fileMap.find((f) => f.normalized === pnorm);
      if (!matched) {
        // try includes
        matched = fileMap.find((f) => pnorm.includes(f.normalized) || f.normalized.includes(pnorm));
      }
      if (!matched) {
        // try each word match
        const parts = pnorm.split(' ');
        matched = fileMap.find((f) => parts.every((pt) => f.normalized.includes(pt) || f.normalized.startsWith(pt)));
      }

      if (matched) {
        const publicUrl = `${url.trim().replace(/\/$/, '')}/storage/v1/object/public/civil/${encodeURIComponent(matched.name)}`;
        updates.push({ id: p.id, name: p.name, file: matched.name, publicUrl });
      }
    }

    if (!updates.length) {
      console.log('No candidate updates found for products.');
      return;
    }

    console.log('Preview SQL updates:');
    for (const u of updates) {
      console.log("UPDATE products SET image_url = '" + u.publicUrl + "' WHERE id = '" + u.id + "';");
    }

    if (apply) {
      console.log('\nApplying updates via Supabase...');
      for (const u of updates) {
        const { error: upErr } = await supabase.from('products').update({ image_url: u.publicUrl }).eq('id', u.id);
        if (upErr) {
          console.error('Failed update for', u.name, upErr);
        } else {
          console.log('Updated', u.name);
        }
      }
      console.log('Done applying updates.');
    } else {
      console.log('\nRun with --apply to perform the updates.');
    }
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
