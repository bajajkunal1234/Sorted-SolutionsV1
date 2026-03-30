/**
 * fire-notification.js
 * 
 * Direct (non-HTTP) notification dispatch helper.
 * Use this instead of fetch('/api/notifications/send') from server-side code.
 * Calling your own API routes via HTTP is unreliable on Vercel serverless.
 */
import { createServerSupabase } from './supabase-server';

/**
 * Fire a notification for a given event_type.
 * Loads active triggers, resolves recipients, saves to app_notifications and notification_logs.
 * 
 * @param {string} event_type - e.g. 'job_completed', 'job_assigned'
 * @param {object} context - { job_id, customer_id, technician_id, customer_name, technician_name }
 */
export async function fireNotification(event_type, context = {}) {
    const { job_id, job_number, customer_id, technician_id, customer_name, technician_name } = context;

    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            console.error('[fireNotification] Supabase client not initialized');
            return;
        }

        // 1. Load active triggers for this event
        const { data: triggers, error: triggerErr } = await supabase
            .from('notification_triggers')
            .select('*, notification_templates(id, name, channel, type, content, variables)')
            .eq('event_type', event_type)
            .eq('is_active', true);

        if (triggerErr) {
            console.error('[fireNotification] trigger fetch error:', triggerErr.message);
            return;
        }

        if (!triggers || triggers.length === 0) {
            console.log(`[fireNotification] No active triggers for event: ${event_type}`);
            return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';

        for (const trigger of triggers) {
            const template = trigger.notification_templates;
            if (!template) continue;

            const audience = trigger.audience || [];
            const recipientSets = [];

            // Resolve customer recipients
            if (audience.includes('customers') && customer_id) {
                const { data: customer } = await supabase
                    .from('accounts')
                    .select('id, name, phone, fcm_token')
                    .eq('id', customer_id)
                    .single();
                recipientSets.push({
                    ...(customer || { id: customer_id, name: customer_name || 'Customer', fcm_token: null }),
                    recipientType: 'customer'
                });
            }

            // Resolve technician recipients
            if (audience.includes('technicians') && technician_id) {
                const { data: tech } = await supabase
                    .from('technicians')
                    .select('id, name, phone, fcm_token')
                    .eq('id', technician_id)
                    .single();
                if (tech) recipientSets.push({ ...tech, recipientType: 'technician' });
            }

            // Resolve admin recipients — always ensure at least one entry
            if (audience.includes('admins')) {
                const { data: admins } = await supabase
                    .from('admin_recipients')
                    .select('id, name, fcm_token');

                if (admins && admins.length > 0) {
                    admins.forEach(a => recipientSets.push({ ...a, recipientType: 'admin' }));
                } else {
                    // Fallback: generic admin (matches the bell's recipient_id='admin')
                    recipientSets.push({ id: 'admin', name: 'Admin', fcm_token: null, recipientType: 'admin' });
                }
            }

            // Send to each recipient
            for (const recipient of recipientSets) {
                const message = (template.content || '')
                    .replace(/{customer_name}/g, customer_name || recipient.name || 'Customer')
                    .replace(/{technician_name}/g, technician_name || 'Technician')
                    .replace(/{job_id}/g, job_number || job_id || '')
                    .replace(/{recipient_name}/g, recipient.name || '')
                    .replace(/{event_type}/g, event_type);

                // Build smart deep-link
                let targetLink = baseUrl;
                if (recipient.recipientType === 'customer') {
                    targetLink = ['job_created_admin', 'job_assigned', 'job_started', 'job_completed', 'job_cancelled', 'sales_invoice_created', 'quotation_sent'].includes(event_type) && job_id
                        ? `${baseUrl}/customer/bookings/${job_id}`
                        : event_type.startsWith('rental_') ? `${baseUrl}/customer/rentals` : `${baseUrl}/customer/dashboard`;
                } else if (recipient.recipientType === 'technician') {
                    targetLink = `${baseUrl}/technician/dashboard`;
                } else if (recipient.recipientType === 'admin') {
                    targetLink = `${baseUrl}/admin`;
                }

                let status = 'skipped';
                let errorMsg = null;

                try {
                    if (trigger.channel === 'push' && recipient.fcm_token) {
                        const { sendFCMPush } = await import('./send-notification-server');
                        await sendFCMPush(recipient.fcm_token, {
                            title: template.name,
                            body: message,
                            data: { link: targetLink }
                        });
                        status = 'sent';
                    } else if (trigger.channel === 'whatsapp' && recipient.phone) {
                        console.log(`[fireNotification] WhatsApp → ${recipient.phone}: ${message}`);
                        status = 'sent';
                    } else {
                        status = 'skipped';
                        errorMsg = `No ${trigger.channel} token/phone for recipient`;
                    }
                } catch (sendErr) {
                    status = 'failed';
                    errorMsg = sendErr.message;
                    console.error(`[fireNotification] Push failed for ${recipient.id}:`, sendErr.message);
                }

                // Always save to in-app bell (even if push was skipped — no FCM token is fine)
                if (status !== 'failed') {
                    const { error: insertErr } = await supabase.from('app_notifications').insert({
                        recipient_type: recipient.recipientType,
                        recipient_id: String(recipient.id),
                        title: template.name || 'Notification',
                        message: message,
                        link: targetLink,
                        is_read: false
                    });
                    if (insertErr) console.error('[fireNotification] Failed to save in-app notification:', insertErr.message);
                }

                // Log the attempt
                const { error: logErr } = await supabase.from('notification_logs').insert({
                    trigger_id: trigger.id,
                    channel: trigger.channel,
                    recipient_type: recipient.recipientType,
                    recipient_id: String(recipient.id),
                    recipient_name: recipient.name,
                    event_type,
                    status,
                    error: errorMsg,
                    sent_at: new Date().toISOString(),
                });
                if (logErr) console.error('[fireNotification] Log insert error:', logErr.message);
            }
        }
    } catch (err) {
        console.error('[fireNotification] Unexpected error:', err.message);
    }
}
