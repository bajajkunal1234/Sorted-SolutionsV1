/**
 * GET /api/notifications/test
 * Diagnostic: dumps ALL recent app_notifications and checks what IDs are being written.
 */
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const supabase = createServerSupabase();
    const results = {};

    // 1. ALL recent app_notifications (last 20 across all recipients)
    const { data: allNotifs, error: allErr } = await supabase
        .from('app_notifications')
        .select('id, recipient_type, recipient_id, title, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

    results.allRecentNotifications = allErr
        ? { error: allErr.message }
        : { count: allNotifs?.length, items: allNotifs };

    // 2. Check notification_logs (any columns)
    const { data: logs, error: logsErr } = await supabase
        .from('notification_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    results.recentLogs = logsErr
        ? { error: logsErr.message }
        : { count: logs?.length, items: logs };

    // 3. Check if notification_logs has sent_at column by trying insert
    const { error: logInsertErr } = await supabase
        .from('notification_logs')
        .insert({
            channel: 'push',
            recipient_type: 'admin',
            recipient_id: 'admin',
            recipient_name: 'Admin',
            event_type: 'test_debug',
            status: 'skipped',
            sent_at: new Date().toISOString(),
        });

    results.logInsertTest = logInsertErr
        ? { error: logInsertErr.message, hint: logInsertErr.hint }
        : { success: true };

    return NextResponse.json(results);
}

