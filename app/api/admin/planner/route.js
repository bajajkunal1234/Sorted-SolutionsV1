import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Helper: Project monthly occurrences
function projectMonthly(originalDate, startStr, endStr) {
    const [origY, origM, origD] = originalDate.split('-').map(Number);
    const [startY, startM] = startStr.split('-').map(Number);
    const [endY, endM] = endStr.split('-').map(Number);
    const results = [];
    let curY = startY;
    let curM = startM;
    while (curY < endY || (curY === endY && curM <= endM)) {
        const maxDays = new Date(curY, curM, 0).getDate();
        const targetDay = Math.min(origD, maxDays);
        const occStr = `${curY}-${String(curM).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
        if (occStr >= originalDate && occStr >= startStr && occStr <= endStr) {
            results.push(occStr);
        }
        curM++;
        if (curM > 12) {
            curM = 1;
            curY++;
        }
    }
    return results;
}

// Helper: Project weekly occurrences
function projectWeekly(originalDate, startStr, endStr) {
    const orig = new Date(originalDate + 'T00:00:00');
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const results = [];
    let cur = new Date(orig);
    while (cur < start) {
        cur.setDate(cur.getDate() + 7);
    }
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const occStr = `${y}-${m}-${d}`;
        if (occStr >= originalDate && occStr <= endStr) {
            results.push(occStr);
        }
        cur.setDate(cur.getDate() + 7);
    }
    return results;
}

// Helper: Project daily occurrences
function projectDaily(originalDate, startStr, endStr) {
    const orig = new Date(originalDate + 'T00:00:00');
    const start = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');
    const results = [];
    let cur = new Date(orig);
    if (cur < start) cur = new Date(start);
    while (cur <= end) {
        const y = cur.getFullYear();
        const m = String(cur.getMonth() + 1).padStart(2, '0');
        const d = String(cur.getDate()).padStart(2, '0');
        const occStr = `${y}-${m}-${d}`;
        results.push(occStr);
        cur.setDate(cur.getDate() + 1);
    }
    return results;
}

// GET: Fetch planned reminders with recurring projection, date filtering, type, status, and search
export async function GET(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')
        const date = searchParams.get('date')
        const reminderType = searchParams.get('type')
        const status = searchParams.get('status')
        const search = searchParams.get('search')
        const limit = parseInt(searchParams.get('limit') || '500', 10)

        // 1. Fetch non-recurring items in date range
        let baseQuery = supabase
            .from('reminders')
            .select('*')
            .order('due_date', { ascending: true })
            .order('due_time', { ascending: true, nullsFirst: false })
            .limit(limit)

        if (date) {
            baseQuery = baseQuery.eq('due_date', date)
        } else {
            if (startDate) baseQuery = baseQuery.gte('due_date', startDate)
            if (endDate) baseQuery = baseQuery.lte('due_date', endDate)
        }

        if (reminderType && reminderType !== 'all') {
            baseQuery = baseQuery.eq('reminder_type', reminderType)
        }

        if (status && status !== 'all') {
            baseQuery = baseQuery.eq('status', status)
        }

        if (search && search.trim()) {
            const s = search.trim()
            baseQuery = baseQuery.or(`title.ilike.%${s}%,description.ilike.%${s}%,contact_name.ilike.%${s}%,location.ilike.%${s}%`)
        }

        // 2. Fetch recurring items (which may have originated before startDate)
        let recurringQuery = supabase
            .from('reminders')
            .select('*')
            .eq('is_recurring', true)

        if (endDate) {
            recurringQuery = recurringQuery.lte('due_date', endDate)
        }
        if (reminderType && reminderType !== 'all') {
            recurringQuery = recurringQuery.eq('reminder_type', reminderType)
        }

        const [baseRes, recRes] = await Promise.all([baseQuery, recurringQuery])
        if (baseRes.error) throw baseRes.error

        const baseItems = baseRes.data || []
        const recurringItems = recRes.data || []

        // Map existing items by unique ID
        const itemsMap = new Map()
        for (const item of baseItems) {
            itemsMap.set(item.id, item)
        }

        // Project recurring items if we have a date range or specific date
        const rangeStart = date || startDate
        const rangeEnd = date || endDate

        if (rangeStart && rangeEnd) {
            for (const item of recurringItems) {
                const freq = item.recurrence_pattern?.frequency || 'monthly'
                const completedDates = new Set(item.recurrence_pattern?.completed_dates || [])

                let occurrences = []
                if (freq === 'monthly') {
                    occurrences = projectMonthly(item.due_date, rangeStart, rangeEnd)
                } else if (freq === 'weekly') {
                    occurrences = projectWeekly(item.due_date, rangeStart, rangeEnd)
                } else if (freq === 'daily') {
                    occurrences = projectDaily(item.due_date, rangeStart, rangeEnd)
                }

                for (const occDate of occurrences) {
                    if (occDate === item.due_date) {
                        // Original item
                        if (!itemsMap.has(item.id)) {
                            itemsMap.set(item.id, item)
                        }
                    } else {
                        // Projected recurring occurrence
                        const occId = `${item.id}_${occDate}`
                        const isDone = completedDates.has(occDate)

                        if (status && status !== 'all') {
                            if (status === 'completed' && !isDone) continue
                            if (status === 'pending' && isDone) continue
                        }

                        itemsMap.set(occId, {
                            ...item,
                            id: occId,
                            master_id: item.id,
                            is_projected: true,
                            due_date: occDate,
                            status: isDone ? 'completed' : 'pending',
                            completed_at: isDone ? (item.completed_at || new Date().toISOString()) : null
                        })
                    }
                }
            }
        }

        // 3. Fetch New Era Liabilities repayment schedule entries if payments are included
        const includeNewEra = (!reminderType || reminderType === 'all' || reminderType === 'payment');

        if (includeNewEra && rangeStart && rangeEnd) {
            let neweraQuery = supabase
                .from('newera_repayments')
                .select('id, loan_id, due_date, installment_number, expected_amount, expected_principal, expected_interest, status, notes, newera_loans(id, name, lender, loan_type, status)')
                .gte('due_date', rangeStart)
                .lte('due_date', rangeEnd)
                .order('due_date', { ascending: true });

            if (status && status !== 'all') {
                if (status === 'completed') {
                    neweraQuery = neweraQuery.eq('status', 'paid');
                } else if (status === 'pending') {
                    neweraQuery = neweraQuery.neq('status', 'paid');
                }
            }

            const { data: neweraData, error: neweraErr } = await neweraQuery;
            if (neweraErr) {
                console.warn('Failed to fetch newera repayments:', neweraErr);
            } else if (neweraData) {
                for (const rep of neweraData) {
                    const loan = rep.newera_loans;
                    const loanName = loan?.name ? loan.name.trim() : 'Liability Loan';
                    const lender = loan?.lender ? loan.lender.trim() : 'Liability';
                    const instNumber = rep.installment_number;
                    const cleanTitle = loanName;

                    // Search filter if provided
                    if (search && search.trim()) {
                        const s = search.trim().toLowerCase();
                        const matchTitle = cleanTitle.toLowerCase().includes(s);
                        const matchLender = lender.toLowerCase().includes(s);
                        const matchNotes = (rep.notes || '').toLowerCase().includes(s);
                        if (!matchTitle && !matchLender && !matchNotes) continue;
                    }

                    const occId = `newera_${rep.id}`;
                    itemsMap.set(occId, {
                        id: occId,
                        source: 'newera',
                        reminder_type: 'payment',
                        title: cleanTitle,
                        amount: parseFloat(rep.expected_amount || 0),
                        contact_name: lender,
                        contact_phone: null,
                        location: null,
                        due_date: rep.due_date,
                        due_time: null,
                        status: rep.status === 'paid' ? 'completed' : 'pending',
                        priority: 'high',
                        is_recurring: false,
                        account_id: null,
                        metadata: {
                            direction: 'payable',
                            is_newera: true,
                            newera_repayment_id: rep.id,
                            loan_id: rep.loan_id,
                            loan_name: loanName,
                            lender: lender,
                            installment_number: instNumber,
                            expected_principal: rep.expected_principal,
                            expected_interest: rep.expected_interest,
                            notes: rep.notes,
                            repayment_status: rep.status
                        },
                        description: rep.notes || (instNumber ? `Installment #${instNumber} • Principal ₹${Math.round(rep.expected_principal || 0).toLocaleString('en-IN')}, Interest ₹${Math.round(rep.expected_interest || 0).toLocaleString('en-IN')}` : `Liability Repayment to ${lender}`)
                    });
                }
            }
        }

        // 4. Fetch Active Rentals monthly rent schedules if payments are included
        const includeRentals = (!reminderType || reminderType === 'all' || reminderType === 'payment');

        if (includeRentals && rangeStart && rangeEnd) {
            let rentalQuery = supabase
                .from('active_rentals')
                .select('*, rental_plans(product_name), accounts(name, mobile, phone)')
                .neq('status', 'archived');

            const { data: rentalsData, error: rentalsErr } = await rentalQuery;
            if (rentalsErr) {
                console.warn('Failed to fetch active rentals:', rentalsErr);
            } else if (rentalsData) {
                for (const rental of rentalsData) {
                    if (rental.status === 'terminated') continue;

                    const duration = Number(rental.tenure?.duration || 1);
                    const unit = rental.tenure?.unit || 'month';
                    const totalMonths = unit.includes('year') ? duration * 12 : duration;

                    if (!rental.start_date) continue;
                    const [origY, origM, origD] = rental.start_date.split('-').map(Number);
                    const customerName = rental.customer_name || rental.accounts?.name || 'Customer';
                    const productName = rental.product_name || rental.rental_plans?.product_name || 'Rental Item';
                    const monthlyRent = parseFloat(rental.monthly_rent || 0);

                    const rawReceipts = rental.rent_receipts || {};

                    for (let i = 1; i <= totalMonths; i++) {
                        const targetMonth = origM + (i - 1);
                        const y = origY + Math.floor((targetMonth - 1) / 12);
                        const m = ((targetMonth - 1) % 12) + 1;
                        const maxDays = new Date(y, m, 0).getDate();
                        const d = Math.min(origD, maxDays);
                        const dueDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                        if (dueDateStr < rangeStart || dueDateStr > rangeEnd) continue;

                        const monthReceipt = rawReceipts[i] || rawReceipts[String(i)];
                        const isPaid = Boolean(
                            (Array.isArray(monthReceipt) && monthReceipt.length > 0) ||
                            (typeof monthReceipt === 'string' && monthReceipt.trim())
                        );

                        if (status && status !== 'all') {
                            if (status === 'completed' && !isPaid) continue;
                            if (status === 'pending' && isPaid) continue;
                        }

                        if (search && search.trim()) {
                            const s = search.trim().toLowerCase();
                            const matchTitle = productName.toLowerCase().includes(s);
                            const matchCustomer = customerName.toLowerCase().includes(s);
                            const matchSerial = (rental.serial_number || '').toLowerCase().includes(s);
                            const matchNotes = (rental.notes || '').toLowerCase().includes(s);
                            if (!matchTitle && !matchCustomer && !matchSerial && !matchNotes) continue;
                        }

                        const occId = `rental_${rental.id}_${i}`;
                        itemsMap.set(occId, {
                            id: occId,
                            source: 'rental',
                            reminder_type: 'payment',
                            title: productName,
                            amount: monthlyRent,
                            contact_name: customerName,
                            contact_phone: rental.accounts?.mobile || rental.accounts?.phone || null,
                            location: null,
                            due_date: dueDateStr,
                            due_time: null,
                            status: isPaid ? 'completed' : 'pending',
                            priority: 'high',
                            is_recurring: false,
                            account_id: rental.customer_id || null,
                            metadata: {
                                direction: 'receivable',
                                is_rental: true,
                                rental_id: rental.id,
                                month_index: i,
                                total_months: totalMonths,
                                product_name: productName,
                                customer_name: customerName,
                                serial_number: rental.serial_number,
                                receipt_ids: Array.isArray(monthReceipt) ? monthReceipt : (monthReceipt ? [monthReceipt] : []),
                                rental: {
                                    ...rental,
                                    productName,
                                    customerName,
                                    monthlyRent,
                                    securityDeposit: Number(rental.deposit_amount || rental.security_deposit || 0)
                                }
                            },
                            description: `Month ${i}/${totalMonths} Rent • ${customerName}${rental.serial_number ? ` • SN: ${rental.serial_number}` : ''}`
                        });
                    }
                }
            }
        }

        const allItems = Array.from(itemsMap.values())
        allItems.sort((a, b) => {
            if (a.due_date !== b.due_date) return a.due_date.localeCompare(b.due_date)
            const timeA = a.due_time || '99:99'
            const timeB = b.due_time || '99:99'
            return timeA.localeCompare(timeB)
        })

        return NextResponse.json({ success: true, data: allItems })
    } catch (error) {
        console.error('Error fetching planner items:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST: Create a new day plan / reminder item
export async function POST(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const body = await request.json()
        const {
            title,
            due_date,
            due_time,
            reminder_type = 'general',
            amount = 0,
            contact_name,
            contact_phone,
            location,
            description,
            priority = 'medium',
            status = 'pending',
            account_id = null,
            is_recurring = false,
            recurrence_pattern = {},
            metadata = {}
        } = body

        if (!title || !title.trim()) {
            return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
        }

        if (!due_date) {
            return NextResponse.json({ success: false, error: 'Due date is required' }, { status: 400 })
        }

        const payload = {
            title: title.trim(),
            due_date,
            due_time: due_time || null,
            reminder_type,
            amount: parseFloat(amount) || 0,
            contact_name: contact_name ? contact_name.trim() : null,
            contact_phone: contact_phone ? contact_phone.trim() : null,
            location: location ? location.trim() : null,
            description: description ? description.trim() : null,
            priority,
            status,
            account_id: account_id || null,
            is_recurring: Boolean(is_recurring),
            recurrence_pattern: recurrence_pattern || {},
            metadata: metadata || {}
        }

        const { data, error } = await supabase
            .from('reminders')
            .insert([payload])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data }, { status: 201 })
    } catch (error) {
        console.error('Error creating planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PATCH: Update a plan / toggle completion
export async function PATCH(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
        }

        // Handle New Era Liabilities repayment completion/payment sync
        if (typeof id === 'string' && id.startsWith('newera_')) {
            const repaymentId = id.replace('newera_', '');
            const isCompleted = updates.status === 'completed';
            const newStatus = isCompleted ? 'paid' : 'unpaid';

            // Fetch repayment details to get loan_id and expected_amount
            const { data: rep, error: repFetchErr } = await supabase
                .from('newera_repayments')
                .select('*, newera_loans(id, name, lender)')
                .eq('id', repaymentId)
                .maybeSingle();

            if (repFetchErr || !rep) {
                return NextResponse.json({ success: false, error: 'Repayment record not found' }, { status: 404 });
            }

            // Update newera_repayments status
            const { error: repUpdErr } = await supabase
                .from('newera_repayments')
                .update({ status: newStatus })
                .eq('id', repaymentId);

            if (repUpdErr) throw repUpdErr;

            // Keep newera_payments in sync
            if (isCompleted) {
                const { data: existingPay } = await supabase
                    .from('newera_payments')
                    .select('id')
                    .eq('repayment_id', repaymentId)
                    .maybeSingle();

                if (!existingPay) {
                    // Find active member Kunal or first member
                    const { data: members } = await supabase
                        .from('newera_members')
                        .select('id, name')
                        .order('id');
                    const memberId = members?.find(m => m.name.toLowerCase() === 'kunal')?.id || members?.[0]?.id || 1;

                    await supabase.from('newera_payments').insert({
                        loan_id: rep.loan_id,
                        repayment_id: repaymentId,
                        member_id: memberId,
                        payment_date: rep.due_date || new Date().toISOString().split('T')[0],
                        amount: parseFloat(rep.expected_amount || 0),
                        principal_portion: parseFloat(rep.expected_principal || 0),
                        interest_portion: parseFloat(rep.expected_interest || 0),
                        source_of_income: 'Business',
                        notes: 'Marked paid from Admin Day Planner'
                    });
                }
            } else {
                await supabase
                    .from('newera_payments')
                    .delete()
                    .eq('repayment_id', repaymentId);
            }

            return NextResponse.json({
                success: true,
                data: {
                    id,
                    source: 'newera',
                    status: updates.status
                }
            });
        }

        // Handle Active Rentals rent payment completion sync
        if (typeof id === 'string' && id.startsWith('rental_')) {
            const parts = id.split('_');
            const rentalId = parts[1];
            const monthIndex = parts[2];
            const isCompleted = updates.status === 'completed';

            // Fetch rental record
            const { data: rental, error: rFetchErr } = await supabase
                .from('active_rentals')
                .select('*')
                .eq('id', rentalId)
                .maybeSingle();

            if (rFetchErr || !rental) {
                return NextResponse.json({ success: false, error: 'Rental record not found' }, { status: 404 });
            }

            const currentReceipts = { ...(rental.rent_receipts || {}) };
            if (isCompleted) {
                if (!currentReceipts[monthIndex]) {
                    currentReceipts[monthIndex] = 'marked_paid';
                }
            } else {
                delete currentReceipts[monthIndex];
            }

            const duration = Number(rental.tenure?.duration || 1);
            const unit = rental.tenure?.unit || 'month';
            const totalMonths = unit.includes('year') ? duration * 12 : duration;

            let earliestUnpaid = 1;
            while (earliestUnpaid <= totalMonths && currentReceipts[earliestUnpaid]) {
                earliestUnpaid++;
            }

            let rentsPaidCount = 0;
            for (let m = 1; m <= totalMonths; m++) {
                if (currentReceipts[m]) rentsPaidCount++;
            }

            const [origY, origM, origD] = rental.start_date.split('-').map(Number);
            const targetM = origM + (earliestUnpaid - 1);
            const nextY = origY + Math.floor((targetM - 1) / 12);
            const nextM = ((targetM - 1) % 12) + 1;
            const maxD = new Date(nextY, nextM, 0).getDate();
            const nextD = Math.min(origD, maxD);
            const nextDueDateStr = earliestUnpaid <= totalMonths ? `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}` : null;

            const { error: updErr } = await supabase
                .from('active_rentals')
                .update({
                    rent_receipts: currentReceipts,
                    rents_paid: rentsPaidCount,
                    rents_remaining: Math.max(0, totalMonths - rentsPaidCount),
                    next_rent_due_date: nextDueDateStr
                })
                .eq('id', rentalId);

            if (updErr) throw updErr;

            return NextResponse.json({
                success: true,
                data: {
                    id,
                    source: 'rental',
                    status: updates.status
                }
            });
        }

        // Handle projected recurring occurrence completion
        if (typeof id === 'string' && id.includes('_')) {
            const [masterId, occDate] = id.split('_')
            const { data: master, error: fetchErr } = await supabase
                .from('reminders')
                .select('*')
                .eq('id', masterId)
                .single()

            if (fetchErr) throw fetchErr

            const pattern = master.recurrence_pattern || {}
            let completedDates = Array.isArray(pattern.completed_dates) ? [...pattern.completed_dates] : []

            if (updates.status === 'completed') {
                if (!completedDates.includes(occDate)) completedDates.push(occDate)
            } else if (updates.status === 'pending') {
                completedDates = completedDates.filter(d => d !== occDate)
            }

            const { data: updatedMaster, error: updateErr } = await supabase
                .from('reminders')
                .update({
                    recurrence_pattern: { ...pattern, completed_dates: completedDates },
                    updated_at: new Date().toISOString()
                })
                .eq('id', masterId)
                .select()
                .single()

            if (updateErr) throw updateErr

            return NextResponse.json({
                success: true,
                data: {
                    ...updatedMaster,
                    id,
                    master_id: masterId,
                    is_projected: true,
                    due_date: occDate,
                    status: updates.status
                }
            })
        }

        // Standard item update
        if ('status' in updates) {
            if (updates.status === 'completed') {
                updates.completed_at = new Date().toISOString()
            } else if (updates.status === 'pending') {
                updates.completed_at = null
            }
        }

        updates.updated_at = new Date().toISOString()

        const { data, error } = await supabase
            .from('reminders')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error updating planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE: Delete a planner item
export async function DELETE(request) {
    try {
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client unavailable' }, { status: 503 })
        }

        const { searchParams } = new URL(request.url)
        let id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Item ID is required' }, { status: 400 })
        }

        // New Era Liabilities installments cannot be deleted from Admin Day Planner
        if (typeof id === 'string' && id.startsWith('newera_')) {
            return NextResponse.json({
                success: false,
                error: 'New Era liabilities installments cannot be deleted from Admin Day Planner. Please manage them directly in the New Era Liabilities Tracker.'
            }, { status: 403 });
        }

        // Rental schedule entries cannot be deleted from Admin Day Planner
        if (typeof id === 'string' && id.startsWith('rental_')) {
            return NextResponse.json({
                success: false,
                error: 'Rental payment schedule entries cannot be deleted from Admin Day Planner. Please manage or terminate agreements in the Rentals tab.'
            }, { status: 403 });
        }

        // If deleting a projected recurring occurrence, delete the master record
        if (id.includes('_')) {
            id = id.split('_')[0]
        }

        const { error } = await supabase
            .from('reminders')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true, message: 'Item deleted successfully' })
    } catch (error) {
        console.error('Error deleting planner item:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
