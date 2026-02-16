import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .order('name')

        if (error) {
            console.error('Error fetching products:', error)
            return NextResponse.json(
                { error: 'Failed to fetch products' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            products: products || []
        })

    } catch (error) {
        console.error('Error in products API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
