import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { associateKioskProfile } from '@/lib/manageEngine';

export async function POST(request) {
    try {
        const { technician_id } = await request.json();
        const sessionToken = request.headers.get('x-session-token');

        if (!technician_id) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        // Validate active session
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('current_session_token, name, mdm_device_id')
            .eq('id', technician_id)
            .single();

        if (techError || !tech || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
        }

        // Calculate today's date in local time string YYYY-MM-DD (India timezone default)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const localDate = new Date(utc + (3600000 * 5.5));
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const timestampStr = now.toISOString();

        // 1. Fetch existing attendance row for today if any
        const { data: existingAtt } = await supabase
            .from('technician_attendance')
            .select('id, shift_start_time')
            .eq('technician_id', technician_id)
            .eq('date', todayStr)
            .maybeSingle();

        // Use the first shift_start_time if already logged, otherwise set it
        const finalStartStr = existingAtt?.shift_start_time || timestampStr;

        // 2. Upsert attendance for today
        const { error: attError } = await supabase
            .from('technician_attendance')
            .upsert({
                technician_id,
                date: todayStr,
                status: 'present',
                shift_start_time: finalStartStr,
                updated_at: timestampStr
            }, {
                onConflict: 'technician_id,date'
            });

        if (attError) {
            console.error('Error logging shift start attendance:', attError);
            return NextResponse.json({ success: false, error: 'Failed to record attendance' }, { status: 500 });
        }

        // 3. Update Live Locations status to online and on_duty
        const { error: locError } = await supabase
            .from('technician_live_locations')
            .upsert({
                technician_id,
                is_online: true,
                duty_status: 'on_duty',
                updated_at: timestampStr
            }, {
                onConflict: 'technician_id'
            });

        if (locError) {
            console.error('Error updating live location status:', locError);
        }

        // 4. Trigger ManageEngine Kiosk Profile association (OTA lock)
        let mdmResult = { success: true };
        if (tech.mdm_device_id) {
            mdmResult = await associateKioskProfile(tech.mdm_device_id);
        }

        return NextResponse.json({
            success: true,
            shift_start_time: finalStartStr,
            mdm_simulated: mdmResult.simulated || false,
            mdm_success: mdmResult.success
        });

    } catch (err) {
        console.error('Error starting shift:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
