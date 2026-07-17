import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
    try {
        const { technician_id, action } = await request.json();
        const sessionToken = request.headers.get('x-session-token');

        if (!technician_id || !action || !['start', 'end'].includes(action)) {
            return NextResponse.json({ success: false, error: 'Technician ID and valid action (start/end) are required' }, { status: 400 });
        }

        // Validate active session
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technician_id)
            .single();

        if (techError || !tech || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
        }

        // Calculate today's date in local India time (UTC+5.5)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const localDate = new Date(utc + (3600000 * 5.5));
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const timestampStr = now.toISOString();
        const updatePayload = {
            updated_at: timestampStr
        };

        if (action === 'start') {
            updatePayload.lunch_start_time = timestampStr;
        } else {
            updatePayload.lunch_end_time = timestampStr;
        }

        // 1. Record Lunch Time in today's attendance row
        const { error: attError } = await supabase
            .from('technician_attendance')
            .upsert({
                technician_id,
                date: todayStr,
                ...updatePayload
            }, {
                onConflict: 'technician_id,date'
            });

        if (attError) {
            console.error('Error logging lunch break time:', attError);
            return NextResponse.json({ success: false, error: 'Failed to record lunch status' }, { status: 500 });
        }

        // 2. Update Live Locations status (on_duty or lunch)
        const nextDutyStatus = action === 'start' ? 'lunch' : 'on_duty';
        const { error: locError } = await supabase
            .from('technician_live_locations')
            .upsert({
                technician_id,
                is_online: true,
                duty_status: nextDutyStatus,
                updated_at: timestampStr
            }, {
                onConflict: 'technician_id'
            });

        if (locError) {
            console.error('Error updating live location status during lunch:', locError);
        }

        return NextResponse.json({
            success: true,
            timestamp: timestampStr,
            duty_status: nextDutyStatus
        });

    } catch (err) {
        console.error('Error handling lunch break request:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
