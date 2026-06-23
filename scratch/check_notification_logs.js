const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(20);
    
  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }
  
  console.log('Recent notification logs:');
  console.log(JSON.stringify(data, null, 2));
}

run();
