const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const admin = require('firebase-admin');

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Firebase credentials not configured.');
    }
    let cleanPrivateKey = privateKey.trim();
    if (cleanPrivateKey.startsWith('"') || cleanPrivateKey.startsWith("'")) {
        cleanPrivateKey = cleanPrivateKey.slice(1);
    }
    if (cleanPrivateKey.endsWith('"') || cleanPrivateKey.endsWith("'")) {
        cleanPrivateKey = cleanPrivateKey.slice(0, -1);
    }
    cleanPrivateKey = cleanPrivateKey.trim().replace(/\\n/g, '\n');
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: projectId,
            client_email: clientEmail,
            private_key: cleanPrivateKey,
        }),
    });
    return admin;
}

async function sendFCMPush(token, { title, body, data = {}, sound }) {
    if (!token) throw new Error('FCM token is required');
    const fb = getFirebaseAdmin();
    const clickLink = data.link || 'https://sortedsolutions.in';
    const targetChannel = sound && sound !== 'default' ? sound : 'jobs';
    const targetSound = sound && sound !== 'default' ? sound : 'default';

    const message = {
        token,
        notification: { title, body },
        data,
        android: {
            priority: 'high',
            notification: {
                channelId: targetChannel,
                sound: targetSound,
                notificationPriority: 'PRIORITY_MAX',
                clickAction: 'FCM_PLUGIN_ACTIVITY',
            },
        },
    };
    const response = await fb.messaging().send(message);
    console.log(`[FCM] Push sent — messageId: ${response}`);
    return response;
}

async function run() {
    const event_type = 'booking_enquiry_captured';
    const context = {
        job_id: '59729268-d6c4-4b2a-929e-4bb1d2600f9f',
        job_number: 'Refrigerator',
        customer_name: '+91-9876543210'
    };

    console.log("Fetching triggers for event_type:", event_type);
    const { data: triggers, error: triggerErr } = await supabase
        .from('notification_triggers')
        .select('*, notification_templates(id, name, channel, type, content, variables)')
        .eq('event_type', event_type)
        .eq('is_active', true);

    if (triggerErr) {
        console.error("Trigger fetch error:", triggerErr);
        return;
    }
    console.log("Found triggers:", triggers.length);

    for (const trigger of triggers) {
        const template = trigger.notification_templates;
        const audience = trigger.audience || [];
        console.log(`Trigger: ${trigger.id}, Sound: ${trigger.sound}, Audience: ${audience.join(', ')}`);

        const recipientSets = [];
        if (audience.includes('admins')) {
            const { data: admins } = await supabase
                .from('admin_recipients')
                .select('id, name, fcm_token');
            console.log(`Found ${admins?.length} admin recipients`);
            if (admins) {
                admins.forEach(a => recipientSets.push({ ...a, recipientType: 'admin' }));
            }
        }

        for (const recipient of recipientSets) {
            console.log(`Sending to recipient: ${recipient.name} (${recipient.id}), token prefix: ${recipient.fcm_token?.slice(0, 10)}`);
            const message = (template.content || '')
                .replace(/{customer_name}/g, context.customer_name)
                .replace(/{job_id}/g, context.job_number);

            let status = 'skipped';
            let errorMsg = null;

            try {
                if (trigger.channel === 'push' && recipient.fcm_token) {
                    await sendFCMPush(recipient.fcm_token, {
                        title: template.name,
                        body: message,
                        data: { link: '/admin' },
                        sound: trigger.sound
                    });
                    status = 'sent';
                } else {
                    errorMsg = "No FCM token";
                }
            } catch (err) {
                status = 'failed';
                errorMsg = err.message;
                console.error(`FCM error for recipient ${recipient.name}:`, err);
            }

            console.log(`Logging result status: ${status}, error: ${errorMsg}`);
            const logRes = await supabase.from('notification_logs').insert({
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
            if (logRes.error) {
                console.error("Failed to insert log:", logRes.error);
            } else {
                console.log("Log saved successfully.");
            }
        }
    }
}
run();
