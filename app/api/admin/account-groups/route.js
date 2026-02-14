import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET - Fetch all account groups
export async function GET() {
    try {
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
        const body = await request.json();

        // Basic validation
        if (!body.name || !body.parent) {
            return NextResponse.json({ success: false, error: 'Name and Parent Group are required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('account_groups')
            .insert([body])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
