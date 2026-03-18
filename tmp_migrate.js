import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function run() {
    console.log("Starting migration of ledger properties...")

    // 1. Fetch all accounts with properties
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, name, properties')

    if (error) {
        console.error("Error fetching accounts:", error)
        return
    }

    let migratedCount = 0;

    for (const acc of accounts) {
        if (!acc.properties || !Array.isArray(acc.properties) || acc.properties.length === 0) continue;

        let needsClear = false;

        for (const p of acc.properties) {
            // Check if already migrated by checking customer_properties for this account_id
            const address = p.address?.trim() || ''
            if (!address) continue;

            const { data: existingLinks } = await supabase
                .from('customer_properties')
                .select('*, properties(address)')
                .eq('account_id', acc.id)

            // See if this address is already linked
            const alreadyLinked = existingLinks?.some(l => l.properties?.address?.toLowerCase() === address.toLowerCase())
            
            if (alreadyLinked) {
                console.log(`Skipping duplicate for ${acc.name} - ${address}`)
                needsClear = true;
                continue;
            }

            console.log(`Migrating property for ${acc.name}: ${address}`)

            // 1. Insert property
            const { data: newProp, error: propErr } = await supabase
                .from('properties')
                .insert({
                    address: address,
                    flat_number: p.flat_number || '',
                    building_name: p.building_name || '',
                    locality: p.locality || '',
                    city: p.city || 'Mumbai',
                    pincode: p.pincode || '',
                    property_type: p.property_type || 'residential'
                })
                .select()
                .single()

            if (propErr) {
                console.error("Prop error:", propErr)
                continue;
            }

            // 2. Link to account_id
            const { error: linkErr } = await supabase
                .from('customer_properties')
                .insert({
                    property_id: newProp.id,
                    account_id: acc.id,
                    is_active: true
                })

            if (linkErr) {
                console.error("Link error:", linkErr)
            } else {
                migratedCount++;
                needsClear = true;
            }
        }
        
        // (Optional) clear the JSONB array so it doesn't cause duplicates
        // But since we fixed the API to deduplicate, we can leave it or clear it.
        // It's safer to clear it so it doesn't clutter.
        /* if (needsClear) {
            await supabase.from('accounts').update({ properties: [] }).eq('id', acc.id)
        } */
    }

    console.log(`Migration complete! Migrated ${migratedCount} properties.`)
}

run()
