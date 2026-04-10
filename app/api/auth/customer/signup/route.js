import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createServerSupabase } from '@/lib/supabase-server';
import { generateAccountSKU } from '@/lib/generateAccountSKU';

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

        // ── Check duplicates & Admin Claims ──────────────────────────────────
        const { data: existingPhone } = await supabase
            .from('customers')
            .select('id, ledger_id, password_hash, full_name')
            .eq('phone', phone)
            .maybeSingle();

        if (existingPhone) {
            if (existingPhone.password_hash) {
                return NextResponse.json(
                    { success: false, error: 'This phone number is already registered. Please log in.' },
                    { status: 409 }
                );
            } else {
                // Admin-created account -> CLAIM IT
                const password_hash = await bcrypt.hash(password, 12);
                
                // Update customers table
                await supabase.from('customers').update({
                    full_name: name.trim(),
                    name: name.trim(),
                    username: cleanUsername,
                    password_hash,
                    profile_complete: true
                }).eq('id', existingPhone.id);

                // Update accounts table name
                if (existingPhone.ledger_id) {
                    await supabase.from('accounts').update({ 
                        name: name.trim(),
                        source: 'Customer Signup'
                    }).eq('id', existingPhone.ledger_id);
                    
                    // Log Interaction
                    await supabase.from('interactions').insert([{
                        type: 'account-claimed',
                        category: 'account',
                        customer_id: existingPhone.ledger_id,
                        customer_name: name.trim(),
                        performed_by_name: name.trim(),
                        description: `Customer claimed their admin-created account via website signup.`,
                        source: 'Website Signup'
                    }]);
                }

                return NextResponse.json({
                    success: true,
                    customer: {
                        id: existingPhone.id,
                        name: name.trim(),
                        username: cleanUsername,
                        phone: phone,
                        role: 'customer',
                        profile_complete: true,
                        ledger_id: existingPhone.ledger_id,
                    },
                });
            }
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
                name: name.trim(),
                username: cleanUsername,
                password_hash,
                customer_type: 'one_time',
                profile_complete: false,
            }])
            .select('id, phone, full_name, username')
            .single();

        if (insertError) throw insertError;

        // -- Normalise phone and generate SKU for the new account
        const last10 = phone.replace(/\D/g, '').slice(-10);
        const newSKU = await generateAccountSKU('customer', 'sundry-debtors');

        const { data: accountEntry, error: accountError } = await supabase
            .from('accounts')
            .insert([{
                name: name.trim(),
                mobile: last10,
                type: 'customer',
                under: 'sundry-debtors',
                source: 'Customer Signup',
                sku: newSKU,
                opening_balance: 0,
                balance_type: 'debit',
                status: 'active',
                created_at: new Date().toISOString(),
            }])
            .select('id')
            .single();

        if (accountError) {
            // Rollback: delete the orphan customers row before failing
            await supabase.from('customers').delete().eq('id', customer.id);
            console.error('[signup] Failed to create accounts entry, rolled back customer:', accountError.message);
            return NextResponse.json({ success: false, error: 'Failed to set up account. Please try again.' }, { status: 500 });
        }

        // Link ledger_id back to customer row
        let ledgerId = null;
        if (accountEntry?.id) {
            ledgerId = accountEntry.id;
            await supabase.from('customers').update({ ledger_id: ledgerId }).eq('id', customer.id);
        }

        return NextResponse.json({
            success: true,
            customer: {
                id: customer.id,
                name: customer.full_name,
                username: customer.username,
                phone: customer.phone,
                role: 'customer',
                profile_complete: false,
                ledger_id: ledgerId,
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
