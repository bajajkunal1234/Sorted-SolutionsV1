import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Password for /newera
const NEWERA_PASSWORD = '12476451';

// Helper to check the current session
async function getSession(request, supabase) {
    const sessionCookie = request.cookies.get('newera_session');
    if (!sessionCookie?.value) return null;

    const { data: session, error } = await supabase
        .from('newera_sessions')
        .select('*')
        .eq('id', sessionCookie.value)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

    if (error || !session) return null;
    return session;
}

// Helper to log audit actions
async function logInteraction(supabase, memberName, actionType, description) {
    try {
        await supabase.from('newera_interactions').insert({
            member_name: memberName,
            action_type: actionType,
            description: description
        });
    } catch (e) {
        console.error('[logInteraction-error]:', e);
    }
}

export async function GET(request) {
    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        const session = await getSession(request, supabase);
        if (!session) {
            return NextResponse.json({ authenticated: false });
        }

        if (!session.member_name) {
            // Seeding verification and retrieval
            const { data: members } = await supabase.from('newera_members').select('*').order('name');
            return NextResponse.json({ authenticated: true, needsMember: true, members: members || [] });
        }

        // Retrieve dashboard data
        const [membersRes, loansRes, repaymentsRes, paymentsRes, allocationsRes, interactionsRes] = await Promise.all([
            supabase.from('newera_members').select('*').order('name'),
            supabase.from('newera_loans').select('*').order('created_at', { ascending: false }),
            supabase.from('newera_repayments').select('*').order('due_date', { ascending: true }),
            supabase.from('newera_payments').select('*').order('payment_date', { ascending: false }),
            supabase.from('newera_allocations').select('*'),
            supabase.from('newera_interactions').select('*').order('created_at', { ascending: false }).limit(200)
        ]);

        return NextResponse.json({
            authenticated: true,
            needsMember: false,
            activeMember: session.member_name,
            members: membersRes.data || [],
            loans: loansRes.data || [],
            repayments: repaymentsRes.data || [],
            payments: paymentsRes.data || [],
            allocations: allocationsRes.data || [],
            interactions: interactionsRes.data || []
        });

    } catch (error) {
        console.error('[newera-get-error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const { action } = body;

        // 1. Password login action (doesn't require active session)
        if (action === 'login') {
            const { password } = body;
            if (password !== NEWERA_PASSWORD) {
                return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
            }

            // Create a session in database
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

            const { data: session, error } = await supabase
                .from('newera_sessions')
                .insert({ expires_at: expiresAt.toISOString() })
                .select()
                .single();

            if (error) throw error;

            const response = NextResponse.json({ success: true, authenticated: true });
            
            // Set session cookie
            response.cookies.set('newera_session', session.id, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            });

            return response;
        }

        // Check session for all other actions
        const session = await getSession(request, supabase);
        if (!session) {
            const response = NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            // Clear any old path-restricted cookies to prevent loops
            response.headers.append('Set-Cookie', 'newera_session=; Path=/newera; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_member=; Path=/newera; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_member=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict');
            return response;
        }

        // 2. Select member action (authenticated but needs member selection)
        if (action === 'select_member') {
            const { name } = body;
            if (!name) return NextResponse.json({ success: false, error: 'Member name required' }, { status: 400 });

            const { error } = await supabase
                .from('newera_sessions')
                .update({ member_name: name })
                .eq('id', session.id);

            if (error) throw error;

            const response = NextResponse.json({ success: true, activeMember: name });
            // Set companion non-httpOnly cookie for client state
            response.cookies.set('newera_member', name, {
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 30 * 24 * 60 * 60
            });
            return response;
        }

        // 3. Logout action
        if (action === 'logout') {
            await supabase.from('newera_sessions').delete().eq('id', session.id);
            const response = NextResponse.json({ success: true });
            // Clear cookies for both paths on logout
            response.headers.append('Set-Cookie', 'newera_session=; Path=/newera; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; HttpOnly; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_member=; Path=/newera; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict');
            response.headers.append('Set-Cookie', 'newera_member=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict');
            return response;
        }

        // Check if member selection has been made
        if (!session.member_name) {
            return NextResponse.json({ success: false, error: 'Member selection required' }, { status: 403 });
        }

        // --- DASHBOARD DATABASE ACTIONS ---

        // 4. Create Loan
        if (action === 'create_loan') {
            const { name, lender, account_number, loan_type, principal_amount, interest_rate_annual, start_date, tenure_months, emi_amount, allocations, repayment_day } = body;

            // Insert loan
            const { data: loan, error: loanError } = await supabase
                .from('newera_loans')
                .insert({
                    name,
                    lender,
                    account_number: account_number || null,
                    loan_type,
                    principal_amount: parseFloat(principal_amount),
                    interest_rate_annual: parseFloat(interest_rate_annual),
                    start_date,
                    tenure_months: tenure_months ? parseInt(tenure_months) : null,
                    emi_amount: emi_amount ? parseFloat(emi_amount) : null,
                    repayment_day: repayment_day ? parseInt(repayment_day) : 5
                })
                .select()
                .single();

            if (loanError) throw loanError;

            // Insert allocations (shares)
            if (allocations && allocations.length > 0) {
                const allocationInserts = allocations.map(a => ({
                    loan_id: loan.id,
                    member_id: parseInt(a.member_id),
                    share_percentage: parseFloat(a.share_percentage)
                }));
                const { error: allocError } = await supabase.from('newera_allocations').insert(allocationInserts);
                if (allocError) throw allocError;
            }

            // Automatically generate schedule if tenure is provided
            if (tenure_months && emi_amount && parseFloat(emi_amount) > 0) {
                const repayments = [];
                let balance = parseFloat(principal_amount);
                const monthlyRate = (parseFloat(interest_rate_annual) / 100) / 12;
                const startDateObj = new Date(start_date);

                for (let i = 1; i <= parseInt(tenure_months); i++) {
                    const expectedInterest = balance * monthlyRate;
                    let expectedPrincipal = parseFloat(emi_amount) - expectedInterest;
                    
                    if (expectedPrincipal > balance || i === parseInt(tenure_months)) {
                        expectedPrincipal = balance;
                    }
                    
                    const installmentAmount = expectedPrincipal + expectedInterest;
                    balance -= expectedPrincipal;

                    const dueDate = new Date(startDateObj);
                    dueDate.setMonth(dueDate.getMonth() + i);
                    
                    // Set preferred day of month for repayment due
                    const rDay = repayment_day ? parseInt(repayment_day) : 5;
                    dueDate.setDate(rDay);

                    repayments.push({
                        loan_id: loan.id,
                        due_date: dueDate.toISOString().split('T')[0],
                        installment_number: i,
                        expected_amount: installmentAmount,
                        expected_principal: expectedPrincipal,
                        expected_interest: expectedInterest,
                        status: 'unpaid'
                    });

                    if (balance <= 0) break;
                }

                if (repayments.length > 0) {
                    const { error: repErr } = await supabase.from('newera_repayments').insert(repayments);
                    if (repErr) throw repErr;
                }
            }

            await logInteraction(supabase, session.member_name, 'create_loan', `Added new liability "${name}" (${loan_type}) with principal ₹${parseFloat(principal_amount).toLocaleString('en-IN')} from lender "${lender}"`);

            return NextResponse.json({ success: true, loan });
        }

        // 5. Delete Loan
        if (action === 'delete_loan') {
            const { loanId } = body;
            const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loanId).maybeSingle();
            const loanName = loan ? loan.name : 'Unknown';

            const { error } = await supabase.from('newera_loans').delete().eq('id', loanId);
            if (error) throw error;

            await logInteraction(supabase, session.member_name, 'delete_loan', `Deleted liability account "${loanName}"`);

            return NextResponse.json({ success: true });
        }

        // 6. Close/Reopen Loan
        if (action === 'update_loan_status') {
            const { loanId, status } = body;
            const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loanId).maybeSingle();
            const loanName = loan ? loan.name : 'Unknown';

            const { error } = await supabase.from('newera_loans').update({ status }).eq('id', loanId);
            if (error) throw error;

            await logInteraction(supabase, session.member_name, 'update_loan_status', `Marked liability "${loanName}" as ${status.toUpperCase()}`);

            return NextResponse.json({ success: true });
        }

        // 7. Upsert repayment schedule item manually
        if (action === 'upsert_repayment') {
            const { id, loan_id, due_date, installment_number, expected_amount, expected_principal, expected_interest, status, notes } = body;

            const repaymentRow = {
                loan_id,
                due_date,
                installment_number: installment_number ? parseInt(installment_number) : null,
                expected_amount: parseFloat(expected_amount),
                expected_principal: parseFloat(expected_principal),
                expected_interest: parseFloat(expected_interest),
                status: status || 'unpaid',
                notes: notes || null
            };

            const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loan_id).maybeSingle();
            const loanName = loan ? loan.name : 'Unknown';

            let error = null;
            if (id) {
                // Update
                const { error: updErr } = await supabase
                    .from('newera_repayments')
                    .update(repaymentRow)
                    .eq('id', id);
                error = updErr;

                if (!error) {
                    await logInteraction(supabase, session.member_name, 'update_repayment', `Updated schedule installment due on ${due_date} (Expected: ₹${parseFloat(expected_amount).toLocaleString('en-IN')}) for "${loanName}"`);
                }
            } else {
                // Insert
                const { error: insErr } = await supabase
                    .from('newera_repayments')
                    .insert(repaymentRow);
                error = insErr;

                if (!error) {
                    await logInteraction(supabase, session.member_name, 'create_repayment', `Added manual schedule installment of ₹${parseFloat(expected_amount).toLocaleString('en-IN')} due on ${due_date} for "${loanName}"`);
                }
            }

            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        // 8. Delete repayment item
        if (action === 'delete_repayment') {
            const { repaymentId } = body;
            const { data: repayment } = await supabase.from('newera_repayments').select('loan_id, due_date, expected_amount').eq('id', repaymentId).maybeSingle();
            let loanName = 'Unknown';
            if (repayment) {
                const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', repayment.loan_id).maybeSingle();
                loanName = loan ? loan.name : 'Unknown';
            }

            const { error } = await supabase.from('newera_repayments').delete().eq('id', repaymentId);
            if (error) throw error;

            if (repayment) {
                await logInteraction(supabase, session.member_name, 'delete_repayment', `Deleted schedule installment of ₹${parseFloat(repayment.expected_amount).toLocaleString('en-IN')} due on ${repayment.due_date} for "${loanName}"`);
            }

            return NextResponse.json({ success: true });
        }

        // 9. Bulk Import Repayments
        if (action === 'bulk_import_repayments') {
            const { loanId, rows } = body;
            if (!loanId || !rows || !rows.length) {
                return NextResponse.json({ success: false, error: 'Invalid data' }, { status: 400 });
            }

            const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loanId).maybeSingle();
            const loanName = loan ? loan.name : 'Unknown';

            const repaymentsToInsert = rows.map((r, index) => ({
                loan_id: loanId,
                due_date: r.due_date,
                installment_number: r.installment_number ? parseInt(r.installment_number) : (index + 1),
                expected_amount: parseFloat(r.expected_amount || 0),
                expected_principal: parseFloat(r.expected_principal || 0),
                expected_interest: parseFloat(r.expected_interest || 0),
                status: r.status || 'unpaid',
                notes: r.notes || null
            }));

            const { error } = await supabase.from('newera_repayments').insert(repaymentsToInsert);
            if (error) throw error;

            await logInteraction(supabase, session.member_name, 'bulk_import_repayments', `Bulk imported ${rows.length} schedule installments via Excel for liability "${loanName}"`);

            return NextResponse.json({ success: true });
        }

        // 10. Log Payment
        if (action === 'log_payment') {
            const { loan_id, repayment_id, member_id, payment_date, amount, principal_portion, interest_portion, source_of_income, notes } = body;

            // Fetch info for logging
            const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loan_id).maybeSingle();
            const loanName = loan ? loan.name : 'Unknown';
            const { data: member } = await supabase.from('newera_members').select('name').eq('id', member_id).maybeSingle();
            const memberName = member ? member.name : 'Unknown';

            // Insert payment log
            const { data: payment, error: payError } = await supabase
                .from('newera_payments')
                .insert({
                    loan_id,
                    repayment_id: repayment_id || null,
                    member_id: parseInt(member_id),
                    payment_date,
                    amount: parseFloat(amount),
                    principal_portion: parseFloat(principal_portion),
                    interest_portion: parseFloat(interest_portion),
                    source_of_income,
                    notes: notes || null
                })
                .select()
                .single();

            if (payError) throw payError;

            // If linked to a repayment schedule item, let's update that schedule item status
            if (repayment_id) {
                // Fetch all payments for this schedule item
                const { data: siblingPayments } = await supabase
                    .from('newera_payments')
                    .select('amount')
                    .eq('repayment_id', repayment_id);

                const { data: repaymentItem } = await supabase
                    .from('newera_repayments')
                    .select('expected_amount')
                    .eq('id', repayment_id)
                    .single();

                if (repaymentItem) {
                    const totalPaid = (siblingPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
                    let newStatus = 'unpaid';
                    if (totalPaid >= parseFloat(repaymentItem.expected_amount)) {
                        newStatus = 'paid';
                    } else if (totalPaid > 0) {
                        newStatus = 'partially_paid';
                    }

                    await supabase
                        .from('newera_repayments')
                        .update({ status: newStatus })
                        .eq('id', repayment_id);
                }
            }

            await logInteraction(supabase, session.member_name, 'log_payment', `Logged payment of ₹${parseFloat(amount).toLocaleString('en-IN')} by ${memberName} for "${loanName}" (Income Source: ${source_of_income})`);

            return NextResponse.json({ success: true, payment });
        }

        // 11. Delete Payment Log
        if (action === 'delete_payment') {
            const { paymentId } = body;

            // Get payment first to check if we need to update any linked repayment status
            const { data: payment } = await supabase
                .from('newera_payments')
                .select('loan_id, member_id, amount, repayment_id')
                .eq('id', paymentId)
                .maybeSingle();

            let loanName = 'Unknown';
            let memberName = 'Unknown';
            if (payment) {
                const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', payment.loan_id).maybeSingle();
                loanName = loan ? loan.name : 'Unknown';
                const { data: member } = await supabase.from('newera_members').select('name').eq('id', payment.member_id).maybeSingle();
                memberName = member ? member.name : 'Unknown';
            }

            const { error } = await supabase.from('newera_payments').delete().eq('id', paymentId);
            if (error) throw error;

            if (payment?.repayment_id) {
                // Recalculate status of the repayment item
                const { data: siblingPayments } = await supabase
                    .from('newera_payments')
                    .select('amount')
                    .eq('repayment_id', payment.repayment_id);

                const { data: repaymentItem } = await supabase
                    .from('newera_repayments')
                    .select('expected_amount')
                    .eq('id', payment.repayment_id)
                    .single();

                if (repaymentItem) {
                    const totalPaid = (siblingPayments || []).reduce((sum, p) => sum + parseFloat(p.amount), 0);
                    let newStatus = 'unpaid';
                    if (totalPaid >= parseFloat(repaymentItem.expected_amount)) {
                        newStatus = 'paid';
                    } else if (totalPaid > 0) {
                        newStatus = 'partially_paid';
                    }

                    await supabase
                        .from('newera_repayments')
                        .update({ status: newStatus })
                        .eq('id', payment.repayment_id);
                }
            }

            if (payment) {
                await logInteraction(supabase, session.member_name, 'delete_payment', `Deleted payment entry of ₹${parseFloat(payment.amount).toLocaleString('en-IN')} made by ${memberName} for "${loanName}"`);
            }

            return NextResponse.json({ success: true });
        }

        // 12. Import Parsed Schedule (PDF/Excel)
        if (action === 'import_parsed_schedule') {
            const { loanId, loanForm: newLoanForm, installments } = body;
            if (!installments || !installments.length) {
                return NextResponse.json({ success: false, error: 'No installments provided' }, { status: 400 });
            }

            let finalLoanId = loanId;
            let loanName = 'Unknown';

            if (loanId === 'new') {
                if (!newLoanForm) {
                    return NextResponse.json({ success: false, error: 'Loan details required for new liability' }, { status: 400 });
                }

                const { name, lender, account_number, loan_type, principal_amount, interest_rate_annual, start_date, tenure_months, emi_amount, repayment_day } = newLoanForm;

                const { data: loan, error: loanError } = await supabase
                    .from('newera_loans')
                    .insert({
                        name,
                        lender,
                        account_number: account_number || null,
                        loan_type,
                        principal_amount: parseFloat(principal_amount),
                        interest_rate_annual: parseFloat(interest_rate_annual),
                        start_date,
                        tenure_months: tenure_months ? parseInt(tenure_months) : null,
                        emi_amount: emi_amount ? parseFloat(emi_amount) : null,
                        repayment_day: repayment_day ? parseInt(repayment_day) : 5
                    })
                    .select()
                    .single();

                if (loanError) throw loanError;
                finalLoanId = loan.id;
                loanName = loan.name;

                await logInteraction(supabase, session.member_name, 'create_loan', `Created new liability "${name}" via schedule parser with principal ₹${parseFloat(principal_amount).toLocaleString('en-IN')}`);
            } else {
                const { data: loan } = await supabase.from('newera_loans').select('name').eq('id', loanId).maybeSingle();
                loanName = loan ? loan.name : 'Unknown';

                // Delete existing unpaid schedule items for this loan to avoid duplicates
                await supabase.from('newera_repayments').delete().eq('loan_id', loanId).eq('status', 'unpaid');
            }

            // Insert installments
            const repaymentsToInsert = installments.map(inst => ({
                loan_id: finalLoanId,
                due_date: inst.due_date,
                installment_number: inst.installment_number,
                expected_amount: parseFloat(inst.expected_amount),
                expected_principal: parseFloat(inst.expected_principal),
                expected_interest: parseFloat(inst.expected_interest),
                status: 'unpaid'
            }));

            const { error: repError } = await supabase.from('newera_repayments').insert(repaymentsToInsert);
            if (repError) throw repError;

            await logInteraction(supabase, session.member_name, 'bulk_import_repayments', `Imported ${installments.length} installments via document parser for "${loanName}"`);

            return NextResponse.json({ success: true, loanId: finalLoanId });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        console.error('[newera-post-error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
