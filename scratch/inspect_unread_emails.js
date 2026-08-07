const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
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
        console.error("No config found");
        return;
    }

    const config = allSettings[activeAcc.id];
    console.log(`Connecting to ${config.email} to inspect unread HDFC emails...`);

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

        console.log(`Total HDFC emails found in mailbox: ${searchResults.length}`);
        
        const limit = Math.min(searchResults.length, 10);
        for (let i = 0; i < limit; i++) {
            const msgId = searchResults[i];
            const emailData = await client.download(msgId);
            const parsedEmail = await simpleParser(emailData.content);
            
            console.log(`\n--- Email #${i+1} (ID: ${msgId}) ---`);
            console.log(`Subject: ${parsedEmail.subject}`);
            console.log(`Body:\n${parsedEmail.text || parsedEmail.html}`);
        }
    } finally {
        lock.release();
    }
    await client.logout();
}

inspect();
