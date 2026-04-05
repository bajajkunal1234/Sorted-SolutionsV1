import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            amount, receipt, currency = 'INR',
            // Context for webhook auto-linking
            job_id, account_id, invoice_id,
            collected_by = 'customer', // 'customer' | 'technician' | 'admin'
            technician_id, technician_name,
            amount_label = 'payment', // 'advance' | 'partial' | 'full' | 'payment'
        } = body;

        if (!amount || !receipt) {
            return NextResponse.json({ success: false, error: 'Amount and receipt are required' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: Math.round(amount * 100), // paise
            currency,
            receipt: String(receipt),
            notes: {
                job_id: job_id || receipt,
                account_id: account_id || '',
                invoice_id: invoice_id || '',
                collected_by,
                technician_id: technician_id || '',
                technician_name: technician_name || '',
                amount_label,
            },
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            success: true,
            order,
            keyId: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
