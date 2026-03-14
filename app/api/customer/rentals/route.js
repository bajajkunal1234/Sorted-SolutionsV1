import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

// Transform DB snake_case row → camelCase for customer frontend
function transformPlan(p) {
    return {
        id: p.id,
        productName: p.product_name,
        name: p.product_name,        // fallback alias
        category: p.category,
        tenureOptions: p.tenure_options || [],
        includedServices: p.included_services || [],
        freeVisits: p.free_visits || 0,
        terms: p.terms || '',
        isActive: p.is_active,
        createdAt: p.created_at,
    }
}

// Helper: fetch available rental plans (public)
async function getRentalPlans() {
    const { data, error } = await supabase
        .from('rental_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
    return { data: (data || []).map(transformPlan), error }
}


export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')
        const plansOnly = searchParams.get('plans') === 'true'

        // Return public plans list
        if (plansOnly) {
            const { data: plans } = await getRentalPlans()
            return NextResponse.json({ success: true, plans: plans || [] })
        }

        if (!customerId) {
            return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
        }

        // Try to fetch customer's active rentals
        const { data: rentals, error: rentalsError } = await supabase
            .from('active_rentals')
            .select('*')
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false })

        if (rentalsError) {
            console.warn('active_rentals table not ready:', rentalsError.message)
            const { data: plans } = await getRentalPlans()
            return NextResponse.json({
                success: true,
                rentals: [],
                plans: plans || [],
                tableReady: false
            })
        }

        const { data: plans } = await getRentalPlans()

        const transformed = (rentals || []).map(r => ({
            id: r.id,
            productName: r.product_name,
            productType: r.product_type,
            serialNumber: r.serial_number,
            monthlyRent: r.monthly_rent,
            securityDeposit: r.security_deposit,
            startDate: r.start_date,
            endDate: r.end_date,
            tenureDuration: r.tenure_duration,
            tenureUnit: r.tenure_unit,
            nextRentDueDate: r.next_rent_due_date,
            status: r.status,
            lastPaymentDate: r.last_payment_date,
        }))

        return NextResponse.json({
            success: true,
            rentals: transformed,
            plans: plans || [],
            tableReady: true
        })

    } catch (error) {
        console.error('Rentals API error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
