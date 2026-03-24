import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// POST — link a customer to a property
export async function POST(request) {
    try {
        const { customer_id, property_id, notes } = await request.json()
        if (!customer_id || !property_id) {
            return NextResponse.json({ success: false, error: 'customer_id and property_id are required' }, { status: 400 })
        }

        // Check if already actively linked
        const { data: existing } = await supabase
            .from('customer_properties')
            .select('id, is_active')
            .eq('customer_id', customer_id)
            .eq('property_id', property_id)
            .eq('is_active', true)
            .single()

        if (existing) {
            return NextResponse.json({ success: true, message: 'Already linked', data: existing })
        }

        const { data, error } = await supabase
            .from('customer_properties')
            .insert({
                account_id: customer_id,   // admin account ID — avoids FK on customers table
                customer_id: null,          // not a customer-app customer
                property_id,
                linked_at: new Date().toISOString(),
                is_active: true,
                notes: notes || null,
            })
            .select()
            .single()

        if (error) {
            // Fallback: some schemas may still require customer_id — try both
            console.error('account_id insert failed:', error.message, '— trying fallback')
            const { data: fallback, error: fallbackError } = await supabase
                .from('customer_properties')
                .insert({
                    customer_id,
                    account_id: customer_id,
                    property_id,
                    linked_at: new Date().toISOString(),
                    is_active: true,
                    notes: notes || null,
                })
                .select()
                .single()
            if (fallbackError) throw fallbackError
            return NextResponse.json({ success: true, data: fallback })
        }

        // Fetch names for logging
        const { data: customer } = await supabase.from('customers').select('name, full_name').eq('id', customer_id).single()
        const { data: property } = await supabase.from('properties').select('address, locality').eq('id', property_id).single()
        const cName = customer?.name || customer?.full_name || customer_id
        const pAddr = property ? `${property.address}, ${property.locality || ''}` : property_id

        logInteractionServer({
            type: 'property-linked',
            category: 'property',
            customerId: customer_id,
            customerName: cName,
            propertyId: property_id,
            description: `"${cName}" linked to property: ${pAddr}`,
            metadata: { property_id, customer_id },
            source: 'Admin App',
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
