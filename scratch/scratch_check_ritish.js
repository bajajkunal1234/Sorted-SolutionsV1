require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRitish() {
  console.log("=== DB QUERY START ===");

  const { data: accounts, error: err1 } = await supabase
    .from('accounts')
    .select('*')
    .ilike('name', '%Ritish%');

  if (err1) {
    console.error("Error fetching accounts:", err1);
    return;
  }

  for (const acc of accounts || []) {
    console.log("-----------------------------------------");
    console.log(`Account ID: ${acc.id}`);
    console.log(`Name: ${acc.name}`);
    console.log(`Mobile: ${acc.mobile}`);
    console.log(`Properties JSONB:`, JSON.stringify(acc.properties, null, 2));

    // Links in customer_properties
    const { data: cpLinks, error: err2 } = await supabase
      .from('customer_properties')
      .select('*, property:properties(*)')
      .or(`account_id.eq.${acc.id},customer_id.eq.${acc.id}`);
    
    console.log(`customer_properties links:`, cpLinks);

    // Mapped customers in auth customers table
    const { data: authCustomers } = await supabase
      .from('customers')
      .select('*')
      .eq('ledger_id', acc.id);
    
    console.log(`Mapped Auth Customers:`, authCustomers);
  }

  console.log("=== DB QUERY END ===");
}

checkRitish();
