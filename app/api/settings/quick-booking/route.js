import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Fetch quick booking settings
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('quick_booking_settings')
            .select('*')
            .single()

        if (error && error.code !== 'PGRST116') throw error

        // If no settings exist yet, return defaults
        const settings = data || {
            title: 'Book A Technician Now',
            subtitle: 'Get same day service | Transparent pricing | Licensed technicians',
            serviceable_pincodes: ['400001', '400002', '400003', '400004', '400005', '400008', '400012', '400014', '400050', '400051', '400052', '400053', '400063', '400070', '400077'],
            valid_pincode_message: '✓ We serve here!',
            invalid_pincode_message: '✗ Not serviceable',
            help_text: 'We currently serve Mumbai areas. Call us for other locations.',
            categories: []
        }

        return NextResponse.json({ success: true, data: settings })
    } catch (error) {
        console.error('Error fetching quick booking settings:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update quick booking settings
export async function PUT(request) {
    try {
        const settings = await request.json()

        const { data, error } = await supabase
            .from('quick_booking_settings')
            .upsert({
                id: 1, // Always update the same row
                title: settings.title,
                subtitle: settings.subtitle,
                serviceable_pincodes: settings.serviceable_pincodes,
                valid_pincode_message: settings.valid_pincode_message,
                invalid_pincode_message: settings.invalid_pincode_message,
                help_text: settings.help_text,
                categories: settings.categories || [],
                updated_at: new Date().toISOString()
            })
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data: data[0] })
    } catch (error) {
        console.error('Error updating quick booking settings:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}
