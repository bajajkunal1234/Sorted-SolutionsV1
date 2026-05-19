const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\KIIT\\OneDrive\\Desktop\\sorted-on-next\\app\\admin\\components\\AccountDetailModal.js';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

lines.forEach((line, idx) => {
    if (line.includes('name:') || line.includes('Name') || line.includes('onChange')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
