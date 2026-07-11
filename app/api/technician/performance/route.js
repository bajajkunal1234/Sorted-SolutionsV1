import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const startDate = searchParams.get('startDate') // YYYY-MM-DD
        const endDate = searchParams.get('endDate') // YYYY-MM-DD

        if (!technicianId || !startDate || !endDate) {
            return NextResponse.json(
                { error: 'technicianId, startDate, and endDate are required' },
                { status: 400 }
            )
        }

        // Validate session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single()

        if (techError || !tech) {
            return NextResponse.json({ error: 'Technician not found' }, { status: 404 })
        }

        if (!tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        // Fetch parallel data from DB
        const [jobsRes, invoicesRes, quotationsRes] = await Promise.all([
            // 1. Jobs List
            supabase
                .from('jobs')
                .select('id, job_number, customer_name, status, scheduled_date, completed_at, customer_rating')
                .eq('technician_id', technicianId)
                .gte('scheduled_date', startDate)
                .lte('scheduled_date', endDate),
            
            // 2. Sales Invoices
            supabase
                .from('sales_invoices')
                .select('id, total_amount, date, job_id')
                .eq('technician_id', technicianId)
                .gte('date', startDate)
                .lte('date', endDate)
                .neq('status', 'cancelled'),

            // 3. Quotations
            supabase
                .from('quotations')
                .select('id, status, date, job_id')
                .eq('technician_id', technicianId)
                .gte('date', startDate)
                .lte('date', endDate)
                .neq('status', 'cancelled')
        ])

        const rawJobs = jobsRes.data || []
        const rawInvoices = invoicesRes.data || []
        const rawQuotations = quotationsRes.data || []

        const jobIds = new Set(rawJobs.map(j => j.id))
        
        // Fetch all visits by tech or on tech's jobs
        const { data: allVisits } = await supabase
            .from('job_interactions')
            .select('id, job_id')
            .eq('type', 'on-way')
            .gte('created_at', `${startDate}T00:00:00.000Z`)
            .lte('created_at', `${endDate}T23:59:59.999Z`)
        
        const visitsDone = (allVisits || []).filter(v => jobIds.has(v.job_id)).length

        // Calculations
        const jobsAssigned = rawJobs.length
        const completedJobs = rawJobs.filter(j => j.status === 'completed' || j.status === 'closed')
        const jobsClosed = completedJobs.length
        
        const quotationsCreated = rawQuotations.length
        const invoicesCreated = rawInvoices.length

        const ratedJobs = completedJobs.filter(j => j.customer_rating && j.customer_rating > 0)
        const feedbacksTaken = ratedJobs.length
        const totalRatingSum = ratedJobs.reduce((sum, j) => sum + j.customer_rating, 0)
        const avgRating = feedbacksTaken > 0 ? parseFloat((totalRatingSum / feedbacksTaken).toFixed(1)) : 0

        let totalDaysToClose = 0
        let closeCount = 0
        completedJobs.forEach(j => {
            if (j.completed_at && j.scheduled_date) {
                const closeMs = new Date(j.completed_at) - new Date(j.scheduled_date)
                const closeDays = Math.round(closeMs / (1000 * 60 * 60 * 24))
                totalDaysToClose += Math.max(0, closeDays)
                closeCount++
            }
        })
        const avgDaysToClose = closeCount > 0 ? parseFloat((totalDaysToClose / closeCount).toFixed(1)) : 0

        const revenueGenerated = rawInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)

        const approvedQuotes = rawQuotations.filter(q => q.status === 'approved' || q.status === 'finalized').length
        const conversionRate = quotationsCreated > 0 ? Math.round((approvedQuotes / quotationsCreated) * 100) : 0

        const avgRevenuePerJob = jobsClosed > 0 ? Math.round(revenueGenerated / jobsClosed) : 0
        const feedbackRate = jobsClosed > 0 ? Math.round((feedbacksTaken / jobsClosed) * 100) : 0

        // Enrich Job List with revenue generated from invoices
        const jobsList = rawJobs.map(job => {
            const invoices = rawInvoices.filter(inv => inv.job_id === job.id)
            const revenue = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
            const quotes = rawQuotations.filter(q => q.job_id === job.id)
            const visits = (allVisits || []).filter(v => v.job_id === job.id).length
            return {
                id: job.id,
                job_number: job.job_number,
                customer_name: job.customer_name,
                scheduled_date: job.scheduled_date,
                status: job.status,
                completed_at: job.completed_at,
                customer_rating: job.customer_rating || null,
                revenue,
                visits_count: visits,
                has_quotation: quotes.length > 0,
                is_quote_approved: quotes.some(q => q.status === 'approved' || q.status === 'finalized'),
                has_invoice: invoices.length > 0
            }
        })

        return NextResponse.json({
            success: true,
            data: {
                metrics: {
                    jobsAssigned,
                    visitsDone,
                    jobsClosed,
                    quotationsCreated,
                    invoicesCreated,
                    feedbacksTaken,
                    avgRating,
                    avgDaysToClose,
                    revenueGenerated,
                    conversionRate,
                    avgRevenuePerJob,
                    feedbackRate
                },
                jobsList
            }
        })

    } catch (error) {
        console.error('Error in technician performance aggregation route:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
