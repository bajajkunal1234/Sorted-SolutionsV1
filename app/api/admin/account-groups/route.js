import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const PRIMARY_GROUPS = [
    // ── Primary Groups ─────────────────────────────────────────────
    { id: 'capital-account',       name: 'Capital Account',             nature: 'liability', parent: null },
    { id: 'current-assets',        name: 'Current Assets',              nature: 'asset',     parent: null },
    { id: 'current-liabilities',   name: 'Current Liabilities',         nature: 'liability', parent: null },
    { id: 'fixed-assets',          name: 'Fixed Assets',                nature: 'asset',     parent: null },
    { id: 'investments',           name: 'Investments',                 nature: 'asset',     parent: null },
    { id: 'direct-expenses',       name: 'Direct Expenses',             nature: 'expense',   parent: null },
    { id: 'indirect-expenses',     name: 'Indirect Expenses',           nature: 'expense',   parent: null },
    { id: 'direct-incomes',        name: 'Direct Incomes',              nature: 'income',    parent: null },
    { id: 'indirect-incomes',      name: 'Indirect Incomes',            nature: 'income',    parent: null },
    { id: 'duties-taxes',          name: 'Duties & Taxes',              nature: 'liability', parent: null },
    { id: 'loans-liabilities',     name: 'Loans (Liability)',           nature: 'liability', parent: null },
    { id: 'miscellaneous-exp',     name: 'Miscellaneous Expenses (Asset)', nature: 'asset',  parent: null },
    { id: 'suspense',              name: 'Suspense A/c',               nature: 'asset',     parent: null },

    // ── Under Current Assets ───────────────────────────────────────
    { id: 'cash-in-hand',          name: 'Cash-in-Hand',                nature: 'asset',     parent: 'current-assets' },
    { id: 'bank-accounts',         name: 'Bank Accounts',               nature: 'asset',     parent: 'current-assets' },
    { id: 'sundry-debtors',        name: 'Sundry Debtors',              nature: 'asset',     parent: 'current-assets' },
    { id: 'loans-advances-asset',  name: 'Loans & Advances (Asset)',    nature: 'asset',     parent: 'current-assets' },
    { id: 'stock-in-hand',         name: 'Stock-in-Hand',               nature: 'asset',     parent: 'current-assets' },
    { id: 'deposits-asset',        name: 'Deposits (Asset)',            nature: 'asset',     parent: 'current-assets' },

    // ── Under Current Liabilities ──────────────────────────────────
    { id: 'sundry-creditors',      name: 'Sundry Creditors',            nature: 'liability', parent: 'current-liabilities' },
    { id: 'provisions',            name: 'Provisions',                  nature: 'liability', parent: 'current-liabilities' },
    { id: 'bank-od',               name: 'Bank OD A/c',                 nature: 'liability', parent: 'current-liabilities' },

    // ── Under Capital Account ──────────────────────────────────────
    { id: 'reserves-surplus',      name: 'Reserves & Surplus',          nature: 'liability', parent: 'capital-account' },

    // ── Under Loans (Liability) ────────────────────────────────────
    { id: 'secured-loans',         name: 'Secured Loans',               nature: 'liability', parent: 'loans-liabilities' },
    { id: 'unsecured-loans',       name: 'Unsecured Loans',             nature: 'liability', parent: 'loans-liabilities' },

    // ── Under Direct Expenses ──────────────────────────────────────
    { id: 'purchase-accounts',     name: 'Purchase Accounts',           nature: 'expense',   parent: 'direct-expenses' },

    // ── Under Direct Incomes ───────────────────────────────────────
    { id: 'sales-accounts',        name: 'Sales Accounts',              nature: 'income',    parent: 'direct-incomes' },

    // ── Under Sundry Debtors ───────────────────────────────────────
    { id: 'customers',             name: 'Customers',                   nature: 'asset',     parent: 'sundry-debtors' },
];

async function seedGroupsIfEmpty() {
    try {
        // Use upsert so existing databases always get new groups on next call
        await supabase
            .from('account_groups')
            .upsert(PRIMARY_GROUPS, { onConflict: 'id', ignoreDuplicates: true });
    } catch (err) {
        console.error('Error seeding groups:', err);
    }
}

// GET - Fetch all account groups
export async function GET() {
    try {
        await seedGroupsIfEmpty();

        const { data, error } = await supabase
            .from('account_groups')
            .select('*')
            .order('name', { ascending: true })
            .limit(100);

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST - Create new account group
export async function POST(request) {
    try {
        await seedGroupsIfEmpty();

        const body = await request.json();

        // Basic validation
        if (!body.name || !body.parent) {
            return NextResponse.json({ success: false, error: 'Name and Parent Group are required' }, { status: 400 });
        }

        // Ensure fields match database schema (including case-sensitive quoted columns)
        const newGroup = {
            id: body.id,
            name: body.name,
            alias: body.alias,
            parent: body.parent,
            nature: body.nature,
            behavesAsSubLedger: body.behavesAsSubLedger,
            nettDebitCreditBalance: body.nettDebitCreditBalance,
            usedForCalculation: body.usedForCalculation,
            allocationMethod: body.allocationMethod,
            createdAt: body.createdAt || new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('account_groups')
            .insert([newGroup])
            .select()
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            throw error;
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
