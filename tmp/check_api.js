
import fs from 'fs';

async function checkApi() {
    const logFile = 'c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/tmp/check_log.txt';
    let logStr = '';
    const log = (msg) => {
        logStr += msg + '\n';
        console.log(msg);
    };

    try {
        const envPath = 'c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/.env.local';
        const envFile = fs.readFileSync(envPath, 'utf8');
        const urlMatch = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=["']?(.*?)["']?(\r|\n|$)/);
        const supabaseUrl = urlMatch[1].trim();

        // Check the brand-logos API endpoint directly
        // Note: This expects the dev server to be running. If not, this might fail.
        log('Checking local API endpoint: /api/settings/brand-logos...');

        const response = await fetch('http://localhost:3000/api/settings/brand-logos', {
            method: 'GET'
        });

        log(`Status: ${response.status}`);
        if (response.ok) {
            const data = await response.json();
            log('SUCCESS: API responding.');
            log(JSON.stringify(data, null, 2));
        } else {
            const error = await response.text();
            log('ERROR: API check failed.');
            log(error);
        }
    } catch (e) {
        log(`Error: ${e.message} (Is the dev server running at localhost:3000?)`);
    } finally {
        fs.writeFileSync(logFile, logStr);
        log('Log written to tmp/check_log.txt');
    }
}

checkApi();
