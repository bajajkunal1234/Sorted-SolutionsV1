import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { productCategories } from '@/lib/data/inventoryData'

export async function GET() {
    try {
        // Try to fetch from a dedicated table if it exists, otherwise fallback to static data
        const { data, error } = await supabase
            .from('inventory_categories')
            .select('*')
            .order('name', { ascending: true })

        if (error) {
            // If table doesn't exist or other error, return static categories as fallback
            console.log('Falling back to static inventory categories');
            return NextResponse.json({ success: true, data: productCategories });
        }

        return NextResponse.json({ success: true, data: data && data.length > 0 ? data : productCategories })
    } catch (error) {
        // Ultimate fallback to ensure the UI doesn't break
        return NextResponse.json({ success: true, data: productCategories })
    }
}
