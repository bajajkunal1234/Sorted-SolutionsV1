import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/notifications/send
 * Body: { event_type, job_id?, customer_id?, technician_id?, customer_name?, technician_name? }
 *
 * 1. Loads all active triggers for the event_type
 * 2. For each trigger, resolves recipients and fires notifications
 * 3. Logs each attempt to notification_logs
 */
export async function POST(request) {
    const supabase = createServerSupabase();

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const { event_type, job_id, customer_id, technician_id, customer_name, technician_name } = body;
    if (!event_type) return NextResponse.json({ success: false, error: 'event_type required' }, { status: 400 });

    // Load active triggers for this event
    const { data: triggers, error: triggerErr } = await supabase
        .from('notification_triggers')
        .select('*, notification_templates(id, name, channel, type, content, variables)')
        .eq('event_type', event_type)
        .eq('is_active', true);

    if (triggerErr) {
        console.error('[notifications/send] trigger fetch error:', triggerErr.message);
        return NextResponse.json({ success: false, error: triggerErr.message }, { status: 500 });
    }

    if (!triggers || triggers.length === 0) {
        return NextResponse.json({ success: true, message: 'No active triggers for this event', sent: 0 });
    }

    const results = [];

    for (const trigger of triggers) {
        const template = trigger.notification_templates;
        if (!template) continue;

        const audience = trigger.audience || [];
        const recipientSets = [];

        // Resolve recipients
        if (audience.includes('customers') && customer_id) {
            const { data: customer } = await supabase
                .from('customers')
                .select('id, name, phone, fcm_token')
                .eq('id', customer_id)
                .single();
            if (customer) recipientSets.push({ ...customer, recipientType: 'customer' });
        }

        if (audience.includes('technicians') && technician_id) {
            const { data: tech } = await supabase
                .from('technicians')
                .select('id, name, phone, fcm_token')
                .eq('id', technician_id)
                .single();
            if (tech) recipientSets.push({ ...tech, recipientType: 'technician' });
        }

        if (audience.includes('admins')) {
            const { data: admins } = await supabase
                .from('admin_recipients')
                .select('id, name, fcm_token')
                .not('fcm_token', 'is', null);
            (admins || []).forEach(a => recipientSets.push({ ...a, recipientType: 'admin' }));
        }

        // Fire notification for each recipient
        for (const recipient of recipientSets) {
            // Merge template variables
            const message = (template.content || '')
                .replace(/{customer_name}/g, customer_name || recipient.name || 'Customer')
                .replace(/{technician_name}/g, technician_name || 'Technician')
                .replace(/{job_id}/g, job_id || '')
                .replace(/{recipient_name}/g, recipient.name || '')
                .replace(/{event_type}/g, event_type);

            let status = 'pending';
            let errorMsg = null;

            try {
                if (trigger.channel === 'push' && recipient.fcm_token) {
                    
                    // Smart Linking for Push Click
                    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';
                    let targetLink = baseUrl;
                    
                    if (recipient.recipientType === 'customer') {
                        if (['job_created_admin', 'job_assigned', 'job_started', 'job_completed', 'job_cancelled', 'sales_invoice_created', 'quotation_sent'].includes(event_type) && job_id) {
                            targetLink = `${baseUrl}/customer/bookings/${job_id}`;
                        } else if (event_type.startsWith('rental_')) {
                            targetLink = `${baseUrl}/customer/rentals`;
                        } else {
                            targetLink = `${baseUrl}/customer/dashboard`;
                        }
                    } else if (recipient.recipientType === 'technician') {
                        targetLink = `${baseUrl}/technician/dashboard`;
                    } else if (recipient.recipientType === 'admin') {
                        targetLink = `${baseUrl}/admin`;
                    }

                    // Send FCM push
                    const { sendFCMPush } = await import('@/lib/send-notification-server');
                    await sendFCMPush(recipient.fcm_token, {
                        title: template.name,
                        body: message,
                        data: { link: targetLink }
                    });
                    status = 'sent';
                } else if (trigger.channel === 'whatsapp' && recipient.phone) {

                    // WhatsApp sending placeholder — wire when WhatsApp API is integrated
                    console.log(`[notifications/send] WhatsApp → ${recipient.phone}: ${message}`);
                    status = 'sent';
                } else {
                    status = 'skipped';
                    errorMsg = `No ${trigger.channel} token/phone for recipient`;
                }
            } catch (sendErr) {
                status = 'failed';
                errorMsg = sendErr.message;
                console.error(`[notifications/send] Failed for ${recipient.id}:`, sendErr.message);
            }

            // Log result
            await supabase.from('notification_logs').insert({
                trigger_id: trigger.id,
                channel: trigger.channel,
                recipient_type: recipient.recipientType,
                recipient_id: String(recipient.id),
                recipient_name: recipient.name,
                event_type,
                status,
                error: errorMsg,
            });

            results.push({ recipient: recipient.name, channel: trigger.channel, status });
        }
    }

    return NextResponse.json({ success: true, sent: results.filter(r => r.status === 'sent').length, results });
}
