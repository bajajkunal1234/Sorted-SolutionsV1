const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase env vars missing!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const phone = '9833565746'; // Mahesh Indulkar
  console.log(`Updating lead source for phone ${phone} to "google_ads"...`);
  
  const { data, error } = await supabase
    .from('lead_attributions')
    .update({ lead_source: 'google_ads' })
    .eq('phone', phone)
    .select('*')
    .single();
    
  if (error) {
    console.error('Error updating lead source:', error);
  } else {
    console.log('Update result:', data);
  }
}

run();
