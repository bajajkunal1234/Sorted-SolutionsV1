const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectNotifications() {
  const { data, error } = await supabase
    .from('app_notifications')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching notifications:", error);
  } else {
    console.log("Notifications column sample data:", data);
  }
}

inspectNotifications();
