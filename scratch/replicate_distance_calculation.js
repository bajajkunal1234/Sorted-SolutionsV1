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

async function testDistance() {
    const technicianId = '3c593991-902e-42a6-b0f3-5b74ea22691d';
    const month = '2026-07';

    const startMonth = new Date(`${month}-01T00:00:00+05:30`);
    const year = parseInt(month.split('-')[0]);
    const m = parseInt(month.split('-')[1]);
    const endMonth = new Date(year, m, 0, 23, 59, 59);

    console.log("startMonth:", startMonth.toISOString());
    console.log("endMonth:", endMonth.toISOString());

    const { data: logs, error: logsError } = await supabase
        .from('technician_location_logs')
        .select('latitude, longitude, created_at, location_precision')
        .eq('technician_id', technicianId)
        .gte('created_at', startMonth.toISOString())
        .lte('created_at', endMonth.toISOString())
        .order('created_at', { ascending: true });

    if (logsError) {
        console.error(logsError);
        return;
    }

    console.log("Total logs fetched for month:", logs.length);

    const dailyDistances = {};
    const pointsByDay = {};

    logs.forEach(log => {
        if (log.location_precision === 'approx') return;

        const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (!pointsByDay[dateIST]) {
            pointsByDay[dateIST] = [];
        }
        pointsByDay[dateIST].push({ lat: log.latitude, lng: log.longitude, time: log.created_at });
    });

    console.log("Days with precise points:", Object.keys(pointsByDay));

    for (const [day, pts] of Object.entries(pointsByDay)) {
        let dist = 0;
        console.log(`Day: ${day}, points count: ${pts.length}`);
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i-1];
            const curr = pts[i];
            const segmentDist = getDistance(prev.lat, prev.lng, curr.lat, curr.lng);
            
            const timeDiffSec = (new Date(curr.time) - new Date(prev.time)) / 1000;
            const speedKmh = timeDiffSec > 0 ? (segmentDist / 1000) / (timeDiffSec / 3600) : 0;
            
            if (speedKmh <= 100) {
                dist += segmentDist;
            } else {
                console.log(`  Filtered out jump: ${segmentDist.toFixed(1)}m in ${timeDiffSec}s (${speedKmh.toFixed(1)} km/h)`);
            }
        }
        dailyDistances[day] = Number((dist / 1000).toFixed(1));
    }

    console.log("Final dailyDistances calculated:", dailyDistances);
}

testDistance();
