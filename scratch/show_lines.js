const fs = require('fs');
const path = require('path');

const filePath = 'c:\\Users\\KIIT\\OneDrive\\Desktop\\sorted-on-next\\app\\admin\\components\\AccountDetailModal.js';
const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

for (let idx = 350; idx < 516; idx++) {
    const line = lines[idx];
    if (line) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
}
