const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function calculateAll() {
    const technicianId = '3c593991-902e-42a6-b0f3-5b74ea22691d';
    const pointsByDay = {};

    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const offset = page * pageSize;
        const { data: logs, error } = await supabase
            .from('technician_location_logs')
            .select('latitude, longitude, created_at, location_precision')
            .eq('technician_id', technicianId)
            .gte('created_at', '2026-07-01T00:00:00Z')
            .lte('created_at', '2026-07-31T23:59:59Z')
            .order('created_at', { ascending: true })
            .range(offset, offset + pageSize - 1);

        if (error) {
            console.error(error);
            break;
        }

        if (logs.length === 0) {
            hasMore = false;
            break;
        }

        logs.forEach(log => {
            if (log.location_precision === 'approx') return;

            const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            if (!pointsByDay[dateIST]) {
                pointsByDay[dateIST] = [];
            }
            pointsByDay[dateIST].push({ lat: log.latitude, lng: log.longitude, time: log.created_at });
        });

        page++;
        if (logs.length < pageSize) {
            hasMore = false;
        }
    }

    const dailyDistances = {};
    for (const [day, pts] of Object.entries(pointsByDay)) {
        let dist = 0;
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i-1];
            const curr = pts[i];
            const segmentDist = getDistance(prev.lat, prev.lng, curr.lat, curr.lng);
            
            const timeDiffSec = (new Date(curr.time) - new Date(prev.time)) / 1000;
            const speedKmh = timeDiffSec > 0 ? (segmentDist / 1000) / (timeDiffSec / 3600) : 0;
            
            if (speedKmh <= 100) {
                dist += segmentDist;
            }
        }
        dailyDistances[day] = Number((dist / 1000).toFixed(1));
    }

    console.log("Calculated daily distances for July (without row limits):", dailyDistances);
}

calculateAll();
