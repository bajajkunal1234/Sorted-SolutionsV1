import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: Project monthly occurrences
function projectMonthly(originalDate, startStr, endStr) {
    const [origY, origM, origD] = originalDate.split('-').map(Number);
    const [startY, startM] = startStr.split('-').map(Number);
    const [endY, endM] = endStr.split('-').map(Number);
    const results = [];
    let curY = startY;
    let curM = startM;
    while (curY < endY || (curY === endY && curM <= endM)) {
        const maxDays = new Date(curY, curM, 0).getDate();
        const targetDay = Math.min(origD, maxDays);
        const occStr = `${curY}-${String(curM).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
        if (occStr >= originalDate && occStr >= startStr && occStr <= endStr) {
            results.push(occStr);
        }
        curM++;
        if (curM > 12) {
            curM = 1;
            curY++;
        }
    }
    return results;
}

// Helper: Project weekly occurrences
function projectWeekly(originalDate, startStr, endStr) {
    const orig = new Date(originalDate + 'T00:00:00');
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const results = [];
    let cur = new Date(orig);
    while (cur < start) {
        cur.setDate(cur.getDate() + 7);
    }
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const occStr = `${y}-${m}-${d}`;
        if (occStr >= originalDate && occStr <= endStr) {
            results.push(occStr);
        }
        cur.setDate(cur.getDate() + 7);
    }
    return results;
}

// Helper: Project daily occurrences
function projectDaily(originalDate, startStr, endStr) {
    const orig = new Date(originalDate + 'T00:00:00');
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const results = [];
    let cur = new Date(orig);
    if (cur < start) cur = new Date(start);
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const occStr = `${y}-${m}-${d}`;
        results.push(occStr);
        cur.setDate(cur.getDate() + 1);
    }
    return results;
}

// GET: Fetch planned reminders with recurring projection, date filtering, type, status, and search
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

        // 1. Fetch non-recurring items in date range
        let baseQuery = supabase
            .from('reminders')
            .select('*')
            .order('due_date', { ascending: true })
            .order('due_time', { ascending: true, nullsFirst: false })
            .limit(limit)

        if (date) {
            baseQuery = baseQuery.eq('due_date', date)
        } else {
            if (startDate) baseQuery = baseQuery.gte('due_date', startDate)
            if (endDate) baseQuery = baseQuery.lte('due_date', endDate)
        }

        if (reminderType && reminderType !== 'all') {
            baseQuery = baseQuery.eq('reminder_type', reminderType)
        }

        if (status && status !== 'all') {
            baseQuery = baseQuery.eq('status', status)
        }

        if (search && search.trim()) {
            const s = search.trim()
            baseQuery = baseQuery.or(`title.ilike.%${s}%,description.ilike.%${s}%,contact_name.ilike.%${s}%,location.ilike.%${s}%`)
        }

        // 2. Fetch recurring items (which may have originated before startDate)
        let recurringQuery = supabase
            .from('reminders')
            .select('*')
            .eq('is_recurring', true)

        if (endDate) {
            recurringQuery = recurringQuery.lte('due_date', endDate)
        }
        if (reminderType && reminderType !== 'all') {
            recurringQuery = recurringQuery.eq('reminder_type', reminderType)
        }

        const [baseRes, recRes] = await Promise.all([baseQuery, recurringQuery])
        if (baseRes.error) throw baseRes.error

        const baseItems = baseRes.data || []
        const recurringItems = recRes.data || []

        // Map existing items by unique ID
        const itemsMap = new Map()
        for (const item of baseItems) {
            itemsMap.set(item.id, item)
        }

        // Project recurring items if we have a date range or specific date
        const rangeStart = date || startDate
        const rangeEnd = date || endDate

        if (rangeStart && rangeEnd) {
            for (const item of recurringItems) {
                const freq = item.recurrence_pattern?.frequency || 'monthly'
                const completedDates = new Set(item.recurrence_pattern?.completed_dates || [])

                let occurrences = []
                if (freq === 'monthly') {
                    occurrences = projectMonthly(item.due_date, rangeStart, rangeEnd)
                } else if (freq === 'weekly') {
                    occurrences = projectWeekly(item.due_date, rangeStart, rangeEnd)
                } else if (freq === 'daily') {
                    occurrences = projectDaily(item.due_date, rangeStart, rangeEnd)
                }

                for (const occDate of occurrences) {
                    if (occDate === item.due_date) {
                        // Original item
                        if (!itemsMap.has(item.id)) {
                            itemsMap.set(item.id, item)
                        }
                    } else {
                        // Projected recurring occurrence
                        const occId = `${item.id}_${occDate}`
                        const isDone = completedDates.has(occDate)

                        if (status && status !== 'all') {
                            if (status === 'completed' && !isDone) continue
                            if (status === 'pending' && isDone) continue
                        }

                        itemsMap.set(occId, {
                            ...item,
                            id: occId,
                            master_id: item.id,
                            is_projected: true,
                            due_date: occDate,
                            status: isDone ? 'completed' : 'pending',
                            completed_at: isDone ? (item.completed_at || new Date().toISOString()) : null
                        })
                    }
                }
            }
        }

        const allItems = Array.from(itemsMap.values())
        allItems.sort((a, b) => {
            if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
            const timeA = a.due_time || '99:99'
            const timeB = b.due_time || '99:99'
            return timeA.localeCompare(timeB)
        })

        return NextResponse.json({ success: true, data: allItems })
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
            is_recurring = false,
            recurrence_pattern = {},
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
            is_recurring: Boolean(is_recurring),
            recurrence_pattern: recurrence_pattern || {},
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

        // Handle projected recurring occurrence completion
        if (typeof id === 'string' && id.includes('_')) {
            const [masterId, occDate] = id.split('_')
            const { data: master, error: fetchErr } = await supabase
                .from('reminders')
                .select('*')
                .eq('id', masterId)
                .single()

            if (fetchErr) throw fetchErr

            const pattern = master.recurrence_pattern || {}
            let completedDates = Array.isArray(pattern.completed_dates) ? [...pattern.completed_dates] : []

            if (updates.status === 'completed') {
                if (!completedDates.includes(occDate)) completedDates.push(occDate)
            } else if (updates.status === 'pending') {
                completedDates = completedDates.filter(d => d !== occDate)
            }

            const { data: updatedMaster, error: updateErr } = await supabase
                .from('reminders')
                .update({
                    recurrence_pattern: { ...pattern, completed_dates: completedDates },
                    updated_at: new Date().toISOString()
                })
                .eq('id', masterId)
                .select()
                .single()

            if (updateErr) throw updateErr

            return NextResponse.json({
                success: true,
                data: {
                    ...updatedMaster,
                    id,
                    master_id: masterId,
                    is_projected: true,
                    due_date: occDate,
                    status: updates.status
                }
            })
        }

        // Standard item update
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
        let id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
        }

        // If deleting a projected recurring occurrence, delete the master record
        if (id.includes('_')) {
            id = id.split('_')[0]
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
