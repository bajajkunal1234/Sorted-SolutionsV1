import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// POST — unlink a customer from a property (soft delete, preserves history)
export async function POST(request) {
    try {
        const { customer_id, property_id, link_id } = await request.json()

        let query = supabase.from('customer_properties').update({
            is_active: false,
            unlinked_at: new Date().toISOString(),
        })

        if (link_id) {
            query = query.eq('id', link_id)
        } else if (customer_id && property_id) {
            query = query.eq('customer_id', customer_id).eq('property_id', property_id).eq('is_active', true)
        } else {
            return NextResponse.json({ success: false, error: 'Provide link_id OR (customer_id + property_id)' }, { status: 400 })
        }

        const { data, error } = await query.select().single()
        if (error) throw error

        // Fetch names for logging
        const { data: customer } = await supabase.from('customers').select('name, full_name').eq('id', data.customer_id).single()
        const { data: property } = await supabase.from('properties').select('address, locality').eq('id', data.property_id).single()
        const cName = customer?.name || customer?.full_name || data.customer_id
        const pAddr = property ? `${property.address}, ${property.locality || ''}` : data.property_id

        logInteractionServer({
            type: 'property-unlinked',
            category: 'account',
            customerId: data.customer_id,
            customerName: cName,
            description: `Customer "${cName}" unlinked from property: ${pAddr}`,
            source: 'Admin App',
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
