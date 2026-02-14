import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const { data: issues, error } = await supabase
            .from('issues')
            .select('*')
            .eq('active', true)
            .order('name')

        if (error) {
            console.error('Error fetching issues:', error)
            return NextResponse.json(
                { error: 'Failed to fetch issues' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            issues: issues || []
        })

    } catch (error) {
        console.error('Error in issues API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
