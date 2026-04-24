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
        const q = searchParams.get('q') // admin full-text filter (address, building, locality, pincode)

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

            // Fetch job history for this property:
            // 1. Jobs directly tagged with property_id
            // 2. Jobs for any customer linked to this property (covers older jobs without property_id)
            const linkedCustomerIds = (tenants || [])
                .map(t => t.customer_id || t.account_id)
                .filter(Boolean)

            const [byPropId, byCustomerIds] = await Promise.all([
                supabase
                    .from('jobs')
                    .select('id, job_number, category, subcategory, status, created_at, customer_name, technician_name, property_id')
                    .eq('property_id', id)
                    .order('created_at', { ascending: false })
                    .limit(30),
                linkedCustomerIds.length > 0
                    ? supabase
                        .from('jobs')
                        .select('id, job_number, category, subcategory, status, created_at, customer_name, technician_name, property_id')
                        .in('customer_id', linkedCustomerIds)
                        .order('created_at', { ascending: false })
                        .limit(50)
                    : Promise.resolve({ data: [] })
            ])

            // Merge and deduplicate by job id
            const allJobs = [...(byPropId.data || []), ...(byCustomerIds.data || [])]
            const seen = new Set()
            const jobs = allJobs.filter(j => { if (seen.has(j.id)) return false; seen.add(j.id); return true })
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 50)

            return NextResponse.json({ success: true, data: { ...property, tenants: enrichedTenants, jobs } })
        }

        // Properties for a specific customer (admin view: query both customer_id and account_id)
        if (customerId) {
            // Admin passes ledger_id. We need to find real Auth Customer IDs mapped to it
            let lookupIds = [customerId];
            const { data: authCustomers } = await supabase.from('customers').select('id').eq('ledger_id', customerId);
            if (authCustomers && authCustomers.length > 0) {
                lookupIds = [...lookupIds, ...authCustomers.map(c => c.id)];
            }

            // Fetch by customer_id OR account_id to cover both customer-app and admin-added links
            const { data: byCustomer } = await supabase
                .from('customer_properties')
                .select('*, property:properties(*)')
                .in('customer_id', lookupIds)
                .eq('is_active', true)
                .order('linked_at', { ascending: false })
            const { data: byAccount } = await supabase
                .from('customer_properties')
                .select('*, property:properties(*)')
                .in('account_id', lookupIds)
                .eq('is_active', true)
                .order('linked_at', { ascending: false })
                
            // Merge, deduplicate by property id
            const mergedDb = [...(byCustomer || []), ...(byAccount || [])]
            const seenIds = new Set()
            
            const uniqueDb = mergedDb.filter(r => {
                if (!r.property || seenIds.has(r.property.id)) return false
                seenIds.add(r.property.id)
                return true
            }).map(r => ({ ...r.property, link_id: r.id, linked_at: r.linked_at, _source: 'db' }));

            return NextResponse.json({ success: true, data: uniqueDb })
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

        // List all properties (with optional server-side text filter)
        // NOTE: limit raised to 2000 to avoid truncation. Use `q` param for DB-side filtering.
        let listQuery = supabase
            .from('properties')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        if (q && q.trim()) {
            const term = q.trim()
            listQuery = listQuery.or(
                `flat_number.ilike.%${term}%,building_name.ilike.%${term}%,address.ilike.%${term}%,locality.ilike.%${term}%,city.ilike.%${term}%,pincode.eq.${term}`
            )
        }

        const { data: all, count: totalCount, error } = await listQuery.limit(2000)
        if (error) throw error

        // Return raw rows — no N+1 enrichment on list view (that's done in the detail panel GET ?id=)
        return NextResponse.json({ success: true, data: all || [], total: totalCount ?? (all || []).length })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST — create new property (optionally link to a customer)
export async function POST(request) {
    try {
        const body = await request.json()
        const { address, locality, city, pincode, property_type, customer_id, notes, flat_number, building_name, force_create, latitude, longitude } = body

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
                property_type: property_type || 'residential',
                latitude: latitude || null,
                longitude: longitude || null,
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

// DELETE — remove a property (only if no customer links AND no job history, unless force=true)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const force = searchParams.get('force') === 'true'
        if (!id) return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })

        // Check for any job history (never bypass this — it's financial data)
        const { count: jobCount } = await supabase
            .from('jobs')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', id)

        if (jobCount > 0 && !force) {
            return NextResponse.json({
                success: false,
                error: `Cannot delete — this property has ${jobCount} service record${jobCount > 1 ? 's' : ''} in history.`,
                canForce: false,
            }, { status: 400 })
        }

        if (jobCount > 0 && force) {
            // Soft-unlink from jobs rather than deleting records
            await supabase.from('jobs').update({ property_id: null }).eq('property_id', id)
        }

        // Check for any linked customers
        const { count: customerCount } = await supabase
            .from('customer_properties')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', id)

        if (customerCount > 0 && !force) {
            return NextResponse.json({
                success: false,
                error: `Cannot delete — ${customerCount} customer${customerCount > 1 ? 's are' : ' is'} linked to this property. Unlink them first, or use force delete.`,
                canForce: true,
                customerCount,
            }, { status: 400 })
        }

        if (customerCount > 0 && force) {
            // Remove all links first
            await supabase.from('customer_properties').delete().eq('property_id', id)
        }

        const { error } = await supabase.from('properties').delete().eq('id', id)
        if (error) throw error

        logInteractionServer({
            type: 'property-deleted',
            category: 'property',
            propertyId: id,
            description: `Property ${id} deleted${force ? ' (force)' : ''}`,
            metadata: { property_id: id, force, customer_links_removed: customerCount || 0, job_links_unlinked: jobCount || 0 },
            source: 'Admin App',
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}



// PATCH — edit property fields (id comes from URL ?id=...)
// Called from Reports > Properties > Edit & Fix Pin
export async function PATCH(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ success: false, error: 'Property ID required' }, { status: 400 })

        const updates = await request.json()
        // Never let client overwrite id
        delete updates.id

        const { data, error } = await supabase
            .from('properties')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error

        const changedFields = Object.keys(updates)
        logInteractionServer({
            type: 'property-edited',
            category: 'property',
            propertyId: id,
            description: `Property updated by admin: ${changedFields.join(', ')}`,
            metadata: { property_id: id, changed_fields: changedFields },
            source: 'Admin App',
        })

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
