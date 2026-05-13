const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("--- Customer Accounts ---");
  const { data: accounts, error: err1 } = await supabase
    .from('accounts')
    .select('*')
    .ilike('name', '%Kalpesh Mahulkar%');
  console.log(JSON.stringify(accounts, null, 2));

  console.log("\n--- Properties ---");
  if (accounts && accounts.length > 0) {
      for (const account of accounts) {
          const { data: props } = await supabase
              .from('properties')
              .select('*')
              .eq('customer_id', account.id);
          console.log(`Properties for account ${account.id}:`, JSON.stringify(props, null, 2));
      }
  }

  console.log("\n--- Jobs ---");
  const { data: jobs, error: err3 } = await supabase
    .from('jobs')
    .select('*')
    .ilike('customer_name', '%Kalpesh Mahulkar%');
  console.log(JSON.stringify(jobs, null, 2));
  
  if (jobs && jobs.length > 0) {
    for (const job of jobs) {
      console.log(`\n--- Interactions for Job ${job.job_number} ---`);
      const { data: interactions } = await supabase
        .from('job_interactions')
        .select('*')
        .eq('job_id', job.id)
        .order('created_at', { ascending: true });
      console.log(JSON.stringify(interactions, null, 2));
    }
  }
}
run();
