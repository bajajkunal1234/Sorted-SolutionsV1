const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("--- Querying All Technicians ---");
  const { data: techs, error: techErr } = await supabase
    .from('technicians')
    .select('id, name, email, phone, current_session_token, active, is_active');
    
  if (techErr) {
    console.error("Error fetching techs:", techErr);
    return;
  }
  console.log("Technicians:", JSON.stringify(techs, null, 2));

  console.log("\n--- Querying All Live Locations ---");
  const { data: locs, error: locErr } = await supabase
    .from('technician_live_locations')
    .select('*');
    
  if (locErr) {
    console.error("Error fetching locations:", locErr);
  } else {
    console.log("Live Locations:", JSON.stringify(locs, null, 2));
  }
}

run();
