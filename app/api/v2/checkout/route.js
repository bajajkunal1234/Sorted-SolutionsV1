import crypto from 'crypto';
import Razorpay from 'razorpay';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { generateJobNumber } from '@/lib/generateJobNumber';
import { generateAccountSKU } from '@/lib/generateAccountSKU';
import { getNextVoucherNumber } from '@/lib/voucherNumberService';
import { fireNotification } from '@/lib/fire-notification';
import { logInteractionServer } from '@/lib/log-interaction-server';
import { trackLeadAttribution } from '@/lib/lead-tracker';
import { getLocalityForPincode } from '@/lib/data/mumbaiLocalities';
import { calculateCartTotals, normalizeWebServiceItem } from '@/lib/v2/catalogConfig';

export const dynamic = 'force-dynamic';

function getTodayIST() {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
}

async function resolveOrCreateCustomerAndProperty(supabase, { customer, rawPhone10, pincode }) {
    let customerId = null;
    let customerAuthId = null;
    let resolvedPropertyId = null;
    let resolvedPropertyObj = null;

    const customerName =
        (customer?.name || '').trim() ||
        `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
        `Customer ${rawPhone10.slice(-4)}`;

    const cleanLocality =
        (customer?.address?.locality && customer.address.locality !== '__other__'
            ? customer.address.locality
            : customer?.address?.area) ||
        getLocalityForPincode(customer?.address?.pincode || pincode) ||
        pincode ||
        '';

    const loosePattern = '%' + rawPhone10.split('').join('%') + '%';
    const { data: candidates } = await supabase
        .from('customers')
        .select('id, phone, name, ledger_id')
        .ilike('phone', loosePattern)
        .limit(20);

    const existingCustomer =
        (candidates || []).find(
            c => c.phone && c.phone.replace(/\D/g, '').slice(-10) === rawPhone10
        ) || null;

    if (existingCustomer) {
        customerAuthId = existingCustomer.id;
        customerId = existingCustomer.ledger_id || existingCustomer.id;

        if (!existingCustomer.ledger_id) {
            const { data: acct } = await supabase
                .from('accounts')
                .select('id')
                .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
                .maybeSingle();
            if (acct?.id) {
                customerId = acct.id;
                await supabase.from('customers').update({ ledger_id: acct.id }).eq('id', existingCustomer.id);
            }
        }
    } else {
        const { data: existingAccount } = await supabase
            .from('accounts')
            .select('id')
            .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
            .maybeSingle();

        let ledgerId = existingAccount?.id || null;

        if (!ledgerId) {
            let newSKU = null;
            try {
                newSKU = await generateAccountSKU('customer', 'customers');
            } catch (_) {}

            const accountPayload = {
                name: customerName,
                mobile: rawPhone10,
                type: 'customer',
                under: 'customers',
                acquisition_source: 'Website V2 Checkout',
                opening_balance: 0,
                balance_type: 'debit',
                status: 'active',
                mailing_address: [
                    customer?.address?.flat_number,
                    customer?.address?.building_name,
                    customer?.address?.street,
                    cleanLocality,
                    customer?.address?.pincode || pincode,
                ]
                    .filter(Boolean)
                    .join(', '),
                properties: [
                    {
                        id: Date.now(),
                        name: 'Home',
                        flat_number: customer?.address?.flat_number || '',
                        building_name: customer?.address?.building_name || '',
                        address: customer?.address?.street || '',
                        locality: cleanLocality,
                        pincode: customer?.address?.pincode || pincode || '',
                        contactPhone: rawPhone10,
                        contactPerson: customerName,
                    },
                ],
            };
            if (newSKU) accountPayload.sku = newSKU;

            const { data: newAccount, error: accountErr } = await supabase
                .from('accounts')
                .insert(accountPayload)
                .select('id')
                .single();

            if (accountErr && accountErr.code === '23505') {
                const { data: racedAcct } = await supabase
                    .from('accounts')
                    .select('id')
                    .or(`mobile.eq.${rawPhone10},mobile.eq.+91${rawPhone10}`)
                    .maybeSingle();
                ledgerId = racedAcct?.id || null;
            } else if (!accountErr) {
                ledgerId = newAccount?.id || null;
            }
        }

        const autoUsername = `customer_${rawPhone10}`;
        const { data: newCustomer, error: customerCreateErr } = await supabase
            .from('customers')
            .upsert(
                {
                    phone: rawPhone10,
                    name: customerName,
                    full_name: customerName,
                    username: autoUsername,
                    customer_type: 'one_time',
                    profile_complete: true,
                    ledger_id: ledgerId,
                    address: customer?.address || {},
                    properties: [
                        {
                            id: Date.now(),
                            name: 'Home',
                            flat_number: customer?.address?.flat_number || '',
                            building_name: customer?.address?.building_name || '',
                            address: customer?.address?.street || '',
                            locality: cleanLocality,
                            pincode: customer?.address?.pincode || pincode || '',
                            contactPhone: rawPhone10,
                            contactPerson: customerName,
                        },
                    ],
                },
                { onConflict: 'username', ignoreDuplicates: false }
            )
            .select('id')
            .single();

        if (customerCreateErr) {
            const { data: fallbackCx } = await supabase
                .from('customers')
                .select('id')
                .eq('username', autoUsername)
                .maybeSingle();
            if (fallbackCx?.id) customerAuthId = fallbackCx.id;
        } else if (newCustomer?.id) {
            customerAuthId = newCustomer.id;
        }

        customerId = ledgerId || customerAuthId;
    }

    // Resolve or insert property record
    if (customer?.address?.street && customerId) {
        try {
            const { data: existingProps } = await supabase
                .from('customer_properties')
                .select('property_id, property:properties(*)')
                .eq('account_id', customerId);

            const match = (existingProps || []).find(
                cp =>
                    cp.property &&
                    String(cp.property.flat_number || '').trim().toLowerCase() ===
                        String(customer.address.flat_number || '').trim().toLowerCase() &&
                    String(cp.property.building_name || '').trim().toLowerCase() ===
                        String(customer.address.building_name || '').trim().toLowerCase() &&
                    String(cp.property.address || '').trim().toLowerCase() ===
                        String(customer.address.street || '').trim().toLowerCase()
            );

            if (match?.property) {
                resolvedPropertyId = match.property_id;
                resolvedPropertyObj = match.property;
            } else {
                const { data: newProp } = await supabase
                    .from('properties')
                    .insert({
                        address: customer.address.street,
                        flat_number: customer.address.flat_number || '',
                        building_name: customer.address.building_name || '',
                        locality: cleanLocality,
                        city: customer.address.city || 'Mumbai',
                        pincode: customer.address.pincode || pincode || '',
                        property_type: 'residential',
                    })
                    .select()
                    .single();

                if (newProp) {
                    resolvedPropertyId = newProp.id;
                    resolvedPropertyObj = newProp;
                    await supabase.from('customer_properties').insert({
                        property_id: newProp.id,
                        account_id: customerId,
                        is_active: true,
                    });
                }
            }
        } catch (err) {
            console.error('[v2 checkout] property resolution warning:', err.message);
        }
    }

    return {
        customerId,
        customerAuthId,
        customerName,
        cleanLocality,
        resolvedPropertyId,
        resolvedPropertyObj,
    };
}

async function checkSlotAvailability(supabase, schedule) {
    if (!schedule?.date || !schedule?.slot) return { ok: true };

    const { data: slotsConfig } = await supabase
        .from('website_section_configs')
        .select('extra_config')
        .eq('section_id', 'booking-slots')
        .maybeSingle();

    const extra = slotsConfig?.extra_config;
    if (!extra?.templates?.length) return { ok: true };

    const template = extra.templates.find(
        t => (t.name || `${t.startTime} - ${t.endTime}`) === schedule.slot
    );
    if (!template) return { ok: true };

    const dateObj = new Date(`${schedule.date}T00:00:00Z`);
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysOfWeek[dateObj.getUTCDay()];
    const daySlots = extra.overrides?.[schedule.date] || extra.defaultWeeklySchedule?.[dayName] || [];
    const slotCfg = daySlots.find(s => s.templateId === template.id);
    if (!slotCfg?.maxBookings) return { ok: true };

    const { count } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('scheduled_date', schedule.date)
        .eq('scheduled_time', schedule.slot)
        .not('status', 'in', '("cancelled","closed")');

    if (count >= slotCfg.maxBookings) {
        return {
            ok: false,
            error: 'This time slot just filled up. Please choose another slot.',
        };
    }
    return { ok: true };
}

export async function POST(request) {
    const supabase = createServerSupabase();

    try {
        const body = await request.json();
        const { action = 'prepare_order' } = body;

        // ─────────────────────────────────────────────────────────────────────
        // ACTION 1: CONFIRM PAYMENT (after Razorpay Checkout modal succeeds)
        // ─────────────────────────────────────────────────────────────────────
        if (action === 'confirm_payment') {
            const {
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                job_id,
                invoice_id,
                account_id,
                account_name,
                amount,
            } = body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return NextResponse.json(
                    { success: false, error: 'Missing Razorpay verification parameters.' },
                    { status: 400 }
                );
            }

            const secret = process.env.RAZORPAY_KEY_SECRET;
            const generatedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (generatedSignature !== razorpay_signature) {
                return NextResponse.json(
                    { success: false, error: 'Payment signature verification failed.' },
                    { status: 400 }
                );
            }

            // Idempotent receipt voucher check (guards against webhook double-insertion)
            const { data: existingReceipt } = await supabase
                .from('receipt_vouchers')
                .select('id, receipt_number')
                .eq('reference_number', razorpay_payment_id)
                .maybeSingle();

            let receiptRecord = existingReceipt;

            if (!receiptRecord) {
                const receiptNumber =
                    (await getNextVoucherNumber('receipt')) ||
                    `RCP-V2-${Date.now().toString().slice(-6)}`;

                const paidAmount = Number(amount) || 0;

                const { data: createdReceipt, error: receiptErr } = await supabase
                    .from('receipt_vouchers')
                    .insert({
                        receipt_number: receiptNumber,
                        account_id: account_id || null,
                        account_name: account_name || 'Website Customer',
                        date: getTodayIST(),
                        amount: paidAmount,
                        payment_mode: 'Razorpay Online',
                        reference_number: razorpay_payment_id,
                        reference: razorpay_order_id,
                        narration: `Online upfront payment for booking (Order ${razorpay_order_id})`,
                        job_id: job_id || null,
                        status: 'cleared',
                        source: 'website_v2',
                        created_by: 'Customer (V2 Checkout)',
                    })
                    .select('id, receipt_number')
                    .single();

                if (!receiptErr && createdReceipt) {
                    receiptRecord = createdReceipt;

                    if (invoice_id) {
                        try {
                            await supabase
                                .from('receipt_voucher_allocations')
                                .insert({
                                    receipt_voucher_id: createdReceipt.id,
                                    invoice_id,
                                    amount_applied: paidAmount,
                                });
                        } catch (_) {}

                        const { data: inv } = await supabase
                            .from('sales_invoices')
                            .select('total_amount, paid_amount')
                            .eq('id', invoice_id)
                            .maybeSingle();

                        if (inv) {
                            const newPaid = (Number(inv.paid_amount) || 0) + paidAmount;
                            const totalAmt = Number(inv.total_amount) || 0;
                            await supabase
                                .from('sales_invoices')
                                .update({
                                    paid_amount: newPaid,
                                    status: newPaid >= totalAmt && totalAmt > 0 ? 'paid' : 'partial',
                                })
                                .eq('id', invoice_id);
                        }
                    }
                }
            }

            if (job_id) {
                await supabase.from('job_interactions').insert([
                    {
                        job_id,
                        type: 'payment-received-online',
                        message: `Upfront online payment verified via Razorpay (Payment ID: ${razorpay_payment_id})`,
                        user_name: 'Website V2 Checkout',
                    },
                ]);

                fireNotification('payment_received_online', {
                    job_id: String(job_id),
                    customer_id: account_id ? String(account_id) : undefined,
                    amount: Number(amount) || 0,
                    payment_id: razorpay_payment_id,
                }).catch(() => {});
            }

            return NextResponse.json({
                success: true,
                paymentId: razorpay_payment_id,
                receiptNumber: receiptRecord?.receipt_number || null,
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // ACTION 2: PREPARE ORDER (Validate Web Services + Create Job & Invoice)
        // ─────────────────────────────────────────────────────────────────────
        const {
            items = [],
            customer = {},
            schedule = {},
            paymentMethod = 'online',
            session_id = null,
            notes = '',
        } = body;

        const rawPhone10 = String(customer?.phone || '').replace(/\D/g, '').slice(-10);
        if (rawPhone10.length !== 10) {
            return NextResponse.json(
                { success: false, error: 'Please provide a valid 10-digit mobile number.' },
                { status: 400 }
            );
        }

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Your cart is empty.' },
                { status: 400 }
            );
        }

        if (!schedule?.date || !schedule?.slot) {
            return NextResponse.json(
                { success: false, error: 'Please select a date and time slot.' },
                { status: 400 }
            );
        }

        if (!customer?.address?.street?.trim() && !customer?.address?.building_name?.trim()) {
            return NextResponse.json(
                { success: false, error: 'Please enter your Mumbai flat, building, and street address.' },
                { status: 400 }
            );
        }

        // 1. Verify authentic catalog items from DB (strictly subtype='web' & status='active')
        const qtyMap = {};
        items.forEach(entry => {
            if (entry?.id) {
                qtyMap[entry.id] = Math.max(1, parseInt(entry.qty, 10) || 1);
            }
        });
        const requestedIds = Object.keys(qtyMap);
        if (requestedIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Invalid cart items.' }, { status: 400 });
        }

        const { data: dbItems, error: invError } = await supabase
            .from('inventory')
            .select(
                'id, name, category, sku, unit, unit_of_measure, description, type, subtype, status, sale_price, selling_price, retail_price, gst_applicable, gst_rate, sac_code, hsn_code, images, terms_conditions, service_terms_template, job_type'
            )
            .in('id', requestedIds)
            .eq('subtype', 'web')
            .eq('status', 'active');

        if (invError) throw invError;

        if (!dbItems || dbItems.length !== requestedIds.length) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'One or more services in your cart are no longer active. Please refresh your cart.',
                },
                { status: 400 }
            );
        }

        const cartLineItems = dbItems.map(row => {
            const normalized = normalizeWebServiceItem(row);
            return {
                ...normalized,
                qty: qtyMap[row.id] || 1,
                unit: row.unit_of_measure || row.unit || 'Unit',
            };
        });

        const totals = calculateCartTotals(cartLineItems);
        const formattedPhone = `+91-${rawPhone10.slice(0, 5)} ${rawPhone10.slice(5)}`;
        const pincode = customer?.address?.pincode || '';

        // 2. Check slot availability
        const slotStatus = await checkSlotAvailability(supabase, schedule);
        if (!slotStatus.ok) {
            return NextResponse.json({ success: false, error: slotStatus.error }, { status: 409 });
        }

        // 3. Resolve/Create Customer + Account + Property
        const resolved = await resolveOrCreateCustomerAndProperty(supabase, {
            customer: { ...customer, phone: formattedPhone },
            rawPhone10,
            pincode,
        });

        // 4. Create Job Record
        const bookingNumber = await generateJobNumber();
        const primaryItem = cartLineItems[0];
        const summaryTitles = cartLineItems.map(i => `${i.name}${i.qty > 1 ? ` x${i.qty}` : ''}`).join(', ');
        const jobDescription = `${summaryTitles} — ${resolved.cleanLocality || 'Mumbai'}`;

        const propertyObj = resolved.resolvedPropertyObj || {
            id: `inline:${customer?.address?.flat_number || ''}|${customer?.address?.building_name || ''}|${customer?.address?.street || ''}|${resolved.cleanLocality}|${pincode}`,
            flat_number: customer?.address?.flat_number || '',
            building_name: customer?.address?.building_name || '',
            address: customer?.address?.street || '',
            locality: resolved.cleanLocality,
            city: customer?.address?.city || 'Mumbai',
            pincode,
            property_type: 'residential',
            _source: 'inline',
        };

        const fullAddressString = [
            customer?.address?.flat_number,
            customer?.address?.building_name,
            customer?.address?.street,
            resolved.cleanLocality,
            customer?.address?.city || 'Mumbai',
            pincode,
        ]
            .filter(Boolean)
            .join(', ');

        const { data: job, error: jobErr } = await supabase
            .from('jobs')
            .insert({
                job_number: bookingNumber,
                status: 'new_job_request',
                priority: 'normal',
                customer_id: resolved.customerId,
                property_id: resolved.resolvedPropertyId,
                customer_name: resolved.customerName,
                category: primaryItem.categoryName,
                subcategory: primaryItem.subgroup,
                appliance: primaryItem.name,
                issue: summaryTitles,
                description: jobDescription,
                amount: totals.grandTotal,
                scheduled_date: schedule.date,
                scheduled_time: schedule.slot,
                source: 'website_v2',
                property: propertyObj,
                created_at: new Date().toISOString(),
                notes: JSON.stringify({
                    origin: 'v2_cart',
                    paymentMethod,
                    specialInstructions: notes || '',
                    schedule,
                    items: cartLineItems.map(i => ({
                        id: i.id,
                        name: i.name,
                        qty: i.qty,
                        price: i.price,
                        gstRate: i.gstRate,
                    })),
                    totals,
                    customer: {
                        name: resolved.customerName,
                        phone: formattedPhone,
                        email: customer?.email || '',
                        address: customer?.address || {},
                    },
                }),
            })
            .select('id, job_number')
            .single();

        if (jobErr) throw jobErr;

        // 5. Generate linked Sales Invoice in ERP format
        const invoiceNumber =
            (await getNextVoucherNumber('sales')) ||
            `INV-V2-${Date.now().toString().slice(-6)}`;

        const invoiceItems = cartLineItems.map(item => ({
            productId: item.id,
            description: item.name,
            hsn: item.hsnCode,
            qty: item.qty,
            rate: item.price,
            discount: 0,
            taxRate: item.gstRate,
            isCharge: false,
            unit: item.unit,
            total: item.qty * item.price,
            terms_conditions: item.highlights,
        }));

        const { data: createdInvoice } = await supabase
            .from('sales_invoices')
            .insert({
                invoice_number: invoiceNumber,
                reference: bookingNumber,
                account_id: resolved.customerId,
                account_name: resolved.customerName,
                account_mobile: rawPhone10,
                account_phone: formattedPhone,
                account_email: customer?.email || null,
                account_address: fullAddressString,
                account_state: 'Maharashtra',
                date: getTodayIST(),
                items: invoiceItems,
                billing_address: fullAddressString,
                shipping_address: fullAddressString,
                items_subtotal: totals.itemsSubtotal,
                subtotal: totals.itemsSubtotal,
                discount: 0,
                charges_total: 0,
                cgst: totals.cgst,
                sgst: totals.sgst,
                igst: 0,
                total_tax: totals.totalTax,
                total_amount: totals.grandTotal,
                paid_amount: 0,
                status: 'unpaid',
                job_id: job.id,
                notes: `Cart checkout booking ${bookingNumber}`,
            })
            .select('id, invoice_number')
            .single();

        // 6. Create Razorpay Order if Online Checkout selected
        let razorpayOrder = null;
        if (paymentMethod === 'online') {
            if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                return NextResponse.json(
                    { success: false, error: 'Online payment gateway is not configured on this server.' },
                    { status: 500 }
                );
            }
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });
            razorpayOrder = await razorpay.orders.create({
                amount: Math.round(totals.grandTotal * 100),
                currency: 'INR',
                receipt: String(job.id),
                notes: {
                    job_id: String(job.id),
                    account_id: String(resolved.customerId || ''),
                    invoice_id: String(createdInvoice?.id || ''),
                    collected_by: 'customer',
                    amount_label: 'full',
                    source: 'website_v2',
                },
            });
        }

        // 7. Side-effect logs & notifications (non-blocking / failure-safe)
        try {
            await supabase
                .from('job_interactions')
                .insert([
                    {
                        job_id: job.id,
                        type: 'created',
                        message: `V2 Cart booking (${summaryTitles}) by ${resolved.customerName} (${formattedPhone}) — Total ${totals.grandTotal}`,
                        user_name: 'Website V2 Checkout',
                    },
                ]);
        } catch (_) {}

        logInteractionServer({
            type: 'booking-created-website',
            category: 'job',
            jobId: String(job.id),
            customerId: resolved.customerId,
            customerName: resolved.customerName,
            description: `V2 Cart Order: ${summaryTitles} (${bookingNumber})`,
            metadata: { bookingNumber, itemsCount: cartLineItems.length, total: totals.grandTotal, pincode },
            source: 'Website V2',
        }).catch(() => {});

        trackLeadAttribution(supabase, {
            phone: formattedPhone,
            session_id,
            conversion_type: 'web_booking',
            name: resolved.customerName,
            status: 'converted',
        }).catch(() => {});

        fireNotification('booking_created_website', {
            job_id: String(job.id),
            job_number: job.job_number,
            customer_id: resolved.customerId ? String(resolved.customerId) : undefined,
            customer_name: resolved.customerName,
        }).catch(() => {});

        return NextResponse.json({
            success: true,
            bookingId: job.id,
            bookingNumber: job.job_number,
            customerId: resolved.customerId,
            customerAuthId: resolved.customerAuthId,
            customerName: resolved.customerName,
            invoiceId: createdInvoice?.id || null,
            invoiceNumber: createdInvoice?.invoice_number || invoiceNumber,
            totals,
            razorpayOrder,
            keyId: process.env.RAZORPAY_KEY_ID || null,
        });
    } catch (error) {
        console.error('[/api/v2/checkout] error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Checkout failed' },
            { status: 500 }
        );
    }
}
