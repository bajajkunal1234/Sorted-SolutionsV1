const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function parseHdfcEmail(subject, text, html) {
    let bodyToParse = text || '';
    if (!bodyToParse && html) {
        // Strip style and script blocks
        let cleanedHtml = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        cleanedHtml = cleanedHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        bodyToParse = cleanedHtml.replace(/<[^>]*>/g, ' ');
    }
    
    const textClean = bodyToParse
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/\s+/g, ' ');
    
    // Pattern 1: Rs.10.00 is debited from your account ending 4298 towards VPA bajajkunal1234@okicici (KUNAL VASUDEO BAJAJ) on 05-08-26.
    // Handles optional parenthesis payee name between VPA and "on"
    const upiDebRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+is\s+(debited|credited)\s+from\s+your\s+account\s+ending\s+(\d{4})\s+towards\s+VPA\s+([^\s]+)(?:\s+\([^)]+\))?\s+on\s+(\d{2}-\d{2}-\d{2})/i;
    
    // Pattern 2: Generic Debit/Credit Alert
    const genericRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+is\s+(debited|credited)\s+from\s+your\s+account\s+ending\s+(\d{4})\s+towards\s+([^\s]+)(?:\s+\([^)]+\))?\s+on\s+(\d{2}-\d{2}-\d{2})/i;

    // Pattern 3: spent/debited on card
    // Rs.10000.00 is debited from your HDFC Bank Debit Card ending 6099 at GOOGLESERVIS on 28 Jul, 2026 at 14:31:49.
    const cardRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+(?:was\s+spent|was\s+debited|debited|is\s+debited)\s+from\s+your\s+HDFC\s+Bank\s+(?:Credit|Debit)\s+Card\s+ending\s+(\d{4})\s+(?:at|to)\s+([^\s]+)\s+on\s+(\d{1,2}\s+[a-z]{3},?\s*\d{4})/i;

    // Pattern 4: E-mandate / Debit Card Auto-pay (INR 12096.91 ... Debit Card ending 6099 ... Date: 04/02/2026)
    const emandateRegex = /Debit\s+Card\s+ending\s+(\d{4})\..*?Amount:\s*INR\s*([\d,]+\.?\d*).*?Date:\s*([\d\/]+)/i;

    // Pattern 5: HDFC Account Update Credit/Debit style
    // We're writing to inform you that Rs.9900.00 has been successfully credited to your HDFC Bank account ending in 4298.
    const accountUpdateRegex = /Rs\.?\s*([\d,]+\.?\d*)\s+has\s+been\s+successfully\s+(credited|debited)\s+to\s+your\s+HDFC\s+Bank\s+account\s+ending\s+(?:in|with)\s+(\d{4})/i;

    const upiRefRegex = /(?:UPI\s+transaction\s+reference\s+no\.:|UTR\s+No\.:)\s*(\d+)/i;

    // Try Account Update match
    const updateMatch = textClean.match(accountUpdateRegex);
    if (updateMatch) {
        const amount = parseFloat(updateMatch[1].replace(/,/g, ''));
        const type = updateMatch[2].toLowerCase() === 'credited' ? 'credit' : 'debit';
        const accountEnding = updateMatch[3];
        
        // Extract Date: Date: 02-08-26
        const dateMatch = textClean.match(/Date:\s*(\d{2}-\d{2}-\d{2})/i);
        const dateRaw = dateMatch ? dateMatch[1] : null;
        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateRaw) {
            const parts = dateRaw.split('-');
            if (parts.length === 3) {
                formattedDate = `20${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        // Extract Sender: Sender: KUNAL VASUDEO BAJAJ (VPA: bajajkunal1234@okicici)
        const senderMatch = textClean.match(/Sender:\s*([^\n\r(]+)(?:\(VPA:\s*([^)]+)\))?/i);
        const partyName = senderMatch ? senderMatch[1].trim() : 'Unknown Sender';
        const vpa = senderMatch && senderMatch[2] ? senderMatch[2].trim() : '';

        // Extract Reference Number
        const refMatch = textClean.match(/(?:UPI\s+Reference\s+No\.:|Reference\s+No\.:|UTR\s+No\.:)\s*(\d+)/i);
        const refNo = refMatch ? refMatch[1] : null;

        return {
            amount,
            type,
            accountEnding,
            partyName: partyName || vpa || 'HDFC Bank Credit',
            date: formattedDate,
            referenceNumber: refNo,
            narration: `Gmail Account Update: Credit of ₹${amount} from ${partyName} ${vpa ? `(${vpa})` : ''}`
        };
    }

    let match = textClean.match(upiDebRegex);
    if (!match) match = textClean.match(genericRegex);
    
    if (match) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        const type = match[2].toLowerCase() === 'debited' ? 'debit' : 'credit';
        const accountEnding = match[3];
        const partyRaw = match[4];
        const dateRaw = match[5];

        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateRaw) {
            const parts = dateRaw.split('-');
            if (parts.length === 3) {
                formattedDate = `20${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }

        const refMatch = textClean.match(upiRefRegex);
        const refNo = refMatch ? refMatch[1] : null;

        return {
            amount,
            type,
            accountEnding,
            partyName: partyRaw.replace(/\([^)]*\)/g, '').trim(),
            date: formattedDate,
            referenceNumber: refNo,
            narration: `Gmail Scraped Alert: ${type === 'debit' ? 'Debit' : 'Credit'} of ₹${amount} to ${partyRaw.trim()}`
        };
    }

    const cardMatch = textClean.match(cardRegex);
    if (cardMatch) {
        const amount = parseFloat(cardMatch[1].replace(/,/g, ''));
        const type = 'debit';
        const accountEnding = cardMatch[2];
        const partyRaw = cardMatch[3];
        const dateRaw = cardMatch[4];

        let formattedDate = new Date().toISOString().split('T')[0];
        if (dateRaw) {
            const parseDate = new Date(dateRaw.replace(',', ''));
            if (!isNaN(parseDate.getTime())) {
                formattedDate = parseDate.toISOString().split('T')[0];
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

async function run() {
    const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('under', 'bank-accounts');

    const { data: settingsRes } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'bank_accounts_imap_settings')
        .maybeSingle();

    const allSettings = settingsRes?.value || {};
    const activeAcc = accounts.find(acc => allSettings[acc.id] && allSettings[acc.id].email);
    
    if (!activeAcc) {
        console.error("No active configuration found");
        return;
    }

    const config = allSettings[activeAcc.id];
    console.log(`Connecting to ${config.email} using config ending suffix ${config.account_ending || 'none'}...`);

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        logger: false,
        auth: {
            user: config.email.trim(),
            pass: config.app_password.replace(/\s+/g, '')
        }
    });

    await client.connect();
    let lock = await client.getMailboxLock('INBOX');
    try {
        const searchResults = await client.search({
            from: 'alerts@hdfcbank.bank.in'
        });

        console.log(`Found ${searchResults.length} HDFC emails. Fetching newest 30...`);
        const limitedResults = searchResults.slice(-30);

        for (let i = 0; i < limitedResults.length; i++) {
            const msgId = limitedResults[i];
            const emailData = await client.download(msgId);
            const parsedEmail = await simpleParser(emailData.content);
            
            const alert = parseHdfcEmail(parsedEmail.subject, parsedEmail.text, parsedEmail.html);
            
            console.log(`\n[Email #${i+1}] ID: ${msgId} | Subject: "${parsedEmail.subject}"`);
            if (alert) {
                const matchSuffix = !config.account_ending || alert.accountEnding === config.account_ending;
                console.log(`  -> 🎉 MATCHED! details:`);
                console.log(`     Amount: ₹${alert.amount} | Type: ${alert.type} | Suffix: ${alert.accountEnding} | Date: ${alert.date}`);
                console.log(`     Match Config Suffix ("${config.account_ending}"): ${matchSuffix ? "✅ YES" : "❌ NO"}`);
            } else {
                console.log(`  -> ❌ Did not match regex patterns.`);
            }
        }
    } finally {
        lock.release();
    }
    await client.logout();
}

run();
