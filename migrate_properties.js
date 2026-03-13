const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function migrate() {
    console.log('Fetching legacy customers...');
    const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, full_name, address, locality, city, pincode');
    
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${customers.length} customers.`);

    let migrated = 0;
    for (const c of customers) {
        if (!c.address && !c.pincode && !c.locality) {
            console.log(`Skipping ${c.name} (no address data)`);
            continue;
        }

        // Check if a property with this address/pincode already exists
        const { data: existingProps } = await supabase
            .from('properties')
            .select('*')
            .eq('pincode', c.pincode || '')
            .ilike('address', `%${(c.address || '').substring(0, 10)}%`)
            .limit(1);

        let propertyId = null;

        if (existingProps && existingProps.length > 0) {
            propertyId = existingProps[0].id;
        } else {
            // Create property
            const { data: newProp, error: propErr } = await supabase
                .from('properties')
                .insert({
                    address: c.address || 'Unknown Address',
                    locality: c.locality || null,
                    city: c.city || 'Mumbai',
                    pincode: c.pincode || '',
                    property_type: 'residential'
                })
                .select()
                .single();
            
            if (propErr) {
                console.error(`Error creating property for ${c.name}:`, propErr);
                continue;
            }
            propertyId = newProp.id;
        }

        // check if link exists
        const { data: link } = await supabase
            .from('customer_properties')
            .select('*')
            .eq('customer_id', c.id)
            .eq('property_id', propertyId)
            .single();

        if (!link) {
            const { error: linkErr } = await supabase
                .from('customer_properties')
                .insert({
                    customer_id: c.id,
                    property_id: propertyId,
                    linked_at: new Date().toISOString(),
                    is_active: true
                });
            if (linkErr) console.error(`Error linking ${c.name}:`, linkErr);
            else {
                console.log(`Migrated property for ${c.name}`);
                migrated++;
            }
        } else {
            console.log(`Link already exists for ${c.name}`);
        }
    }
    console.log(`Finished migrating ${migrated} properties.`);
}
migrate();
