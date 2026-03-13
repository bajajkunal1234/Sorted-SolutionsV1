import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import bcrypt from 'bcryptjs'

// ─── GET: check if a phone number already has an account ────────────────────
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')
        if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

        const last10 = phone.replace(/\D/g, '').slice(-10)

        // Check technicians first — technician phones should never be allowed to sign up as customers
        const { data: techData } = await supabase
            .from('technicians')
            .select('id')
            .or(`phone.eq.${last10},phone.eq.+91${last10}`)
            .limit(1)
            .maybeSingle()

        if (techData) {
            // Treat as "exists" so signup flow blocks this number
            return NextResponse.json({ exists: true, isTechnician: true })
        }

        const { data } = await supabase
            .from('customers')
            .select('id, name, phone')
            .or(`phone.eq.${last10},phone.eq.+91${last10}`)
            .limit(1)
            .maybeSingle()

        return NextResponse.json({ exists: !!data, hasPassword: !!(data && data.password_hash !== undefined) })
    } catch {
        return NextResponse.json({ exists: false })
    }
}

// ─── POST: signup | login | reset-password | otp-sync (legacy) ──────────────
export async function POST(request) {
    try {
        const body = await request.json()
        const { action } = body

        // ── 1. SIGNUP ─────────────────────────────────────────────────────────
        if (action === 'signup') {
            const { phone, password, name } = body
            if (!phone || !password) return NextResponse.json({ error: 'Phone and password required' }, { status: 400 })

            const last10 = phone.replace(/\D/g, '').slice(-10)

            // Block technician phones from creating customer accounts
            const { data: existingTech } = await supabase
                .from('technicians')
                .select('id')
                .or(`phone.eq.${last10},phone.eq.+91${last10}`)
                .limit(1)
                .maybeSingle()

            if (existingTech) {
                return NextResponse.json({ error: 'This number is already registered as a technician account. Please use the technician login portal.' }, { status: 409 })
            }

            // Check not already registered as customer
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .or(`phone.eq.${last10},phone.eq.+91${last10}`)
                .limit(1)
                .maybeSingle()

            if (existing) {
                return NextResponse.json({ error: 'An account with this number already exists. Please log in.' }, { status: 409 })
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12)
            const customerName = name || `Customer ${last10.slice(-4)}`

            // Create customer
            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert({
                    phone: last10,
                    name: customerName,
                    password_hash: passwordHash,
                    profile_complete: false,
                    created_at: new Date().toISOString(),
                })
                .select()
                .single()

            if (createError) {
                console.error('Signup create error:', createError)
                return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
            }

            // Create Sundry Debtor entry in accounts table
            const { data: accountEntry, error: accountError } = await supabase
                .from('accounts')
                .insert({
                    name: customerName,
                    mobile: last10,
                    type: 'customer',
                    under: 'Sundry Debtors',
                    opening_balance: 0,
                    balance_type: 'debit',
                    created_at: new Date().toISOString(),
                })
                .select('id')
                .single()

            if (accountError) {
                // Rollback: delete the orphan customers row before failing
                await supabase.from('customers').delete().eq('id', newCustomer.id)
                console.error('[Signup] Failed to create accounts entry, rolled back customer:', accountError.message)
                return NextResponse.json({ success: false, error: 'Failed to set up account. Please try again.' }, { status: 500 })
            }

            // Link ledger_id back to customer
            if (accountEntry?.id) {
                await supabase
                    .from('customers')
                    .update({ ledger_id: accountEntry.id })
                    .eq('id', newCustomer.id)
            }

            logInteractionServer({
                type: 'account-created-website',
                category: 'account',
                customerId: String(newCustomer.id),
                customerName,
                description: `New customer signed up via mobile+password (${last10})`,
                source: 'Customer App',
            })

            const { password_hash, ...safeUser } = newCustomer
            return NextResponse.json({ success: true, user: { ...safeUser, role: 'customer', profile_complete: false, ledger_id: accountEntry?.id || null }, message: 'Account created' })
        }

        // ── 2. LOGIN ──────────────────────────────────────────────────────────
        if (action === 'login') {
            const { phone, identifier, password } = body
            const raw = (identifier || phone || '').trim()
            if (!raw || !password) return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })

            const last10 = raw.replace(/\D/g, '').slice(-10)

            // ── Check technicians FIRST by phone ──
            const { data: technician } = await supabase
                .from('technicians')
                .select('*')
                .or(`phone.eq.${last10},phone.eq.+91${last10}`)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle()

            if (technician && technician.password_hash) {
                const techValid = technician.password_hash.startsWith('$2')
                    ? await bcrypt.compare(password, technician.password_hash)
                    : technician.password_hash === password

                if (techValid) {
                    const { password_hash, ...safeTech } = technician
                    return NextResponse.json({ success: true, user: { ...safeTech, role: 'technician' }, message: 'Login successful' })
                }
                return NextResponse.json({ error: 'Incorrect password. Try again.' }, { status: 401 })
            }

            // ── Check if Admin ──
            const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean)
            if (adminPhones.includes(last10)) {
                // Verify admin password
                const adminPass = process.env.ADMIN_PASSWORD || 'admin123'
                if (password !== adminPass) {
                    return NextResponse.json({ error: 'Incorrect admin password.' }, { status: 401 })
                }
                
                logInteractionServer({ type: 'admin-login', category: 'account', customerId: 'admin', customerName: 'Admin', description: `Admin logged in (${last10})`, source: 'Admin Portal' })
                
                // Return fake user object for admin
                return NextResponse.json({ 
                    success: true, 
                    user: { id: 'admin-id', name: 'Admin', phone: last10, role: 'admin', profile_complete: true }, 
                    message: 'Login successful' 
                })
            }

            // ── Fall through to customer lookup ──
            const { data: customer } = await supabase
                .from('customers')
                .select('*')
                .or(`phone.eq.${last10},phone.eq.+91${last10}`)
                .limit(1)
                .maybeSingle()

            if (!customer) return NextResponse.json({ error: 'No account found with this number. Please sign up.' }, { status: 404 })
            if (!customer.password_hash) return NextResponse.json({ error: 'This account was created via OTP. Use OTP to login or reset your password first.' }, { status: 400 })

            const isValid = await bcrypt.compare(password, customer.password_hash)
            if (!isValid) return NextResponse.json({ error: 'Incorrect password. Try again or use Forgot Password.' }, { status: 401 })

            logInteractionServer({ type: 'customer-login', category: 'account', customerId: String(customer.id), customerName: customer.name || customer.phone, description: 'Customer logged in via mobile+password', source: 'Customer App' })

            const { password_hash, ...safeUser } = customer
            return NextResponse.json({ success: true, user: { ...safeUser, role: 'customer', profile_complete: customer.profile_complete ?? false }, message: 'Login successful' })
        }

        // ── 3. RESET PASSWORD (OTP already verified on client) ────────────────
        if (action === 'reset-password') {
            const { phone, password } = body
            if (!phone || !password) return NextResponse.json({ error: 'Phone and password required' }, { status: 400 })

            const last10 = phone.replace(/\D/g, '').slice(-10)

            const { data: customer } = await supabase
                .from('customers')
                .select('id, name')
                .or(`phone.eq.${last10},phone.eq.+91${last10}`)
                .limit(1)
                .single()

            if (!customer) {
                return NextResponse.json({ error: 'No account found with this number.' }, { status: 404 })
            }

            const passwordHash = await bcrypt.hash(password, 12)
            await supabase
                .from('customers')
                .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
                .eq('id', customer.id)

            logInteractionServer({
                type: 'password-reset',
                category: 'account',
                customerId: String(customer.id),
                customerName: customer.name || last10,
                description: `Customer reset password via OTP (${last10})`,
                source: 'Customer App',
            })

            return NextResponse.json({ success: true, message: 'Password updated successfully' })
        }

        // ── 4. LEGACY OTP SYNC (Technician / Admin OTP login) ─────────────────
        const { firebaseUid, phoneNumber } = body

        if (!firebaseUid || !phoneNumber) {
            return NextResponse.json({ error: 'Invalid action or missing fields' }, { status: 400 })
        }

        let user = null
        let role = ''

        const { data: customerByUid } = await supabase
            .from('customers')
            .select('*')
            .eq('firebase_uid', firebaseUid)
            .single()

        if (customerByUid) {
            user = customerByUid; role = 'customer'
        } else {
            const { data: techByUid } = await supabase
                .from('technicians')
                .select('*')
                .eq('firebase_uid', firebaseUid)
                .single()
            if (techByUid) { user = techByUid; role = 'technician' }
        }

        if (!user) {
            const cleanPhone = phoneNumber.replace(/\s/g, '')
            const last10 = cleanPhone.slice(-10)
            const findByPhone = async (table) => {
                const { data } = await supabase.from(table).select('*').or(`phone.eq.${phoneNumber},phone.eq.${cleanPhone},phone.ilike.%${last10}`).limit(1).single()
                return data
            }
            const cByPhone = await findByPhone('customers')
            if (cByPhone) {
                const { data: u } = await supabase.from('customers').update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() }).eq('id', cByPhone.id).select().single()
                user = u; role = 'customer'
            } else {
                const tByPhone = await findByPhone('technicians')
                if (tByPhone) {
                    const { data: u } = await supabase.from('technicians').update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() }).eq('id', tByPhone.id).select().single()
                    user = u; role = 'technician'
                }
            }
        }

        if (!user) {
            // Check if this is an admin phone
            const ADMIN_PHONES = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim())
            const incomingLast10 = phoneNumber.replace(/\D/g, '').slice(-10)
            if (ADMIN_PHONES.includes(incomingLast10)) {
                return NextResponse.json({ success: true, user: { id: 'admin-' + incomingLast10, name: 'Admin', phone: incomingLast10, role: 'admin' } })
            }
            // New customer via OTP (fallback)
            const { data: newC, error: ce } = await supabase.from('customers').insert({ firebase_uid: firebaseUid, phone: phoneNumber, name: `Customer ${phoneNumber.slice(-4)}`, created_at: new Date().toISOString() }).select().single()
            if (ce) return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
            user = newC; role = 'customer'
        }

        const { password_hash, ...userData } = user
        return NextResponse.json({ success: true, user: { ...userData, role }, message: 'Authentication successful' })

    } catch (error) {
        console.error('Auth API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
