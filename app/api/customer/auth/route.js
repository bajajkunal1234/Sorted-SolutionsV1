import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const { firebaseUid, phoneNumber } = await request.json()

        if (!firebaseUid || !phoneNumber) {
            return NextResponse.json(
                { error: 'Firebase UID and phone number are required' },
                { status: 400 }
            )
        }

        let user = null;
        let role = '';

        // 1. Try to find user by Firebase UID in both tables
        // Check Customers
        const { data: customerByUid } = await supabase
            .from('customers')
            .select('*')
            .eq('firebase_uid', firebaseUid)
            .single();

        if (customerByUid) {
            user = customerByUid;
            role = 'customer';
        } else {
            // Check Technicians
            const { data: techByUid } = await supabase
                .from('technicians')
                .select('*')
                .eq('firebase_uid', firebaseUid)
                .single();

            if (techByUid) {
                user = techByUid;
                role = 'technician';
            }
        }

        // 2. If not found by UID, try to find by phone number
        if (!user) {
            // Normalize phone number for searching (remove spaces, etc from the search target if possible)
            // But since we can't easily normalize the whole DB column in a query without RPC, 
            // we'll try a few common formats or a like query.
            const cleanPhone = phoneNumber.replace(/\s/g, ''); // +919876543210
            const last10 = cleanPhone.slice(-10); // 9876543210

            // Helper to find user by normalized phone
            const findByPhone = async (table) => {
                // Try exact match
                const { data } = await supabase.from(table).select('*').or(`phone.eq.${phoneNumber},phone.eq.${cleanPhone},phone.ilike.%${last10}`).limit(1).single();
                return data;
            };

            const customerByPhone = await findByPhone('customers');
            if (customerByPhone) {
                const { data: updatedCustomer } = await supabase
                    .from('customers')
                    .update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() })
                    .eq('id', customerByPhone.id)
                    .select()
                    .single();
                user = updatedCustomer;
                role = 'customer';
            } else {
                const techByPhone = await findByPhone('technicians');
                if (techByPhone) {
                    const { data: updatedTech } = await supabase
                        .from('technicians')
                        .update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() })
                        .eq('id', techByPhone.id)
                        .select()
                        .single();
                    user = updatedTech;
                    role = 'technician';
                }
            }
        }

        // 3. If still not found, create a new Customer by default
        if (!user) {
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    firebase_uid: firebaseUid,
                    phone: phoneNumber,
                    name: `Customer ${phoneNumber.slice(-4)}`,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating customer:', createError);
                return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
            }

            user = newCustomer;
            role = 'customer';
        }

        // Remove sensitive fields
        const { password_hash, ...userData } = user;

        return NextResponse.json({
            success: true,
            user: {
                ...userData,
                role: role
            },
            message: 'Authentication successful'
        });

    } catch (error) {
        console.error('Error in auth sync API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
