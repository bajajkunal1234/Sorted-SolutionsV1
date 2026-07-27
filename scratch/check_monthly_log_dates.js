const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDates() {
    const technicianId = '3c593991-902e-42a6-b0f3-5b74ea22691d';
    const month = '2026-07';

    const startMonth = new Date(`${month}-01T00:00:00+05:30`);
    const year = parseInt(month.split('-')[0]);
    const m = parseInt(month.split('-')[1]);
    const endMonth = new Date(year, m, 0, 23, 59, 59);

    // Query all logs with a high limit (e.g. 10000)
    const { data: logs, error: logsError } = await supabase
        .from('technician_location_logs')
        .select('created_at, location_precision')
        .eq('technician_id', technicianId)
        .gte('created_at', startMonth.toISOString())
        .lte('created_at', endMonth.toISOString())
        .order('created_at', { ascending: true })
        .limit(15000);

    if (logsError) {
        console.error(logsError);
        return;
    }

    console.log("Total logs fetched with 15000 limit:", logs.length);

    const countByDay = {};
    const countByDayPrecise = {};

    logs.forEach(log => {
        const dateIST = new Date(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        countByDay[dateIST] = (countByDay[dateIST] || 0) + 1;
        if (log.location_precision !== 'approx') {
            countByDayPrecise[dateIST] = (countByDayPrecise[dateIST] || 0) + 1;
        }
    });

    console.log("Total logs per day (IST):", countByDay);
    console.log("Precise logs per day (IST):", countByDayPrecise);
}

checkDates();
