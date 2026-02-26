
import fs from 'fs';

async function checkTable() {
    const logFile = 'c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/tmp/check_log.txt';
    let logStr = '';
    const log = (msg) => {
        logStr += msg + '\n';
        console.log(msg);
    };

    try {
        const envPath = 'c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/.env.local';
        const envFile = fs.readFileSync(envPath, 'utf8');

        // Better regex to handle quotes
        const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?(\r|\n|$)/);
        const keyMatch = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=["']?(.*?)["']?(\r|\n|$)/);

        if (!urlMatch || !keyMatch) {
            throw new Error(`Failed to parse .env.local. URL: ${!!urlMatch}, Key: ${!!keyMatch}`);
        }

        const supabaseUrl = urlMatch[1].trim();
        const supabaseKey = keyMatch[1].trim();

        log(`Supabase URL: ${supabaseUrl}`);
        log('Checking table: website_brands...');

        const apiUrl = `${supabaseUrl}/rest/v1/website_brands?select=*&limit=1`;
        log(`API URL: ${apiUrl}`);

        const response = await fetch(apiUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            log('SUCCESS: Table website_brands exists.');
            log(JSON.stringify(data, null, 2));
        } else {
            const error = await response.text();
            log('ERROR: Table check failed.');
            log(error);
        }
    } catch (e) {
        log(`Error: ${e.message}`);
    } finally {
        fs.writeFileSync(logFile, logStr);
        log('Log written to tmp/check_log.txt');
    }
}

checkTable();
