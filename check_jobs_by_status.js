const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('status, id, job_number, customer_name, created_at, source');
  
  const byStatus = {};
  for (const job of jobs || []) {
      if (!byStatus[job.status]) byStatus[job.status] = [];
      byStatus[job.status].push(job);
  }
  
  for (const status in byStatus) {
      console.log(`Status: ${status} (${byStatus[status].length})`);
      if (status === 'enquiry' || status === 'booking_request' || status === 'new_job_request') {
          console.log(byStatus[status]);
      }
  }
}
run();
