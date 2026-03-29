/**
 * GET /api/notifications/test
 * Diagnostic endpoint: directly inserts a test notification and fires a test trigger.
 * Remove this file after debugging is complete.
 */
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { fireNotification } from '@/lib/fire-notification';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const supabase = createServerSupabase();
    const results = {};

    // 1. Direct insert into app_notifications
    const { data: inserted, error: insertErr } = await supabase
        .from('app_notifications')
        .insert({
            recipient_type: 'admin',
            recipient_id: 'admin',
            title: 'Test Notification',
            message: 'This is a direct test insert. If you see this in the bell, the table and inbox API work correctly.',
            link: 'https://sortedsolutions.in/admin',
            is_read: false,
        })
        .select()
        .single();

    results.directInsert = insertErr ? { error: insertErr.message } : { success: true, id: inserted?.id };

    // 2. Fire a real notification via fireNotification module
    try {
        await fireNotification('job_completed', {
            job_id: 'TEST-001',
            customer_name: 'Test Customer',
            technician_name: 'Test Tech',
        });
        results.fireNotification = { success: true };
    } catch (err) {
        results.fireNotification = { error: err.message };
    }

    // 3. Check what's in app_notifications for admin
    const { data: inbox, error: inboxErr } = await supabase
        .from('app_notifications')
        .select('id, title, message, created_at')
        .eq('recipient_type', 'admin')
        .eq('recipient_id', 'admin')
        .order('created_at', { ascending: false })
        .limit(5);

    results.currentInbox = inboxErr ? { error: inboxErr.message } : { count: inbox?.length, items: inbox };

    // 4. Check notification_logs
    const { data: logs, error: logsErr } = await supabase
        .from('notification_logs')
        .select('id, event_type, status, error, recipient_type')
        .order('id', { ascending: false })
        .limit(5);

    results.recentLogs = logsErr ? { error: logsErr.message } : { count: logs?.length, items: logs };

    return NextResponse.json(results);
}
