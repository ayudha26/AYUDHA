// For each product in the DB, try common filename variants in the 'civil' public folder
// to find which image URLs return 200. Prints SQL UPDATE statements for matches.
// Usage: node scripts/find_images_by_product.js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

const extCandidates = ['.JPG', '.jpg', '.PNG', '.png', '.JPEG', '.jpeg', '.WebP', '.webp'];

const normalizeName = (name) => {
  if (!name) return '';
  return name
    .replace(/\s+/g, ' ')
    .replace(/[\u2018\u2019\u201c\u201d]/g, "'")
    .replace(/[\/:?\\]/g, '')
    .trim();
};

const buildCandidates = (name) => {
  const nm = normalizeName(name);
  const upper = nm.toUpperCase();
  const stripped = upper.replace(/[^A-Z0-9 ]+/g, '');
  const candidates = [];
  // exact uppercase
  extCandidates.forEach((ext) => candidates.push(`${upper}${ext}`));
  // stripped
  extCandidates.forEach((ext) => candidates.push(`${stripped}${ext}`));
  // replace spaces with %20 via encodeURIComponent when building URL
  // also try short name (first two words)
  const parts = stripped.split(' ');
  if (parts.length > 1) {
    const firstTwo = parts.slice(0, 2).join(' ');
    extCandidates.forEach((ext) => candidates.push(`${firstTwo}${ext}`));
  }
  return Array.from(new Set(candidates));
};

(async () => {
  try {
    const { data: products, error: pErr } = await supabase.from('products').select('id,name,image_url').limit(1000);
    if (pErr) throw pErr;
    console.log(`Checking ${products.length} products for public images...`);

    const matches = [];

    const fetchWithTimeout = async (input, opts = {}, ms = 4000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      try {
        const res = await fetch(input, { ...opts, signal: controller.signal });
        return res;
      } finally {
        clearTimeout(id);
      }
    };

    // process in small batches to avoid long serial runs
    const batchSize = 12;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (p) => {
          const candidates = buildCandidates(p.name);
          for (const fname of candidates) {
            const publicUrl = `${url.trim().replace(/\/$/, '')}/storage/v1/object/public/civil/${encodeURIComponent(fname)}`;
            try {
              const resp = await fetchWithTimeout(publicUrl, { method: 'HEAD' }, 3000);
              if (resp && resp.status === 200) {
                matches.push({ id: p.id, name: p.name, url: publicUrl });
                break;
              }
            } catch (err) {
              // ignore timeouts or fetch errors for this candidate
            }
          }
        })
      );
      process.stdout.write('.');
    }
    process.stdout.write('\n');

    if (!matches.length) {
      console.log('No images found via filename heuristics.');
      return;
    }

    console.log('Found images for products:');
    for (const m of matches) {
      console.log(`UPDATE products SET image_url = '${m.url}' WHERE id = '${m.id}';`);
    }
    console.log('\nRun the updates manually or extend this script to apply updates.');
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
