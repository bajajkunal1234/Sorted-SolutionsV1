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
const hooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext'];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find destructured imports from react
    const reactImportMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]react['"]/);
    const importedHooks = new Set();
    if (reactImportMatch) {
        reactImportMatch[1].split(',').map(s => s.trim()).forEach(h => importedHooks.add(h));
    }
    
    hooks.forEach(hook => {
        // Simple regex to check if hook is used in code as a function/expression (e.g. hook( or hook. or React.hook)
        const isUsed = new RegExp('\\b' + hook + '\\b').test(content);
        if (isUsed) {
            // Check if it's imported or used via React.hook
            const hasDirectImport = importedHooks.has(hook);
            const hasReactPrefix = content.includes('React.' + hook);
            if (!hasDirectImport && !hasReactPrefix) {
                console.log(`Missing import/prefix for ${hook} in: ${file}`);
            }
        }
    });
});
