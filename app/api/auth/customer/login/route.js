import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/customer/login
 * Body: { identifier, password }
 * identifier = phone number OR username
 */
export async function POST(request) {
    const supabase = createServerSupabase();
    try {
        const { identifier, password } = await request.json();

        if (!identifier || !password) {
            return NextResponse.json(
                { success: false, error: 'Phone/username and password are required.' },
                { status: 400 }
            );
        }

        // ── Look up by phone or username ─────────────────────────────────────
        const clean = identifier.trim().toLowerCase();
        const isPhone = /^[\d+\s\-()]+$/.test(identifier.trim());

        let query = supabase
            .from('customers')
            .select('id, phone, full_name, username, password_hash, customer_type');

        if (isPhone) {
            // Strip non-digits for flexible matching
            const digitsOnly = identifier.replace(/\D/g, '');
            query = query.or(`phone.eq.${identifier.trim()},phone.eq.${digitsOnly}`);
        } else {
            query = query.eq('username', clean);
        }

        const { data: customer, error: lookupError } = await query.maybeSingle();

        if (lookupError) throw lookupError;

        if (!customer || !customer.password_hash) {
            return NextResponse.json(
                { success: false, error: 'No account found. Please sign up first.' },
                { status: 404 }
            );
        }

        // ── Verify password ──────────────────────────────────────────────────
        const match = await bcrypt.compare(password, customer.password_hash);
        if (!match) {
            return NextResponse.json(
                { success: false, error: 'Incorrect password. Please try again.' },
                { status: 401 }
            );
        }

        // ── Return session data ──────────────────────────────────────────────
        return NextResponse.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.full_name,
                username: customer.username,
                phone: customer.phone,
                role: 'customer',
            },
        });
    } catch (error) {
        console.error('[login] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Login failed.' },
            { status: 500 }
        );
    }
}
