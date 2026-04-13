
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  // Fetch the 42 accounts
  const { data: accountsToMigrate } = await supabase.from('accounts').select('id, name, mobile, phone, sku').eq('under', 'sundry-debtors');
  
  // Fetch all other accounts and customers to check for duplicates
  const { data: existingAccounts } = await supabase.from('accounts').select('name, mobile, phone').neq('under', 'sundry-debtors');
  const { data: existingCustomers } = await supabase.from('customers').select('name, full_name, phone');
  
  console.log('--- Duplicate Check ---');
  let duplicateCount = 0;
  
  for (const a of accountsToMigrate) {
      const mobile = a.mobile || a.phone;
      const nm = a.name.toLowerCase();
      
      let dupFound = false;
      let dupDetails = '';
      
      // Check accounts
      for (const ex of existingAccounts) {
          if (mobile && (ex.mobile === mobile || ex.phone === mobile)) { dupFound = true; dupDetails = 'Mobile matched in accounts (' + ex.name + ')'; break; }
          if (ex.name.toLowerCase() === nm) { dupFound = true; dupDetails = 'Name matched in accounts (' + ex.name + ')'; break; }
      }
      
      // Check customers if not found
      if (!dupFound) {
          for (const c of existingCustomers) {
              if (mobile && c.phone === mobile) { dupFound = true; dupDetails = 'Mobile matched in customers (' + (c.name || c.full_name) + ')'; break; }
              if ((c.name || '').toLowerCase() === nm || (c.full_name || '').toLowerCase() === nm) { dupFound = true; dupDetails = 'Name matched in customers (' + (c.name || c.full_name) + ')'; break; }
          }
      }
      
      if (dupFound) {
          console.log('- [DUP] ' + a.name + ' (' + mobile + ') => ' + dupDetails);
          duplicateCount++;
      }
  }
  
  if (duplicateCount === 0) console.log('No duplicates found!');
  else console.log('Total duplicates found: ' + duplicateCount);
  
  console.log('\n--- Migrating 42 Accounts ---');
  
  // Fetch current max SKU for C prefix
  const { data: skuData } = await supabase.from('accounts').select('sku').like('sku', 'C%');
  let maxNum = (skuData || []).reduce((max, acc) => {
      const n = parseInt((acc.sku || '').replace('C', '')) || 0;
      return n > max ? n : max;
  }, 100);
  
  for (const a of accountsToMigrate) {
      maxNum++;
      const newSku = 'C' + maxNum;
      
      const { error } = await supabase.from('accounts').update({
          under: 'customers',
          sku: newSku
      }).eq('id', a.id);
      
      if (error) console.error('Error updating ' + a.name + ':', error);
      else console.log('Updated ' + a.name + ' -> under: customers, sku: ' + newSku);
  }
  console.log('Done!');
}
run();

