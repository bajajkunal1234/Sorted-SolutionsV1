const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(fullPath));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(fullPath);
        }
    });
    return results;
}

const files = walkDir('c:/Users/KIIT/OneDrive/Desktop/sorted-on-next/app/admin/components');

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('useRef')) {
        // Check if useRef is imported
        const hasImport = content.includes('useRef') && (
            content.includes("from 'react'") ||
            content.includes('from "react"') ||
            content.includes('React.useRef')
        );
        if (!hasImport) {
            console.log(`Potential missing import in ${file}`);
        } else {
            // Check if it's imported correctly in destructured import
            // e.g. import { ... useRef ... } from 'react';
            const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
            if (reactImportMatch) {
                const imports = reactImportMatch[1].split(',').map(s => s.trim());
                if (!imports.includes('useRef') && !content.includes('React.useRef')) {
                    console.log(`Missing from destructured React import: ${file}`);
                }
            } else if (!content.includes('React.useRef')) {
                console.log(`No destructured import match found for: ${file}`);
            }
        }
    }
});
