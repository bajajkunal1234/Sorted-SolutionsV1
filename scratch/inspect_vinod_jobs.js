const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking after-photos interactions for Kunal's jobs...");
  const { data: interactions, error } = await supabase
    .from('interactions')
    .select('timestamp, type, description, job_id, performed_by_name')
    .in('job_id', ['dc02262e-9226-4657-82ff-bc82708b9cd5', 'cc8a3908-ad15-4bee-9c73-537fa649c83b'])
    .eq('type', 'after-photos-uploaded');

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(interactions, null, 2));
  }
}
run();
