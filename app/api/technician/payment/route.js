import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/technician/payment
 * Called by technician app to record a cash payment collected at the customer's door.
 *
 * Body: {
 *   job_id, account_id, technician_id, technician_name,
 *   amount, method: 'cash', amount_label: 'advance'|'partial'|'full',
 *   notes?
 * }
 */
export async function POST(request) {
    const supabase = createServerSupabase();

    let body;
    try { body = await request.json(); }
    catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 }); }

    const {
        job_id, account_id, technician_id, technician_name,
        amount, method = 'cash', amount_label = 'payment', notes = ''
    } = body;

    if (!job_id || !amount || amount <= 0) {
        return NextResponse.json({ success: false, error: 'job_id and amount are required' }, { status: 400 });
    }

    const amountNum = parseFloat(amount);
    const techLabel = technician_name || 'Technician';
    const interactionMsg = `₹${amountNum.toLocaleString('en-IN')} cash collected as ${amount_label} by ${techLabel}${notes ? ` · Note: ${notes}` : ''}`;

    try {
        // 1. Log to job_interactions
        await supabase.from('job_interactions').insert({
            job_id,
            type: 'payment-received-cash',
            message: interactionMsg,
            user_name: techLabel,
            metadata: { amount: amountNum, method, amount_label, technician_id },
        });

        // 2. Log to account_interactions
        if (account_id) {
            await supabase.from('account_interactions').insert({
                account_id,
                type: 'payment-received-cash',
                message: interactionMsg,
                user_name: techLabel,
                metadata: { amount: amountNum, method, amount_label, job_id, technician_id },
            }).catch(e => console.error('[tech-payment] account_interactions error:', e.message));
        }

        // 3. Fire push notification to customer + admin
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_type: 'payment_received_cash',
                job_id,
                customer_id: account_id,
                technician_id,
                technician_name: techLabel,
                amount: amountNum,
            }),
        }).catch(e => console.error('[tech-payment] notification error:', e.message));

        return NextResponse.json({ success: true, message: interactionMsg });

    } catch (err) {
        console.error('[tech-payment] error:', err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
