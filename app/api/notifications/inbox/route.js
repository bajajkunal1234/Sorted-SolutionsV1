import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Fetch recent notifications for a user
export async function GET(request) {
    const supabase = createServerSupabase();
    try {
        const { searchParams } = new URL(request.url);
        const recipient_id = searchParams.get('recipient_id');
        const recipient_type = searchParams.get('recipient_type');

        if (!recipient_id || !recipient_type) {
            return NextResponse.json({ success: false, error: 'recipient_id and recipient_type required' }, { status: 400 });
        }

        // Fetch up to 50 most recent notifications
        const { data, error } = await supabase
            .from('app_notifications')
            .select('*')
            .eq('recipient_id', String(recipient_id))
            .eq('recipient_type', recipient_type)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[inbox] query error', error.message);
            // If table doesn't exist yet, just return empty gracefully
            if (error.message.includes('relation "app_notifications" does not exist')) {
                 return NextResponse.json({ success: true, data: [], unreadCount: 0 });
            }
            throw error;
        }

        const unreadCount = data ? data.filter(n => !n.is_read).length : 0;

        return NextResponse.json({ success: true, data: data || [], unreadCount });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Mark notifications as read
export async function PUT(request) {
    const supabase = createServerSupabase();
    try {
        const body = await request.json();
        const { recipient_id, recipient_type, notification_id, mark_all_read } = body;

        if (!recipient_id || !recipient_type) {
            return NextResponse.json({ success: false, error: 'recipient_id and recipient_type required' }, { status: 400 });
        }

        let query = supabase
            .from('app_notifications')
            .update({ is_read: true })
            .eq('recipient_id', String(recipient_id))
            .eq('recipient_type', recipient_type);
        
        if (!mark_all_read && notification_id) {
            query = query.eq('id', notification_id);
        }

        const { error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
