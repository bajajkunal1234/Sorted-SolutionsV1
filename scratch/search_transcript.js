const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function searchTranscript() {
    const file = 'C:\\Users\\KIIT\\.gemini\\antigravity\\brain\\8bbceafc-6b5e-4ccd-b2a9-1a1a2434aecf\\.system_generated\\logs\\transcript.jsonl';
    if (!fs.existsSync(file)) {
        console.log("Transcript file does not exist at:", file);
        return;
    }

    const rl = readline.createInterface({
        input: fs.createReadStream(file),
        crlfDelay: Infinity
    });

    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        if (line.toLowerCase().includes('closed') || line.toLowerCase().includes('status')) {
            // Parse JSON to display clean snippet
            try {
                const data = JSON.parse(line);
                if (data.type === 'USER_INPUT') {
                    console.log(`Line ${lineNumber} (USER):`, data.content);
                } else if (data.type === 'PLANNER_RESPONSE' && data.content && data.content.includes('closed')) {
                    console.log(`Line ${lineNumber} (PLANNER):`, data.content.substring(0, 150) + '...');
                }
            } catch (err) {
                // Not JSON or parse error
            }
        }
    }
}
searchTranscript();
