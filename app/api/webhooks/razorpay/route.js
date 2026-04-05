import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/razorpay
 * Razorpay fires this for: payment.captured, payment.failed, payment_link.paid
 */
export async function POST(request) {
    const supabase = createServerSupabase();
    const rawBody = await request.text();

    // 1. Verify signature
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) {
        return NextResponse.json({ error: 'Missing secret or signature' }, { status: 400 });
    }
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    if (expected !== signature) {
        console.error('[razorpay-webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let event;
    try { event = JSON.parse(rawBody); } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const eventType = event.event; // e.g. 'payment.captured'
    const payload = event.payload?.payment?.entity || event.payload?.payment_link?.entity || {};

    console.log(`[razorpay-webhook] Event: ${eventType} | ID: ${payload.id}`);

    // 2. Handle payment.captured and payment_link.paid
    if (eventType === 'payment.captured' || eventType === 'payment_link.paid') {
        const amountRupees = (payload.amount || 0) / 100;
        const paymentId = payload.id;
        const orderId = payload.order_id;
        const notes = payload.notes || {};

        const jobId = notes.job_id || null;
        const accountId = notes.account_id || null;
        const invoiceId = notes.invoice_id || null;
        const collectedBy = notes.collected_by || 'customer';
        const technicianId = notes.technician_id || null;
        const techName = notes.technician_name || 'Technician';
        const amountLabel = notes.amount_label || 'payment';

        const interactionMsg = collectedBy === 'technician'
            ? `₹${amountRupees.toLocaleString('en-IN')} ${amountLabel} collected via QR/Link by ${techName} · Razorpay Tx: ${paymentId}`
            : collectedBy === 'admin'
            ? `₹${amountRupees.toLocaleString('en-IN')} received via payment link sent by admin · Razorpay Tx: ${paymentId}`
            : `₹${amountRupees.toLocaleString('en-IN')} received online by customer · Razorpay Tx: ${paymentId}`;

        // 3a. Log to job_interactions (if job linked)
        if (jobId) {
            await supabase.from('job_interactions').insert({
                job_id: jobId,
                type: 'payment-received-online',
                message: interactionMsg,
                user_name: collectedBy === 'technician' ? techName : 'Razorpay',
            }).catch(e => console.error('[webhook] job_interactions error:', e.message));
        }

        // 3b. Log to account_interactions (if account linked)
        if (accountId) {
            await supabase.from('account_interactions').insert({
                account_id: accountId,
                type: 'payment-received-online',
                message: interactionMsg,
                user_name: collectedBy === 'technician' ? techName : 'Razorpay',
                metadata: { payment_id: paymentId, order_id: orderId, amount: amountRupees, job_id: jobId },
            }).catch(e => console.error('[webhook] account_interactions error:', e.message));
        }

        // 3c. Auto-create Receipt Voucher + allocate to invoice
        if (accountId && amountRupees > 0) {
            try {
                const voucherPayload = {
                    account_id: accountId,
                    date: new Date().toISOString().split('T')[0],
                    amount: amountRupees,
                    payment_method: 'online',
                    notes: `Auto-created from Razorpay payment ${paymentId}${jobId ? ` · Job: ${jobId}` : ''}`,
                    narration: interactionMsg,
                    reference: paymentId,
                };

                const { data: voucher } = await supabase
                    .from('receipt_vouchers')
                    .insert(voucherPayload)
                    .select()
                    .single();

                // Allocate to invoice if provided
                if (voucher && invoiceId) {
                    await supabase.from('receipt_voucher_allocations').insert({
                        receipt_voucher_id: voucher.id,
                        sales_invoice_id: invoiceId,
                        allocated_amount: amountRupees,
                    }).catch(e => console.error('[webhook] allocation error:', e.message));

                    // Update invoice paid_amount
                    const { data: inv } = await supabase
                        .from('sales_invoices')
                        .select('paid_amount, total_amount')
                        .eq('id', invoiceId)
                        .single();

                    if (inv) {
                        const newPaid = (parseFloat(inv.paid_amount) || 0) + amountRupees;
                        const newStatus = newPaid >= parseFloat(inv.total_amount) ? 'paid' : 'partial';
                        await supabase.from('sales_invoices')
                            .update({ paid_amount: newPaid, status: newStatus })
                            .eq('id', invoiceId);
                    }
                }
            } catch (e) {
                console.error('[webhook] receipt voucher creation error:', e.message);
            }
        }

        // 3d. Fire push notification
        try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_type: 'payment_received_online',
                    job_id: jobId,
                    customer_id: accountId,
                    technician_id: technicianId,
                    amount: amountRupees,
                    payment_id: paymentId,
                }),
            });
        } catch (e) {
            console.error('[webhook] notification fire error:', e.message);
        }
    }

    // Always return 200 so Razorpay doesn't retry
    return NextResponse.json({ received: true });
}
