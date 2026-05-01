import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            visitor_id,
            url,
            pathname,
            referrer,
            duration,
            type, // 'pageview' or 'duration_update'
            session_id,
            utm_source,
            utm_medium,
            utm_campaign
        } = body;

        if (type === 'pageview' && !visitor_id) {
            return NextResponse.json({ success: false, error: 'Missing visitor_id' }, { status: 400 });
        }


        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        let currentSessionId = session_id;

        // If it's a new pageview, we might need to create a session if one doesn't exist
        // But for simplicity, the client sends a session_id. If it doesn't exist in DB, we create it.
        // Actually, let's just UPSERT the session.
        if (type === 'pageview') {
            const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
            const user_agent = request.headers.get('user-agent') || 'unknown';

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
                        utm_campaign
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
