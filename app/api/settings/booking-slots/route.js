import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

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
        const slots = data?.config?.slots || DEFAULT_SLOTS;
        return NextResponse.json({ success: true, data: slots });
    } catch (err) {
        console.error('booking-slots GET error:', err);
        return NextResponse.json({ success: true, data: DEFAULT_SLOTS });
    }
}

export async function PUT(request) {
    try {
        const { slots } = await request.json();
        const supabase = createServerSupabase();
        const { error } = await supabase
            .from('website_section_configs')
            .upsert({
                section_id: SECTION_ID,
                config: { slots },
                updated_at: new Date().toISOString()
            });
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('booking-slots PUT error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
