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
  console.log('Querying lead_attributions...');
  const { data: leads, error } = await supabase
    .from('lead_attributions')
    .select('*')
    .order('first_contact_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error('Error fetching leads:', error);
  } else {
    console.log('Recent 10 leads:');
    leads.forEach(l => {
      console.log(`Phone: ${l.phone}, Name: ${l.name}, Source: ${l.lead_source}, Status: ${l.status}, CreatedAt: ${l.first_contact_at || l.created_at}`);
    });
  }
}

run();
