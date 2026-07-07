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

// 1. Update capacitor.config.json
updateFile('capacitor.config.json', (content) => {
    const config = JSON.parse(content);
    config.appId = `in.sortedsolutions.${target}`;
    config.appName = target === 'admin' ? 'Sorted Admin' : 'Sorted Technician';
    config.server.url = target === 'admin' 
        ? 'https://sortedsolutions.in/admin' 
        : 'https://sortedsolutions.in/technician/dashboard';
    return JSON.stringify(config, null, 2);
});

// 2. Update android/app/build.gradle
updateFile('android/app/build.gradle', (content) => {
    return content.replace(
        /applicationId\s+"in\.sortedsolutions\.(technician|admin)"/,
        `applicationId "in.sortedsolutions.${target}"`
    );
});

// 3. Update android/app/src/main/res/values/strings.xml
updateFile('android/app/src/main/res/values/strings.xml', (content) => {
    let updated = content;
    const displayName = target === 'admin' ? 'Sorted Admin' : 'Sorted Technician';
    
    updated = updated.replace(
        /<string name="app_name">Sorted (Technician|Admin)<\/string>/,
        `<string name="app_name">${displayName}</string>`
    );
    updated = updated.replace(
        /<string name="title_activity_main">Sorted (Technician|Admin)<\/string>/,
        `<string name="title_activity_main">${displayName}</string>`
    );
    updated = updated.replace(
        /<string name="package_name">in\.sortedsolutions\.(technician|admin)<\/string>/,
        `<string name="package_name">in.sortedsolutions.${target}</string>`
    );
    updated = updated.replace(
        /<string name="custom_url_scheme">in\.sortedsolutions\.(technician|admin)<\/string>/,
        `<string name="custom_url_scheme">in.sortedsolutions.${target}</string>`
    );
    
    return updated;
});

console.log(`Successfully switched build configuration to: ${target.toUpperCase()}`);
