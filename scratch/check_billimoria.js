const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('name', 'Mr. Billimoria');

  if (error) {
    console.error(error);
  } else {
    console.log("Account matching Mr. Billimoria:", data);
  }
}
run();
