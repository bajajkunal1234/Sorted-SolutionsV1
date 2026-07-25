const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = 'is_online: pingOnline,';
const replacementStr = 'is_online: isOnline,';

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(path, content, 'utf8');
    console.log('Successfully fixed pingOnline -> isOnline in TechnicianApp.jsx');
} else {
    console.error('Target string "is_online: pingOnline," not found in TechnicianApp.jsx');
}
