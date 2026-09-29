import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { logInteractionServer } from '@/lib/log-interaction-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const technicianId = searchParams.get('technicianId');
        const status = searchParams.get('status');
        const unsettledOnly = searchParams.get('unsettled_only') === 'true';

        let query = supabase
            .from('technician_cash_handovers')
            .select('*')
            .order('created_at', { ascending: false });

        if (technicianId) {
            query = query.eq('technician_id', technicianId);
        }

        if (status) {
            query = query.in('status', status.split(','));
        }

        if (unsettledOnly) {
            query = query.eq('is_settled', false);
        }

        const { data: handovers, error } = await query;

        if (error) {
            console.error('Error fetching cash handovers:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const activeHandovers = (handovers || []).filter(h => h.status !== 'rejected' && !h.is_settled);
        const totalHandedOver = activeHandovers.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
        const totalSubmitted = (handovers || []).filter(h => h.status === 'submitted').reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
        const totalVerified = (handovers || []).filter(h => h.status === 'verified').reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);

        return NextResponse.json({
            success: true,
            handovers: handovers || [],
            summary: {
                totalHandedOver,
                totalSubmitted,
                totalVerified,
                count: handovers?.length || 0
            }
        });
    } catch (error) {
        console.error('Error in cash-handovers GET:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            technician_id,
            technician_name,
            amount,
            handover_type,
            handover_to,
            receipt_url,
            notes,
            date
        } = body;

        if (!technician_id || !amount || !handover_type) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: technician_id, amount, handover_type' },
                { status: 400 }
            );
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return NextResponse.json(
                { success: false, error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        if (handover_type === 'in_person' && (!handover_to || !handover_to.trim())) {
            return NextResponse.json(
                { success: false, error: 'Please enter the name of the person you handed over the cash to' },
                { status: 400 }
            );
        }

        const payload = {
            technician_id,
            technician_name: technician_name || 'Technician',
            amount: numAmount,
            handover_type,
            handover_to: handover_type === 'in_person' ? handover_to.trim() : null,
            receipt_url: handover_type === 'bank_deposit' ? (receipt_url || null) : null,
            notes: notes ? notes.trim() : null,
            status: 'submitted',
            date: date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            is_settled: false
        };

        const { data: handover, error } = await supabase
            .from('technician_cash_handovers')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error inserting cash handover:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Log interaction
        const typeLabel = handover_type === 'bank_deposit' ? 'CDM Bank Deposit' : `In-Person Handover to ${handover_to}`;
        logInteractionServer({
            type: 'cash-handover-submitted',
            category: 'payment',
            performedBy: technician_id,
            performedByName: technician_name || 'Technician',
            description: `Cash handover submitted: ₹${numAmount.toLocaleString('en-IN')} via ${typeLabel}${notes ? ` (Note: ${notes})` : ''}`,
            metadata: {
                handover_id: handover.id,
                amount: numAmount,
                handover_type,
                handover_to,
                receipt_url
            },
            source: 'Technician App'
        });

        // Push notification to admin
        try {
            await supabase.from('app_notifications').insert({
                recipient_type: 'admin',
                recipient_id: 'admin',
                title: 'Cash Handover Recorded 💵',
                message: `${technician_name || 'Technician'} submitted a cash handover of ₹${numAmount.toLocaleString('en-IN')} via ${typeLabel}.`,
                link: '/admin?tab=reports&sub=customer-payments',
                is_read: false
            });
        } catch (notifErr) {
            console.error('Error sending admin notification:', notifErr);
        }

        return NextResponse.json({
            success: true,
            handover,
            message: 'Cash handover entry created successfully'
        });
    } catch (error) {
        console.error('Error in cash-handovers POST:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, status, verified_by, notes, action, technician_id } = body;

        // Bulk settle action
        if (action === 'settle_all' && technician_id) {
            const { data, error } = await supabase
                .from('technician_cash_handovers')
                .update({ is_settled: true, status: 'settled' })
                .eq('technician_id', technician_id)
                .neq('status', 'rejected')
                .select();

            if (error) throw error;
            return NextResponse.json({ success: true, count: data?.length || 0, message: 'All active handovers marked as settled' });
        }

        if (!id) {
            return NextResponse.json({ success: false, error: 'Handover ID is required' }, { status: 400 });
        }

        const updateData = {};
        if (status) {
            updateData.status = status;
            if (status === 'verified') {
                updateData.verified_at = new Date().toISOString();
                updateData.verified_by = verified_by || 'Admin';
            }
        }
        if (notes !== undefined) updateData.notes = notes;

        const { data: updated, error } = await supabase
            .from('technician_cash_handovers')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating cash handover:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            handover: updated,
            message: `Handover status updated to ${status}`
        });
    } catch (error) {
        console.error('Error in cash-handovers PUT:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
