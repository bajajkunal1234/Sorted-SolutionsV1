import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET: Fetch planned reminders with date filtering, type, status, and search
export async function GET(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const date = searchParams.get('date')
        const reminderType = searchParams.get('type')
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const limit = parseInt(searchParams.get('limit') || '500', 10)

        let query = supabase
            .from('reminders')
            .select('*')
            .order('due_date', { ascending: true })
            .order('due_time', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false })
            .limit(limit)

        if (date) {
            query = query.eq('due_date', date)
        } else {
            if (startDate) query = query.gte('due_date', startDate)
            if (endDate) query = query.lte('due_date', endDate)
        }

        if (reminderType && reminderType !== 'all') {
            query = query.eq('reminder_type', reminderType)
        }

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (search && search.trim()) {
            const s = search.trim()
            query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,contact_name.ilike.%${s}%,location.ilike.%${s}%`)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, data: data || [] })
    } catch (error) {
        console.error('Error fetching planner items:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST: Create a new day plan / reminder item
export async function POST(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const body = await request.json()
        const {
            title,
            due_date,
            due_time,
            reminder_type = 'general',
            amount = 0,
            contact_name,
            contact_phone,
            location,
            description,
            priority = 'medium',
            status = 'pending',
            account_id = null,
            metadata = {}
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
        }

        if (!due_date) {
            return NextResponse.json({ success: false, error: 'Due date is required' }, { status: 400 })
        }

        const payload = {
            title: title.trim(),
            due_date,
            due_time: due_time || null,
            reminder_type,
            amount: parseFloat(amount) || 0,
            contact_name: contact_name ? contact_name.trim() : null,
            contact_phone: contact_phone ? contact_phone.trim() : null,
            location: location ? location.trim() : null,
            description: description ? description.trim() : null,
            priority,
            status,
            account_id: account_id || null,
            metadata: metadata || {}
        }

        const { data, error } = await supabase
            .from('reminders')
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error) {
        console.error('Error creating planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PATCH: Update a plan / toggle completion
export async function PATCH(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
        }

        // Handle completed_at timestamp when toggling status
        if ('status' in updates) {
            if (updates.status === 'completed') {
                updates.completed_at = new Date().toISOString()
            } else if (updates.status === 'pending') {
                updates.completed_at = null
            }
        }

        updates.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('reminders')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error updating planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE: Delete a planner item
export async function DELETE(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
        }

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Item deleted successfully' })
    } catch (error) {
        console.error('Error deleting planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
