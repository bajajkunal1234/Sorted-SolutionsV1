import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { generateAccountSKU } from '@/lib/generateAccountSKU'
import { cleanPhone10, trackLeadAttribution } from '@/lib/lead-tracker'

export const dynamic = 'force-dynamic'

// GET - Fetch all accounts
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type')
        const id = searchParams.get('id')

        if (id) {
            const { data, error } = await supabase
                .from('accounts')
                .select('*, customers:customers(password_hash, image_url)')
                .eq('id', id)
                .single()
            if (error) throw error
            
            if (data.customers && data.customers[0]) {
                data.accountImage = data.customers[0].image_url;
                data.is_claimed = !!data.customers[0].password_hash;
            }
            delete data.customers;
            
            return NextResponse.json({ success: true, data })
        }

        // ── Fast dropdown path: only fields needed for autocomplete ──────────
        const purpose = searchParams.get('purpose');
        if (purpose === 'dropdown') {
            let dropdownQuery = supabase
                .from('accounts')
                .select('id, name, mobile, phone, type, under, gst_applicable, tax_rate')
                .neq('status', 'archived')
                .order('name', { ascending: true })
                .limit(1000);
            if (type && type !== 'all') {
                if (type === 'customer') {
                    dropdownQuery = dropdownQuery.or('type.eq.customer,under.ilike.%customer%,under.ilike.%debtor%');
                } else if (type === 'supplier' || type === 'vendor') {
                    dropdownQuery = dropdownQuery.or('type.eq.supplier,type.eq.vendor,under.ilike.%supplier%,under.ilike.%vendor%,under.ilike.%creditor%');
                } else {
                    dropdownQuery = dropdownQuery.eq('type', type);
                }
            }
            const { data: dropData, error: dropErr } = await dropdownQuery;
            if (dropErr) throw dropErr;
            return NextResponse.json({ success: true, data: dropData });
        }

        let query = supabase
            .from('accounts')
            .select('*, jobs:jobs(count), customers:customers(password_hash, image_url)')
            .order('name', { ascending: true })
            .limit(1000)

        if (type && type !== 'all') {
            if (type === 'customer') {
                query = query.or('type.eq.customer,under.ilike.%customer%,under.ilike.%debtor%')
            } else if (type === 'supplier' || type === 'vendor') {
                query = query.or('type.eq.supplier,type.eq.vendor,under.ilike.%supplier%,under.ilike.%vendor%,under.ilike.%creditor%')
            } else if (type === 'technician') {
                query = query.or('type.eq.technician,under.ilike.%technician%,under.ilike.%creditor%')
            } else if (type === 'payment_method') {
                query = query.or('type.eq.bank,type.eq.cash,under.ilike.%bank%,under.ilike.%cash%')
            } else {
                query = query.eq('type', type)
            }
        }

        const includeArchived = searchParams.get('include_archived') === '1' || searchParams.get('include_archived') === 'true';
        if (!includeArchived) {
            query = query.neq('status', 'archived');
        }

        const { data, error } = await query

        if (error) throw error

        const enrichedData = data.map(account => {
            const customerData = account.customers && account.customers[0];
            const isOrganicCustomer = !!customerData?.password_hash;
            const strictSource = isOrganicCustomer ? 'Customer Signup' : 'Admin';

            // Keep the raw acquisition source intact for marketing purposes, but decouple it from the Created By metric
            const acqSource = account.acquisition_source || account.source || '';

            // Don't leak the password hash to the frontend
            delete account.customers;

            return {
                ...account,
                accountImage: customerData?.image_url || null,
                jobs_done: account.jobs?.[0]?.count || 0,
                jobs: undefined, // Clean up the raw relational object before sending to client
                acquisition_source: acqSource,
                source: strictSource,
                is_claimed: isOrganicCustomer
            };
        });

        return NextResponse.json({ success: true, data: enrichedData }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// List of allowed database columns in the accounts table
const ALLOWED_COLUMNS = [
    'id', 'name', 'type', 'under', 'gstin', 'address', 'opening_balance', 'closing_balance',
    'active', 'created_at', 'updated_at', 'sku', 'alias', 'contact_person', 'mobile',
    'email', 'mailing_name', 'mailing_address', 'billing_address', 'shipping_address',
    'pan', 'state_name', 'country', 'credit_limit', 'credit_period', 'bank_name',
    'account_number', 'ifsc_code', 'branch', 'tax_rate', 'acquisition_source',
    'referred_by', 'properties', 'as_on_date', 'balance_type', 'asset_category',
    'purchase_date', 'purchase_value', 'depreciation_method', 'depreciation_rate',
    'useful_life', 'status', 'micr_code', 'account_type', 'enable_cheque_printing',
    'rounding_method', 'currency', 'gst_applicable'
];

// POST - Create new account
export async function POST(request) {
    try {
        const body = await request.json()

        // Normalize mobile phone number to raw 10 digits
        if (body.mobile) {
            body.mobile = body.mobile.replace(/\D/g, '').slice(-10);
        }

        const isCustomer = body.type === 'customer' ||
            (body.under_name || '').toLowerCase().includes('customer') ||
            (body.under_name || '').toLowerCase().includes('debtor');

        // ── Prevent Duplicate Account Names (Case-Insensitive & Trimmed) ──────────
        if (body.name) {
            const trimmedName = body.name.trim();
            const { data: existingName } = await supabase
                .from('accounts')
                .select('id, name')
                .ilike('name', trimmedName)
                .maybeSingle();

            if (existingName) {
                return NextResponse.json({
                    success: false,
                    error: `An account/ledger with the name "${trimmedName}" already exists. Please choose a unique name.`
                }, { status: 409 });
            }
        }

        // ── Prevent Duplicate Mobile Numbers for Customers ──────────────────────
        if (isCustomer && body.mobile) {
            const { data: existing } = await supabase
                .from('customers')
                .select('id, full_name, name')
                .eq('phone', body.mobile)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ 
                    success: false, 
                    error: `A customer with mobile number ${body.mobile} already exists (${existing.name || existing.full_name || 'Unknown'}). Please use the existing account.` 
                }, { status: 409 });
            }
        }

        // -- Generate SKU server-side using shared utility ----------------
        if (!body.sku || body.sku === '') {
            body.sku = await generateAccountSKU(body.type || '', body.under || '');
        }

        // ── Clean payload to only include actual DB schema columns ──────────────
        const cleanBody = {};
        for (const key of ALLOWED_COLUMNS) {
            if (body[key] !== undefined) {
                if ((key === 'purchase_date' || key === 'as_on_date') && body[key] === '') {
                    cleanBody[key] = null;
                } else {
                    cleanBody[key] = body[key];
                }
            }
        }

        const { data, error } = await supabase
            .from('accounts')
            .insert([cleanBody])
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables (isCustomer already defined above)
        const isTechnician = body.type === 'technician' ||
            (body.under_name || '').toLowerCase().includes('technician') ||
            (body.under_name || '').toLowerCase().includes('creditor');

        if (isCustomer) {
            const formattedAddress = body.mailing_address 
                ? (typeof body.mailing_address === 'string' ? { text: body.mailing_address } : body.mailing_address) 
                : {};
            const { error: customerError } = await supabase.from('customers').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                gstin: body.gstin || '',
                address: formattedAddress,
                properties: body.properties || [],
                ledger_id: data.id
            }, { onConflict: 'ledger_id' });

            if (customerError) throw customerError;

            // Log Call/WhatsApp Lead automatically if channel is selected
            if (body.leadChannel === 'call' || body.leadChannel === 'whatsapp') {
                const rawPhone = cleanPhone10(body.mobile);
                if (rawPhone) {
                    const conversionType = body.leadChannel === 'whatsapp' ? 'manual_whatsapp' : 'manual_call';
                    const leadNotes = body.mailing_address || body.customerDescription || 'Logged automatically during account creation.';
                    try {
                        await trackLeadAttribution(supabase, {
                            phone: rawPhone,
                            conversion_type: conversionType,
                            name: body.name,
                            status: 'converted', // always converted on account creation
                            notes: leadNotes,
                            lead_source: body.acquisitionSource || 'direct',
                            first_contact_at: new Date().toISOString()
                        });
                    } catch (leadError) {
                        console.error('[accounts POST] Lead tracking failed:', leadError.message);
                    }
                }
            }
        } else if (isTechnician) {
            const { error: techError } = await supabase.from('technicians').upsert({
                name: body.name,
                phone: body.mobile || '',
                email: body.email || '',
                ledger_id: data.id,
                status: 'available'
            }, { onConflict: 'ledger_id' });

            if (techError) throw techError;
        }

        // ── Native Property Insertion ─────────────────────────────────────
        if (body.properties && Array.isArray(body.properties) && body.properties.length > 0) {
            for (const p of body.properties) {
                const address = p.address?.trim() || '';
                if (!address) continue;
                
                const { data: newProp } = await supabase
                    .from('properties')
                    .insert({
                        address: address,
                        flat_number: p.flat_number || '',
                        building_name: p.building_name || '',
                        locality: p.locality || '',
                        city: p.city || 'Mumbai',
                        pincode: p.pincode || '',
                        property_type: p.property_type || 'residential'
                    })
                    .select()
                    .single();
                    
                if (newProp) {
                    await supabase
                        .from('customer_properties')
                        .insert({
                            property_id: newProp.id,
                            account_id: data.id,
                            is_active: true
                        });
                }
            }
        }

        // ── Rich creation log ──────────────────────────────────────────────
        const creationDetails = [
            `SKU: ${data.sku}`,
            `Type: ${body.type || 'N/A'}`,
            body.mobile   ? `Phone: ${body.mobile}`   : null,
            body.email    ? `Email: ${body.email}`     : null,
            body.gstin    ? `GSTIN: ${body.gstin}`     : null,
            body.status   ? `Status: ${body.status}`   : null,
        ].filter(Boolean).join(' · ');

        logInteractionServer({
            type: 'account-created',
            category: 'account',
            customerId: data.id,
            customerName: data.name,
            performedByName: 'Admin',
            description: `Account created — ${data.name} · ${creationDetails}`,
            source: 'Admin App'
        });

        return NextResponse.json({ success: true, data }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update account
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        // ── Prevent Duplicate Account Names on Update (Case-Insensitive & Trimmed) ──
        if (updates.name) {
            const trimmedName = updates.name.trim();
            const { data: existingName } = await supabase
                .from('accounts')
                .select('id, name')
                .ilike('name', trimmedName)
                .neq('id', id)
                .maybeSingle();

            if (existingName) {
                return NextResponse.json({
                    success: false,
                    error: `Another account/ledger with the name "${trimmedName}" already exists. Please choose a unique name.`
                }, { status: 409 });
            }
        }

        // Normalize mobile phone number to raw 10 digits
        if (updates.mobile) {
            updates.mobile = updates.mobile.replace(/\D/g, '').slice(-10);
        }

        // Fetch the current state BEFORE updating so we can diff it
        const { data: before } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', id)
            .single()

        // ── Clean updates to only include actual DB schema columns ──────────────
        const cleanUpdates = {};
        for (const key of ALLOWED_COLUMNS) {
            if (updates[key] !== undefined) {
                if ((key === 'purchase_date' || key === 'as_on_date') && updates[key] === '') {
                    cleanUpdates[key] = null;
                } else {
                    cleanUpdates[key] = updates[key];
                }
            }
        }

        const { data, error } = await supabase
            .from('accounts')
            .update(cleanUpdates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Sync with customers/technicians tables
        const isCustomer = (updates.type === 'customer' || data.type === 'customer') ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('customer')) ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('debtor'));

        const isTechnician = (updates.type === 'technician' || data.type === 'technician') ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('technician')) ||
            ((updates.under_name || data.under_name || '').toLowerCase().includes('creditor'));

        if (isCustomer) {
            const rawAddress = updates.mailing_address !== undefined ? updates.mailing_address : data.mailing_address;
            const formattedAddress = rawAddress 
                ? (typeof rawAddress === 'string' ? { text: rawAddress } : rawAddress) 
                : {};
            const { error: customerError } = await supabase.from('customers').upsert({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email,
                gstin: updates.gstin || data.gstin,
                address: formattedAddress,
                properties: updates.properties || data.properties,
                ledger_id: id
            }, { onConflict: 'ledger_id' });

            if (customerError) throw customerError;
        } else if (isTechnician) {
            const { error: techError } = await supabase.from('technicians').upsert({
                name: updates.name || data.name,
                phone: updates.mobile || data.mobile,
                email: updates.email || data.email,
                ledger_id: id,
                status: 'available'
            }, { onConflict: 'ledger_id' });

            if (techError) throw techError;
        }

        // ── Build a per-field diff log ─────────────────────────────────────
        const TRACKED_FIELDS = {
            name:            'Name',
            mobile:          'Phone',
            email:           'Email',
            status:          'Status',
            type:            'Type',
            gstin:           'GSTIN',
            pan:             'PAN',
            credit_limit:    'Credit Limit',
            credit_period:   'Credit Period',
            opening_balance: 'Opening Balance',
            balance_type:    'Balance Type',
            under:           'Group',
            mailing_address: 'Address',
        };

        const changed = [];
        if (before) {
            Object.entries(TRACKED_FIELDS).forEach(([field, label]) => {
                const oldVal = before[field];
                const newVal = updates[field];
                if (newVal !== undefined) {
                    const oldStr = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
                    const newStr = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');
                    if (oldStr !== newStr) {
                        changed.push(`${label}: "${oldStr}" → "${newStr}"`);
                    }
                }
            });
        }

        const diffSummary = changed.length > 0
            ? `Changed: ${changed.join(' | ')}`
            : 'No tracked fields changed (internal fields updated)';

        logInteractionServer({
            type: 'account-edited',
            category: 'account',
            customerId: id,
            customerName: data.name,
            performedByName: 'Admin',
            description: `Account edited — ${data.name} (${data.sku || ''}) · ${diffSummary}`,
            source: 'Admin App'
        });

        return NextResponse.json({ success: true, data }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            }
        })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete account
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 })
        }

        // Check ALL dependencies in parallel
        const [
            technicianRows,
            jobRows,
            salesRows,
            purchaseRows,
            quotationRows,
            receiptRows,
            paymentRows,
        ] = await Promise.all([
            supabase.from('technicians').select('id, name').eq('ledger_id', id),
            supabase.from('jobs').select('id, job_number').eq('customer_id', id).limit(5),
            supabase.from('sales_invoices').select('id, invoice_number').eq('account_id', id).limit(5),
            supabase.from('purchase_invoices').select('id, invoice_number').eq('account_id', id).limit(5),
            supabase.from('quotations').select('id, quote_number').eq('account_id', id).limit(5),
            supabase.from('receipt_vouchers').select('id, receipt_number').eq('account_id', id).limit(5),
            supabase.from('payment_vouchers').select('id, payment_number').eq('account_id', id).limit(5),
        ])

        // Build a clear dependency list
        const blocking = []

        if (technicianRows.data?.length > 0) {
            blocking.push({
                type: 'Technician Profile',
                records: technicianRows.data.map(r => r.name),
            })
        }
        if (jobRows.data?.length > 0) {
            blocking.push({
                type: 'Jobs',
                records: jobRows.data.map(r => r.job_number || r.id),
            })
        }
        if (salesRows.data?.length > 0) {
            blocking.push({
                type: 'Sales Invoices',
                records: salesRows.data.map(r => r.invoice_number || r.id),
                action: 'Delete or reassign these sales invoices under Accounts → Sales tab first.'
            })
        }
        if (purchaseRows.data?.length > 0) {
            blocking.push({
                type: 'Purchase Invoices',
                records: purchaseRows.data.map(r => r.invoice_number || r.id),
                action: 'Delete or reassign these purchase invoices under Accounts → Purchases tab first.'
            })
        }
        if (quotationRows.data?.length > 0) {
            blocking.push({
                type: 'Quotations',
                records: quotationRows.data.map(r => r.quote_number || r.id),
                action: 'Delete or reassign these quotations under Accounts → Quotations tab first.'
            })
        }
        if (receiptRows.data?.length > 0) {
            blocking.push({
                type: 'Receipt Vouchers',
                records: receiptRows.data.map(r => r.receipt_number || r.id),
                action: 'Delete these receipts under Accounts → Receipts tab first.'
            })
        }
        if (paymentRows.data?.length > 0) {
            blocking.push({
                type: 'Payment Vouchers',
                records: paymentRows.data.map(r => r.payment_number || r.id),
                action: 'Delete these payments under Accounts → Payments tab first.'
            })
        }

        if (blocking.length > 0) {
            const summary = blocking
                .map(b => `${b.records.length} ${b.type}`)
                .join(', ')

            return NextResponse.json({
                success: false,
                error: `Cannot delete — this account has active dependencies: ${summary}`,
                blocking,
            }, { status: 400 })
        }

        // No dependencies — safe to delete. Capture account details BEFORE deletion.
        const { data: accountToDelete } = await supabase
            .from('accounts')
            .select('name, sku, mobile, type, email')
            .eq('id', id)
            .single()

        // ── Log deletion BEFORE removing the record ────────────────────────
        logInteractionServer({
            type: 'account-deleted',
            category: 'account',
            customerId: id,
            customerName: accountToDelete?.name || id,
            performedByName: 'Admin',
            description: `Account deleted — ${accountToDelete?.name || 'Unknown'} (SKU: ${accountToDelete?.sku || 'N/A'}, Type: ${accountToDelete?.type || 'N/A'}${accountToDelete?.mobile ? `, Phone: ${accountToDelete.mobile}` : ''})`,
            source: 'Admin App'
        });

        const { error } = await supabase
            .from('accounts')
            .delete()
            .eq('id', id)

        if (error) throw error

        // If this was a customer account, also remove from the customers table
        // so the phone number is freed up for future signups
        if (accountToDelete?.type === 'customer' && accountToDelete?.mobile) {
            const mobile = accountToDelete.mobile.replace(/\D/g, '').slice(-10)
            await supabase
                .from('customers')
                .delete()
                .or(`phone.eq.${mobile},phone.eq.+91${mobile}`)
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

