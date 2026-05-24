import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/customer/lookup?phone=9876543210
 * 
 * Looks up a customer by phone number.
 * Returns the customer ID and profile_complete status for auto-login.
 * Used by the booking wizard as a fallback when the booking API
 * fails to return a customerAuthId.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawPhone = (searchParams.get('phone') || '').replace(/\D/g, '').slice(-10);

        if (rawPhone.length !== 10) {
            return NextResponse.json({ success: false, error: 'Invalid phone number' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Service unavailable' }, { status: 503 });
        }

        // Fuzzy phone search (handles +91-XXXXX XXXXX, 10-digit, etc.)
        const loosePattern = '%' + rawPhone.split('').join('%') + '%';
        const { data: candidates, error } = await supabase
            .from('customers')
            .select('id, phone, profile_complete, full_name, name')
            .ilike('phone', loosePattern)
            .limit(20);

        if (error) {
            console.error('[customer/lookup] DB error:', error.message);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const customer = (candidates || []).find(
            c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === rawPhone
        );

        if (!customer) {
            return NextResponse.json({ success: false, error: 'Customer not found' });
        }

        return NextResponse.json({
            success: true,
            customerId: customer.id,
            profile_complete: customer.profile_complete,
            name: customer.name || customer.full_name || '',
        });
    } catch (err) {
        console.error('[customer/lookup] error:', err.message);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
