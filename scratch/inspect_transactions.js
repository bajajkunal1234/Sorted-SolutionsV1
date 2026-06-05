const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data: rv, error: err1 } = await supabase.from('receipt_vouchers').select('*').limit(3);
  const { data: pv, error: err2 } = await supabase.from('payment_vouchers').select('*').limit(3);
  console.log("Receipts:");
  console.log(JSON.stringify(rv, null, 2));
  console.log("Payments:");
  console.log(JSON.stringify(pv, null, 2));
}
run();
