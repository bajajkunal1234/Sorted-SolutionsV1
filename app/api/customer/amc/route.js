import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Helper: fetch available AMC plans (public, no auth)
async function getAMCPlans() {
    const { data, error } = await supabase
        .from('amc_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
    return { data, error }
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')
        const plansOnly = searchParams.get('plans') === 'true'

        // Return public plans list
        if (plansOnly) {
            const { data: plans, error } = await getAMCPlans()
            if (error) {
                // If table doesn't exist yet, return empty
                return NextResponse.json({ success: true, plans: [] })
            }
            return NextResponse.json({ success: true, plans: plans || [] })
        }

        if (!customerId) {
            return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
        }

        // Resolve the ledger_id for the given customerId
        const { data: cx } = await supabase.from('customers').select('ledger_id').eq('id', customerId).single()
        const accountId = cx?.ledger_id || customerId

        // Try to fetch customer's AMC contracts
        const { data: contracts, error: contractsError } = await supabase
            .from('active_amcs')
            .select(`
                *,
                amc_plan:amc_plans(id, name, category, price, duration, services)
            `)
            .or(`customer_id.eq.${customerId},customer_id.eq.${accountId}`)
            .order('created_at', { ascending: false })

        // If table doesn't exist, return empty state gracefully
        if (contractsError) {
            console.warn('active_amcs fetch error:', contractsError.message)
            const { data: plans } = await getAMCPlans()
            return NextResponse.json({
                success: true,
                contracts: [],
                plans: plans || [],
                tableReady: false
            })
        }

        const { data: plans } = await getAMCPlans()

        // Transform contracts
        const transformed = (contracts || []).map(c => ({
            id: c.id,
            planName: c.amc_plan?.name || c.plan_name || 'AMC Contract',
            category: c.amc_plan?.category || c.category || c.product_type || 'Appliance',
            price: c.amc_plan?.price || c.amc_amount || c.total_amount || 0,
            startDate: c.start_date,
            endDate: c.end_date,
            status: c.status || 'active',
            productBrand: c.product_brand || '',
            productModel: c.product_model || '',
            productType: c.product_type || c.category || 'Appliance',
            servicesTotal: c.services_total || c.total_services || 4,
            servicesUsed: c.services_used || 0,
            nextServiceDate: c.next_service_date,
            servicesRemaining: c.services_remaining || {},
        }))

        return NextResponse.json({
            success: true,
            contracts: transformed,
            plans: plans || [],
            tableReady: true
        })

    } catch (error) {
        console.error('AMC API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
