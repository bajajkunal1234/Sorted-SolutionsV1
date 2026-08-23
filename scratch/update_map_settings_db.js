const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
let supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
supabaseUrl = supabaseUrl.replace(/['"]/g, '');
supabaseKey = supabaseKey.replace(/['"]/g, '');
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching map_settings...');
  const { data: adminData, error: adminErr } = await supabase
    .from('website_settings')
    .select('*')
    .eq('key', 'map_settings')
    .single();

  if (adminErr) {
    console.error('Error fetching admin settings:', adminErr);
  } else {
    console.log('Current admin settings value:', adminData.value);
    const updatedValue = {
      ...adminData.value,
      custMarkerType: 'thin',
      supplierMarkerType: 'thin'
    };
    const { error: updateErr } = await supabase
      .from('website_settings')
      .update({ value: updatedValue })
      .eq('key', 'map_settings');
    if (updateErr) {
      console.error('Error updating admin settings:', updateErr);
    } else {
      console.log('Successfully updated admin settings to thin!');
    }
  }

  console.log('Fetching tech_map_settings...');
  const { data: techData, error: techErr } = await supabase
    .from('website_settings')
    .select('*')
    .eq('key', 'tech_map_settings')
    .single();

  if (techErr) {
    console.error('Error fetching tech settings:', techErr);
  } else {
    console.log('Current tech settings value:', techData.value);
    const updatedValue = {
      ...techData.value,
      custMarkerType: 'thin',
      supplierMarkerType: 'thin'
    };
    const { error: updateErr } = await supabase
      .from('website_settings')
      .update({ value: updatedValue })
      .eq('key', 'tech_map_settings');
    if (updateErr) {
      console.error('Error updating tech settings:', updateErr);
    } else {
      console.log('Successfully updated tech settings to thin!');
    }
  }
}

run();
