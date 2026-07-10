const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectTechnicians() {
  const { data, error } = await supabase
    .from('technicians')
    .select('*');

  if (error) {
    console.error("Error fetching technicians:", error);
  } else {
    console.log("Technicians list:");
    data.forEach(t => {
      console.log(`- ID: ${t.id}, Name: ${t.name}, Status/Active: ${t.status || t.active || 'N/A'}, Raw:`, t);
    });
  }
}

inspectTechnicians();
