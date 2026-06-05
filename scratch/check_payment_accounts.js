const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('accounts').select('id, name, type, under, opening_balance, balance_type');
  if (error) {
    console.error(error);
  } else {
    // filter cash or bank accounts
    const filtered = data.filter(a => {
      const u = (a.under || '').toLowerCase();
      const n = (a.name || '').toLowerCase();
      const t = (a.type || '').toLowerCase();
      return u.includes('bank') || u.includes('cash') || n.includes('cash') || n.includes('bank') || t.includes('bank') || t.includes('cash');
    });
    console.log(JSON.stringify(filtered, null, 2));
  }
}
run();
