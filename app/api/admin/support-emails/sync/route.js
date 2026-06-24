import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export const dynamic = 'force-dynamic'

const CONFIGS = [
    {
        user: process.env.ZOHO_SUPPORT_USER || 'support@sortedsolutions.in',
        pass: process.env.ZOHO_SUPPORT_PASS || '5rNVgXHc9pyN'
    },
    {
        user: process.env.ZOHO_KUNAL_USER || 'kunal.bajaj@sortedsolutions.in',
        pass: process.env.ZOHO_KUNAL_PASS || 'RFcwTpWj33xZ'
    }
]

export async function GET(request) {
    try {
        // 1. Authenticate Request
        const secret = new URL(request.url).searchParams.get('secret') || request.headers.get('x-sync-secret');
        const expectedSecret = process.env.INBOUND_EMAIL_SECRET || 'sorted_solutions_secret_2026';
        
        if (secret !== expectedSecret) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServer();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 });
        }

        const stats = {
            processed: 0,
            inserted: 0,
            skipped: 0,
            errors: []
        };

        // 2. Loop through configured mailboxes and sync
        for (const config of CONFIGS) {
            try {
                const client = new ImapFlow({
                    host: 'imap.zoho.in', // Using India region zoho server
                    port: 993,
                    secure: true,
                    auth: {
                        user: config.user,
                        pass: config.pass
                    },
                    logger: false
                });

                await client.connect();

                let lock = await client.getMailboxLock('INBOX');
                try {
                    // Get total messages in folder
                    const status = await client.status('INBOX', { messages: true });
                    const totalMessages = status.messages;
                    
                    if (totalMessages > 0) {
                        // Fetch latest 30 messages
                        const startSeq = Math.max(1, totalMessages - 29);
                        const range = `${startSeq}:${totalMessages}`;

                        for await (let msg of client.list({ seq: range }, { envelope: true, source: true })) {
                            stats.processed++;
                            const messageId = msg.envelope?.messageId || '';

                            if (!messageId) continue;

                            // Check if messageId already exists in metadata
                            const { data: existing, error: queryErr } = await supabase
                                .from('support_emails')
                                .select('id')
                                .eq('metadata->>messageId', messageId)
                                .limit(1);

                            if (queryErr) {
                                console.error('Error querying existing emails:', queryErr);
                                continue;
                            }

                            if (existing && existing.length > 0) {
                                stats.skipped++;
                                continue;
                            }

                            // Parse raw email source
                            const parsed = await simpleParser(msg.source);
                            const sender_email = parsed.from?.value?.[0]?.address || msg.envelope.from?.[0]?.address || 'unknown@example.com';
                            const sender_name = parsed.from?.value?.[0]?.name || msg.envelope.from?.[0]?.name || sender_email.split('@')[0];
                            const recipient_email = config.user; // Use the sync target mailbox as recipient to be clean
                            const subject = parsed.subject || msg.envelope.subject || 'No Subject';
                            const body_text = parsed.text || '';
                            const body_html = parsed.html || parsed.textAsHtml || '';
                            const received_at = parsed.date || msg.envelope.date || new Date();

                            // Metadata payload
                            const metadata = {
                                direction: 'inbound',
                                messageId,
                                mailbox: config.user,
                                headers: parsed.headers ? Object.fromEntries(parsed.headers) : {}
                            };

                            // Insert into database
                            const { error: insertErr } = await supabase
                                .from('support_emails')
                                .insert([{
                                    recipient_email,
                                    sender_email,
                                    sender_name,
                                    subject,
                                    body_text,
                                    body_html,
                                    status: 'unread',
                                    received_at,
                                    metadata
                                }]);

                            if (insertErr) {
                                console.error('Error inserting synced email:', insertErr);
                                stats.errors.push(`Insert failed for ${messageId}: ${insertErr.message}`);
                            } else {
                                stats.inserted++;
                            }
                        }
                    }
                } finally {
                    lock.release();
                }

                await client.logout();
            } catch (err) {
                console.error(`Error syncing mailbox ${config.user}:`, err);
                stats.errors.push(`Mailbox ${config.user} sync error: ${err.message}`);
            }
        }

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('IMAP sync endpoint error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
