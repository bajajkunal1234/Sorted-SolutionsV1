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

            // Fetch tenant history (customer-app and admin-linked)
            const { data: tenants } = await supabase
                .from('customer_properties')
                .select('*, customer:customers(id, name, phone, full_name)')
                .eq('property_id', id)
                .order('linked_at', { ascending: false })

            // For admin-side links (account_id set, no customer join), look up account names
            const adminIds = (tenants || []).filter(t => t.account_id && !t.customer).map(t => t.account_id)
            let accountMap = {}
            if (adminIds.length > 0) {
                const { data: accs } = await supabase.from('accounts').select('id, name').in('id', adminIds)
                for (const a of accs || []) accountMap[a.id] = a.name
            }
            const enrichedTenants = (tenants || []).map(t => ({
                ...t,
                customer: t.customer || (t.account_id ? { id: t.account_id, name: accountMap[t.account_id] || 'Account' } : null)
            }))

            // Fetch job history for this property
            const { data: jobs } = await supabase
                .from('jobs')
                .select('id, job_number, category, status, created_at, customer_name, assigned_technician_name')
                .eq('property_id', id)
                .order('created_at', { ascending: false })
                .limit(20)

            return NextResponse.json({ success: true, data: { ...property, tenants: enrichedTenants, jobs: jobs || [] } })
        }

        // Properties for a specific customer (admin view: query both customer_id and account_id)
        if (customerId) {
            // Fetch by customer_id OR account_id to cover both customer-app and admin-added links
            const { data: byCustomer } = await supabase
                .from('customer_properties')
                .select('*, property:properties(*)')
                .eq('customer_id', customerId)
                .eq('is_active', true)
                .order('linked_at', { ascending: false })
            const { data: byAccount } = await supabase
                .from('customer_properties')
                .select('*, property:properties(*)')
                .eq('account_id', customerId)
                .eq('is_active', true)
                .order('linked_at', { ascending: false })
            // Merge, deduplicate by property id
            const merged = [...(byCustomer || []), ...(byAccount || [])]
            const seen = new Set()
            const unique = merged.filter(r => {
                if (!r.property || seen.has(r.property.id)) return false
                seen.add(r.property.id)
                return true
            })
            return NextResponse.json({ success: true, data: unique.map(r => ({ ...r.property, link_id: r.id, linked_at: r.linked_at })) })
        }

        // Smart search by pincode or address (for matching when adding a property)
        if (search) {
            const term = search.trim()
            const { data: matches, error } = await supabase
                .from('properties')
                .select('*')
                .or(`pincode.eq.${term},address.ilike.%${term}%,locality.ilike.%${term}%,building_name.ilike.%${term}%`)
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
        const { address, locality, city, pincode, property_type, customer_id, notes, flat_number, building_name, force_create } = body

        if (!address) return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 })

        // ── Duplicate detection ──────────────────────────────────────────────
        if (!force_create) {
            let dupQuery = supabase.from('properties').select('*')
            if (flat_number?.trim() && building_name?.trim()) {
                dupQuery = dupQuery
                    .eq('flat_number', flat_number.trim())
                    .ilike('building_name', `%${building_name.trim()}%`)
            } else if (building_name?.trim() && address?.trim()) {
                dupQuery = dupQuery
                    .ilike('building_name', `%${building_name.trim()}%`)
                    .ilike('address', `%${address.trim()}%`)
            }

            if (flat_number?.trim() || building_name?.trim()) {
                const { data: dups } = await dupQuery.limit(1)
                if (dups?.length > 0) {
                    return NextResponse.json({
                        success: false,
                        duplicate: true,
                        existing: dups[0],
                        error: `A property "${[flat_number, building_name].filter(Boolean).join(', ')}" already exists.`,
                    }, { status: 409 })
                }
            }
        }
        // ────────────────────────────────────────────────────────────────────

        const { data: property, error } = await supabase
            .from('properties')
            .insert({ 
                flat_number: flat_number || null,
                building_name: building_name || null,
                address, 
                locality, 
                city, 
                pincode, 
                property_type: property_type || 'residential' 
            })
            .select()
            .single()
        if (error) throw error

        // Link to a customer — store as account_id (admin side) to avoid FK issues with customers table
        if (customer_id) {
            const { error: linkError } = await supabase.from('customer_properties').insert({
                account_id: customer_id,   // admin account ID
                customer_id: null,          // nullable — this is not a customer-app customer
                property_id: property.id,
                linked_at: new Date().toISOString(),
                is_active: true,
                notes: notes || null,
            })
            if (linkError) {
                // If customer_id is still NOT NULL, fall back — store account ID in customer_id field directly
                console.error('account_id insert failed:', linkError.message, '— trying fallback')
                const { error: fallbackError } = await supabase.from('customer_properties').insert({
                    customer_id: customer_id,  // store account.id in customer_id as fallback
                    account_id: customer_id,
                    property_id: property.id,
                    linked_at: new Date().toISOString(),
                    is_active: true,
                    notes: notes || null,
                })
                if (fallbackError) {
                    console.error('Fallback also failed:', fallbackError.message)
                }
            }
        }


        logInteractionServer({
            type: 'property-created',
            category: 'property',
            customerId: customer_id || null,
            propertyId: property.id,
            description: `Property created: ${[flat_number, building_name, address, locality, city, pincode].filter(Boolean).join(', ')}`,
            metadata: { property_id: property.id, address, locality, city, pincode, linked_to_customer: customer_id || null },
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

        // Log the edit
        const changedFields = Object.keys(updates).filter(k => k !== 'id')
        logInteractionServer({
            type: 'property-edited',
            category: 'property',
            propertyId: id,
            description: `Property updated: ${changedFields.join(', ')}`,
            metadata: { property_id: id, changed_fields: changedFields, updates },
            source: 'Admin App',
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE — remove a property (only if no customer links AND no job history)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })

        // Check for any linked customers (active or past)
        const { count: customerCount } = await supabase
            .from('customer_properties')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', id)

        if (customerCount > 0) {
            return NextResponse.json({
                success: false,
                error: `Cannot delete — ${customerCount} customer${customerCount > 1 ? 's are' : ' is'} linked to this property (including past links). Unlink all customers first.`
            }, { status: 400 })
        }

        // Check for any job history
        const { count: jobCount } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', id)

        if (jobCount > 0) {
            return NextResponse.json({
                success: false,
                error: `Cannot delete — this property has ${jobCount} service record${jobCount > 1 ? 's' : ''} in history.`
            }, { status: 400 })
        }

        const { error } = await supabase.from('properties').delete().eq('id', id)
        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

