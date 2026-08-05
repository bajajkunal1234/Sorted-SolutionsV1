import { getSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export const dynamic = 'force-dynamic';

// Helper: Parse HDFC Email Alerts using regex
function parseHdfcEmail(subject, text, html) {
    let bodyToParse = text || '';
    if (!bodyToParse && html) {
        // Strip HTML tags
        bodyToParse = html.replace(/<[^>]*>/g, ' ');
    }
    
    const textClean = bodyToParse
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ');
    
    // Pattern 1: Rs.10.00 is debited from your account ending 8771 towards VPA bajaj.bhavesh.94@okicici (bajaj.bhavesh.94@okicici) on 05-08-26.
    const upiDebRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+is\s+(debited|credited)\s+from\s+your\s+account\s+ending\s+(\d{4})\s+towards\s+VPA\s+([^\s]+)\s+on\s+(\d{2}-\d{2}-\d{2})/i;
    
    // Pattern 2: Generic Debit/Credit Alert
    // Rs.1,500.00 was debited from HDFC Bank Account ending 1234 towards merchant on 05-08-26
    const genericRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+is\s+(debited|credited)\s+from\s+your\s+account\s+ending\s+(\d{4})\s+towards\s+([^\s]+)\s+on\s+(\d{2}-\d{2}-\d{2})/i;

    // Pattern 3: spent/debited on debit/credit card
    // Rs.500.00 was spent on HDFC Bank Credit Card ending 1234 at PAYTM on 05-08-26
    const cardRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+(?:was\s+spent|was\s+debited|debited)\s+on\s+your\s+HDFC\s+Bank\s+(?:Credit|Debit)\s+Card\s+ending\s+(\d{4})\s+(?:at|to)\s+([^\s]+)\s+on\s+(\d{2}-\d{2}-\d{2})/i;

    // UPI reference match
    // UPI transaction reference no.: 621716076591
    const upiRefRegex = /(?:UPI\s+transaction\s+reference\s+no\.:|UTR\s+No\.:)\s*(\d+)/i;

    let match = textClean.match(upiDebRegex);
    if (!match) match = textClean.match(genericRegex);
    
    if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        const type = match[2].toLowerCase() === 'debited' ? 'debit' : 'credit';
        const accountEnding = match[3];
        const partyRaw = match[4];
        const dateRaw = match[5]; // DD-MM-YY or similar

        // Convert date DD-MM-YY to YYYY-MM-DD
        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateRaw) {
            const parts = dateRaw.split('-');
            if (parts.length === 3) {
                // HDFC format is DD-MM-YY
                const day = parts[0];
                const month = parts[1];
                const year = '20' + parts[2];
                formattedDate = `${year}-${month}-${day}`;
            }
        }

        const refMatch = textClean.match(upiRefRegex);
        const refNo = refMatch ? refMatch[1] : null;

        return {
            amount,
            type,
            accountEnding,
            partyName: partyRaw.replace(/\([^)]*\)/g, '').trim(), // strip brackets
            date: formattedDate,
            referenceNumber: refNo,
            narration: `Gmail Scraped Alert: ${type === 'debit' ? 'Debit' : 'Credit'} of ₹${amount} to ${partyRaw.trim()}`
        };
    }

    // Try card match
    const cardMatch = textClean.match(cardRegex);
    if (cardMatch) {
        const amount = parseFloat(cardMatch[1].replace(/,/g, ''));
        const type = 'debit'; // spent card is debit
        const accountEnding = cardMatch[2];
        const partyRaw = cardMatch[3];
        const dateRaw = cardMatch[4];

        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateRaw) {
            const parts = dateRaw.split('-');
            if (parts.length === 3) {
                formattedDate = `20${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        return {
            amount,
            type,
            accountEnding,
            partyName: partyRaw.trim(),
            date: formattedDate,
            referenceNumber: null,
            narration: `Card Alert: Spend of ₹${amount} at ${partyRaw.trim()}`
        };
    }

    return null;
}

export async function POST(request) {
    let client = null;
    try {
        const { accountId } = await request.json();
        if (!accountId) {
            return NextResponse.json({ success: false, error: 'Bank account ID is required' }, { status: 400 });
        }

        const supabase = getSupabaseServer();
        if (!supabase) return NextResponse.json({ success: false, error: 'DB not available' }, { status: 503 });

        // 1. Fetch bank account details
        const { data: bankAccount, error: bankErr } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', accountId)
            .single();

        if (bankErr || !bankAccount) {
            return NextResponse.json({ success: false, error: 'Bank account not found' }, { status: 404 });
        }

        // 2. Fetch IMAP settings
        const { data: settingsRes, error: settingsErr } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', 'bank_accounts_imap_settings')
            .maybeSingle();

        if (settingsErr) throw settingsErr;

        const allSettings = settingsRes?.value || {};
        const config = allSettings[accountId];

        if (!config || !config.email || !config.app_password || config.is_active === false) {
            return NextResponse.json({ success: true, count: 0, msg: 'IMAP sync configuration is not complete or inactive.' });
        }

        // 3. Connect to Gmail via ImapFlow
        client = new ImapFlow({
            host: 'imap.gmail.com',
            port: 993,
            secure: true,
            logger: false,
            auth: {
                user: config.email.trim(),
                pass: config.app_password.replace(/\s+/g, '') // remove spaces
            }
        });

        await client.connect();

        let syncCount = 0;
        let matchedCount = 0;

        // Obtain lock for Inbox or the tagged label folder
        // Defaults to checking "BankAlerts" label first, falls back to "INBOX"
        let mailbox = 'INBOX';
        const mailboxes = await client.list();
        const hasLabel = mailboxes.some(m => m.name.toLowerCase() === 'bankalerts' || m.path.toLowerCase() === 'bankalerts');
        if (hasLabel) {
            mailbox = 'BankAlerts';
        }

        let lock = await client.getMailboxLock(mailbox);
        try {
            // Search for transaction emails from HDFC Bank (read or unread)
            const searchResults = await client.search({
                from: 'alerts@hdfcbank.bank.in'
            });
 
            // Limit to newest 30 messages per run to avoid serverless timeout limits (approx. 5s execution time) and allow backfilling
            const limitedResults = searchResults.slice(-30);
 
            for (const msgId of limitedResults) {
                // Fetch email source
                const emailData = await client.download(msgId);
                const parsedEmail = await simpleParser(emailData.content);
                
                const subject = parsedEmail.subject || '';
 
                // Extract transaction parameters from text or html
                const alert = parseHdfcEmail(subject, parsedEmail.text, parsedEmail.html);

                if (alert && (!config.account_ending || alert.accountEnding === config.account_ending)) {
                    // Check if this reference number or transaction date+amount combination is already logged
                    let alreadyLogged = false;
                    
                    if (alert.referenceNumber) {
                        const { data: existing } = await supabase
                            .from('bank_alerts_log')
                            .select('id')
                            .eq('reference_number', alert.referenceNumber)
                            .maybeSingle();
                        if (existing) alreadyLogged = true;
                    } else {
                        const { data: existing } = await supabase
                            .from('bank_alerts_log')
                            .select('id')
                            .eq('bank_account_id', accountId)
                            .eq('date', alert.date)
                            .eq('amount', alert.amount)
                            .maybeSingle();
                        if (existing) alreadyLogged = true;
                    }

                    if (!alreadyLogged) {
                        // 4. Try to auto-reconcile against recorded Payment/Receipt vouchers
                        const voucherTable = alert.type === 'debit' ? 'payment_vouchers' : 'receipt_vouchers';
                        const { data: matchedVoucher } = await supabase
                            .from(voucherTable)
                            .select('id')
                            .eq('payment_account_id', accountId)
                            .eq('amount', alert.amount)
                            .eq('date', alert.date)
                            .eq('status', 'cleared')
                            .maybeSingle();

                        const status = matchedVoucher ? 'reconciled' : 'unreconciled';
                        const voucherId = matchedVoucher ? matchedVoucher.id : null;

                        // Insert log row
                        await supabase
                            .from('bank_alerts_log')
                            .insert({
                                bank_account_id: accountId,
                                date: alert.date,
                                amount: alert.amount,
                                type: alert.type,
                                reference_number: alert.referenceNumber,
                                party_name: alert.partyName,
                                narration: alert.narration,
                                raw_body: bodyText,
                                status,
                                voucher_id: voucherId
                            });

                        syncCount++;
                        if (matchedVoucher) matchedCount++;
                    }
                }

                // Mark the email as read on Gmail to prevent reprocessing next time
                await client.messageFlagsAdd(msgId, ['\\Seen']);
            }
        } finally {
            lock.release();
        }

        await client.logout();

        return NextResponse.json({
            success: true,
            count: syncCount,
            matched: matchedCount,
            msg: `Gmail Alerts Sync Complete. Parsed ${syncCount} alerts (${matchedCount} auto-reconciled).`
        });

    } catch (err) {
        console.error('IMAP sync failed:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    } finally {
        if (client) {
            try {
                await client.logout();
            } catch (e) {}
        }
    }
}
