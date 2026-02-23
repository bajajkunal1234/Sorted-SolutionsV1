import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) {
    const d = new Date()
    d.setDate(d.getDate() - n)
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
}

function todayStart() {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.toISOString()
}

// ─── GA4 Data API ─────────────────────────────────────────────────────────────
async function fetchGA4(propertyId, serviceAccountJson, dateRange) {
    try {
        const sa = JSON.parse(serviceAccountJson)
        // Build a JWT for Google OAuth2
        const now = Math.floor(Date.now() / 1000)
        const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const payload = btoa(JSON.stringify({
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/analytics.readonly',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

        // Sign with RSA-SHA256 using Web Crypto
        const pkcs8 = sa.private_key
            .replace(/-----BEGIN PRIVATE KEY-----/, '')
            .replace(/-----END PRIVATE KEY-----/, '')
            .replace(/\n/g, '')
        const binaryKey = Uint8Array.from(atob(pkcs8), c => c.charCodeAt(0))
        const privateKey = await crypto.subtle.importKey(
            'pkcs8', binaryKey.buffer,
            { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
            false, ['sign']
        )
        const sigBuffer = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5', privateKey,
            new TextEncoder().encode(`${header}.${payload}`)
        )
        const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const jwt = `${header}.${payload}.${sig}`

        // Exchange JWT for access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
        })
        const { access_token } = await tokenRes.json()
        if (!access_token) return null

        // GA4 Data API runReport
        const body = {
            dateRanges: [{ startDate: dateRange, endDate: 'today' }],
            metrics: [
                { name: 'sessions' },
                { name: 'totalUsers' },
                { name: 'screenPageViews' },
                { name: 'bounceRate' },
                { name: 'averageSessionDuration' },
                { name: 'newUsers' }
            ],
            dimensions: [],
        }
        const reportRes = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            }
        )
        const report = await reportRes.json()
        const row = report.rows?.[0]?.metricValues || []
        const traffic = {
            sessions: parseInt(row[0]?.value || '0'),
            users: parseInt(row[1]?.value || '0'),
            pageViews: parseInt(row[2]?.value || '0'),
            bounceRate: parseFloat(row[3]?.value || '0'),
            avgSessionDuration: parseFloat(row[4]?.value || '0'),
            newUsers: parseInt(row[5]?.value || '0'),
        }

        // Top pages
        const pagesBody = {
            dateRanges: [{ startDate: dateRange, endDate: 'today' }],
            metrics: [{ name: 'sessions' }, { name: 'bounceRate' }],
            dimensions: [{ name: 'pagePath' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 10
        }
        const pagesRes = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
            { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(pagesBody) }
        )
        const pagesReport = await pagesRes.json()
        const topPages = (pagesReport.rows || []).map(r => ({
            path: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value),
            bounceRate: parseFloat(r.metricValues[1].value)
        }))

        // Traffic sources
        const sourcesBody = {
            dateRanges: [{ startDate: dateRange, endDate: 'today' }],
            metrics: [{ name: 'sessions' }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 8
        }
        const sourcesRes = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
            { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(sourcesBody) }
        )
        const sourcesReport = await sourcesRes.json()
        const trafficSources = (sourcesReport.rows || []).map(r => ({
            channel: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value)
        }))

        // Daily trend (last 30d)
        const trendBody = {
            dateRanges: [{ startDate: dateRange, endDate: 'today' }],
            metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
            dimensions: [{ name: 'date' }],
            orderBys: [{ dimension: { dimensionName: 'date' } }],
        }
        const trendRes = await fetch(
            `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
            { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(trendBody) }
        )
        const trendReport = await trendRes.json()
        const dailyTrend = (trendReport.rows || []).map(r => ({
            date: r.dimensionValues[0].value,
            sessions: parseInt(r.metricValues[0].value),
            pageViews: parseInt(r.metricValues[1].value)
        }))

        return { traffic, topPages, trafficSources, dailyTrend }
    } catch (err) {
        console.error('[GA4 fetch error]', err)
        return null
    }
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    const dateRangeMap = { '7d': '7daysAgo', '30d': '30daysAgo', '90d': '90daysAgo', 'today': 'today' }
    const ga4DateRange = dateRangeMap[range] || '30daysAgo'

    const lookback = range === 'today' ? todayStart()
        : range === '7d' ? daysAgo(7)
            : range === '90d' ? daysAgo(90)
                : daysAgo(30)

    const prevLookback = range === 'today' ? daysAgo(1)
        : range === '7d' ? daysAgo(14)
            : range === '90d' ? daysAgo(180)
                : daysAgo(60)

    try {
        const supabase = createServerSupabase()
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 })

        // ── Supabase queries (parallel) ───────────────────────────────────────
        const [
            { count: totalBookings },
            { count: periodBookings },
            { count: prevPeriodBookings },
            { data: statusBreakdown },
            { data: dailyBookings },
            { data: topServices },
            { count: totalCustomers },
            { count: newCustomers },
            { count: prevNewCustomers },
            { data: googleConfig }
        ] = await Promise.all([
            supabase.from('jobs').select('*', { count: 'exact', head: true }),

            supabase.from('jobs').select('*', { count: 'exact', head: true })
                .gte('created_at', lookback),

            supabase.from('jobs').select('*', { count: 'exact', head: true })
                .gte('created_at', prevLookback).lt('created_at', lookback),

            supabase.from('jobs').select('status')
                .gte('created_at', lookback),

            // daily booking trend (raw rows, we group in JS)
            supabase.from('jobs').select('created_at')
                .gte('created_at', lookback)
                .order('created_at', { ascending: true }),

            // top service categories
            supabase.from('jobs').select('category')
                .gte('created_at', lookback),

            supabase.from('customers').select('*', { count: 'exact', head: true }),

            supabase.from('customers').select('*', { count: 'exact', head: true })
                .gte('created_at', lookback),

            supabase.from('customers').select('*', { count: 'exact', head: true })
                .gte('created_at', prevLookback).lt('created_at', lookback),

            supabase.from('website_config').select('value').eq('key', 'google_apis').single()
        ])

        // Process status breakdown
        const statusCounts = {}
        for (const row of (statusBreakdown || [])) {
            statusCounts[row.status] = (statusCounts[row.status] || 0) + 1
        }

        // Process daily booking trend
        const bookingsByDate = {}
        for (const row of (dailyBookings || [])) {
            const d = row.created_at?.split('T')[0]
            if (d) bookingsByDate[d] = (bookingsByDate[d] || 0) + 1
        }
        const bookingTrend = Object.entries(bookingsByDate).map(([date, count]) => ({ date, count }))

        // Process top services
        const serviceCounts = {}
        for (const row of (topServices || [])) {
            if (row.category) serviceCounts[row.category] = (serviceCounts[row.category] || 0) + 1
        }
        const topServicesArr = Object.entries(serviceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6)

        // Change % helper
        function pct(curr, prev) {
            if (!prev) return curr > 0 ? 100 : 0
            return Math.round(((curr - prev) / prev) * 100)
        }

        const supabaseData = {
            bookings: {
                total: totalBookings || 0,
                period: periodBookings || 0,
                change: pct(periodBookings || 0, prevPeriodBookings || 0),
                byStatus: statusCounts,
                trend: bookingTrend,
            },
            customers: {
                total: totalCustomers || 0,
                newPeriod: newCustomers || 0,
                change: pct(newCustomers || 0, prevNewCustomers || 0),
            },
            topServices: topServicesArr,
        }

        // ── GA4 (optional) ────────────────────────────────────────────────────
        const cfg = googleConfig?.value || {}
        let ga4Data = null
        if (cfg.ga4PropertyId && cfg.ga4ServiceAccountJson) {
            ga4Data = await fetchGA4(cfg.ga4PropertyId, cfg.ga4ServiceAccountJson, ga4DateRange)
        }

        return NextResponse.json({
            success: true,
            range,
            supabase: supabaseData,
            ga4: ga4Data,
            ga4Connected: !!(cfg.ga4PropertyId && cfg.ga4ServiceAccountJson),
        })
    } catch (err) {
        console.error('[analytics GET]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
