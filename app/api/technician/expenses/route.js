import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

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
        // Validate required fields (including receipt)
        if (!expenseData.technician_id || !expenseData.amount || !expenseData.category || !expenseData.receipt) {
            return NextResponse.json(
                { error: 'Missing required fields (including receipt image)' },
                { status: 400 }
            )
        }

        // Validate date is not past-dated (in local India timezone UTC+5:30)
        const expenseDate = expenseData.date || new Date().toISOString().split('T')[0];
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const nd = new Date(utc + (3600000 * 5.5));
        const todayStr = nd.toISOString().split('T')[0];

        if (expenseDate < todayStr) {
            return NextResponse.json(
                { error: 'Back-dated expenses are not allowed. Please select today or a future date.' },
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

        // Log interaction for expense submission
        supabase.from('interactions').insert({
            type: 'expense-submitted',
            category: 'expense',
            performed_by: expenseData.technician_id,
            performed_by_name: expenseData.technician_name || 'Technician',
            description: `Expense submitted: ${expenseData.category} — ₹${expenseData.amount}${expenseData.description ? ' (' + expenseData.description + ')' : ''}`,
            metadata: { expense_id: expense.id, category: expenseData.category, amount: expenseData.amount },
            source: 'Technician App',
            status: 'completed',
            timestamp: new Date().toISOString(),
        }).then(() => {}).catch(() => {});

        // Insert in-app notification for admin
        supabase.from('app_notifications').insert({
            recipient_type: 'admin',
            recipient_id: 'admin',
            title: 'New Expense Request 💰',
            message: `${expenseData.technician_name || 'A technician'} submitted a new ${expenseData.category} expense request of ₹${expenseData.amount}.`,
            link: '/admin',
            is_read: false
        }).then(() => {}).catch((err) => console.error('Error creating admin notification:', err));

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

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const technicianId = searchParams.get('technicianId')

        if (!id || !technicianId) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            )
        }

        // Delete expense but only if it belongs to this technician and status is 'pending'
        const { data, error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id)
            .eq('technician_id', technicianId)
            .eq('status', 'pending')
            .select()
            .single()

        if (error) {
            console.error('Error deleting expense:', error)
            return NextResponse.json(
                { error: 'Failed to delete expense or expense is not pending' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            success: true,
            message: 'Expense deleted successfully',
            expense: data
        })

    } catch (error) {
        console.error('Error in expense deletion API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

