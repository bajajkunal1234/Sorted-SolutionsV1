const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkJob() {
  const jobId = '54b1e371-3329-4554-9273-fa49a37e5ec0';
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, job_number, status')
    .eq('id', jobId)
    .single();

  console.log("Job:", job);
  if (error) console.error("Error:", error);
}

checkJob();
