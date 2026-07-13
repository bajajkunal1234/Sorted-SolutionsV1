async function checkHitesh() {
    const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
    const techId = 'efa3b3e6-0946-473f-99d1-6fcc1bd2b4f8'; // Hitesh Tayde Tech
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
        },
        body: JSON.stringify({ 
            sql_query: `SELECT id, created_at, latitude, longitude FROM public.technician_location_logs WHERE technician_id = '${techId}' AND created_at >= '2026-07-13T00:00:00Z' AND created_at <= '2026-07-13T23:59:59Z'`
        })
    };

    try {
        const res = await fetch(url, options);
        const logs = await res.json();
        console.log("HITESH LOGS COUNT:", logs.length);
        if (logs.length > 0) {
            console.log("FIRST LOG:", logs[0]);
            console.log("LAST LOG:", logs[logs.length - 1]);
            const uniqueCoords = Array.from(new Set(logs.map(l => `${l.latitude.toFixed(5)},${l.longitude.toFixed(5)}`)));
            console.log("UNIQUE COORDS:", uniqueCoords);
        } else {
            console.log("RAW RESPONSE:", logs);
        }
    } catch (err) {
        console.error('RPC error:', err);
    }
}

checkHitesh();
