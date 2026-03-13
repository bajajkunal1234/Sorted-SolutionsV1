import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// GET — list all properties OR smart search by pincode/address
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const search = searchParams.get('search') // pincode or address fragment
        const customerId = searchParams.get('customer_id')

        // Single property by ID
        if (id) {
            const { data: property, error } = await supabase
                .from('properties')
                .select('*')
                .eq('id', id)
                .single()
            if (error) throw error

            // Fetch tenant history
            const { data: tenants } = await supabase
                .from('customer_properties')
                .select('*, customer:customers(id, name, phone, full_name)')
                .eq('property_id', id)
                .order('linked_at', { ascending: false })

            // Fetch job history for this property
            const { data: jobs } = await supabase
                .from('jobs')
                .select('id, job_number, category, status, created_at, customer_name, assigned_technician_name')
                .eq('property_id', id)
                .order('created_at', { ascending: false })
                .limit(20)

            return NextResponse.json({ success: true, data: { ...property, tenants: tenants || [], jobs: jobs || [] } })
        }

        // Properties for a specific customer
        if (customerId) {
            const { data, error } = await supabase
                .from('customer_properties')
                .select('*, property:properties(*)')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .order('linked_at', { ascending: false })
            if (error) throw error
            return NextResponse.json({ success: true, data: data?.map(r => ({ ...r.property, link_id: r.id, linked_at: r.linked_at })) || [] })
        }

        // Smart search by pincode or address (for matching when adding a property)
        if (search) {
            const term = search.trim()
            const { data: matches, error } = await supabase
                .from('properties')
                .select('*')
                .or(`pincode.eq.${term},address.ilike.%${term}%,locality.ilike.%${term}%`)
                .limit(5)
            if (error) throw error

            // For each match, get the last job done there
            const enriched = await Promise.all((matches || []).map(async (prop) => {
                const { data: lastJobs } = await supabase
                    .from('jobs')
                    .select('id, category, created_at, status')
                    .eq('property_id', prop.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                const lastJob = lastJobs?.[0] || null

                // Count active tenants
                const { count: tenantCount } = await supabase
                    .from('customer_properties')
                    .select('id', { count: 'exact', head: true })
                    .eq('property_id', prop.id)
                    .eq('is_active', true)

                return {
                    ...prop,
                    lastJob: lastJob ? {
                        category: lastJob.category,
                        date: lastJob.created_at,
                        status: lastJob.status,
                    } : null,
                    activeTenants: tenantCount || 0,
                }
            }))

            return NextResponse.json({ success: true, data: enriched })
        }

        // List all properties with last job + active tenant count
        const { data: all, error } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200)
        if (error) throw error

        const enriched = await Promise.all((all || []).map(async (prop) => {
            const { data: lastJobs } = await supabase
                .from('jobs')
                .select('id, category, created_at, status, customer_name')
                .eq('property_id', prop.id)
                .order('created_at', { ascending: false })
                .limit(1)

            const { data: currentTenants } = await supabase
                .from('customer_properties')
                .select('customer:customers(id, name, full_name, phone)')
                .eq('property_id', prop.id)
                .eq('is_active', true)

            return {
                ...prop,
                lastJob: lastJobs?.[0] || null,
                currentTenants: currentTenants?.map(r => r.customer).filter(Boolean) || [],
            }
        }))

        return NextResponse.json({ success: true, data: enriched })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST — create new property (optionally link to a customer)
export async function POST(request) {
    try {
        const body = await request.json()
        const { address, locality, city, pincode, property_type, customer_id, notes } = body

        if (!address) return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 })

        const { data: property, error } = await supabase
            .from('properties')
            .insert({ address, locality, city, pincode, property_type: property_type || 'residential' })
            .select()
            .single()
        if (error) throw error

        // Optionally link to a customer right away
        if (customer_id) {
            await supabase.from('customer_properties').insert({
                customer_id,
                property_id: property.id,
                linked_at: new Date().toISOString(),
                is_active: true,
                notes: notes || null,
            })
        }

        logInteractionServer({
            type: 'property-created',
            category: 'account',
            description: `Property created: ${address}, ${locality || ''}, ${city || ''} ${pincode || ''}`,
            source: 'Admin App',
        })

        return NextResponse.json({ success: true, data: property })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT — update property details
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body
        if (!id) return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })

        const { data, error } = await supabase
            .from('properties')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE — remove a property (only if no active jobs)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })

        const { count } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', id)
            .not('status', 'in', '("cancelled")')

        if (count > 0) {
            return NextResponse.json({ success: false, error: `Cannot delete — this property has ${count} service records.` }, { status: 400 })
        }

        await supabase.from('customer_properties').delete().eq('property_id', id)
        const { error } = await supabase.from('properties').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
