const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectQuotations() {
  const { data, error } = await supabase
    .from('quotations')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching quotations:", error);
  } else {
    console.log("Quotations column sample data:", data);
  }
}

inspectQuotations();
