const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function search() {
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
        console.error("No active configuration");
        return;
    }

    const config = allSettings[activeAcc.id];
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

        console.log(`Found total ${searchResults.length} HDFC emails. Searching body text for charge keywords...`);
        
        let foundCount = 0;
        // Search the most recent 100 emails
        const startIdx = Math.max(0, searchResults.length - 150);
        const limitedResults = searchResults.slice(startIdx);

        for (let i = limitedResults.length - 1; i >= 0; i--) {
            const msgId = limitedResults[i];
            const emailData = await client.download(msgId);
            const parsedEmail = await simpleParser(emailData.content);
            
            const subject = (parsedEmail.subject || '').toLowerCase();
            let bodyText = (parsedEmail.text || (parsedEmail.html || '')).toLowerCase();
            
            const keywords = ['charge', 'fee', 'gst', 'tax', 'commission', 'levied', 'recovery'];
            const matchesKeyword = keywords.some(k => subject.includes(k) || bodyText.includes(k));

            if (matchesKeyword) {
                // Let's make sure it's not a generic footer disclaimer about service charges
                // HDFC footer has "For more details on Service charges and Fees..."
                // We check if the keyword matches outside the footer
                let cleanBody = bodyText.replace(/for more details on service charges and fees/g, '');
                
                const matchesValid = keywords.some(k => subject.includes(k) || cleanBody.includes(k));
                if (matchesValid) {
                    foundCount++;
                    console.log(`\n--- Match #${foundCount} | ID: ${msgId} ---`);
                    console.log(`Subject: ${parsedEmail.subject}`);
                    
                    let htmlClean = parsedEmail.html || '';
                    htmlClean = htmlClean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
                    htmlClean = htmlClean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    let textClean = htmlClean.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
                    
                    console.log(`Body:\n${textClean.substring(0, 500)}...\n`);
                    if (foundCount >= 5) break;
                }
            }
        }
        
        if (foundCount === 0) {
            console.log("No service charge alerts found in the recent 150 HDFC emails.");
        }
    } finally {
        lock.release();
    }
    await client.logout();
}

search();
