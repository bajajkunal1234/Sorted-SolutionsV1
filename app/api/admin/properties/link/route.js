import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// POST — link an admin account to a property
// customer_id here is an admin account ID, NOT a customer-app user ID.
// We store it in account_id to avoid the FK constraint on the customers table.
export async function POST(request) {
    try {
        const { customer_id, property_id, notes } = await request.json()
        if (!customer_id || !property_id) {
            return NextResponse.json({ success: false, error: 'customer_id and property_id are required' }, { status: 400 })
        }

        // Check if already actively linked via account_id OR customer_id
        const { data: existingByAccount } = await supabase
            .from('customer_properties')
            .select('id')
            .eq('account_id', customer_id)
            .eq('property_id', property_id)
            .eq('is_active', true)
            .maybeSingle()

        const { data: existingByCustomer } = await supabase
            .from('customer_properties')
            .select('id')
            .eq('customer_id', customer_id)
            .eq('property_id', property_id)
            .eq('is_active', true)
            .maybeSingle()

        if (existingByAccount || existingByCustomer) {
            return NextResponse.json({ success: true, message: 'Already linked' })
        }

        // Insert using account_id — avoids FK constraint on customers table
        // customer_id is intentionally omitted so the column keeps its default (null)
        const { data, error } = await supabase
            .from('customer_properties')
            .insert({
                account_id: customer_id,
                property_id,
                linked_at: new Date().toISOString(),
                is_active: true,
                notes: notes || null,
            })
            .select()
            .single()

        if (error) {
            // Fallback if account_id column doesn't exist or schema differs
            console.error('[link] account_id insert failed:', error.message, '— trying fallback with customer_id')
            const { data: fallback, error: fallbackError } = await supabase
                .from('customer_properties')
                .insert({
                    account_id: customer_id,
                    customer_id: customer_id,
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

        // Log (best-effort — don't let logging failure break the response)
        try {
            const { data: property } = await supabase
                .from('properties')
                .select('address, locality')
                .eq('id', property_id)
                .maybeSingle()
            const pAddr = property ? `${property.address}, ${property.locality || ''}` : property_id

            const { data: account } = await supabase
                .from('accounts')
                .select('name')
                .eq('id', customer_id)
                .maybeSingle()
            const cName = account?.name || String(customer_id)

            logInteractionServer({
                type: 'property-linked',
                category: 'property',
                customerId: customer_id,
                customerName: cName,
                propertyId: property_id,
                description: `"${cName}" linked to property: ${pAddr}`,
                metadata: { property_id, account_id: customer_id },
                source: 'Admin App',
            })
        } catch (logErr) {
            console.error('[link] logging failed (non-fatal):', logErr.message)
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('[link] fatal error:', error.message)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
