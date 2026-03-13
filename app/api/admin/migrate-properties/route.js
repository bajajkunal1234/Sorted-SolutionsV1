import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        // Fetch all legacy customers
        const { data: customers, error } = await supabase
            .from('customers')
            .select('id, name, full_name, address, properties');

        if (error) throw error;

        let migratedCount = 0;
        let skippedCount = 0;
        const logs = [];

        for (const customer of customers) {
            // Arrays to collect addresses
            let propertiesToMigrate = [];

            // 1. Check if they have an array in 'properties' column
            if (Array.isArray(customer.properties) && customer.properties.length > 0) {
                propertiesToMigrate.push(...customer.properties.filter(p => p && p.address && p.address.trim() !== ''));
            }

            // 2. Check if they have a legacy simple address string or object
            if (customer.address) {
                if (typeof customer.address === 'string' && customer.address.trim() !== '') {
                    propertiesToMigrate.push({ address: customer.address });
                } else if (typeof customer.address === 'object' && customer.address.street) {
                    propertiesToMigrate.push({
                        address: customer.address.street,
                        locality: customer.address.locality || '',
                        pincode: customer.address.pincode || '',
                        city: customer.address.city || 'Mumbai'
                    });
                } else if (typeof customer.address === 'object' && Object.keys(customer.address).length > 0) {
                    // Try to stringify unknown object
                    propertiesToMigrate.push({ address: JSON.stringify(customer.address) });
                }
            }

            if (propertiesToMigrate.length === 0) {
                skippedCount++;
                continue;
            }

            for (const prop of propertiesToMigrate) {
                const addressStr = prop.address || prop.street || 'Unknown';
                const pincodeStr = prop.pincode || '';
                
                // See if property exists
                const { data: existing } = await supabase
                    .from('properties')
                    .select('id')
                    .eq('pincode', pincodeStr)
                    .ilike('address', `%${addressStr.substring(0, 15)}%`)
                    .limit(1);

                let propertyId;

                if (existing && existing.length > 0) {
                    propertyId = existing[0].id;
                } else {
                    // Create new property
                    const { data: newProp, error: insertErr } = await supabase
                        .from('properties')
                        .insert({
                            address: addressStr,
                            locality: prop.locality || null,
                            city: prop.city || 'Mumbai',
                            pincode: pincodeStr,
                            property_type: 'residential'
                        })
                        .select()
                        .single();

                    if (insertErr) {
                        logs.push(`Err creating prop for ${customer.id}: ${insertErr.message}`);
                        continue;
                    }
                    propertyId = newProp.id;
                }

                // Link them
                const { data: existingLink } = await supabase
                    .from('customer_properties')
                    .select('id')
                    .eq('customer_id', customer.id)
                    .eq('property_id', propertyId)
                    .single();

                if (!existingLink) {
                    await supabase.from('customer_properties').insert({
                        customer_id: customer.id,
                        property_id: propertyId,
                        linked_at: new Date().toISOString(),
                        is_active: true
                    });
                    migratedCount++;
                    logs.push(`Migrated property for customer ${customer.name || customer.id}`);
                }
            }
        }

        return NextResponse.json({
            success: true,
            migrated_links: migratedCount,
            skipped_customers: skippedCount,
            total_customers: customers.length,
            logs
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
