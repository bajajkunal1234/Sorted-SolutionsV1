import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

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

        // Validate active session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single()

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        let query = supabase
            .from('expenses')
            .select('*')
            .eq('technician_id', technicianId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })

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

        // Validate active session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', expenseData.technician_id)
            .single()

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        // Validate date: must not be future-dated and must be within the last 48 hours (in local India timezone UTC+5:30)
        const rawDate = expenseData.date || new Date().toISOString().split('T')[0];
        const expenseDate = rawDate.split('T')[0];

        // Reference time for submission: if queued offline, check client_submitted_at
        let refTimestamp = Date.now();
        if (expenseData.client_submitted_at) {
            const clientTime = new Date(expenseData.client_submitted_at).getTime();
            // Valid if not in the future (with 5 min leeway for clock skew) and within last 30 days
            if (!isNaN(clientTime) && clientTime <= (Date.now() + 5 * 60 * 1000) && clientTime >= (Date.now() - 30 * 24 * 60 * 60 * 1000)) {
                refTimestamp = clientTime;
            }
        }

        const d = new Date(refTimestamp);
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const nd = new Date(utc + (3600000 * 5.5)); // Reference time in IST
        const todayStr = nd.toISOString().split('T')[0];

        // 48 hours (2 days) window in IST
        const limit48h = new Date(nd.getTime() - (2 * 24 * 60 * 60 * 1000));
        const limit48hStr = limit48h.toISOString().split('T')[0];

        if (expenseDate > todayStr) {
            return NextResponse.json(
                { error: 'Future-dated expenses are not allowed. Please select today or a date within the last 48 hours.' },
                { status: 400 }
            );
        }

        if (expenseDate < limit48hStr) {
            return NextResponse.json(
                { error: 'Expenses must be submitted within 48 hours of receipt date.' },
                { status: 400 }
            );
        }

        // Insert expense
        const nowIso = new Date().toISOString();
        const submittedDateIso = (refTimestamp !== Date.now()) 
            ? new Date(refTimestamp).toISOString() 
            : nowIso;

        // Exclude ephemeral client fields from DB payload
        const { client_submitted_at, ...dbPayload } = expenseData;

        const { data: expense, error } = await supabase
            .from('expenses')
            .insert({
                ...dbPayload,
                status: 'pending',
                date: expenseDate,
                submitted_date: submittedDateIso,
                created_at: submittedDateIso
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
        logInteractionServer({
            type: 'expense-submitted',
            category: 'expense',
            performedBy: expenseData.technician_id,
            performedByName: expenseData.technician_name || 'Technician',
            description: `Expense submitted: ${expenseData.category} — ₹${expenseData.amount}${expenseData.description ? ' (' + expenseData.description + ')' : ''}`,
            metadata: { 
                expense_id: expense.id, 
                category: expenseData.category, 
                amount: expenseData.amount,
                latitude: expenseData.latitude || null,
                longitude: expenseData.longitude || null
            },
            source: 'Technician App',
        });

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

        // Validate active session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single()

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
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

