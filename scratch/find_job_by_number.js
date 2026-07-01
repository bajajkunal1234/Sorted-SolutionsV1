const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findJobByNumber() {
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, job_number, status')
    .eq('job_number', 'JOB-1362')
    .single();

  console.log("Job by number:", job);
  if (error) console.error("Error:", error);
}

findJobByNumber();
