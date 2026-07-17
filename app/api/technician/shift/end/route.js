import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { disassociateKioskProfile } from '@/lib/manageEngine';

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

        // Calculate today's date and hour in local India time (UTC+5.5)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const localDate = new Date(utc + (3600000 * 5.5));
        const yyyy = localDate.getFullYear();
        const mm = String(localDate.getMonth() + 1).padStart(2, '0');
        const dd = String(localDate.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const currentHour = localDate.getHours();

        // Enforce shift hours lock boundary: locked during core shift hours (9:00 AM - 7:00 PM)
        if (currentHour >= 9 && currentHour < 19) {
            return NextResponse.json({ 
                success: false, 
                error: 'Shift end / Log out is locked during active shift hours (9:00 AM - 7:00 PM).' 
            }, { status: 400 });
        }

        const timestampStr = now.toISOString();

        // 1. Record Shift End Time in today's attendance row
        const { error: attError } = await supabase
            .from('technician_attendance')
            .upsert({
                technician_id,
                date: todayStr,
                status: 'present',
                shift_end_time: timestampStr,
                updated_at: timestampStr
            }, {
                onConflict: 'technician_id,date'
            });

        if (attError) {
            console.error('Error logging shift end attendance:', attError);
            return NextResponse.json({ success: false, error: 'Failed to record check-out time' }, { status: 500 });
        }

        // 2. Update Live Locations to offline
        const { error: locError } = await supabase
            .from('technician_live_locations')
            .upsert({
                technician_id,
                is_online: false,
                duty_status: 'offline',
                updated_at: timestampStr
            }, {
                onConflict: 'technician_id'
            });

        if (locError) {
            console.error('Error updating live location status:', locError);
        }

        // 3. Trigger ManageEngine Kiosk Profile disassociation (OTA unlock)
        let mdmResult = { success: true };
        if (tech.mdm_device_id) {
            mdmResult = await disassociateKioskProfile(tech.mdm_device_id);
        }

        return NextResponse.json({
            success: true,
            shift_end_time: timestampStr,
            mdm_simulated: mdmResult.simulated || false,
            mdm_success: mdmResult.success
        });

    } catch (err) {
        console.error('Error ending shift:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
