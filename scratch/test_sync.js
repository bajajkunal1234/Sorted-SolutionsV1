const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Fetching bank account configurations...");
    const { data: accounts } = await supabase
        .from('accounts')
        .select('*')
        .eq('under', 'bank-accounts');

    if (!accounts || accounts.length === 0) {
        console.error("No bank accounts found.");
        return;
    }

    const { data: settingsRes } = await supabase
        .from('website_settings')
        .select('value')
        .eq('key', 'bank_accounts_imap_settings')
        .maybeSingle();

    const allSettings = settingsRes?.value || {};
    
    // Test the first active one
    const activeAcc = accounts.find(acc => allSettings[acc.id] && allSettings[acc.id].email);
    if (!activeAcc) {
        console.error("No integrated bank accounts found in setup settings.");
        return;
    }

    const config = allSettings[activeAcc.id];
    console.log(`Testing Sync for ${activeAcc.name} with email: ${config.email}`);

    const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        logger: {
            debug: console.log,
            info: console.log,
            warn: console.warn,
            error: console.error
        },
        auth: {
            user: config.email.trim(),
            pass: config.app_password.replace(/\s+/g, '')
        },
        connectionTimeout: 8000,
        socketTimeout: 15000
    });

    try {
        console.log("Connecting to imap.gmail.com...");
        await client.connect();
        console.log("Connected successfully!");

        let mailbox = 'INBOX';
        const mailboxes = await client.list();
        const hasLabel = mailboxes.some(m => m.name.toLowerCase() === 'bankalerts' || m.path.toLowerCase() === 'bankalerts');
        if (hasLabel) {
            mailbox = 'BankAlerts';
            console.log("Found custom label 'BankAlerts', switching mailbox selection...");
        } else {
            console.log("No custom 'BankAlerts' label found, searching primary INBOX...");
        }

        console.log(`Selecting mailbox: ${mailbox}...`);
        let lock = await client.getMailboxLock(mailbox);
        try {
            console.log("Searching for unread emails from alerts@hdfcbank.bank.in...");
            const searchResults = await client.search({
                seen: false,
                from: 'alerts@hdfcbank.bank.in'
            });

            console.log(`Search completed. Found ${searchResults.length} unread alerts.`);
            
            // Log details of the first 3
            const limit = Math.min(searchResults.length, 3);
            for (let i = 0; i < limit; i++) {
                const msgId = searchResults[i];
                console.log(`Downloading email ${i + 1} of ${limit} (ID: ${msgId})...`);
                const emailData = await client.download(msgId);
                const parsedEmail = await simpleParser(emailData.content);
                console.log(`Subject: ${parsedEmail.subject}`);
                console.log(`Body excerpt: ${(parsedEmail.text || '').substring(0, 100)}`);
            }
        } finally {
            lock.release();
            console.log("Mailbox lock released.");
        }

        await client.logout();
        console.log("Logged out successfully.");
    } catch (err) {
        console.error("Sync test failed:", err);
    }
}

test();
