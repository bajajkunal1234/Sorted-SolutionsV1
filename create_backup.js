const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// output zip file path
const output = path.join(__dirname, 'SortedSolutions_V1_Backup.zip');

// folders to exclude
const excludes = ['node_modules', '.next', '.git', '.vscode', 'tmp'];

console.log('Creating zip backup...');

// Using PowerShell to zip (since user is on Windows)
const command = `Compress-Archive -Path * -DestinationPath "${output}" -Force`;

exec(`powershell -Command "${command}"`, (err, stdout, stderr) => {
    if (err) {
        console.error('Error creating zip:', err);
        return;
    }
    console.log('Backup created successfully at:', output);
});
