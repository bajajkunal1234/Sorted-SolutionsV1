import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        // Calculate date boundaries in IST (IST = UTC + 5:30)
        const localDate = new Date();
        const utcTime = localDate.getTime() + (localDate.getTimezoneOffset() * 60000);
        const nowIST = new Date(utcTime + (3600000 * 5.5));
        
        const startOfTodayIST = new Date(nowIST);
        startOfTodayIST.setHours(0, 0, 0, 0);
        const todayStr = `${startOfTodayIST.getFullYear()}-${String(startOfTodayIST.getMonth() + 1).padStart(2, '0')}-${String(startOfTodayIST.getDate()).padStart(2, '0')}`;

        // 7 days ago in IST
        const startOfLast7DaysIST = new Date(nowIST);
        startOfLast7DaysIST.setDate(startOfLast7DaysIST.getDate() - 6);
        startOfLast7DaysIST.setHours(0, 0, 0, 0);
        const startOfLast7DaysUTC = new Date(startOfLast7DaysIST.getTime() - (3600000 * 5.5));
        const startOfLast7DaysISO = startOfLast7DaysUTC.toISOString();

        const l7Year = startOfLast7DaysIST.getFullYear();
        const l7Month = String(startOfLast7DaysIST.getMonth() + 1).padStart(2, '0');
        const l7Day = String(startOfLast7DaysIST.getDate()).padStart(2, '0');
        const startOfLast7DaysYMD = `${l7Year}-${l7Month}-${l7Day}`;

        // Run database queries concurrently
        const [leadsRes, dailyMetricsRes] = await Promise.all([
            supabase
                .from('lead_attributions')
                .select('conversion_type, first_contact_at, lead_source, referrer_name')
                .gte('first_contact_at', startOfLast7DaysISO),
            supabase
                .from('google_ads_daily_metrics')
                .select('date, amount_spent')
                .gte('date', startOfLast7DaysYMD)
        ]);

        if (leadsRes.error) throw leadsRes.error;
        if (dailyMetricsRes.error) throw dailyMetricsRes.error;

        const getLocalDateStringIST = (isoString) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            const istTime = d.getTime() + (5.5 * 3600000);
            const istDate = new Date(istTime);
            const y = istDate.getFullYear();
            const m = String(istDate.getMonth() + 1).padStart(2, '0');
            const day = String(istDate.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        };

        const categorizeLead = (l) => {
            const src = (l.lead_source || '').toLowerCase().trim();
            const ref = (l.referrer_name || '').toLowerCase().trim();

            if (src.includes('justdial') || ref.includes('justdial')) {
                return 'justdial';
            }
            if (src === 'google_organic') {
                return 'organic';
            }
            if (src === 'google_ads' || src === 'google' || src.includes('ads') || src.includes('cpc')) {
                return 'google';
            }
            return 'organic';
        };

        const leads = leadsRes.data || [];
        let todayGoogle = 0;
        let todayJustdial = 0;
        let todayOrganic = 0;
        let todayManual = 0;
        let todayTotal = 0;

        let organic7Days = 0;
        let paid7Days = 0;

        leads.forEach(l => {
            const leadYMD = getLocalDateStringIST(l.first_contact_at);
            const category = categorizeLead(l);
            const isToday = (leadYMD === todayStr);

            if (category === 'organic') {
                organic7Days++;
            } else {
                paid7Days++;
            }

            if (isToday) {
                todayTotal++;
                if (l.conversion_type?.startsWith('manual_')) todayManual++;
                if (category === 'google') todayGoogle++;
                else if (category === 'justdial') todayJustdial++;
                else if (category === 'organic') todayOrganic++;
            }
        });

        const todayPaid = todayGoogle + todayJustdial;

        // Generate last 7 days list
        const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const last7DaysList = [];

        for (let i = 0; i < 7; i++) {
            const dateVal = new Date(nowIST);
            dateVal.setDate(dateVal.getDate() - i);
            const y = dateVal.getFullYear();
            const m = String(dateVal.getMonth() + 1).padStart(2, '0');
            const d = String(dateVal.getDate()).padStart(2, '0');
            const ymd = `${y}-${m}-${d}`;

            const dayName = days[dateVal.getDay()];
            const display = `${dayName}, ${dateVal.getDate()} ${months[dateVal.getMonth()]}`;

            last7DaysList.push({
                dateStr: ymd,
                dayName: dayName,
                displayDate: display,
                googleLeads: 0,
                justdialLeads: 0,
                paidLeads: 0,
                organicLeads: 0,
                leadsCount: 0,
                spent: 0
            });
        }

        // Map leads to days
        leads.forEach(l => {
            const leadYMD = getLocalDateStringIST(l.first_contact_at);
            const dayObj = last7DaysList.find(day => day.dateStr === leadYMD);
            if (dayObj) {
                dayObj.leadsCount++;
                const category = categorizeLead(l);
                if (category === 'google') {
                    dayObj.googleLeads++;
                    dayObj.paidLeads++;
                } else if (category === 'justdial') {
                    dayObj.justdialLeads++;
                    dayObj.paidLeads++;
                } else {
                    dayObj.organicLeads++;
                }
            }
        });

        // Map spends to days (strictly Google Ads daily spends from google_ads_daily_metrics)
        const dailyMetrics = dailyMetricsRes.data || [];
        dailyMetrics.forEach(m => {
            const dayObj = last7DaysList.find(day => day.dateStr === m.date);
            if (dayObj) {
                dayObj.spent = parseFloat(m.amount_spent) || 0;
            }
        });

        return NextResponse.json({
            success: true,
            total: todayTotal,
            paidToday: todayPaid,
            googleToday: todayGoogle,
            justdialToday: todayJustdial,
            organicToday: todayOrganic,
            organic7Days: organic7Days,
            paid7Days: paid7Days,
            manual: todayManual,
            last7Days: last7DaysList
        });

    } catch (error) {
        console.error('[dashboard/leads-metrics GET error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
