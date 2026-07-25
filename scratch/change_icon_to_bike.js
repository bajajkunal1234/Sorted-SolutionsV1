const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const lines = content.split(/\r?\n/);

// 1. Update imports - add Bike
let importIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('import {') && lines[i].includes('lucide-react')) {
        importIndex = i;
        break;
    }
}

if (importIndex === -1) {
    console.error('Import line not found');
    process.exit(1);
}

// Replace Activity inside button with Bike in imports
lines[importIndex] = lines[importIndex].replace(
    'Play, Power, Loader2,',
    'Play, Power, Loader2, Bike, Motorcycle,'
);

// 2. Replace icon in Start Shift button
let buttonTextIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<Activity size={16} /> Start Work Shift')) {
        buttonTextIndex = i;
        break;
    }
}

if (buttonTextIndex === -1) {
    console.error('Start shift icon not found');
    process.exit(1);
}

lines[buttonTextIndex] = lines[buttonTextIndex].replace(
    '<Activity size={16} /> Start Work Shift',
    '<Bike size={16} /> Start Work Shift'
);

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Successfully changed button icon to Bike two-wheeler!');
