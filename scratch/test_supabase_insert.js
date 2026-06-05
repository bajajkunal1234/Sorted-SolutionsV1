const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const insertData = {
    customer_id: 'd3fdf5e8-80ed-47dc-8095-9a1109537904', // Mr. Billimoria
    customer_name: 'Mr. Billimoria',
    job_number: 'JOB-T9999',
    description: 'Test job for Mr. Billimoria',
    status: 'new_job_request',
    priority: 'normal',
    category: 'Oven',
    appliance: 'Oven',
    brand: 'Other',
    issue: 'Not Heating',
    scheduled_date: '2026-06-03',
    scheduled_time: 'Evening 5PM - 7PM',
    amount: 0,
    property: {
      id: 'prop-12345',
      address: 'Khodadad Circle dadar, Dadar East, Mumbai, Maharashtra, 400014',
      property_name: 'Home'
    }
  };

  const { data, error } = await supabase
    .from('jobs')
    .insert([insertData])
    .select();

  if (error) {
    console.error("Supabase Error:", error);
  } else {
    console.log("Insert Success! Data:", data);
  }
}
run();
