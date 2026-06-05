import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/leaves
 * Retrieves all leave requests for all technicians (enriched with technician names).
 */
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('technician_leaves')
            .select(`
                *,
                technician:technicians(id, name)
            `)
            .order('leave_date', { ascending: false });

        if (error) throw error;

        // Flatten technician name for convenience
        const enriched = (data || []).map(r => ({
            ...r,
            technician_name: r.technician?.name || 'Unknown Technician'
        }));

        return NextResponse.json({ success: true, leaves: enriched });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/leaves
 * Approves or rejects a leave request.
 */
export async function PATCH(request) {
    try {
        const { id, status } = await request.json();

        if (!id || !status || !['approved', 'rejected'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Valid ID and Status (approved/rejected) are required' }, { status: 400 });
        }

        // Update status in public.technician_leaves
        const { data: leave, error } = await supabase
            .from('technician_leaves')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Fetch technician details for notification
        const { data: tech } = await supabase
            .from('technicians')
            .select('name')
            .eq('id', leave.technician_id)
            .single();

        const techName = tech?.name || 'Technician';
        const statusEmoji = status === 'approved' ? '✅' : '❌';

        // Insert notification for the technician
        await supabase.from('app_notifications').insert({
            recipient_type: 'technician',
            recipient_id: leave.technician_id,
            title: `Leave Request ${status === 'approved' ? 'Approved' : 'Rejected'} ${statusEmoji}`,
            message: `Your leave request for ${leave.leave_date} has been ${status}.`,
            link: '/technician',
            is_read: false
        }).catch(() => {});

        // Send Supabase realtime broadcast so the technician and admin apps update
        const channel = supabase.channel('realtime:technician_updates');
        channel.subscribe((subStatus) => {
            if (subStatus === 'SUBSCRIBED') {
                channel.send({
                    type: 'broadcast',
                    event: 'leave_status_updated',
                    payload: { leaveId: id, status, technicianId: leave.technician_id }
                }).then(() => {
                    supabase.removeChannel(channel);
                });
            }
        });

        return NextResponse.json({ success: true, leave });
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
