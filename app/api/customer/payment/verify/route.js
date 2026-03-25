import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { logInteractionServer } from '@/lib/log-interaction-server';

export async function POST(req) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, receipt } = await req.json();

        // Verify the signature
        const secret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ success: false, error: 'Payment verification failed: Invalid signature' }, { status: 400 });
        }

        // Signature is valid. 
        // Log the payment in interactions so it shows up in admin timeline.
        // `receipt` should ideally be the Job ID or AMC ID.
        if (receipt && receipt.startsWith('JOB-') || receipt.length > 10) {
            await supabase.from('job_interactions').insert([{
                job_id: receipt, // Assuming receipt is the UUID of the job
                type: 'payment-received-online',
                message: `Payment successful online via Razorpay (Tx: ${razorpay_payment_id})`,
                user_name: 'Customer App'
            }]);

            // Update job status if needed, e.g. setting custom paid flags. We'll leave the job status alone to avoid conflict with admin workflow.
        }

        return NextResponse.json({ success: true, message: 'Payment verified successfully', paymentId: razorpay_payment_id });

    } catch (error) {
        console.error('Error verifying Razorpay payment:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
