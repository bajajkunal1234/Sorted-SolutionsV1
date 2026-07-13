import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper to calculate the earliest allowable leave date (after 6 working days from today, skipping Sundays)
function getMinLeaveDate() {
    const d = new Date();
    // Adjust to India Standard Time (UTC+5:30)
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const istDate = new Date(utc + (3600000 * 5.5));
    
    let workingDays = 0;
    let checkDate = new Date(istDate);
    while (workingDays < 6) {
        checkDate.setDate(checkDate.getDate() + 1);
        if (checkDate.getDay() !== 0) { // Not Sunday
            workingDays++;
        }
    }
    let minDate = new Date(checkDate);
    minDate.setDate(minDate.getDate() + 1);
    if (minDate.getDay() === 0) { // Sunday fallback
        minDate.setDate(minDate.getDate() + 1);
    }
    minDate.setHours(0, 0, 0, 0);
    return minDate;
}

/**
 * GET /api/technician/leaves
 * Retrieves all leave requests for a technician.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const technicianId = searchParams.get('technicianId');

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        // Validate active session
        const sessionToken = request.headers.get('x-session-token');
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single();

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('technician_leaves')
            .select('*')
            .eq('technician_id', technicianId)
            .order('leave_date', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, leaves: data || [] });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/technician/leaves
 * Submits a new leave request.
 */
export async function POST(request) {
    try {
        const { technician_id, leave_date, reason } = await request.json();

        if (!technician_id || !leave_date) {
            return NextResponse.json({ success: false, error: 'Technician ID and Leave Date are required' }, { status: 400 });
        }

        // Validate active session and fetch name
        const sessionToken = request.headers.get('x-session-token');
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token, name, weekly_off_day')
            .eq('id', technician_id)
            .single();

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 });
        }

        // Validate date is not their weekly off day
        const reqDate = new Date(leave_date);
        const weeklyOffDay = tech?.weekly_off_day || 'Sunday';
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const reqDayName = dayNames[reqDate.getDay()];
        
        if (reqDayName === weeklyOffDay) {
            return NextResponse.json({ success: false, error: `${weeklyOffDay}s are fixed rest days. Leave applications for ${weeklyOffDay}s are not allowed.` }, { status: 400 });
        }

        // Validate 6-working-day advance notice rule
        const reqDateZero = new Date(leave_date);
        reqDateZero.setHours(0, 0, 0, 0);
        const minAllowed = getMinLeaveDate();

        if (reqDateZero < minAllowed) {
            return NextResponse.json({
                success: false,
                error: `Leaves must be applied at least 6 working days in advance. First available leave date: ${minAllowed.toISOString().split('T')[0]}`
            }, { status: 400 });
        }

        const techName = tech?.name || 'Technician';

        // Insert leave request
        const { data: leave, error } = await supabase
            .from('technician_leaves')
            .insert({
                technician_id,
                leave_date,
                reason: reason || '',
                status: 'pending'
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return NextResponse.json({ success: false, error: 'You have already applied for a leave on this date.' }, { status: 400 });
            }
            throw error;
        }

        // Insert notification for admin
        await supabase.from('app_notifications').insert({
            recipient_type: 'admin',
            recipient_id: 'admin',
            title: 'New Leave Request 📅',
            message: `${techName} requested leave for ${leave_date}. Reason: ${reason || 'Not specified'}`,
            link: '/admin',
            is_read: false
        }).catch(() => {});

        return NextResponse.json({ success: true, leave });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
