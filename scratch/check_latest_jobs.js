const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: latestJobs } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: billimoriaJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('customer_name', 'Mr. Billimoria');

  console.log("Latest 5 jobs in DB:", latestJobs.map(j => ({
    id: j.id,
    job_number: j.job_number,
    customer_name: j.customer_name,
    customer_id: j.customer_id,
    status: j.status,
    created_at: j.created_at,
    description: j.description
  })));

  console.log("All jobs for Mr. Billimoria:", billimoriaJobs.map(j => ({
    id: j.id,
    job_number: j.job_number,
    customer_name: j.customer_name,
    customer_id: j.customer_id,
    status: j.status,
    created_at: j.created_at,
    description: j.description
  })));
}
run();
