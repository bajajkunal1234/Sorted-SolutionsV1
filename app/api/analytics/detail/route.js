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
                .eq('source', 'website_booking')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(c => ({
                id: c.id,
                name: c.name || '—',
                phone: c.mobile || '—',
                email: c.email || '—',
                joined: c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }))
        }

        else if (type === 'customers_all') {
            const { data, error } = await supabase
                .from('customers')
                .select('id, name, mobile, email, created_at')
                .eq('source', 'website_booking')
                .order('created_at', { ascending: false })
                .limit(200)
            if (error) throw error
            rows = (data || []).map(c => ({
                id: c.id,
                name: c.name || '—',
                phone: c.mobile || '—',
                email: c.email || '—',
                joined: c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
            }))
        }

        else if (type === 'bookings_status') {
            // Bookings for a specific status (or all if filter not set)
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, stage, scheduled_date, created_at')
                .eq('source', 'website')
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
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'bookings_period') {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
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
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'bookings_total') {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
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
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'top_service') {
            // Bookings for a specific service category
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
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
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'top_subcategory') {
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (filter) query = query.eq('subcategory', filter)
            const { data, error } = await query
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'top_issue') {
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)
            if (filter) query = query.eq('issue', filter)
            const { data, error } = await query
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'top_pincode') {
            // Pincode filtering requires parsing the JSON notes field in Supabase PostgreSQL
            // The cleanest way is to use PostgreSQL JSONB operators, e.g., notes->>'pincode'
            let query = supabase
                .from('jobs')
                .select('id, job_number, customer_name, category, subcategory, status, scheduled_date, created_at')
                .eq('source', 'website')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200)

            // In postgREST we can query JSONB fields. By converting JSON notes object value
            // filter = '400053' -> "notes->>pincode=eq.400053"
            if (filter) query = query.contains('notes', JSON.stringify({ pincode: filter }))

            const { data, error } = await query
            if (error) throw error
            rows = (data || []).map(j => ({
                id: j.id,
                jobNo: j.job_number || j.id?.slice(0, 8),
                customer: j.customer_name || '—',
                service: [j.category, j.subcategory].filter(Boolean).join(' › ').replace(/-/g, ' '),
                status: j.status || '—',
                date: j.scheduled_date || (j.created_at ? j.created_at.split('T')[0] : '—'),
                created: j.created_at ? new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            }))
        }

        else if (type === 'first_party_sessions') {
            const { data, error } = await supabase
                .from('visitor_sessions')
                .select('id, ip_address, referrer, user_agent, created_at, utm_source, utm_campaign, page_views(count)')
                .gte('created_at', lookback)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            rows = (data || []).map(s => ({
                id: s.id,
                ip: s.ip_address || '—',
                referrer: s.referrer || 'Direct',
                source: s.utm_source ? `${s.utm_source} / ${s.utm_campaign || 'unknown'}` : '—',
                agent: s.user_agent ? s.user_agent.split(' ')[0] : '—',
                views: s.page_views?.[0]?.count || 0,
                created: s.created_at ? new Date(s.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
            }));
        }

        else if (type === 'first_party_journey') {
            // "filter" holds the session_id
            const { data, error } = await supabase
                .from('page_views')
                .select('id, page_path, duration_seconds, created_at')
                .eq('session_id', filter)
                .order('created_at', { ascending: true });

            if (error) throw error;
            rows = (data || []).map(p => ({
                id: p.id,
                path: p.page_path,
                duration: `${p.duration_seconds}s`,
                created: p.created_at ? new Date(p.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
            }));
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
