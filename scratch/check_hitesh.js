const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("--- Querying Technician ---");
  const { data: tech, error: techErr } = await supabase
    .from('technicians')
    .select('*')
    .ilike('name', '%Hitesh%');
    
  if (techErr) {
    console.error("Error fetching tech:", techErr);
  } else {
    console.log("Technicians found:", JSON.stringify(tech, null, 2));
  }
  
  if (tech && tech.length > 0) {
    const techId = tech[0].id;
    console.log(`\n--- Querying Live Locations for ID: ${techId} ---`);
    const { data: locs, error: locErr } = await supabase
      .from('technician_live_locations')
      .select('*')
      .eq('technician_id', techId);
      
    if (locErr) {
      console.error("Error fetching live locations:", locErr);
    } else {
      console.log("Locations found:", JSON.stringify(locs, null, 2));
    }
  }
}

run();
