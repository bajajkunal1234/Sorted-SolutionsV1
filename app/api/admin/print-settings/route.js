import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// Columns that actually exist in the print_settings table
const ALLOWED_COLUMNS = [
    'company_name', 'company_address', 'company_phone', 'company_email',
    'gst_number', 'logo_url', 'show_logo', 'show_gst', 'show_terms',
    'paper_size', 'font_size', 'include_signature', 'template_style',
    'gst_breakdown', 'invoice_terms', 'quotation_terms', 'rental_terms', 'amc_terms'
];

// GET - Fetch print settings
export async function GET() {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
        }

        const { data, error } = await supabase
            .from('print_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('[print-settings GET]', error.message);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: data || null });
    } catch (error) {
        console.error('[print-settings GET] unexpected:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT - Create or update print settings
export async function PUT(request) {
    try {
        const supabase = createServerSupabase();
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database connection missing' }, { status: 500 });
        }

        let body;
        try {
            body = await request.json();
        } catch (parseErr) {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
        }

        const { id, created_at, updated_at, ...rawUpdates } = body;

        // Strip any fields not in the actual DB schema
        const updates = {};
        ALLOWED_COLUMNS.forEach(col => {
            if (rawUpdates[col] !== undefined) updates[col] = rawUpdates[col];
        });

        let result;
        if (id) {
            result = await supabase
                .from('print_settings')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
        } else {
            result = await supabase
                .from('print_settings')
                .insert([updates])
                .select()
                .single();
        }

        if (result.error) {
            console.error('[print-settings PUT]', result.error.message);
            return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (error) {
        console.error('[print-settings PUT] unexpected:', error.message);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
