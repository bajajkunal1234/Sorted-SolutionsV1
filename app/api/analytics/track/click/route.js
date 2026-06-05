import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();
        const { session_id, click_type, page_path } = body;

        if (!session_id || !click_type) {
            return NextResponse.json({ success: false, error: 'Missing session_id or click_type' }, { status: 400 });
        }

        if (click_type !== 'call' && click_type !== 'whatsapp') {
            return NextResponse.json({ success: false, error: 'Invalid click_type' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const { error } = await supabase
            .from('visitor_clicks')
            .insert({
                session_id,
                click_type,
                page_path: page_path || '/'
            });

        if (error) {
            console.error('[visitor_clicks track error]:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[analytics/track/click error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
