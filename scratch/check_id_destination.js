const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const targetId = 'b6db97b3-1c75-48bb-8544-5f33609026f0'; // customer_id from existing job
  
  const { data: acc } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', targetId);

  const { data: cust } = await supabase
    .from('customers')
    .select('*')
    .eq('id', targetId);

  console.log("In accounts:", acc);
  console.log("In customers:", cust);
}
run();
