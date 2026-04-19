import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/customer/fcm-token
 * Body: { customer_id, fcm_token }
 * Saves or updates the FCM web push token for a customer.
 */
export async function PATCH(request) {
    const supabase = createServerSupabase();
    try {
        const { customer_id, fcm_token } = await request.json();
        if (!customer_id || !fcm_token) {
            return NextResponse.json({ success: false, error: 'customer_id and fcm_token required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('customers')
            .update({ fcm_token })
            .eq('id', customer_id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PATCH /api/technician/fcm-token (reuse same handler via query param for technicians)
 */
export async function POST(request) {
    const supabase = createServerSupabase();
    try {
        const { technician_id, fcm_token } = await request.json();
        if (!technician_id || !fcm_token) {
            return NextResponse.json({ success: false, error: 'technician_id and fcm_token required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('technicians')
            .update({ fcm_token })
            .eq('id', technician_id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

/**
 * PUT /api/customer/fcm-token
 * Saves FCM token for an admin user into admin_recipients table.
 * Body: { fcm_token, name? }
 */
export async function PUT(request) {
    const supabase = createServerSupabase();
    try {
        const { fcm_token, name } = await request.json();
        if (!fcm_token) {
            return NextResponse.json({ success: false, error: 'fcm_token required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('admin_recipients')
            .upsert({ fcm_token, name: name || 'Admin' }, { onConflict: 'fcm_token' });

        if (error) {
            if (error.code === 'PGRST205') {
                return NextResponse.json({ success: true, warning: 'admin_recipients table not found - push notifications disabled' });
            }
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
