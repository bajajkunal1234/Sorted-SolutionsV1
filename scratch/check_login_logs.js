const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("--- Querying Login Logs for Hitesh ---");
  const { data: logs, error: logErr } = await supabase
    .from('interactions')
    .select('*')
    .ilike('customer_name', '%Hitesh%');
    
  if (logErr) {
    console.error("Error fetching logs:", logErr);
  } else {
    console.log("Logs found:", JSON.stringify(logs, null, 2));
  }
}

run();
