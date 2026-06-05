const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const insertData = {
    job_number: "TEST-9999",
    customer_id: "100366", // Integer ledger ID as a string
    customer_name: "Mr. Billimoria",
    description: "Test job creation",
    status: "new_job_request",
    priority: "normal",
    category: "Oven",
    appliance: "Oven"
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([insertData])
    .select();

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}
run();
