const query = `SELECT id, job_number, status, notes FROM jobs WHERE job_number = 'BK-830576'`;

async function run() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/system/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        const result = await response.json();
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
