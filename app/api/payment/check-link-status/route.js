import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const linkId = searchParams.get('id');
        if (!linkId) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const link = await razorpay.paymentLink.fetch(linkId);

        return NextResponse.json({ success: true, status: link.status });
    } catch (error) {
        console.error('[check-link-status] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
