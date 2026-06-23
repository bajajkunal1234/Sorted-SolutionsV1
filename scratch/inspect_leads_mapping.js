const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const phone = '9664208493';
  console.log("Checking database for phone:", phone);

  // 1. Check lead_attributions
  const { data: leads, error: leadErr } = await supabase
    .from('lead_attributions')
    .select('*')
    .eq('phone', phone);
  
  console.log("\n--- LEAD ATTRIBUTIONS ---");
  if (leadErr) console.error(leadErr);
  else console.log(JSON.stringify(leads, null, 2));

  // 2. Check customers
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .select('*');
  
  const matchedCustomers = (customers || []).filter(c => {
    const clean = c.phone ? c.phone.replace(/\D/g, '') : '';
    return clean.includes(phone);
  });
  console.log("\n--- MATCHED CUSTOMERS ---");
  console.log(JSON.stringify(matchedCustomers, null, 2));

  // 3. Check accounts
  const { data: accounts, error: accErr } = await supabase
    .from('accounts')
    .select('*');
  
  const matchedAccounts = (accounts || []).filter(a => {
    const phoneClean = a.phone ? a.phone.replace(/\D/g, '') : '';
    const mobileClean = a.mobile ? a.mobile.replace(/\D/g, '') : '';
    return phoneClean.includes(phone) || mobileClean.includes(phone);
  });
  console.log("\n--- MATCHED ACCOUNTS ---");
  console.log(JSON.stringify(matchedAccounts, null, 2));
}

run();
