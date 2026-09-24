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

            const amcId = searchParams.get('id')
            if (amcId) query = query.eq('id', amcId)
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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveInstallationAddressId(addressId, customerId, propertyObj = null) {
    if (!addressId && !propertyObj) return null;

    if (addressId && UUID_REGEX.test(addressId)) {
        return addressId;
    }

    const isInline = (typeof addressId === 'string' && addressId.startsWith('inline:')) || propertyObj?._source === 'inline';
    if (isInline || propertyObj) {
        try {
            let flat_number = propertyObj?.flat_number || '';
            let building_name = propertyObj?.building_name || '';
            let address = propertyObj?.address || '';
            let locality = propertyObj?.locality || '';
            let pincode = propertyObj?.pincode || '';

            if (typeof addressId === 'string' && addressId.startsWith('inline:')) {
                const parts = addressId.slice(7).split('|');
                flat_number = flat_number || parts[0] || '';
                building_name = building_name || parts[1] || '';
                address = address || parts[2] || '';
                locality = locality || parts[3] || '';
                pincode = pincode || parts[4] || '';
            }

            flat_number = (flat_number || '').trim();
            building_name = (building_name || '').trim();
            address = (address || '').trim();
            locality = (locality || '').trim();
            pincode = (pincode || '').trim();

            if (!address && !building_name && !locality) {
                return null;
            }

            let query = supabase.from('properties').select('id');
            if (pincode) query = query.eq('pincode', pincode);
            if (flat_number) query = query.eq('flat_number', flat_number);
            if (building_name) query = query.ilike('building_name', `%${building_name}%`);

            const { data: existing } = await query.limit(1);
            if (existing && existing.length > 0) {
                return existing[0].id;
            }

            const { data: newProp, error: propErr } = await supabase
                .from('properties')
                .insert({
                    flat_number: flat_number || null,
                    building_name: building_name || null,
                    address: address || locality || building_name || 'Mumbai',
                    locality: locality || null,
                    city: 'Mumbai',
                    pincode: pincode || null,
                    property_type: 'residential',
                    created_by: 'AMC Setup',
                })
                .select('id')
                .single();

            if (!propErr && newProp?.id) {
                if (customerId && UUID_REGEX.test(customerId)) {
                    await supabase.from('customer_properties').insert({
                        account_id: customerId,
                        property_id: newProp.id,
                        linked_at: new Date().toISOString(),
                        is_active: true
                    }).then(() => {}).catch(() => {});
                }
                return newProp.id;
            }
        } catch (err) {
            console.warn('[amc/resolveInstallationAddressId] Failed to resolve inline address:', err.message);
        }
    }

    return null;
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

        if (type === 'amc') {
            insertBody.installation_address_id = await resolveInstallationAddressId(insertBody.installation_address_id, insertBody.customer_id, insertBody.property);
            delete insertBody.property;
        }

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

        if (type === 'amc' && updates.installation_address_id !== undefined) {
            updates.installation_address_id = await resolveInstallationAddressId(updates.installation_address_id, updates.customer_id, updates.property);
            delete updates.property;
        }

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
