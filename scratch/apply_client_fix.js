const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `const isLocked = currentHour < 19; // Locked before 7:00 PM (19:00)`;
const replacementStr = `const isLocked = currentHour >= 9 && currentHour < 19; // Locked during core shift hours (9 AM - 7 PM)`;

const targetLabel = `End Shift is locked until 7:00 PM`;
const replacementLabel = `End Shift is locked during shift hours (9:00 AM - 7:00 PM)`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    content = content.replace(targetLabel, replacementLabel);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully applied find-and-replace fix to TechnicianApp.jsx');
} else {
    console.error('Target string not found in TechnicianApp.jsx');
}
