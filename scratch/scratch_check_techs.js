require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTechs() {
  console.log("=== DB QUERY START ===");

  const { data: techs, error } = await supabase
    .from('technicians')
    .select('*');

  if (error) {
    console.error("Error fetching technicians:", error);
    return;
  }

  console.log("All Technicians in Database:", techs);

  console.log("=== DB QUERY END ===");
}

checkTechs();
