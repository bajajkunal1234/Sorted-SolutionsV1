/**
 * fire-notification.js
 *
 * Direct (non-HTTP) notification dispatch helper.
 * Use this instead of fetch('/api/notifications/send') from server-side code.
 * Calling your own API routes via HTTP is unreliable on Vercel serverless.
 *
 * FALLBACK BEHAVIOUR
 * ──────────────────
 * After processing all admin-configured triggers, if the event involves a
 * customer or technician who was NOT reached by any trigger, we still insert
 * a direct in-app notification so their bell icon always shows relevant events.
 * Push notifications (FCM) still require admin-configured triggers + templates.
 */
import { createServerSupabase } from './supabase-server';

// ── Default title / body for fallback (trigger-less) in-app notifications ──
const FALLBACK_COPY = {
    job_created_admin:        { title: 'Booking Confirmed',        body: 'Your service request has been received. We\'ll be in touch soon.' },
    booking_created_website:  { title: 'Booking Received',         body: 'Your booking request has been received. We\'ll call to confirm.' },
    job_assigned:             { title: 'Job Assigned to You',       body: 'A new job has been assigned to you. Open the app to view details.' },
    job_started:              { title: 'Technician On The Way',     body: 'Your technician has started. They\'ll arrive shortly.' },
    job_completed:            { title: 'Service Completed ✅',      body: 'Your service job has been marked complete. Thank you!' },
    job_cancelled:            { title: 'Job Cancelled',             body: 'Your service request has been cancelled. Contact us if this was a mistake.' },
    quotation_sent:           { title: 'Quotation Ready',           body: 'A quotation has been prepared for your job. Please review it.' },
    sales_invoice_created:    { title: 'Invoice Generated',         body: 'A new invoice has been created for your account.' },
    payment_received_online:  { title: 'Payment Received 💳',       body: 'Your online payment has been successfully received. Thank you!' },
    payment_received_cash:    { title: 'Payment Received 💵',       body: 'Cash payment has been recorded for your job. Thank you!' },
    rental_contract_created:  { title: 'Rental Contract Created',   body: 'Your rental agreement has been set up successfully.' },
    rental_contract_expiring: { title: 'Rental Expiring Soon ⏰',    body: 'Your rental contract is expiring in 30 days. Contact us to renew.' },
    rent_due_reminder:        { title: 'Rent Due Reminder 💰',       body: 'A rent payment is due. Please arrange payment at your earliest.' },
    rental_terminated:        { title: 'Rental Terminated',         body: 'Your rental contract has been terminated.' },
};

function getFallbackCopy(event_type) {
    return FALLBACK_COPY[event_type] || { title: 'Notification', body: 'You have a new update.' };
}

/** Build the app deep-link URL for a given recipient type + event. */
function buildLink(baseUrl, event_type, recipientType, job_id) {
    if (recipientType === 'customer') {
        const jobEvents = ['job_created_admin', 'job_assigned', 'job_started', 'job_completed',
                           'job_cancelled', 'sales_invoice_created', 'quotation_sent', 'booking_created_website'];
        if (jobEvents.includes(event_type) && job_id) return `${baseUrl}/customer/bookings/${job_id}`;
        if (event_type.startsWith('rental_') || event_type === 'rent_due_reminder') return `${baseUrl}/customer/rentals`;
        return `${baseUrl}/customer/dashboard`;
    }
    if (recipientType === 'technician') return `${baseUrl}/technician/dashboard`;
    return `${baseUrl}/admin`;
}

/**
 * Fire a notification for a given event_type.
 * Loads active triggers, resolves recipients, saves to app_notifications and notification_logs.
 *
 * @param {string} event_type - e.g. 'job_completed', 'job_assigned'
 * @param {object} context - { job_id, job_number, customer_id, technician_id, customer_name, technician_name }
 */
export async function fireNotification(event_type, context = {}) {
    const { job_id, job_number, customer_id, technician_id, customer_name, technician_name } = context;

    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            console.error('[fireNotification] Supabase client not initialized');
            return;
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://sortedsolutions.in';

        // Track which audiences were covered by triggers (used for fallback logic)
        const coveredCustomers   = new Set();
        const coveredTechnicians = new Set();

        // ── 1. Load active triggers for this event ─────────────────────────────
        const { data: triggers, error: triggerErr } = await supabase
            .from('notification_triggers')
            .select('*, notification_templates(id, name, channel, type, content, variables)')
            .eq('event_type', event_type)
            .eq('is_active', true);

        if (triggerErr) {
            console.error('[fireNotification] trigger fetch error:', triggerErr.message);
            // Don't return — still run fallback logic below
        }

        if (triggers && triggers.length > 0) {
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
                    coveredCustomers.add(String(customer_id));
                }

                // Resolve technician recipients
                if (audience.includes('technicians') && technician_id) {
                    const { data: tech } = await supabase
                        .from('technicians')
                        .select('id, name, phone, fcm_token')
                        .eq('id', technician_id)
                        .single();
                    if (tech) {
                        recipientSets.push({ ...tech, recipientType: 'technician' });
                        coveredTechnicians.add(String(technician_id));
                    }
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

                for (const recipient of recipientSets) {
                    const message = (template.content || '')
                        .replace(/{customer_name}/g, customer_name || recipient.name || 'Customer')
                        .replace(/{technician_name}/g, technician_name || 'Technician')
                        .replace(/{job_id}/g, job_number || job_id || '')
                        .replace(/{recipient_name}/g, recipient.name || '')
                        .replace(/{event_type}/g, event_type);

                    const targetLink = buildLink(baseUrl, event_type, recipient.recipientType, job_id);
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
                            message,
                            link: targetLink,
                            is_read: false
                        });
                        if (insertErr) console.error('[fireNotification] Failed to save in-app notification:', insertErr.message);
                    }

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
        } else {
            console.log(`[fireNotification] No active triggers for event: ${event_type} — running fallback only`);
        }

        // ── 2. FALLBACK: directly notify customer/technician if no trigger covered them ──
        // Guarantees the bell icon always works even without admin-configured triggers.
        // In-app only (no push/WhatsApp, no log entry written — no trigger to reference).
        const fallback = getFallbackCopy(event_type);

        if (customer_id && !coveredCustomers.has(String(customer_id))) {
            const targetLink = buildLink(baseUrl, event_type, 'customer', job_id);
            await supabase.from('app_notifications').insert({
                recipient_type: 'customer',
                recipient_id: String(customer_id),
                title: fallback.title,
                message: fallback.body,
                link: targetLink,
                is_read: false,
            }).catch(e => console.error('[fireNotification] Fallback customer notify failed:', e.message));
        }

        // Only fire technician fallback for events that are relevant to them
        const TECH_EVENTS = ['job_assigned', 'job_started', 'job_completed', 'job_cancelled'];
        if (technician_id && !coveredTechnicians.has(String(technician_id)) && TECH_EVENTS.includes(event_type)) {
            const targetLink = buildLink(baseUrl, event_type, 'technician', job_id);
            await supabase.from('app_notifications').insert({
                recipient_type: 'technician',
                recipient_id: String(technician_id),
                title: fallback.title,
                message: fallback.body,
                link: targetLink,
                is_read: false,
            }).catch(e => console.error('[fireNotification] Fallback technician notify failed:', e.message));
        }

    } catch (err) {
        console.error('[fireNotification] Unexpected error:', err.message);
    }
}
