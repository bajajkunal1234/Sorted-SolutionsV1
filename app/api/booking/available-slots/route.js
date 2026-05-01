import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const SECTION_ID = 'booking-slots';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const daysParam = parseInt(searchParams.get('days')) || 3;
        const startDateParam = searchParams.get('startDate'); // optional YYYY-MM-DD
        
        const supabase = createServerSupabase();
        
        // 1. Fetch Config
        const { data: configData, error: configError } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', SECTION_ID)
            .single();

        let config = configData?.config || {};
        
        // Handle backward compatibility dynamically
        if (config.slots && !config.templates) {
            const templatesMap = {};
            const templates = [];
            const defaultWeeklySchedule = { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] };
            
            config.slots.forEach((slot, i) => {
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

        // 2. Determine Date Range
        const dates = [];
        let baseDate = startDateParam ? new Date(`${startDateParam}T00:00:00`) : new Date();
        
        for (let i = 0; i < daysParam; i++) {
            const d = new Date(baseDate);
            d.setDate(baseDate.getDate() + i);
            dates.push(d);
        }

        const dateStrings = dates.map(d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);

        // 3. Fetch Existing Jobs to calculate capacity
        const { data: existingJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('scheduled_date, scheduled_time')
            .in('scheduled_date', dateStrings)
            .not('status', 'in', '("cancelled", "rejected", "booking_request")'); // booking_request handled separately or excluded? wait, booking_request occupies a slot. Keep them?
            
        // Wait, booking_request is unconfirmed, but we should probably count it so we don't overbook.
        // The original booking logic checks `not.in.(cancelled,rejected,booking_request)`. So we exclude booking_request from capacity count.
        // Actually, we must use the exact same logic as `app/api/booking/route.js`.
        
        // Let's refetch with the correct filter
        const { data: activeJobs } = await supabase
            .from('jobs')
            .select('scheduled_date, scheduled_time')
            .in('scheduled_date', dateStrings)
            .not('status', 'in', '("cancelled", "rejected", "booking_request")');

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

        // 4. Build Availability Map
        const availability = {};
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

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
