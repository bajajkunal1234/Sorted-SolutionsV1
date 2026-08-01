const fs = require('fs');
const readline = require('readline');

async function searchAll() {
    const file = 'C:\\Users\\KIIT\\.gemini\\antigravity\\brain\\8bbceafc-6b5e-4ccd-b2a9-1a1a2434aecf\\.system_generated\\logs\\transcript_full.jsonl';
    if (!fs.existsSync(file)) {
        console.log("Full transcript file does not exist.");
        return;
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(file),
        crlfDelay: Infinity
    });

    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        try {
            const data = JSON.parse(line);
            const content = data.content || '';
            if (data.type === 'USER_INPUT') {
                if (content.toLowerCase().includes('closed') || content.toLowerCase().includes('map')) {
                    console.log(`Line ${lineNumber} (USER):`, content);
                }
            } else if (data.type === 'PLANNER_RESPONSE') {
                if (content.toLowerCase().includes('closed') && content.toLowerCase().includes('map')) {
                    console.log(`Line ${lineNumber} (PLANNER):`, content.substring(0, 200) + '...');
                }
            }
        } catch (err) {}
    }
}
searchAll();
