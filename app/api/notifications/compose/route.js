import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/compose
 * Manual "send now" — bypasses triggers, sends directly.
 * Body: {
 *   channel: 'push' | 'whatsapp',
 *   audience_type: 'all_customers' | 'all_technicians' | 'specific',
 *   recipient_ids?: string[],          // used when audience_type='specific'
 *   title: string,                     // push notification title
 *   message: string,                   // body text (can include {name} placeholder)
 *   template_id?: string,              // optional: use a saved template as base
 * }
 */
export async function POST(request) {
    const supabase = createServerSupabase();
    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const { channel, audience_type, recipient_ids, title, message } = body;
    if (!channel || !message) {
        return NextResponse.json({ success: false, error: 'channel and message are required' }, { status: 400 });
    }

    // Resolve recipients
    let recipients = [];

    if (audience_type === 'all_customers') {
        const { data } = await supabase.from('customers').select('id, name, phone, fcm_token');
        recipients = (data || []).map(r => ({ ...r, recipientType: 'customer' }));
    } else if (audience_type === 'all_technicians') {
        const { data } = await supabase.from('technicians').select('id, name, phone, fcm_token');
        recipients = (data || []).map(r => ({ ...r, recipientType: 'technician' }));
    } else if (audience_type === 'all_admins') {
        const { data } = await supabase.from('admin_recipients').select('id, name, fcm_token').not('fcm_token', 'is', null);
        recipients = (data || []).map(r => ({ ...r, recipientType: 'admin' }));
    } else if (audience_type === 'specific' && recipient_ids?.length > 0) {
        // Try customers first, then technicians
        const { data: custs } = await supabase.from('customers').select('id, name, phone, fcm_token').in('id', recipient_ids);
        const { data: techs } = await supabase.from('technicians').select('id, name, phone, fcm_token').in('id', recipient_ids);
        recipients = [
            ...(custs || []).map(r => ({ ...r, recipientType: 'customer' })),
            ...(techs || []).map(r => ({ ...r, recipientType: 'technician' })),
        ];
    }

    if (recipients.length === 0) {
        return NextResponse.json({ success: false, error: 'No recipients found for the selected audience' }, { status: 400 });
    }

    const results = [];
    const pushTitle = title || 'Sorted Solutions';

    for (const recipient of recipients) {
        // Personalise the message
        const personalised = message.replace(/{name}/g, recipient.name || 'there');

        let status = 'pending';
        let errorMsg = null;

        try {
            if (channel === 'push') {
                if (!recipient.fcm_token) {
                    status = 'skipped';
                    errorMsg = 'No FCM token — user has not enabled notifications';
                } else {
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';
                    let targetLink = baseUrl;
                    if (recipient.recipientType === 'customer') targetLink = `${baseUrl}/customer/dashboard`;
                    else if (recipient.recipientType === 'technician') targetLink = `${baseUrl}/technician/dashboard`;
                    else if (recipient.recipientType === 'admin') targetLink = `${baseUrl}/admin`;

                    const { sendFCMPush } = await import('@/lib/send-notification-server');
                    await sendFCMPush(recipient.fcm_token, { 
                        title: pushTitle, 
                        body: personalised,
                        data: { link: targetLink }
                    });
                    status = 'sent';
                }
            } else if (channel === 'whatsapp') {
                // Placeholder — log intent until WhatsApp API is wired
                console.log(`[compose] WhatsApp → ${recipient.phone}: ${personalised}`);
                status = 'sent';
            }
        } catch (err) {
            status = 'failed';
            errorMsg = err.message;
        }

        // Log to notification_logs
        await supabase.from('notification_logs').insert({
            channel,
            recipient_type: recipient.recipientType,
            recipient_id: String(recipient.id),
            recipient_name: recipient.name,
            event_type: 'manual_compose',
            status,
            error: errorMsg,
        });

        results.push({ name: recipient.name, status, error: errorMsg });
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({ success: true, sent: sentCount, skipped: skippedCount, failed: failedCount, results });
}
