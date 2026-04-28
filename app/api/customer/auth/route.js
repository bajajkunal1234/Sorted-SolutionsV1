import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import bcrypt from 'bcryptjs'

// ─── Shared helper: find a customer row matching any phone format ─────────────
// Strips ALL non-digits from the stored phone and compares against last10.
// This handles formats like '+91-80078 89260', '+91 8007889260', '08007889260', etc.
async function findCustomerByPhone(supabase, last10) {
    // Fetch a small candidate pool using the broadest possible SQL filters
    const { data: candidates } = await supabase
        .from('customers')
        .select('id, name, phone, password_hash, ledger_id')
        .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)},phone.ilike.%${last10.slice(-8)}`)
        .limit(20)

    if (!candidates || candidates.length === 0) return null

    // JS-level comparison: strip non-digits and compare last 10
    return candidates.find(c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === last10) || null
}

// Same approach for accounts table (fallback when admin created ledger but no customers row)
async function findAccountByPhone(supabase, last10) {
    const { data: candidates } = await supabase
        .from('accounts')
        .select('id, name, mobile, type, status')
        .or(`mobile.ilike.%${last10.slice(-6)},mobile.ilike.%${last10.slice(-7)},mobile.ilike.%${last10.slice(-8)}`)
        .limit(20)

    if (!candidates || candidates.length === 0) return null

    return candidates.find(c => c.mobile && c.mobile.replace(/\D/g, '').slice(-10) === last10) || null
}

// ─── GET: check if a phone number already has an account ────────────────────
export async function GET(request) {
    try {
        const supabase = createServerSupabase();
        
        const { searchParams } = new URL(request.url)
        const phone = searchParams.get('phone')
        if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

        const last10 = phone.replace(/\D/g, '').slice(-10)

        // Check technicians first — technician phones should never sign up as customers
        const { data: techCandidates } = await supabase
            .from('technicians')
            .select('id, phone')
            .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)}`)
            .limit(10)
        const techData = (techCandidates || []).find(t => t.phone && t.phone.replace(/\D/g, '').slice(-10) === last10)

        if (techData) {
            return NextResponse.json({ exists: true, isTechnician: true, hasPassword: true })
        }

        // Check Admins
        const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean)
        if (adminPhones.includes(last10)) {
            return NextResponse.json({ exists: true, isAdmin: true, hasPassword: true })
        }

        // Check customers table (JS-level digit-strip comparison)
        const data = await findCustomerByPhone(supabase, last10)

        if (data) {
            // For unclaimed accounts (no password yet), enrich with property + job preview
            if (!data.password_hash) {
                const lookupIds = [data.id, data.ledger_id].filter(Boolean)
                const [propRes, jobRes] = await Promise.all([
                    supabase
                        .from('customer_properties')
                        .select('property:properties(flat_number,building_name,address,locality)')
                        .or(lookupIds.map(id => `customer_id.eq.${id}`).join(',') + (data.ledger_id ? `,account_id.eq.${data.ledger_id}` : ''))
                        .eq('is_active', true)
                        .limit(1)
                        .maybeSingle(),
                    supabase
                        .from('jobs')
                        .select('id', { count: 'exact', head: true })
                        .or(lookupIds.map(id => `customer_id.eq.${id}`).join(','))
                ])
                const prop = propRes.data?.property
                const propertyPreview = prop
                    ? [prop.flat_number, prop.building_name, prop.address, prop.locality].filter(Boolean).join(', ')
                    : null
                return NextResponse.json({
                    exists: true,
                    hasPassword: false,
                    existingName: data.name || '',
                    hasProperties: !!prop,
                    propertyCount: prop ? 1 : 0,
                    propertyPreview,
                    hasJobs: (jobRes.count || 0) > 0,
                    jobCount: jobRes.count || 0,
                })
            }
            return NextResponse.json({ exists: true, hasPassword: true, existingName: data?.name || '' })
        }

        // ── FALLBACK: check accounts table (admin may have created ledger only, no customers row yet) ──
        const account = await findAccountByPhone(supabase, last10)
        if (account) {
            // Account exists in ledger but customer hasn't claimed it yet
            return NextResponse.json({
                exists: true,
                hasPassword: false,
                existingName: account.name || '',
                isLedgerOnly: true, // flag so signup creates customers row linked to this account
                ledgerId: account.id,
                hasProperties: false,
                hasJobs: false,
            })
        }

        return NextResponse.json({ exists: false })
    } catch (e) {
        console.error('[auth GET]', e)
        return NextResponse.json({ exists: false })
    }
}


