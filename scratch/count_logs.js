async function countLogs() {
    const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
    const sql = `
        SELECT date_trunc('day', created_at AT TIME ZONE 'Asia/Kolkata') as day, count(*), count(case when location_precision != 'approx' then 1 end) as precise_count
        FROM public.technician_location_logs 
        WHERE technician_id = '3c593991-902e-42a6-b0f3-5b74ea22691d'
          AND created_at >= '2026-07-01T00:00:00+05:30'
          AND created_at <= '2026-07-31T23:59:59+05:30'
        GROUP BY 1
        ORDER BY 1 ASC
    `;

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
        },
        body: JSON.stringify({ sql_query: sql })
    };

    try {
        const res = await fetch(url, options);
        const data = await res.json();
        console.log("LOG COUNTS BY DAY:", data);
    } catch (err) {
        console.error(err);
    }
}
countLogs();
