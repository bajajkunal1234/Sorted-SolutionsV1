const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Env variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectInteractions() {
  const { data, error } = await supabase
    .from('interactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching interactions:", error);
  } else {
    console.log("Interactions column sample data:", data);
  }
}

inspectInteractions();
