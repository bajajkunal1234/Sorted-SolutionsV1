const { createClient } = require('@supabase/supabase-js');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function printEmail() {
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
        const msgId = '51761'; // Fetch the Debit Card alert
        console.log(`Downloading email ID ${msgId}...`);
        const emailData = await client.download(msgId);
        const parsedEmail = await simpleParser(emailData.content);
        
        console.log(`\nSubject: ${parsedEmail.subject}`);
        
        let htmlClean = parsedEmail.html || '';
        // Strip style and script
        htmlClean = htmlClean.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        htmlClean = htmlClean.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
        // Strip HTML tags
        let textClean = htmlClean.replace(/<[^>]*>/g, ' ');
        // Normalise spaces
        textClean = textClean.replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
        
        console.log("\n--- Cleaned Plain Text ---\n");
        console.log(textClean);
        console.log("\n--------------------------\n");

    } finally {
        lock.release();
    }
    await client.logout();
}

printEmail();
