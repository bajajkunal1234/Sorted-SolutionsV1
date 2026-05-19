const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data: invoices, error } = await supabase
    .from('sales_invoices')
    .select('*')
    .eq('job_id', 'f420d38b-cf4b-4dbd-80e2-80ddc93a5ba0');
  console.log('--- INVOICES FOR JOB ---');
  console.log(JSON.stringify(invoices, null, 2));
}
run();
