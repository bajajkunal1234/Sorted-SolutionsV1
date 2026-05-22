import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fireNotification } from '@/lib/fire-notification'

export const dynamic = 'force-dynamic';

// GET - Fetch AMCs or plans
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plans, active
        const customerId = searchParams.get('customer_id')
        const status = searchParams.get('status')

        if (type === 'plans') {
            const { data, error } = await supabase
                .from('amc_plans')
                .select('*')
                .eq('is_active', true)
                .order('name')
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else if (type === 'active') {
            let query = supabase
                .from('active_amcs')
                .select('*, amc_plans(name, services, terms), jobs(id, job_number, description, status, priority, scheduled_date, scheduled_time, technician_name, created_at)')
                .order('created_at', { ascending: false })

            if (customerId) {
                let lookupIds = [customerId];
                const { data: authCustomers } = await supabase.from('customers').select('id').eq('ledger_id', customerId);
                if (authCustomers && authCustomers.length > 0) {
                    lookupIds = [...lookupIds, ...authCustomers.map(c => c.id)];
                }
                query = query.in('customer_id', lookupIds);
            }
            if (status) query = query.eq('status', status)

            const includeArchived = searchParams.get('include_archived') === '1' || searchParams.get('include_archived') === 'true';
            if (!includeArchived) query = query.neq('status', 'archived');

            const { data, error } = await query
            if (error) throw error

            // Enrich with account name if customer_id exists
            if (data && data.length > 0) {
                const customerIds = [...new Set(data.map(r => r.customer_id).filter(Boolean))]
                if (customerIds.length > 0) {
                    const { data: accounts } = await supabase
                        .from('accounts')
                        .select('id, name, mobile, phone, email, mailing_address, gstin')
                        .in('id', customerIds)

                    const { data: webCustomers } = await supabase
                        .from('customers')
                        .select('id, ledger_id')
                        .in('ledger_id', customerIds)
                    
                    let props = null;
                    if (webCustomers && webCustomers.length > 0) {
                        const webCustomerIds = webCustomers.map(c => c.id)
                        const res = await supabase
                            .from('customer_properties')
                            .select('customer_id, properties(address, locality, city)')
                            .in('customer_id', webCustomerIds)
                        props = res.data
                    }
                        
                    const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, {...a, property: null}]))
                    
                    if (props && webCustomers) {
                        props.forEach(p => {
                            // Find the matching ledger_id
                            const webCustomer = webCustomers.find(c => c.id === p.customer_id)
                            if (webCustomer && accountMap[webCustomer.ledger_id] && p.properties) {
                                // Just pick the first property for display
                                if (!accountMap[webCustomer.ledger_id].property) {
                                    accountMap[webCustomer.ledger_id].property = p.properties;
                                }
                            }
                        })
                    }

                    // Fetch specific installation properties
                    const installationIds = [...new Set(data.map(r => r.installation_address_id).filter(Boolean))];
                    let installationProperties = [];
                    if (installationIds.length > 0) {
                        const { data: instProps } = await supabase.from('properties').select('id, flat_number, building_name, address, locality, city, pincode').in('id', installationIds);
                        installationProperties = instProps || [];
                    }

                    data.forEach(r => {
                        r.accounts = accountMap[r.customer_id] || null;
                        if (r.installation_address_id) {
                            r.installation_property = installationProperties.find(p => String(p.id) === String(r.installation_address_id)) || null;
                        }
                    })
                }
            }

            return NextResponse.json({ success: true, data })
        } else {
            return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 })
        }
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create or manage AMCs/plans
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const body = await request.json()

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

        // Use body directly for insert
        let insertBody = { ...body };

        const { data, error } = await supabase
            .from(tableName)
            .insert([insertBody])
            .select()
            .single()

        if (error) throw error

        // Notify customer when a new AMC contract is activated
        if (type === 'amc' && data && data.customer_id) {
            await fireNotification('rental_contract_created', {
                customer_id: String(data.customer_id),
                customer_name: data.customer_name || undefined,
            }).catch(err => console.error('[amc/fireNotification]:', err.message));
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update AMCs/plans
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const body = await request.json()
        const { id, ...updates } = body

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

        const { data, error } = await supabase
            .from(tableName)
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

// DELETE - Remove AMC plan or active AMC
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, amc
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 })

        const tableName = type === 'plan' ? 'amc_plans' : 'active_amcs'

        // ── Dependency check ──────────────────────────────────────────────────
        if (type === 'amc') {
            const { data: jobDeps, error: jobErr } = await supabase
                .from('jobs')
                .select('id, job_number')
                .eq('amc_id', id)
                .limit(5);

            if (jobDeps && jobDeps.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot delete AMC — ${jobDeps.length} job(s) are dependent on it (e.g., ${jobDeps.map(j => j.job_number || j.id).join(', ')}).`,
                    blocking: [{ type: 'Jobs', records: jobDeps.map(j => j.job_number || j.id) }]
                }, { status: 400 });
            }
        }

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
