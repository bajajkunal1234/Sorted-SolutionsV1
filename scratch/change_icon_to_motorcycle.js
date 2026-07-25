const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = '<Bike size={16} /> Start Work Shift';
const replacementStr = '<Motorcycle size={18} /> Start Work Shift';

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully changed Start Shift icon to Motorcycle!');
} else {
    console.error('Target string not found in TechnicianApp.jsx');
}
