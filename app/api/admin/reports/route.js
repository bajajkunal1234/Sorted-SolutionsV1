import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        // 1. Fetch Sales and Purchase invoices within date range (for registers and GSTR)
        let salesQuery = supabase.from('sales_invoices').select('*');
        let purchaseQuery = supabase.from('purchase_invoices').select('*');
        
        if (from) salesQuery = salesQuery.gte('date', from);
        if (to) salesQuery = salesQuery.lte('date', to);
        if (from) purchaseQuery = purchaseQuery.gte('date', from);
        if (to) purchaseQuery = purchaseQuery.lte('date', to);

        const [ 
            { data: salesInvoices, error: salesError }, 
            { data: purchaseInvoices, error: pchError } 
        ] = await Promise.all([
            salesQuery,
            purchaseQuery
        ]);

        if (salesError) throw salesError;
        if (pchError) throw pchError;

        // 2. Fetch all accounts to build Trial Balance & P&L structurally (group_type doesn't exist)
        const { data: accounts, error: accError } = await supabase.from('accounts').select('id, name, under, type');
        if (accError) throw accError;

        // 3. Fetch all Journal Entry Lines within date range to build totals
        let jeQuery = supabase.from('journal_entry_lines').select(`
            account_id,
            debit,
            credit,
            journal_entries!inner(date, reference_type)
        `);
        
        // Filter journals by date range if applicable
        if (from) jeQuery = jeQuery.gte('journal_entries.date', from);
        if (to) jeQuery = jeQuery.lte('journal_entries.date', to);

        const { data: jeLines, error: jeError } = await jeQuery;
        if (jeError) throw jeError;

        // Group balances by account
        const accountBalances = {};
        if (accounts) {
            accounts.forEach(a => accountBalances[a.id] = { ...a, totalDebit: 0, totalCredit: 0, balance: 0 });
        }

        if (jeLines) {
            jeLines.forEach(line => {
                if (accountBalances[line.account_id]) {
                    accountBalances[line.account_id].totalDebit += Number(line.debit) || 0;
                    accountBalances[line.account_id].totalCredit += Number(line.credit) || 0;
                }
            });
        }

        // Calculate final closing balance based on accounting rules:
        // Asset/Expense: Normal Debit Balance = Debit - Credit
        // Liab/Equity/Income: Normal Credit Balance = Credit - Debit
        Object.values(accountBalances).forEach(a => {
            const isAssetOrExpense = a.under?.toLowerCase().includes('asset') || a.type?.toLowerCase().includes('asset') || 
                                     a.under?.toLowerCase().includes('expense') || a.type?.toLowerCase().includes('expense') ||
                                     a.under?.toLowerCase().includes('cash') || a.under?.toLowerCase().includes('bank') ||
                                     a.under?.toLowerCase().includes('debtor');

            if (isAssetOrExpense) {
                a.balance = a.totalDebit - a.totalCredit;
            } else {
                a.balance = a.totalCredit - a.totalDebit;
            }
        });

        // Structure P&L and Balance Sheet dynamically
        const directIncome = Object.values(accountBalances).filter(a => a.under?.includes('Income') || a.type?.includes('income'));
        const directExpenses = Object.values(accountBalances).filter(a => (a.under?.includes('Expense') || a.type?.includes('expense')) && a.under?.includes('Direct'));
        const indirectExpenses = Object.values(accountBalances).filter(a => (a.under?.includes('Expense') || a.type?.includes('expense')) && !a.under?.includes('Direct'));
        const otherIncome = Object.values(accountBalances).filter(a => a.under?.includes('Indirect Income'));

        const sumBal = (arr) => arr.reduce((s, a) => s + a.balance, 0);

        const totalRevenue = sumBal(directIncome);
        const totalCOGS = sumBal(directExpenses);
        const totalOpEx = sumBal(indirectExpenses);
        const totalOtherIn = sumBal(otherIncome);

        const grossProfit = totalRevenue - totalCOGS;
        const netProfit = grossProfit - totalOpEx + totalOtherIn;

        const currentAssets = Object.values(accountBalances).filter(a => a.under?.includes('Current Asset') || a.under?.includes('Cash') || a.under?.includes('Bank') || a.under?.includes('Debtor'));
        const fixedAssets = Object.values(accountBalances).filter(a => a.under?.includes('Fixed Asset'));
        
        const currentLiabilities = Object.values(accountBalances).filter(a => a.under?.includes('Current Liabilit') || a.under?.includes('Creditor') || a.under?.includes('Duties'));
        const longTermLiabilities = Object.values(accountBalances).filter(a => a.under?.includes('Loan') && !a.under?.includes('Asset'));
        
        const equity = Object.values(accountBalances).filter(a => a.under?.includes('Capital'));

        const reportsData = {
            salesInvoices: salesInvoices || [],
            purchaseInvoices: purchaseInvoices || [],
            trialBalance: Object.values(accountBalances),
            profitLossData: {
                period: `${from || 'Start'} to ${to || 'End'}`,
                revenue: directIncome,
                cogs: directExpenses,
                operatingExpenses: indirectExpenses,
                otherIncome: otherIncome,
                grossProfit,
                netProfit
            },
            balanceSheetData: {
                asOnDate: to || new Date().toISOString().split('T')[0],
                assets: { currentAssets, fixedAssets },
                liabilities: { currentLiabilities, longTermLiabilities },
                equity: { capital: equity, retainedEarnings: netProfit }
            }
        };

        return NextResponse.json({ success: true, data: reportsData });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message || 'Unknown error occurred' }, { status: 500 });
    }
}
