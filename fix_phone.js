const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('id, name, mobile')
    .ilike('name', '%Kalpesh Mahulkar%');
    
  for (const account of accounts || []) {
      if (account.mobile && account.mobile.length === 10 && !account.mobile.startsWith('+91-')) {
          const raw = account.mobile;
          const formatted = `+91-${raw.slice(0, 5)} ${raw.slice(5)}`;
          console.log(`Updating ${account.name} mobile: ${raw} -> ${formatted}`);
          await supabase.from('accounts').update({ mobile: formatted }).eq('id', account.id);
      } else {
          console.log(`Account ${account.name} mobile already formatted or invalid: ${account.mobile}`);
      }
  }
}
run();
