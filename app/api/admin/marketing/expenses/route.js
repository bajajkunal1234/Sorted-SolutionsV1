import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/admin/marketing/expenses
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const marketer = searchParams.get('marketer');

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        let query = supabase
            .from('marketing_expenses')
            .select('*')
            .order('payment_date', { ascending: false });

        if (marketer && marketer !== 'all') {
            query = query.eq('marketer_key', marketer);
        }

        const { data, error } = await query;
        if (error) throw error;

        return NextResponse.json({ success: true, data: data || [] });
    } catch (error) {
        console.error('[marketing/expenses GET error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST /api/admin/marketing/expenses
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            id,
            marketer_key,
            marketer_display_name,
            payment_type,
            amount,
            period_start,
            period_end,
            categories_covered,
            payment_date,
            notes
        } = body;

        if (!marketer_key || !amount) {
            return NextResponse.json({ success: false, error: 'Marketer and amount are required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const payload = {
            marketer_key,
            marketer_display_name: marketer_display_name || marketer_key,
            payment_type: payment_type || 'subscription_advance',
            amount: parseFloat(amount || '0'),
            period_start: period_start || null,
            period_end: period_end || null,
            categories_covered: Array.isArray(categories_covered) ? categories_covered : (categories_covered ? [categories_covered] : []),
            payment_date: payment_date || new Date().toISOString().split('T')[0],
            notes: notes || null
        };

        let result;
        if (id) {
            result = await supabase
                .from('marketing_expenses')
                .update(payload)
                .eq('id', id)
                .select('*')
                .single();
        } else {
            result = await supabase
                .from('marketing_expenses')
                .insert(payload)
                .select('*')
                .single();
        }

        if (result.error) throw result.error;

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        console.error('[marketing/expenses POST error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/marketing/expenses
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: 'Expense ID is required' }, { status: 400 });
        }

        const supabase = createServerSupabase();
        if (!supabase) return NextResponse.json({ error: 'DB unavailable' }, { status: 503 });

        const { error } = await supabase
            .from('marketing_expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[marketing/expenses DELETE error]', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
