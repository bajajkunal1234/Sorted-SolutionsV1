import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/technician-timeline
 * Returns the recent 200 interaction logs for a specific technician.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'technicianId parameter is required' }, { status: 400 })
        }

        const { data: interactions, error } = await supabase
            .from('interactions')
            .select('*')
            .eq('performed_by', technicianId)
            .order('timestamp', { ascending: false })
            .limit(200)

        if (error) throw error

        return NextResponse.json({ success: true, data: interactions || [] })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
