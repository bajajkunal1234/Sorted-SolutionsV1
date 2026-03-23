import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        let query = supabase
            .from('expenses')
            .select('*')
            .eq('technician_id', technicianId)
            .order('date', { ascending: false })

        // Filter by date range if provided
        if (startDate) {
            query = query.gte('date', startDate)
        }
        if (endDate) {
            query = query.lte('date', endDate)
        }

        const { data: expenses, error } = await query

        if (error) {
            console.error('Error fetching expenses:', error)
            return NextResponse.json(
                { error: 'Failed to fetch expenses' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            expenses,
            count: expenses.length
        })

    } catch (error) {
        console.error('Error in expenses API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(request) {
    try {
        const expenseData = await request.json()
        // Validate required fields
        if (!expenseData.technician_id || !expenseData.amount || !expenseData.category) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Insert expense
        const { data: expense, error } = await supabase
            .from('expenses')
            .insert({
                ...expenseData,
                status: 'pending',
                date: expenseData.date || new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Error creating expense:', error)
            return NextResponse.json(
                { error: 'Failed to create expense' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            expense,
            message: 'Expense submitted successfully'
        })

    } catch (error) {
        console.error('Error in expense creation API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
