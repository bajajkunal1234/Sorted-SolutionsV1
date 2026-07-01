const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkInteractions() {
  const jobId = '54b1e371-3329-4554-9273-fa49a37e5ec0';
  const { data: interactions, error } = await supabase
    .from('interactions')
    .select('*')
    .eq('job_id', jobId);

  console.log("Interactions for job:", interactions);
  if (error) console.error("Error:", error);
}

checkInteractions();
