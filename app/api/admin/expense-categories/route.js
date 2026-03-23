import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

const SETTINGS_KEY = 'expense-categories'

const DEFAULT_CATEGORIES = [
    { id: 'travel', name: 'Travel', daily_limit: 500, color: '#3b82f6' },
    { id: 'food', name: 'Food', daily_limit: 300, color: '#10b981' },
    { id: 'parts', name: 'Parts', daily_limit: 2000, color: '#f59e0b' },
    { id: 'tools', name: 'Tools', daily_limit: 1000, color: '#8b5cf6' },
    { id: 'other', name: 'Other', daily_limit: 500, color: '#6b7280' },
]

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', SETTINGS_KEY)
            .single()

        if (error && error.code !== 'PGRST116') throw error

        const categories = data?.value || DEFAULT_CATEGORIES
        return NextResponse.json({ success: true, categories })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const { categories } = await request.json()
        if (!Array.isArray(categories)) {
            return NextResponse.json({ error: 'categories must be an array' }, { status: 400 })
        }

        const { error } = await supabase
            .from('website_settings')
            .upsert({ key: SETTINGS_KEY, value: categories, description: 'Expense categories with daily limits' }, { onConflict: 'key' })

        if (error) throw error
        return NextResponse.json({ success: true, categories })
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
