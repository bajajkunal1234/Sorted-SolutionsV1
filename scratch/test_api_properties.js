require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPropertiesApi() {
  const customerId = '6db88185-2975-47aa-af29-8c52ac626257';
  
  let lookupIds = [customerId];
  const { data: authCustomers } = await supabase.from('customers').select('id').eq('ledger_id', customerId);
  if (authCustomers && authCustomers.length > 0) {
      lookupIds = [...lookupIds, ...authCustomers.map(c => c.id)];
  }

  // Run all 4 sources in parallel
  const [
      A_res,
      B_res,
      C_res,
      D_res,
  ] = await Promise.all([
      supabase.from('customer_properties').select('*, property:properties(*)').in('customer_id', lookupIds).eq('is_active', true).order('linked_at', { ascending: false }),
      supabase.from('customer_properties').select('*, property:properties(*)').in('account_id', lookupIds).eq('is_active', true).order('linked_at', { ascending: false }),
      supabase.from('jobs').select('property_id').in('customer_id', lookupIds).not('property_id', 'is', null).limit(200),
      supabase.from('accounts').select('properties, address').eq('id', customerId).single(),
  ]);

  console.log("Source A Error:", A_res.error);
  console.log("Source B Error:", B_res.error);
  console.log("Source C Error:", C_res.error);
  console.log("Source D Error:", D_res.error);

  const byCustomer = A_res.data;
  const byAccount = B_res.data;
  const jobRows = C_res.data;
  const accountRow = D_res.data;

  console.log("Source A byCustomer:", byCustomer);
  console.log("Source B byAccount:", byAccount);
  console.log("Source C jobRows:", jobRows);
  console.log("Source D accountRow:", accountRow);

  // Source C step 2: fetch the actual property rows by id
  let jobLinkedProperties = [];
  const jobPropertyIds = [...new Set((jobRows || []).map(r => r.property_id).filter(Boolean))];
  if (jobPropertyIds.length > 0) {
      const { data: propRows } = await supabase.from('properties').select('*').in('id', jobPropertyIds);
      jobLinkedProperties = propRows || [];
  }

  // Merge all sources, deduplicate by property id and address
  const seenIds = new Set();
  const seenNormalized = new Set();
  const result = [];

  const normalizeAddress = (p) => {
      if (!p) return '';
      const str = `${p.flat_number || ''} ${p.building_name || ''} ${p.address || ''} ${p.locality || ''} ${p.pincode || ''}`;
      return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  };

  const addProperty = (prop, source, linkId = null, linkedAt = null) => {
      if (!prop || !prop.id || seenIds.has(prop.id)) return;
      
      const norm = normalizeAddress(prop);
      if (norm && seenNormalized.has(norm)) return; // duplicate address
      
      seenIds.add(prop.id);
      if (norm) seenNormalized.add(norm);
      
      result.push({ ...prop, link_id: linkId, linked_at: linkedAt, _source: source });
  };

  for (const r of (byCustomer || [])) {
      if (r.property) addProperty(r.property, 'customer_link', r.id, r.linked_at);
  }
  for (const r of (byAccount || [])) {
      if (r.property) addProperty(r.property, 'account_link', r.id, r.linked_at);
  }
  for (const prop of jobLinkedProperties) {
      addProperty(prop, 'job_history');
  }

  // Source D: inline JSONB array from accounts.properties (pre-migration or manually-entered)
  if (accountRow?.properties && Array.isArray(accountRow.properties)) {
      for (const p of accountRow.properties) {
          const inlineAddr = (p.address || '').trim();
          if (!inlineAddr) continue;
          
          const syntheticId = `inline:${[p.flat_number, p.building_name, p.address, p.locality, p.pincode].join('|')}`;
          if (seenIds.has(syntheticId)) continue;
          
          // Deduplicate synthetic inline property as well
          const norm = normalizeAddress({
              flat_number: p.flat_number,
              building_name: p.building_name,
              address: inlineAddr,
              locality: p.locality,
              pincode: p.pincode
          });
          if (norm && seenNormalized.has(norm)) continue; // skip duplicates
          
          seenIds.add(syntheticId);
          if (norm) seenNormalized.add(norm);

          result.push({
              id: syntheticId,
              flat_number: p.flat_number || '',
              building_name: p.building_name || '',
              address: inlineAddr,
              locality: p.locality || '',
              city: p.city || '',
              pincode: p.pincode || '',
              property_type: p.property_type || 'residential',
              link_id: null,
              linked_at: null,
              _source: 'inline',
          });
      }
  }

  console.log("Final Result:", result);
}

testPropertiesApi();
