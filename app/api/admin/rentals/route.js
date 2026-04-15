import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { fireNotification } from '@/lib/fire-notification'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plans, active
        const customerId = searchParams.get('customer_id')
        const status = searchParams.get('status')

        if (type === 'plans') {
            const { data, error } = await supabase
                .from('rental_plans')
                .select('*')
                .eq('is_active', true)
                .order('product_name')
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else if (type === 'active') {
            let query = supabase
                .from('active_rentals')
                .select('*, rental_plans(product_name), jobs(id, job_number, description, status, priority, scheduled_date, scheduled_time, technician_name, created_at)')  // only join rental_plans (has FK) and jobs
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

            const { data, error } = await query
            if (error) throw error

            // Enrich with account name if customer_id exists
            if (data && data.length > 0) {
                const customerIds = [...new Set(data.map(r => r.customer_id).filter(Boolean))]
                if (customerIds.length > 0) {
                    const { data: accounts } = await supabase
                        .from('accounts')
                        .select('id, name')
                        .in('id', customerIds)
                    const accountMap = Object.fromEntries((accounts || []).map(a => [a.id, a]))
                    data.forEach(r => {
                        r.accounts = accountMap[r.customer_id] || null
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

// POST - Create or manage rentals/plans
export async function POST(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, rental
        const body = await request.json()

        const tableName = type === 'plan' ? 'rental_plans' : 'active_rentals'

        const { data, error } = await supabase
            .from(tableName)
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Fire notification trigger events so the Notification Center handles delivery
        if (type === 'rental' && data) {
            const customerName = data.customer_name || `Customer #${data.customer_id}`
            const productName = data.product_name || `Rental #${data.id}`
            const customerId = data.customer_id ? String(data.customer_id) : undefined

            // 1. Immediately: rental contract created — notifies customer + logs
            await fireNotification('rental_contract_created', {
                customer_id: customerId,
                customer_name: customerName,
            }).catch(err => console.error('[rentals/fireNotification] rental_contract_created:', err.message))

            // Also log to interactions for the activity feed
            logInteractionServer({
                type: 'rental_contract_created',
                category: 'rental',
                jobId: String(data.id),
                customerName,
                description: `New rental contract created for ${productName} — ${customerName}`,
                metadata: { rentalId: data.id, startDate: data.start_date, endDate: data.end_date, monthlyRent: data.monthly_rent },
                source: 'Admin',
            })
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update rentals/plans
export async function PUT(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // plan, rental
        const body = await request.json()
        const { id, ...updates } = body

        const tableName = type === 'plan' ? 'rental_plans' : 'active_rentals'

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

// DELETE - Terminate a rental agreement (type=rental) or deactivate a plan (type=plan)
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'rental' or 'plan'
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 })

        if (type === 'plan') {
            // Dependency check: block if active agreements use this plan
            const { data: activeLinked } = await supabase
                .from('active_rentals')
                .select('id')
                .eq('plan_id', id)
                .eq('status', 'active')
            if (activeLinked?.length > 0) {
                return NextResponse.json({
                    success: false,
                    error: `Cannot delete — ${activeLinked.length} active rental agreement(s) still use this plan. Terminate those agreements first.`
                }, { status: 409 })
            }
            const { error } = await supabase.from('rental_plans').update({ is_active: false }).eq('id', id)
            if (error) throw error
            return NextResponse.json({ success: true })
        }

        // Hard delete rental agreement (in case of mistakes)
        const { error } = await supabase
            .from('active_rentals')
            .delete()
            .eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
