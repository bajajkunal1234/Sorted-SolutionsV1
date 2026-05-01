import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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


export async function GET() {
    try {
        const supabase = createServerSupabase();
        const { data, error } = await supabase
            .from('website_section_configs')
            .select('*')
            .eq('section_id', SECTION_ID)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        let config = data?.extra_config || {};
        
        // Backward compatibility: If the DB still has the old flat array format,
        // convert it into the new template format on the fly.
        // Fallback to DEFAULT_SLOTS if config is completely empty
        let slotsArray = config.slots;
        if (!config.slots && !config.templates) {
            slotsArray = DEFAULT_SLOTS;
        }

        if (slotsArray && !config.templates) {
            const templatesMap = {};
            const templates = [];
            const defaultWeeklySchedule = {
                monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: []
            };
            
            slotsArray.forEach((slot, index) => {
                // Generate a unique key for the template
                const templateKey = `${slot.startTime}-${slot.endTime}-${slot.label}`;
                let templateId = templatesMap[templateKey];
                
                if (!templateId) {
                    templateId = `t_${Date.now()}_${index}`;
                    templatesMap[templateKey] = templateId;
                    templates.push({
                        id: templateId,
                        name: slot.label || `${slot.startTime} - ${slot.endTime}`,
                        startTime: slot.startTime,
                        endTime: slot.endTime
                    });
                }
                
                if (slot.active !== false && defaultWeeklySchedule[slot.day]) {
                    defaultWeeklySchedule[slot.day].push({
                        templateId: templateId,
                        maxBookings: slot.maxBookings || 4
                    });
                }
            });
            
            config = {
                templates,
                defaultWeeklySchedule,
                overrides: {}
            };
        } else if (!config.templates) {
            // No slots and no templates, use empty defaults
            config = {
                templates: [],
                defaultWeeklySchedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
                overrides: {}
            };
        }

        return NextResponse.json({ success: true, data: config });
    } catch (err) {
        console.error('booking-slots GET error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const config = await request.json();
        const supabase = createServerSupabase();
        const { error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: SECTION_ID,
                extra_config: config,
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('booking-slots PUT error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
