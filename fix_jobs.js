const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, job_number, customer_name, customer_id, property_id')
    .is('customer_id', null)
    .not('customer_name', 'is', null)
    .not('customer_name', 'eq', 'Website Lead');
    
  console.log('Affected jobs:', jobs);
  
  for (const job of jobs || []) {
      const { data: customers } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('name', job.customer_name);
        
      if (customers && customers.length > 0) {
          const customer_id = customers[0].id;
          console.log(`Fixing job ${job.job_number}: linking to customer ${customer_id}`);
          await supabase.from('jobs').update({ customer_id }).eq('id', job.id);
      }
  }
}
run();
