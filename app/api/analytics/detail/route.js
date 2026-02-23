import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

function daysAgo(n) {
    const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0)
    return d.toISOString()
}
function todayStart() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString()
}

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')       // e.g. 'customers_new', 'bookings_status', 'top_service'
    const range = searchParams.get('range') || '30d'
    const filter = searchParams.get('filter')   // e.g. status value or service name

    const lookback = range === 'today' ? todayStart()
        : range === '7d' ? daysAgo(7)
            : range === '90d' ? daysAgo(90)
                : daysAgo(30)

    try {
        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

        let rows = []

        if (type === 'customers_new') {
            // New customers in the period
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, mobile, email, created_at')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(c => ({
                id: c.id,
                name: c.name || '—',
                phone: c.mobile || '—',
                email: c.email || '—',
                joined: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }))
        }

        else if (type === 'customers_all') {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, mobile, email, created_at')
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(c => ({
                id: c.id,
                name: c.name || '—',
                phone: c.mobile || '—',
                email: c.email || '—',
                joined: c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }))
        }

        else if (type === 'bookings_status') {
            // Bookings for a specific status (or all if filter not set)
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, stage, scheduled_date, created_at')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (filter) query = query.eq('status', filter)
            const { data, error } = await query
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'bookings_period') {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'bookings_total') {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'top_service') {
            // Bookings for a specific service category
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (filter) query = query.eq('category', filter)
            const { data, error } = await query
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else {
            return NextResponse.json({ error: 'Unknown detail type' }, { status: 400 })
        }

        return NextResponse.json({ success: true, type, filter, rows })

    } catch (err) {
        console.error('[analytics/detail GET]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
