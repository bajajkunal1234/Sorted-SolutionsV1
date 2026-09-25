const fs = require('fs');
const path = require('path');

const target = process.argv[2];

if (target !== 'admin' && target !== 'technician') {
    console.error('Error: Please specify target: "admin" or "technician"');
    console.error('Usage: node scripts/switch-app.js <admin|technician>');
    process.exit(1);
}

const rootDir = path.join(__dirname, '..');

// Helper to update files
function updateFile(filePath, replaceFn) {
    const absolutePath = path.join(rootDir, filePath);
    if (!fs.existsSync(absolutePath)) {
        console.warn(`Warning: File not found: ${filePath}`);
        return;
    }
    const content = fs.readFileSync(absolutePath, 'utf8');
    const updated = replaceFn(content);
    if (content !== updated) {
        fs.writeFileSync(absolutePath, updated, 'utf8');
        console.log(`Updated: ${filePath}`);
    } else {
        console.log(`No changes needed: ${filePath}`);
    }
}

console.log(`Switching target to: ${target.toUpperCase()}...`);

const appId = `in.sortedsolutions.${target}`;
const appName = target === 'admin' ? 'Sorted Admin' : 'Sorted Technician';
const serverUrl = target === 'admin' 
    ? 'https://sortedsolutions.in/admin' 
    : 'https://sortedsolutions.in/technician/dashboard';

const updateCapacitorConfig = (content) => {
    try {
        const config = JSON.parse(content);
        config.appId = appId;
        config.appName = appName;
        if (!config.server) config.server = {};
        config.server.url = serverUrl;
        config.server.cleartext = true;
        return JSON.stringify(config, null, 2) + '\n';
    } catch (e) {
        console.error('Failed to parse capacitor config JSON:', e);
        return content;
    }
};

// 1. Update root capacitor.config.json
updateFile('capacitor.config.json', updateCapacitorConfig);

// 2. Update android asset capacitor.config.json
updateFile('android/app/src/main/assets/capacitor.config.json', updateCapacitorConfig);

// 3. Update android/app/build.gradle
updateFile('android/app/build.gradle', (content) => {
    return content.replace(
        /applicationId\s+["'][^"']+["']/,
        `applicationId "${appId}"`
    );
});

// 4. Update android/app/src/main/res/values/strings.xml
updateFile('android/app/src/main/res/values/strings.xml', (content) => {
    let updated = content;
    
    updated = updated.replace(
        /<string name="app_name">[^<]*<\/string>/,
        `<string name="app_name">${appName}</string>`
    );
    updated = updated.replace(
        /<string name="title_activity_main">[^<]*<\/string>/,
        `<string name="title_activity_main">${appName}</string>`
    );
    updated = updated.replace(
        /<string name="package_name">[^<]*<\/string>/,
        `<string name="package_name">${appId}</string>`
    );
    updated = updated.replace(
        /<string name="custom_url_scheme">[^<]*<\/string>/,
        `<string name="custom_url_scheme">${appId}</string>`
    );
    
    return updated;
});

console.log(`Successfully switched build configuration to: ${target.toUpperCase()} (${serverUrl})`);
