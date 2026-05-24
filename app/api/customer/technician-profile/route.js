import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Returns only customer-safe fields based on customer_card_fields visibility config
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    try {
        const { data: tech, error } = await supabase
            .from('technicians')
            .select('id, name, photo_url, rating, years_experience, bio, specializations, customer_card_fields')
            .eq('id', id)
            .single()

        if (error || !tech) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

        const fields = tech.customer_card_fields || {
            show_photo: true, show_name: true, show_rating: true,
            show_experience: true, show_bio: false
        }

        // Build a sanitised profile — only include what admin has enabled
        const profile = {
            id: tech.id,
            name: fields.show_name !== false ? tech.name : 'Your Technician',
            photo_url: fields.show_photo !== false ? tech.photo_url : null,
            rating: fields.show_rating !== false ? tech.rating : null,
            years_experience: fields.show_experience !== false ? tech.years_experience : null,
            bio: fields.show_bio ? tech.bio : null,
            specializations: fields.show_experience !== false ? tech.specializations : null,
        }

        return NextResponse.json({ success: true, profile })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
