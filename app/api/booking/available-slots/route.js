import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const SECTION_ID = 'booking-slots';

const DEFAULT_SLOTS = [
    { id: 's1', day: 'monday', startTime: '09:00', endTime: '12:00', label: 'Morning (9am – 12pm)', maxBookings: 4, active: true },
    { id: 's2', day: 'monday', startTime: '14:00', endTime: '18:00', label: 'Afternoon (2pm – 6pm)', maxBookings: 6, active: true },
    { id: 's3', day: 'tuesday', startTime: '09:00', endTime: '12:00', label: 'Morning (9am – 12pm)', maxBookings: 4, active: true },
    { id: 's4', day: 'tuesday', startTime: '14:00', endTime: '18:00', label: 'Afternoon (2pm – 6pm)', maxBookings: 6, active: true },
    { id: 's5', day: 'wednesday', startTime: '09:00', endTime: '12:00', label: 'Morning (9am – 12pm)', maxBookings: 4, active: true },
    { id: 's6', day: 'wednesday', startTime: '14:00', endTime: '18:00', label: 'Afternoon (2pm – 6pm)', maxBookings: 6, active: true },
    { id: 's7', day: 'thursday', startTime: '09:00', endTime: '12:00', label: 'Morning (9am – 12pm)', maxBookings: 4, active: true },
    { id: 's8', day: 'thursday', startTime: '14:00', endTime: '18:00', label: 'Afternoon (2pm – 6pm)', maxBookings: 6, active: true },
    { id: 's9', day: 'friday', startTime: '09:00', endTime: '12:00', label: 'Morning (9am – 12pm)', maxBookings: 4, active: true },
    { id: 's10', day: 'friday', startTime: '14:00', endTime: '18:00', label: 'Afternoon (2pm – 6pm)', maxBookings: 6, active: true },
    { id: 's11', day: 'saturday', startTime: '09:00', endTime: '13:00', label: 'Morning (9am – 1pm)', maxBookings: 3, active: true },
];


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const daysParam = parseInt(searchParams.get('days')) || 3;
        const startDateParam = searchParams.get('startDate'); // optional YYYY-MM-DD
        const bypassFilter = searchParams.get('bypassFilter') === 'true' || searchParams.get('admin') === 'true';
        
        const supabase = createServerSupabase();
        
        // 1. Fetch Config
        const { data: configData, error: configError } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', SECTION_ID)
            .single();

        let config = configData?.extra_config || {};
        
        // Handle backward compatibility dynamically
        // Fallback to DEFAULT_SLOTS if config is completely empty
        let slotsArray = config.slots;
        if (!config.slots && !config.templates) {
            slotsArray = DEFAULT_SLOTS;
        }

        if (slotsArray && !config.templates) {
            const templatesMap = {};
            const templates = [];
            const defaultWeeklySchedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
            
            slotsArray.forEach((slot, i) => {
                const key = `${slot.startTime}-${slot.endTime}-${slot.label}`;
                let tid = templatesMap[key];
                if (!tid) {
                    tid = `t_${Date.now()}_${i}`;
                    templatesMap[key] = tid;
                    templates.push({ id: tid, name: slot.label || `${slot.startTime} - ${slot.endTime}`, startTime: slot.startTime, endTime: slot.endTime });
                }
                if (slot.active !== false && defaultWeeklySchedule[slot.day]) {
                    defaultWeeklySchedule[slot.day].push({ templateId: tid, maxBookings: slot.maxBookings || 4 });
                }
            });
            config = { templates, defaultWeeklySchedule, overrides: {} };
        } else if (!config.templates) {
            config = { templates: [], defaultWeeklySchedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }, overrides: {} };
        }

        // 2. Determine Date Range (Enforce Asia/Kolkata Timezone)
        const dates = [];
        let baseDate;
        if (startDateParam) {
            // If explicit start date is provided, use it
            baseDate = new Date(`${startDateParam}T00:00:00Z`); // Treat as UTC midnight so .getDate() remains correct in Vercel
        } else {
            // Get current time in India
            const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
            baseDate = new Date(istString);
            baseDate.setHours(0, 0, 0, 0); // Normalize to midnight so getDate() works perfectly on Vercel's UTC environment
        }
        
        for (let i = 0; i < daysParam; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            dates.push(d);
        }

        const dateStrings = dates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

        // 3. Fetch Existing Jobs to calculate slot capacity
        // Exclude only cancelled/closed — all other statuses occupy a slot
        const { data: activeJobs } = await supabase
            .from('jobs')
            .select('scheduled_date, scheduled_time')
            .in('scheduled_date', dateStrings)
            .not('status', 'in', '("cancelled","closed")');

        const jobCounts = {}; // { 'YYYY-MM-DD': { 'Slot Name': count } }
        (activeJobs || []).forEach(job => {
            const d = job.scheduled_date;
            const t = job.scheduled_time;
            if (d && t) {
                if (!jobCounts[d]) jobCounts[d] = {};
                if (!jobCounts[d][t]) jobCounts[d][t] = 0;
                jobCounts[d][t]++;
            }
        });

        // 4. Build Availability Map (With India timezone calculations for dynamic slot expiration)
        const availability = {};
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        const istString = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
        const todayIST = new Date(istString);
        const todayStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
        const currentMin = todayIST.getHours() * 60 + todayIST.getMinutes();

        dateStrings.forEach((dateStr, index) => {
            const d = dates[index];
            const dayName = daysOfWeek[d.getDay()];
            
            // Check Overrides first, then Defaults
            let daySlotsConfig = config.overrides?.[dateStr];
            if (!daySlotsConfig) {
                daySlotsConfig = config.defaultWeeklySchedule?.[dayName] || [];
            }

            const availableSlots = [];

            daySlotsConfig.forEach(slotConfig => {
                const template = config.templates.find(t => t.id === slotConfig.templateId);
                if (template) {
                    const label = template.name;
                    const bookedCount = jobCounts[dateStr]?.[label] || 0;
                    
                    if (bookedCount < slotConfig.maxBookings) {
                        let isExpired = false;
                        if (!bypassFilter && dateStr === todayStr) {
                            const startTime = template.startTime || '00:00';
                            const endTime = template.endTime || '00:00';
                            const [startH, startM] = startTime.split(':').map(Number);
                            const [endH, endM] = endTime.split(':').map(Number);
                            const startMin = startH * 60 + startM;
                            let endMin = endH * 60 + endM;
                            if (endMin < startMin) {
                                endMin += 24 * 60; // handle overnight crossover
                            }
                            // Midpoint of the slot
                            const midMin = (startMin + endMin) / 2;
                            
                            // If current IST time is past the midpoint (strictly greater), it has expired
                            if (currentMin > midMin) {
                                isExpired = true;
                            }
                        }

                        if (!isExpired) {
                            availableSlots.push({
                                id: template.id,
                                label: label,
                                startTime: template.startTime,
                                endTime: template.endTime,
                                maxBookings: slotConfig.maxBookings,
                                bookedCount: bookedCount,
                                available: true
                            });
                        }
                    }
                }
            });

            // Sort slots by start time
            availableSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
            availability[dateStr] = availableSlots;
        });

        return NextResponse.json({ success: true, data: availability });

    } catch (err) {
        console.error('available-slots error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
