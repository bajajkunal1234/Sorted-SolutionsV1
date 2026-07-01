const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  const { data, error } = await supabase.rpc('inspect_table_columns', { table_name: 'interactions' });
  if (error) {
    // If no RPC, query columns via information_schema
    const { data: cols, error: err2 } = await supabase.from('interactions').select('*').limit(1);
    console.log("Col names:", Object.keys(cols?.[0] || {}));
    
    // Let's check a job too
    const { data: jobs } = await supabase.from('jobs').select('id').limit(1);
    console.log("Jobs ID type:", typeof jobs?.[0]?.id, jobs?.[0]);
  } else {
    console.log("Columns:", data);
  }
}

inspectSchema();
