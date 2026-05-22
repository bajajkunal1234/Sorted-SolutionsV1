const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('jobs')
    .select(`
        *,
        customer:accounts(*),
        technician:technicians(*),
        rental:active_rentals(*),
        amc:active_amcs(*)
    `)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error("QUERY ERROR:", error);
  } else {
    console.log("QUERY SUCCESS, count:", data.length);
  }
}
run();
