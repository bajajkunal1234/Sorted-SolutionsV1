import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/create-link
 * Creates a Razorpay Payment Link (shareable URL) for a given amount.
 * Used by technician app (Send WhatsApp) and admin app (Send from invoice).
 *
 * Body: {
 *   amount, description, customer_name, customer_phone, customer_email?,
 *   job_id, account_id, invoice_id?, collected_by, technician_id?, technician_name?, amount_label?
 * }
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            amount, description, customer_name, customer_phone, customer_email = '',
            job_id, account_id, invoice_id = '', collected_by = 'technician',
            technician_id = '', technician_name = '', amount_label = 'payment',
            expire_by_hours = 48, // link expires in 48 hours by default
            disable_upi = false,
        } = body;

        if (!amount || !customer_phone) {
            return NextResponse.json({ success: false, error: 'amount and customer_phone required' }, { status: 400 });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const expireAt = Math.floor(Date.now() / 1000) + (expire_by_hours * 60 * 60);

        const linkPayload = {
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            accept_partial: false,
            description: description || `Payment for service · Job ${job_id || ''}`,
            customer: {
                name: customer_name || 'Customer',
                contact: `+91${customer_phone.replace(/^\+91/, '').replace(/\D/g, '')}`,
                ...(customer_email ? { email: customer_email } : {}),
            },
            notify: {
                sms: true,
                email: !!customer_email,
            },
            reminder_enable: true,
            expire_by: expireAt,
            notes: {
                job_id: job_id || '',
                account_id: account_id || '',
                invoice_id,
                collected_by,
                technician_id,
                technician_name,
                amount_label,
            },
            ...(disable_upi ? {
                options: {
                    checkout: {
                        method: {
                            netbanking: "1",
                            card: "1",
                            upi: "0",
                            wallet: "1",
                            emi: "0"
                        }
                    }
                }
            } : {})
        };

        const link = await razorpay.paymentLink.create(linkPayload);

        return NextResponse.json({
            success: true,
            short_url: link.short_url,
            link_id: link.id,
            expires_at: new Date(expireAt * 1000).toISOString(),
        });

    } catch (error) {
        console.error('[create-link] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
