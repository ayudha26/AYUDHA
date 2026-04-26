// List Supabase storage buckets and sample files to locate 'civil' objects
// Usage: node scripts/list_storage_buckets.js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(url.trim(), key.trim());

(async () => {
  try {
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) throw bErr;

    console.log('Buckets found:', buckets.length);
    for (const b of buckets) {
      console.log('\nBucket:', b.name, b.public ? '(public)' : '(private)');
      try {
        const { data: files, error: fErr } = await supabase.storage.from(b.name).list('', { limit: 1000 });
        if (fErr) {
          console.error('  Failed listing files for', b.name, fErr.message || fErr);
          continue;
        }
        console.log('  Files at root:', files.length);
        const sample = files.slice(0, 20).map((f) => f.name).join('\n    - ');
        if (sample) console.log('  Sample files:\n    - ' + sample);

        // try to find 'civil' folder or files
        const matches = files.filter((f) => f.name.toLowerCase().includes('civil') || f.name.toLowerCase().includes('acc') || f.name.toLowerCase().includes('suraksha'));
        if (matches.length) {
          console.log('  Matches in root:');
          for (const m of matches) console.log('    -', m.name);
        }

        // Also try listing a 'civil' prefix
        const { data: civilFiles } = await supabase.storage.from(b.name).list('civil', { limit: 1000 });
        if (civilFiles && civilFiles.length) {
          console.log('  Found files under prefix "civil":', civilFiles.length);
          for (const cf of civilFiles.slice(0, 20)) console.log('    -', cf.name);
        }
      } catch (err) {
        console.error('  Error listing bucket', b.name, err && err.message ? err.message : err);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err && err.message ? err.message : err);
    process.exit(1);
  }
})();
