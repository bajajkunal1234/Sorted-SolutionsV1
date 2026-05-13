const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, status, created_at, customer_name, source')
    .order('created_at', { ascending: false })
    .limit(10);
  console.log(JSON.stringify(jobs, null, 2));
}
run();
