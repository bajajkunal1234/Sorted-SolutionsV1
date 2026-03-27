require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testBooking() {
    console.log('Testing booking logic...');
    
    const normalizedPhone = '9999999999';
    const { data: existingAccounts, error: accErr1 } = await supabase.from('accounts').select('id').or(`phone.eq.${normalizedPhone},phone.eq.+91${normalizedPhone},phone.eq.91${normalizedPhone}`).limit(1);
    console.log('Account lookup:', existingAccounts, accErr1?.message);
    
    const { data: newAccount, error: accError } = await supabase.from('accounts').insert({
        name: 'Test Visitor',
        phone: normalizedPhone,
        type: 'asset',
        under: 'customer-accounts',
        opening_balance: 0,
        source: 'website-booking',
        created_at: new Date().toISOString()
    }).select('id').single();
    
    console.log('Account insert:', !!newAccount, accError?.message || accError);
    
    if (newAccount) {
        // create property
        const { data: newProp, error: propErr } = await supabase.from('properties').insert({
            address: '123 Test St',
            locality: 'Test Locality',
            city: 'Mumbai',
            pincode: '400001',
            property_type: 'apartment',
        }).select('id').single();
        console.log('Property insert:', !!newProp, propErr?.message || propErr);

        if (newProp) {
            // create job
            const { data: job, error: jobError } = await supabase.from('jobs').insert({
                job_number: 'JOB-9999',
                status: 'booking_request',
                priority: 'normal',
                customer_id: newAccount.id,
                property_id: newProp.id,
                customer_name: 'Test Visitor',
                category: 'Test Category',
                source: 'website',
                created_at: new Date().toISOString()
            }).select('id').single();
            console.log('Job insert:', !!job, jobError?.message || jobError);

            if (job) {
                await supabase.from('jobs').delete().eq('id', job.id);
            }
            await supabase.from('properties').delete().eq('id', newProp.id);
        }
        await supabase.from('accounts').delete().eq('id', newAccount.id);
    }
}
testBooking().catch(console.error);
