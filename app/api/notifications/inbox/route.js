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

        let targetIds = [String(recipient_id)];

        // If customer, we must also check their ledger_id because jobs usually attach to the ledger account ID
        if (recipient_type === 'customer') {
            const { data: cx } = await supabase.from('customers').select('ledger_id').eq('id', recipient_id).single();
            if (cx?.ledger_id && cx.ledger_id !== recipient_id) {
                targetIds.push(cx.ledger_id);
            }
        }

        // Fetch up to 50 most recent notifications
        const { data, error } = await supabase
            .from('app_notifications')
            .select('*')
            .in('recipient_id', targetIds)
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

        let targetIds = [String(recipient_id)];
        if (recipient_type === 'customer') {
            const { data: cx } = await supabase.from('customers').select('ledger_id').eq('id', recipient_id).single();
            if (cx?.ledger_id && cx.ledger_id !== recipient_id) {
                targetIds.push(cx.ledger_id);
            }
        }

        let query = supabase
            .from('app_notifications')
            .update({ is_read: true })
            .in('recipient_id', targetIds)
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
