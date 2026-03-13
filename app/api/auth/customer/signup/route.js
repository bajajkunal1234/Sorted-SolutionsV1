import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/customer/signup
 * Body: { phone, name, username, password }
 * 
 * Creates a new customer record. Phone must be verified by Firebase OTP
 * on the client before calling this endpoint.
 */
export async function POST(request) {
    const supabase = createServerSupabase();
    try {
        const { phone, name, username, password } = await request.json();

        // ── Validation ───────────────────────────────────────────────────────
        if (!phone || !name || !username || !password) {
            return NextResponse.json(
                { success: false, error: 'All fields are required.' },
                { status: 400 }
            );
        }
        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 6 characters.' },
                { status: 400 }
            );
        }
        const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '');
        if (cleanUsername.length < 3) {
            return NextResponse.json(
                { success: false, error: 'Username must be at least 3 characters.' },
                { status: 400 }
            );
        }

        // ── Check duplicates ─────────────────────────────────────────────────
        const { data: existingPhone } = await supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .maybeSingle();

        if (existingPhone) {
            return NextResponse.json(
                { success: false, error: 'This phone number is already registered. Please log in.' },
                { status: 409 }
            );
        }

        const { data: existingUsername } = await supabase
            .from('customers')
            .select('id')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (existingUsername) {
            return NextResponse.json(
                { success: false, error: 'This username is already taken. Please choose another.' },
                { status: 409 }
            );
        }

        // ── Hash password & create customer ──────────────────────────────────
        const password_hash = await bcrypt.hash(password, 12);

        const { data: customer, error: insertError } = await supabase
            .from('customers')
            .insert([{
                phone,
                full_name: name.trim(),
                username: cleanUsername,
                password_hash,
                customer_type: 'one_time',
                profile_complete: false,
            }])
            .select('id, phone, full_name, username')
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.full_name,
                username: customer.username,
                phone: customer.phone,
                role: 'customer',
                profile_complete: false,
            },
        });
    } catch (error) {
        console.error('[signup] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Signup failed.' },
            { status: 500 }
        );
    }
}