// ─── POST: signup | login | reset-password | otp-sync (legacy) ──────────────
export async function POST(request) {
    try {
        const supabase = createServerSupabase();
        
        const body = await request.json()
        const { action } = body

        // ── 1. SIGNUP ─────────────────────────────────────────────────────────
        if (action === 'signup') {
            const { phone, password, name } = body
            if (!phone || !password) return NextResponse.json({ error: 'Phone and password required' }, { status: 400 })

            const last10 = phone.replace(/\D/g, '').slice(-10)

            const { data: techCandidates } = await supabase
                .from('technicians')
                .select('id, phone')
                .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)}`)
                .limit(10)
            const existingTech = (techCandidates || []).find(t => t.phone && t.phone.replace(/\D/g, '').slice(-10) === last10)

            if (existingTech) {
                return NextResponse.json({ error: 'This number is already registered as a technician account. Please use the technician login portal.' }, { status: 409 })
            }

            // Check not already registered as customer (robust phone format matching)
            let existing = await findCustomerByPhone(supabase, last10)
            let isLedgerOnly = false;
            let ledgerId = null;

            if (!existing) {
                const account = await findAccountByPhone(supabase, last10)
                if (account) {
                    isLedgerOnly = true;
                    ledgerId = account.id;
                    existing = {
                        id: null,
                        password_hash: null,
                        ledger_id: account.id,
                        name: account.name
                    }
                }
            }

            if (existing && !isLedgerOnly) {
                if (existing.password_hash) {
                    return NextResponse.json({ error: 'An account with this number already exists. Please log in.' }, { status: 409 });
                } else {
                    // Account Claim Flow (Organic adoption of Admin-created record)
                    const passwordHash = await bcrypt.hash(password, 12);
                    const customerName = name || existing.name || `Customer ${last10.slice(-4)}`;

                    const { data: updatedCustomer, error: updateError } = await supabase
                        .from('customers')
                        .update({
                            name: customerName,
                            password_hash: passwordHash,
                            phone: last10, // normalize phone to clean 10-digit format on claim
                            profile_complete: false,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id)
                        .select()
                        .single();

                    if (updateError) {
                        return NextResponse.json({ error: 'Failed to claim account.' }, { status: 500 });
                    }

                    if (updatedCustomer.ledger_id) {
                        await supabase
                            .from('accounts')
                            .update({ name: customerName })
                            .eq('id', updatedCustomer.ledger_id);
                    }

                    logInteractionServer({
                        type: 'account-claimed',
                        category: 'account',
                        customerId: String(updatedCustomer.id),
                        customerName,
                        description: `Customer claimed organic access to admin-created account (${last10})`,
                        source: 'Customer App'
                    });

                    const { password_hash: ph, ...safeUser } = updatedCustomer;
                    // is_claim: true tells CustomerApp to show the claim-aware OnboardingWizard variant
                    return NextResponse.json({ success: true, user: { ...safeUser, role: 'customer', profile_complete: false, is_claim: true, ledger_id: updatedCustomer.ledger_id }, message: 'Account registered successfully' });
                }
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12)
            const customerName = name || (existing ? existing.name : null) || `Customer ${last10.slice(-4)}`

            // Create customer
            const insertData = {
                phone: last10,
                name: customerName,
                password_hash: passwordHash,
                profile_complete: false,
                created_at: new Date().toISOString(),
            };
            if (isLedgerOnly && ledgerId) {
                insertData.ledger_id = ledgerId;
            }

            const { data: newCustomer, error: createError } = await supabase
                .from('customers')
                .insert(insertData)
                .select()
                .single()

            if (createError) {
                console.error('Signup create error:', createError)
                return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
            }

            let accountEntryId = ledgerId;

            if (!isLedgerOnly) {
                // The 'customers' group (child of sundry-debtors) always has id='customers' in account_groups.
                // Use it directly — no lookup needed, no fallback to sundry-debtors.
                const customersGroupId = 'customers';

                // Generate Account SKU securely for standard customers automatically
                const { data: existingAccounts } = await supabase
                    .from('accounts')
                    .select('sku')
                    .ilike('sku', 'C%');

                let maxC = 100; // Customer format: C101
                if (existingAccounts && existingAccounts.length > 0) {
                    existingAccounts.forEach(acc => {
                        if (acc.sku) {
                            const numPart = parseInt(acc.sku.substring(1));
                            if (!isNaN(numPart) && numPart > maxC) maxC = numPart;
                        }
                    });
                }
                const nextSku = `C${maxC + 1}`;

                // Create entry in accounts table
                const { data: accountEntry, error: accountError } = await supabase
                    .from('accounts')
                    .insert({
                        name: customerName,
                        sku: nextSku,
                        mobile: last10,
                        type: 'customer',
                        under: customersGroupId,
                        opening_balance: 0,
                        balance_type: 'debit',
                        status: 'active',
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
                accountEntryId = accountEntry.id;

                // Link ledger_id back to customer
                if (accountEntryId) {
                    await supabase
                        .from('customers')
                        .update({ ledger_id: accountEntryId })
                        .eq('id', newCustomer.id)
                }
            } else if (isLedgerOnly && ledgerId) {
                // Just update the ledger name if it was claimed
                await supabase
                    .from('accounts')
                    .update({ name: customerName })
                    .eq('id', ledgerId);
                
                logInteractionServer({
                    type: 'account-claimed',
                    category: 'account',
                    customerId: String(newCustomer.id),
                    customerName,
                    description: `Customer claimed organic access to admin-created ledger account (${last10})`,
                    source: 'Customer App'
                });
            }

            if (!isLedgerOnly) {
                logInteractionServer({
                    type: 'account-created-website',
                    category: 'account',
                    customerId: String(newCustomer.id),
                    customerName,
                    description: `New customer signed up via mobile+password (${last10})`,
                    source: 'Customer App',
                })
            }

            const { password_hash, ...safeUser } = newCustomer
            return NextResponse.json({ success: true, user: { ...safeUser, role: 'customer', profile_complete: false, ledger_id: accountEntryId || null, is_claim: isLedgerOnly }, message: 'Account created' })
        }

        // ── 2. LOGIN ──────────────────────────────────────────────────────────
        if (action === 'login') {
            const { phone, identifier, password } = body
            const raw = (identifier || phone || '').trim()
            if (!raw || !password) return NextResponse.json({ error: 'Phone and password are required' }, { status: 400 })

            const last10 = raw.replace(/\D/g, '').slice(-10)

            // ── Check technicians FIRST by phone ──
            const { data: techCandidates } = await supabase
                .from('technicians')
                .select('*')
                .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)}`)
                .eq('is_active', true)
                .limit(10)
            const technician = (techCandidates || []).find(t => t.phone && t.phone.replace(/\D/g, '').slice(-10) === last10)

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

            // ── Fall through to customer lookup (robust phone format matching) ──
            const customer = await findCustomerByPhone(supabase, last10)

            if (!customer) return NextResponse.json({ error: 'No account found with this number. Please sign up.' }, { status: 404 })
            if (!customer.password_hash) return NextResponse.json({ error: 'This account was created via OTP. Use OTP to login or reset your password first.' }, { status: 400 })

            const isValid = await bcrypt.compare(password, customer.password_hash)
            if (!isValid) return NextResponse.json({ error: 'Incorrect password. Try again or use Forgot Password.' }, { status: 401 })

            logInteractionServer({ type: 'customer-login', category: 'account', customerId: String(customer.id), customerName: customer.name || customer.phone, description: 'Customer logged in via mobile+password', source: 'Customer App' })

            const { password_hash, ...safeUser } = customer
            return NextResponse.json({ success: true, user: { ...safeUser, role: 'customer', profile_complete: customer.profile_complete ?? false }, message: 'Login successful' })
        }

        // ── 3. OTP LOGIN (OTP already verified on client by Firebase) ──────────
        if (action === 'otp-login') {
            const { phone } = body
            if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

            const last10 = phone.replace(/\D/g, '').slice(-10)

            // ── Check technicians FIRST by phone ──
            const { data: techCandidates } = await supabase
                .from('technicians')
                .select('*')
                .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)}`)
                .eq('is_active', true)
                .limit(10)
            const technician = (techCandidates || []).find(t => t.phone && t.phone.replace(/\D/g, '').slice(-10) === last10)


            if (technician) {
                logInteractionServer({ type: 'technician-login-otp', category: 'account', customerId: String(technician.id), customerName: technician.name, description: `Technician logged in via OTP (${last10})`, source: 'Technician App' })
                const { password_hash, ...safeTech } = technician
                return NextResponse.json({ success: true, user: { ...safeTech, role: 'technician' }, message: 'Login successful' })
            }

            // ── Check if Admin ──
            const adminPhones = (process.env.ADMIN_PHONES || '').split(',').map(p => p.trim()).filter(Boolean)
            if (adminPhones.includes(last10)) {
                logInteractionServer({ type: 'admin-login-otp', category: 'account', customerId: 'admin', customerName: 'Admin', description: `Admin logged in via OTP (${last10})`, source: 'Admin Portal' })
                return NextResponse.json({ 
                    success: true, 
                    user: { id: 'admin-id', name: 'Admin', phone: last10, role: 'admin', profile_complete: true }, 
                    message: 'Login successful' 
                })
            }

            // ── Check Customer (robust phone format matching) ──
            let customer = await findCustomerByPhone(supabase, last10)
            
            if (!customer) {
                // Maybe it's a ledger-only account
                const account = await findAccountByPhone(supabase, last10)
                if (account) {
                    return NextResponse.json({
                        error: 'This account has not been set up yet. Please sign up to claim it.',
                        needsClaim: true
                    }, { status: 400 })
                }
                return NextResponse.json({ error: 'No account found with this number. Please sign up.' }, { status: 404 })
            }
            if (!customer.password_hash) {
                // Unclaimed admin-created account — must go through signup/claim flow
                return NextResponse.json({
                    error: 'This account has not been set up yet. Please sign up to claim it.',
                    needsClaim: true
                }, { status: 400 })
            }

            logInteractionServer({
                type: 'customer-login-otp',
                category: 'account',
                customerId: String(customer.id),
                customerName: customer.name || customer.phone,
                description: `Customer logged in via OTP (${last10})`,
                source: 'Customer App'
            })

            const { password_hash, ...safeUser } = customer
            return NextResponse.json({
                success: true,
                user: { ...safeUser, role: 'customer', profile_complete: customer.profile_complete ?? false },
                message: 'Login successful'
            })
        }

        // ── 4. RESET PASSWORD (OTP already verified on client) ────────────────
        if (action === 'reset-password') {
            const { phone, password } = body
            if (!phone || !password) return NextResponse.json({ error: 'Phone and password required' }, { status: 400 })

            const last10 = phone.replace(/\D/g, '').slice(-10)

            const customer = await findCustomerByPhone(supabase, last10)

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
            
            const cByPhone = await findCustomerByPhone(supabase, last10)
            if (cByPhone) {
                const { data: u } = await supabase.from('customers').update({ firebase_uid: firebaseUid, updated_at: new Date().toISOString() }).eq('id', cByPhone.id).select().single()
                user = u; role = 'customer'
            } else {
                const { data: techCandidates } = await supabase
                    .from('technicians')
                    .select('*')
                    .or(`phone.ilike.%${last10.slice(-6)},phone.ilike.%${last10.slice(-7)}`)
                    .limit(10)
                const tByPhone = (techCandidates || []).find(t => t.phone && t.phone.replace(/\D/g, '').slice(-10) === last10)
                
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
