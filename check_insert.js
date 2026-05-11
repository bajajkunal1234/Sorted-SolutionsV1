const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('jobs').select('technician_id').limit(1);
  console.log("No column_default metadata in REST API.");
  // Let me just send an insert and see if technician_id comes back automatically.
  const { data: newJob, error: insertError } = await supabase.from('jobs').insert({
      job_number: 'TEST-1234',
      status: 'new_job_request',
      customer_name: 'Test',
      source: 'test'
  }).select('id, technician_id').single();
  console.log("Inserted job technician_id:", newJob?.technician_id);
  if (newJob) await supabase.from('jobs').delete().eq('id', newJob.id);
}
run();
