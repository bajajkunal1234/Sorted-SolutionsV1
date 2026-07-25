const fs = require('fs');
const path = 'components/technician/TechnicianApp.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove Bike, Motorcycle from imports
const originalImport = 'Play, Power, Loader2, Bike, Motorcycle,';
const cleanImport = 'Play, Power, Loader2,';
if (content.includes(originalImport)) {
    content = content.replace(originalImport, cleanImport);
}

// 2. Replace Motorcycle icon with Scooter emoji
const originalIcon = '<Motorcycle size={18} /> Start Work Shift';
const scooterIcon = '<span style={{ fontSize: "18px", marginRight: "4px" }}>🛵</span> Start Work Shift';
if (content.includes(originalIcon)) {
    content = content.replace(originalIcon, scooterIcon);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully replaced Motorcycle icon with 🛵 Activa scooter emoji!');
