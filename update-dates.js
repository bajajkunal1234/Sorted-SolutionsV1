const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const dirs = ['app', 'components', 'lib', 'utils'];
const files = [];
dirs.forEach(d => {
    files.push(...walk(path.join(__dirname, d)));
});

let changed = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    const old = content;
    
    // 1. Replace empty toLocaleDateString() -> toLocaleDateString('en-GB')
    content = content.replace(/\.toLocaleDateString\(\s*\)/g, ".toLocaleDateString('en-GB')");
    
    // 2. Replace 'en-US' or 'en-IN' with 'en-GB'
    content = content.replace(/\.toLocaleDateString\(\s*['"]en-US['"]/g, ".toLocaleDateString('en-GB'");
    content = content.replace(/\.toLocaleDateString\(\s*['"]en-IN['"]/g, ".toLocaleDateString('en-GB'");
    
    if(content !== old) {
        fs.writeFileSync(f, content);
        changed++;
        console.log('Updated:', f);
    }
});

console.log('Total files changed:', changed);
