import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const { data: brands, error } = await supabase
            .from('brands')
            .select('*')
            .eq('active', true)
            .order('name')

        if (error) {
            console.error('Error fetching brands:', error)
            return NextResponse.json(
                { error: 'Failed to fetch brands' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            brands: brands || []
        })

    } catch (error) {
        console.error('Error in brands API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
