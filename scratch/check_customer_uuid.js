const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const ledgerId = 'd3fdf5e8-80ed-47dc-8095-9a1109537904'; // Mr. Billimoria's actual accounts.id UUID
  
  // Find in accounts
  const { data: acc, error: accErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', ledgerId);

  // Find in customers by ledger_id
  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('ledger_id', ledgerId);

  if (accErr) console.error("Account error:", accErr);
  else console.log("Account:", acc);
  
  if (custErr) console.error("Customer error:", custErr);
  else console.log("Customer UUID records:", cust);
}
run();
