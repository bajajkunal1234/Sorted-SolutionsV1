const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testNotificationInsert() {
  const result = await supabase.from('app_notifications').insert({
      recipient_type: 'admin',
      recipient_id: 'admin',
      title: 'Test Notification',
      message: 'This is a test notification from anon client',
      link: '/admin',
      is_read: false
  }).select();

  console.log("Notification insert result:", result);
  
  if (result.data && result.data.length > 0) {
      await supabase.from('app_notifications').delete().eq('id', result.data[0].id);
      console.log("Cleanup done.");
  }
}

testNotificationInsert();
