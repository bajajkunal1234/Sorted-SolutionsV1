import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        // 1. Fetch technician to get ledger_id
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('ledger_id, name')
            .eq('id', technicianId)
            .single()

        if (techError || !tech) {
            return NextResponse.json(
                { error: 'Technician not found' },
                { status: 404 }
            )
        }

        // 2. Fetch all approved expenses
        const { data: approvedExpenses, error: expError } = await supabase
            .from('expenses')
            .select('*')
            .eq('technician_id', technicianId)
            .eq('status', 'approved')

        if (expError) {
            console.error('Error fetching expenses for ledger:', expError)
            return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
        }

        // Get linked payment voucher IDs
        const linkedVoucherIds = approvedExpenses
            .map(e => e.payment_voucher_id)
            .filter(id => !!id)

        // 3. Fetch all payment vouchers (linked to expenses or direct to tech ledger)
        let payments = []
        
        // Build a query for payment vouchers
        let paymentsQuery = supabase.from('payment_vouchers').select('*')
        
        const filterOr = [];
        if (tech.ledger_id) {
            filterOr.push(`account_id.eq.${tech.ledger_id}`);
        }
        if (linkedVoucherIds.length > 0) {
            filterOr.push(`id.in.(${linkedVoucherIds.join(',')})`);
        }

        if (filterOr.length > 0) {
            const { data: voucherData, error: payError } = await paymentsQuery.or(filterOr.join(','))
            if (payError) {
                console.error('Error fetching payment vouchers:', payError)
            } else {
                payments = voucherData || []
            }
        }

        // 4. Combine into ledger entries
        // A ledger entry has: date, type, details, debit (payments/advances), credit (approved expenses)
        const ledgerEntries = []

        // Approved expenses (Credit: Company owes technician)
        approvedExpenses.forEach(exp => {
            ledgerEntries.push({
                id: exp.id,
                date: exp.date || exp.created_at?.split('T')[0],
                type: 'Expense',
                reference: exp.category ? exp.category.toUpperCase() : 'EXPENSE',
                description: exp.description || `Approved expense request`,
                debit: 0,
                credit: parseFloat(exp.amount || 0),
                raw: exp
            })
        })

        // Payments (Debit: Company paid technician)
        payments.forEach(pay => {
            // Check if this payment was already linked to an expense (to show linked expense details)
            const linkedExp = approvedExpenses.find(e => e.payment_voucher_id === pay.id)
            const refText = pay.payment_number || 'PAYMENT'
            const descText = pay.narration || (linkedExp ? `Reimbursement for ${linkedExp.category}` : 'Technician payout/advance')
            
            ledgerEntries.push({
                id: pay.id,
                date: pay.date || pay.created_at?.split('T')[0],
                type: 'Payment',
                reference: refText,
                description: descText,
                debit: parseFloat(pay.amount || 0),
                credit: 0,
                raw: pay
            })
        })

        // Sort chronologically (oldest first for running balance calculation)
        ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

        // Calculate running balance
        // Balance = Credits (Company owes tech) - Debits (Company paid tech)
        let runningBalance = 0
        const sortedEntries = ledgerEntries.map(entry => {
            runningBalance += (entry.credit - entry.debit)
            return {
                ...entry,
                balance: runningBalance
            }
        })

        // Sort newest first for display
        const displayEntries = [...sortedEntries].sort((a, b) => new Date(b.date) - new Date(a.date))

        // Summary calculations
        const totalExpenses = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
        const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
        const currentBalance = totalExpenses - totalPayments // positive means company owes tech, negative means tech owes company

        return NextResponse.json({
            success: true,
            technician: {
                id: technicianId,
                name: tech.name,
                ledger_id: tech.ledger_id
            },
            summary: {
                total_expenses: totalExpenses,
                total_payments: totalPayments,
                balance: currentBalance
            },
            ledger: displayEntries
        })

    } catch (error) {
        console.error('Error in expenses ledger API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
