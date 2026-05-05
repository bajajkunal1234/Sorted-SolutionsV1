import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// ── Owner/internal IP exclusion list ─────────────────────────────────────────
// Requests from these IPs are silently ignored — no session or page-view stored.
// Exact IPs or prefix strings (e.g. '152.58.' matches any 152.58.x.x)
const EXCLUDED_IPS = [
    '49.36.123.66',  // Owner device — exact IP
    '152.58.',       // Owner ISP range — any IP starting with 152.58.
];

function isExcludedIp(rawIp) {
    if (!rawIp || rawIp === 'unknown') return false;
    // x-forwarded-for can be "client, proxy1, proxy2" — real client is first
    const clientIp = rawIp.split(',')[0].trim();
    return EXCLUDED_IPS.some(rule =>
        rule.endsWith('.') ? clientIp.startsWith(rule) : clientIp === rule
    );
}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            visitor_id,
            url,
            pathname,
            referrer,
            duration,
            type,           // 'pageview' or 'duration_update'
            session_id,
            utm_source,
            utm_medium,
            utm_campaign,
            gclid           // Google Ads Click ID — present on first page of paid visit
        } = body;

        if (type === 'pageview' && !visitor_id) {
            return NextResponse.json({ success: false, error: 'Missing visitor_id' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        if (type === 'pageview') {
            const rawIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
            const user_agent = request.headers.get('user-agent') || 'unknown';

            // ── Silently drop owner / internal traffic ────────────────────────
            if (isExcludedIp(rawIp)) {
                return NextResponse.json({ success: true, ignored: true });
            }

            const ip_address = rawIp.split(',')[0].trim(); // clean client IP

            // Check if session exists
            const { data: existingSession } = await supabase
                .from('visitor_sessions')
                .select('id')
                .eq('id', session_id)
                .single();

            if (!existingSession) {
                await supabase
                    .from('visitor_sessions')
                    .insert({
                        id: session_id,
                        visitor_id,
                        ip_address,
                        user_agent,
                        referrer,
                        utm_source,
                        utm_medium,
                        utm_campaign,
                        ...(gclid ? { gclid } : {})  // only set if present
                    });
            }

            // Insert page view
            const { data: pageView, error: pvError } = await supabase
                .from('page_views')
                .insert({
                    session_id,
                    page_path: pathname,
                    duration_seconds: 0
                })
                .select('id')
                .single();

            if (pvError) {
                console.error('[tracker] PV error:', pvError);
            }

            return NextResponse.json({ success: true, page_view_id: pageView?.id });
        }

        // Handle duration update
        if (type === 'duration_update') {
            const { page_view_id, duration_seconds } = body;
            if (page_view_id) {
                await supabase
                    .from('page_views')
                    .update({ duration_seconds })
                    .eq('id', page_view_id);
            }
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('[analytics/track error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
