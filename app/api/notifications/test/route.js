/**
 * GET /api/notifications/test
 * Diagnostic: dumps triggers and all app_notifications
 */
import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const supabase = createServerSupabase();
    const results = {};

    // 1. ALL recent app_notifications
    const { data: allNotifs } = await supabase
        .from('app_notifications')
        .select('id, recipient_type, recipient_id, title, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
    results.allRecentNotifications = allNotifs;

    // 2. Dump active triggers for job_completed and job_started
    const { data: triggers } = await supabase
        .from('notification_triggers')
        .select('id, event_type, channel, audience, is_active, template_id, notification_templates(name)')
        .in('event_type', ['job_completed', 'job_started']);
    results.triggers = triggers;

    return NextResponse.json(results);
}


