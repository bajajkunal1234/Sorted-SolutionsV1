import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Helper: compute reminder dates from a rental contract
function buildReminders(rental) {
    const reminders = []
    const start = new Date(rental.start_date)
    const end = rental.end_date ? new Date(rental.end_date) : null

    // Rent due reminder — every month starting from start date
    const firstRentDue = new Date(start)
    firstRentDue.setMonth(firstRentDue.getMonth() + 1)
    reminders.push({
        rental_id: rental.id,
        type: 'rent_due',
        due_date: firstRentDue.toISOString().split('T')[0],
        message: `Monthly rent due for rental #${rental.id}`,
        status: 'pending',
    })

    // Contract expiry reminder — 30 days before end
    if (end) {
        const expiryReminder = new Date(end)
        expiryReminder.setDate(expiryReminder.getDate() - 30)
        if (expiryReminder > new Date()) {
            reminders.push({
                rental_id: rental.id,
                type: 'contract_expiry',
                due_date: expiryReminder.toISOString().split('T')[0],
                message: `Rental contract ending in 30 days for rental #${rental.id}`,
                status: 'pending',
            })
        }

        // Contract end reminder — on end date
        reminders.push({
            rental_id: rental.id,
            type: 'contract_end',
            due_date: end.toISOString().split('T')[0],
            message: `Rental contract ends today for rental #${rental.id}`,
            status: 'pending',
        })
    }

    return reminders
}

// GET - Fetch rentals or plans
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
                .select('*, rental_plans(product_name), accounts(name)')
                .order('created_at', { ascending: false })

            if (customerId) query = query.eq('customer_id', customerId)
            if (status) query = query.eq('status', status)

            const { data, error } = await query
            if (error) throw error
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

        // Auto-create reminders when a new rental contract is created
        if (type === 'rental' && data) {
            const reminders = buildReminders(data)
            if (reminders.length > 0) {
                const { error: reminderError } = await supabase
                    .from('rental_reminders')
                    .insert(reminders)

                if (reminderError) {
                    // Non-fatal — rental was created successfully, just log the reminder failure
                    console.warn('Could not create rental reminders:', reminderError.message)
                }
            }
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
