import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/technician/stock
 * Retrieves physical stock for the logged-in technician.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json({ success: false, error: 'Technician ID is required' }, { status: 400 });
        }

        // Validate active session
        const sessionToken = request.headers.get('x-session-token');
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single();

        if (!tech || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
        }

        // Fetch stock records joined with inventory details
        const { data: stock, error } = await supabase
            .from('technician_stock')
            .select(`
                id,
                quantity,
                product_id,
                inventory (
                    id,
                    name,
                    category,
                    sku
                )
            `)
            .eq('technician_id', technicianId)
            .gt('quantity', 0) // Only return items with quantity > 0
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Flatten inventory structure for simpler frontend consumption
        const formattedStock = (stock || []).map(st => ({
            id: st.id,
            product_id: st.product_id,
            quantity: st.quantity,
            name: st.inventory?.name || 'Unknown Spare Part',
            category: st.inventory?.category || 'General',
            sku: st.inventory?.sku || ''
        }));

        return NextResponse.json({
            success: true,
            stock: formattedStock
        });

    } catch (error) {
        console.error('[API/technician/stock GET Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
