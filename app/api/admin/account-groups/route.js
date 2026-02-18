import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const PRIMARY_GROUPS = [
    { id: 'capital-account', name: 'Capital Account', nature: 'liability' },
    { id: 'current-assets', name: 'Current Assets', nature: 'asset' },
    { id: 'current-liabilities', name: 'Current Liabilities', nature: 'liability' },
    { id: 'fixed-assets', name: 'Fixed Assets', nature: 'asset' },
    { id: 'direct-expenses', name: 'Direct Expenses', nature: 'expense' },
    { id: 'indirect-expenses', name: 'Indirect Expenses', nature: 'expense' },
    { id: 'direct-incomes', name: 'Direct Incomes', nature: 'income' },
    { id: 'indirect-incomes', name: 'Indirect Incomes', nature: 'income' },
    { id: 'duties-taxes', name: 'Duties & Taxes', nature: 'liability' }
];

async function seedGroupsIfEmpty() {
    try {
        const { count, error: countError } = await supabase
            .from('account_groups')
            .select('*', { count: 'exact', head: true });

        if (count === 0 && !countError) {
            console.log('Seeding primary account groups...');
            await supabase.from('account_groups').insert(PRIMARY_GROUPS);
        }
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
            .order('name', { ascending: true });

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
