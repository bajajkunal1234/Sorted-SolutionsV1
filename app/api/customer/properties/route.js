import { supabase } from '@/lib/supabase'
import { logInteractionServer } from '@/lib/logger'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — fetch the customer's currently linked properties
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId') || searchParams.get('customer_id')
        const search = searchParams.get('search') // smart match: pincode

        if (!customerId && !search) {
            return NextResponse.json({ error: 'customerId or search required' }, { status: 400 })
        }

        // Smart search — check if a property already exists by pincode
        if (search) {
            const term = search.trim()
            const { data: matches } = await supabase
                .from('properties')
                .select('*')
                .or(`pincode.eq.${term},address.ilike.%${term}%,building_name.ilike.%${term}%`)
                .limit(5)

            const enriched = await Promise.all((matches || []).map(async (prop) => {
                const { data: lastJobs } = await supabase
                    .from('jobs')
                    .select('category, created_at')
                    .eq('property_id', prop.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                return { ...prop, lastJob: lastJobs?.[0] || null }
            }))

            return NextResponse.json({ success: true, properties: enriched })
        }

        // Get the customer's ledger_id if it exists
        const { data: customer } = await supabase
            .from('customers')
            .select('ledger_id')
            .eq('id', customerId)
            .single()

        const ledgerId = customer?.ledger_id

        // Fetch active linked properties using either customer_id or account_id (ledger_id)
        let query = supabase
            .from('customer_properties')
            .select('*, property:properties(*)')
            .eq('is_active', true)
            .order('linked_at', { ascending: false })

        if (ledgerId) {
            query = query.or(`customer_id.eq.${customerId},account_id.eq.${ledgerId}`)
        } else {
            query = query.eq('customer_id', customerId)
        }

        const { data, error } = await query

        if (error) throw error

        const properties = (data || []).map(r => ({
            ...r.property,
            link_id: r.id,
            linked_at: r.linked_at,
        }))

        return NextResponse.json({ success: true, properties, count: properties.length })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// PATCH — customer refines lat/lng on a property they are linked to
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url)
        const propertyId = searchParams.get('property_id')
        const customerId = searchParams.get('customer_id')

        if (!propertyId || !customerId) {
            return NextResponse.json({ error: 'property_id and customer_id required' }, { status: 400 })
        }

        const { latitude, longitude } = await request.json()
        if (latitude == null || longitude == null) {
            return NextResponse.json({ error: 'latitude and longitude required' }, { status: 400 })
        }

        // Verify customer is actually linked to this property (security check)
        const { data: link } = await supabase
            .from('customer_properties')
            .select('id')
            .eq('customer_id', customerId)
            .eq('property_id', propertyId)
            .eq('is_active', true)
            .maybeSingle()

        if (!link) {
            return NextResponse.json({ error: 'You are not linked to this property.' }, { status: 403 })
        }

        // Update the property pin
        const { data: property, error } = await supabase
            .from('properties')
            .update({ latitude, longitude })
            .eq('id', propertyId)
            .select()
            .single()

        if (error) throw error

        const { data: customer } = await supabase.from('customers').select('name, phone').eq('id', customerId).single()
        
        logInteractionServer({
            type: 'property-pin-refined',
            category: 'account',
            customerId: customerId,
            customerName: customer?.name || customer?.phone || 'Customer',
            description: `Customer pinned their exact location for ${property.address || property.building_name || 'their property'}`,
            source: 'Customer App'
        })

        return NextResponse.json({ success: true, property })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// POST — smart create or link: check if property exists, create if not, then link
export async function POST(request) {
    try {
        const body = await request.json()
        const { customer_id, property_id, address, locality, city, pincode, property_type, name, flat_number, building_name, latitude, longitude } = body

        if (!customer_id) {
            return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
        }

        let finalPropertyId = property_id

        // If property_id not provided, create the property first
        if (!finalPropertyId) {
            if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 })
            const { data: prop, error: propError } = await supabase
                .from('properties')
                .insert({ 
                    flat_number: flat_number || null,
                    building_name: building_name || null,
                    address, 
                    locality, 
                    city, 
                    pincode, 
                    property_type: property_type || 'residential',
                    latitude: latitude || null,
                    longitude: longitude || null,
                })
                .select()
                .single()
            if (propError) throw propError
            finalPropertyId = prop.id
        }

        // Link customer to property
        // Upsert: if already linked (active), just return success
        const { data: existing } = await supabase
            .from('customer_properties')
            .select('id')
            .eq('customer_id', customer_id)
            .eq('property_id', finalPropertyId)
            .eq('is_active', true)
            .maybeSingle()

        if (existing) {
            const { data: prop } = await supabase.from('properties').select('*').eq('id', finalPropertyId).single()
            return NextResponse.json({ success: true, property: prop, message: 'Already linked' })
        }

        const { error: linkError } = await supabase.from('customer_properties').insert({
            customer_id,
            property_id: finalPropertyId,
            linked_at: new Date().toISOString(),
            is_active: true,
        })
        if (linkError) throw linkError

        const { data: property } = await supabase.from('properties').select('*').eq('id', finalPropertyId).single()
        return NextResponse.json({ success: true, property, message: 'Property added and linked successfully' })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
