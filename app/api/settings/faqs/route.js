import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// GET - Fetch all FAQs
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_faqs')
            .select('*')
            .eq('active', true)
            .order('order_index', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Error fetching FAQs:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Create new FAQ
export async function POST(request) {
    try {
        const faq = await request.json()
        const { data, error } = await supabase
            .from('website_faqs')
            .insert([faq])
            .select()

        if (error) throw error
        return NextResponse.json({ success: true, data: data[0] })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update FAQ
export async function PUT(request) {
    try {
        const { faqs } = await request.json()

        const updates = faqs.map(faq =>
            supabase
                .from('website_faqs')
                .update({
                    question: faq.question,
                    answer: faq.answer,
                    order_index: faq.order_index,
                    active: faq.active
                })
                .eq('id', faq.id)
        )

        await Promise.all(updates)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete FAQ
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const { error } = await supabase.from('website_faqs').delete().eq('id', id)
        if (error) throw error
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
