const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const newContent = `Hello {customer_name}! 👋

We've prepared your repair estimate for service request (Job #{job_number}).

📋 *Quotation {quote_number}*

📱 View pdf & track your service request here:
{tracking_url}

Please review and let us know if you'd like to proceed. Feel free to call us for any queries.

— Sorted Solutions`;

  const { data, error } = await supabase
    .from('notification_templates')
    .update({ content: newContent })
    .eq('type', 'quotation_whatsapp');

  if (error) {
    console.error("Error updating template:", error);
  } else {
    console.log("Successfully updated quotation template in database!");
  }
}
run();
