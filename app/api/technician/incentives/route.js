import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const month = searchParams.get('month') || new Date().getMonth() + 1
        const year = searchParams.get('year') || new Date().getFullYear()

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        // Calculate start and end dates for the month
        const startDate = new Date(year, month - 1, 1).toISOString()
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

        // Fetch completed jobs for the technician in the given month
        const { data: jobs, error } = await supabase
            .from('jobs')
            .select('id, amount, status, completed_at')
            .eq('assigned_to', technicianId)
            .eq('status', 'completed')
            .gte('completed_at', startDate)
            .lte('completed_at', endDate)

        if (error) {
            console.error('Error fetching incentives data:', error)
            return NextResponse.json(
                { error: 'Failed to fetch incentives data' },
                { status: 500 }
            )
        }

        // Calculate metrics
        const jobsCompleted = jobs.length
        const revenueGenerated = jobs.reduce((sum, job) => sum + (parseFloat(job.amount) || 0), 0)

        // Mock rating for now (random between 4.5 and 5.0)
        const rating = (4.5 + Math.random() * 0.5).toFixed(1)

        // Incentive Logic
        // Simple Example: 10% of revenue + 50 per job if rating > 4.5
        const revenueIncentive = revenueGenerated * 0.10
        const jobBonus = rating >= 4.5 ? jobsCompleted * 50 : 0
        const totalIncentive = revenueIncentive + jobBonus

        // Incentive Breakdown
        const breakdown = [
            {
                category: 'Revenue Share (10%)',
                amount: revenueIncentive,
                description: `10% of ₹${revenueGenerated.toLocaleString()}`
            },
            {
                category: 'Performance Bonus',
                amount: jobBonus,
                description: rating >= 4.5 ? `₹50 per job (Rating ${rating} > 4.5)` : 'Rating below 4.5'
            }
        ]

        return NextResponse.json({
            success: true,
            data: {
                period: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
                metrics: {
                    jobsCompleted,
                    revenueGenerated,
                    rating
                },
                incentive: {
                    total: totalIncentive,
                    breakdown
                }
            }
        })

    } catch (error) {
        console.error('Error in incentives API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
