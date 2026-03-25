import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    try {
        const body = await req.json();
        const { amount, receipt, currency = 'INR' } = body;

        if (!amount || !receipt) {
            return NextResponse.json({ success: false, error: 'Amount and receipt are required' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        // Razorpay expects amount in paise (multiply by 100)
        const options = {
            amount: Math.round(amount * 100),
            currency,
            receipt: String(receipt), // e.g. Job ID
        };

        const order = await razorpay.orders.create(options);

        // Include the Key ID so the frontend doesn't need to expose it separately in NEXT_PUBLIC env
        return NextResponse.json({ 
            success: true, 
            order, 
            keyId: process.env.RAZORPAY_KEY_ID 
        });

    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
