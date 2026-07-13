import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const month = searchParams.get('month') // e.g. YYYY-MM

        if (!technicianId || !month) {
            return NextResponse.json({ success: false, error: 'technicianId and month parameters are required' }, { status: 400 })
        }

        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr);
        const monthNum = parseInt(monthStr);
        const lastDay = new Date(year, monthNum, 0).getDate();
        const startDate = `${month}-01`;
        const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

        // 1. Fetch attendance records
        const { data: attendance, error: attendanceError } = await supabase
            .from('technician_attendance')
            .select('*')
            .eq('technician_id', technicianId)
            .gte('date', startDate)
            .lte('date', endDate);

        if (attendanceError) throw attendanceError;

        // 2. Fetch leaves records
        const { data: leaves, error: leavesError } = await supabase
            .from('technician_leaves')
            .select('*')
            .eq('technician_id', technicianId)
            .gte('leave_date', startDate)
            .lte('leave_date', endDate);

        if (leavesError) throw leavesError;

        return NextResponse.json({
            success: true,
            attendance: attendance || [],
            leaves: leaves || []
        });

    } catch (err) {
        console.error('Error fetching attendance/leaves:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { technicianId, date, status, notes } = await request.json();

        if (!technicianId || !date || !status) {
            return NextResponse.json({ success: false, error: 'technicianId, date, and status are required' }, { status: 400 });
        }

        if (!['present', 'absent', 'half_day', 'weekly_off', 'leave'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 });
        }

        // Upsert to technician_attendance
        const { data, error } = await supabase
            .from('technician_attendance')
            .upsert({
                technician_id: technicianId,
                date,
                status,
                notes: notes || '',
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'technician_id,date'
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, attendance: data });

    } catch (err) {
        console.error('Error saving attendance:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
