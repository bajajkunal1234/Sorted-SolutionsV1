const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function searchAll() {
  const target = '54b1e371-3329-4554-9273-fa49a37e5ec0';
  const tables = ['jobs', 'properties', 'customer_properties', 'interactions', 'accounts', 'technicians', 'customers'];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .or(`id.eq.${target}`)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`FOUND in table: ${table}`, data[0]);
      return;
    }
  }
  console.log("Not found in any standard table.");
}

searchAll();
