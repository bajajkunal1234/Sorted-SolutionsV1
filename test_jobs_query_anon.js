const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim().replace(/['"]/g, '');
let supabaseKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim().replace(/['"]/g, '');
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
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error("QUERY ERROR (Anon Key):", error);
  } else {
    console.log("QUERY SUCCESS (Anon Key), count:", data.length);
    console.log("FIRST JOB:", JSON.stringify(data[0], null, 2));
  }
}
run();
