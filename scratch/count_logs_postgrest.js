async function getLogDates() {
    const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
    const auth = 'Bearer ' + apikey;

    const technicianId = '3c593991-902e-42a6-b0f3-5b74ea22691d';
    const countByDay = {};
    const countByDayPrecise = {};

    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const offset = page * pageSize;
        const url = `https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/technician_location_logs?select=created_at,location_precision&technician_id=eq.${technicianId}&created_at=gte.2026-07-01T00:00:00Z&order=created_at.asc&limit=${pageSize}&offset=${offset}`;
        
        try {
            const res = await fetch(url, {
                headers: { 'apikey': apikey, 'Authorization': auth }
            });
            const data = await res.json();
            
            if (data.length === 0) {
                hasMore = false;
                break;
            }

            data.forEach(log => {
                const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                countByDay[dateIST] = (countByDay[dateIST] || 0) + 1;
                if (log.location_precision !== 'approx') {
                    countByDayPrecise[dateIST] = (countByDayPrecise[dateIST] || 0) + 1;
                }
            });

            console.log(`Fetched page ${page}, rows: ${data.length}, up to: ${data[data.length - 1].created_at}`);
            page++;
            if (data.length < pageSize) {
                hasMore = false;
            }
        } catch (err) {
            console.error(err);
            hasMore = false;
        }
    }

    console.log("All days recorded (IST):", countByDay);
    console.log("All precise days recorded (IST):", countByDayPrecise);
}

getLogDates();
