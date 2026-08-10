require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Failed to list buckets:", error);
    } else {
      console.log("Buckets:", buckets);
      const mediaBucket = buckets.find(b => b.name === 'media');
      if (mediaBucket) {
        console.log("Media bucket exists! Public:", mediaBucket.public);
      } else {
        console.log("Media bucket does NOT exist!");
      }
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}
check();
