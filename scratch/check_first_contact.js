require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const phones = [
    '7697382745',
    '9004235865',
    '9819933118',
    '9594295309',
    '9967490567',
    '9321734323',
    '9321176859',
    '9619904709',
    '8169833751' // Sid Chauhan
];

async function checkDates() {
    const { data: leads, error } = await supabase
        .from('lead_attributions')
        .select('name, phone, first_contact_at, created_at, updated_at')
        .in('phone', phones);

    console.log('Lead Attribution Dates:');
    leads.forEach(l => {
        console.log(`- "${l.name}": first_contact_at: ${l.first_contact_at}, created_at: ${l.created_at}`);
    });
}

checkDates();
