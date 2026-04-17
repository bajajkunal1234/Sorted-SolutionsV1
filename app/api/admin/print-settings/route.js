import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Columns that exist in the print_settings table
const ALLOWED_COLUMNS = [
    'company_name', 'company_address', 'company_phone', 'company_email',
    'gst_number', 'pan', 'website', 'logo_url',
    'show_logo', 'show_gst', 'show_terms',
    'paper_size', 'font_size', 'include_signature', 'template_style',
    'gst_breakdown', 'invoice_terms', 'quotation_terms', 'rental_terms', 'amc_terms'
]

// GET - Fetch print settings
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('print_settings')
            .select('*')
            .limit(1)

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: (data && data[0]) || null })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Create or update print settings
export async function PUT(request) {
    try {
        let body
        try {
            body = await request.json()
        } catch {
            return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
        }

        const { id, created_at, updated_at, ...rawUpdates } = body

        // Strip fields not in the DB schema
        const updates = {}
        ALLOWED_COLUMNS.forEach(col => {
            if (rawUpdates[col] !== undefined) updates[col] = rawUpdates[col]
        })

        let result
        if (id) {
            result = await supabase
                .from('print_settings')
                .update(updates)
                .eq('id', id)
                .select()
                .single()
        } else {
            result = await supabase
                .from('print_settings')
                .insert([updates])
                .select()
                .single()
        }

        if (result.error) {
            return NextResponse.json({ success: false, error: result.error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, data: result.data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
