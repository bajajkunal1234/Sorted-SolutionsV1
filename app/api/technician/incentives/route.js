import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';

const parseSlotStartTime = (slotStr) => {
    if (!slotStr) return null;
    const timeRegex = /(\d+)(?::(\d+))?\s*(am|pm)?/i;
    const match = slotStr.match(timeRegex);
    if (!match) return null;
    
    let hours = parseInt(match[1]);
    let minutes = match[2] ? parseInt(match[2]) : 0;
    const ampm = match[3] ? match[3].toLowerCase() : null;
    
    if (ampm === 'pm' && hours < 12) {
        hours += 12;
    } else if (ampm === 'am' && hours === 12) {
        hours = 0;
    }
    return { hours, minutes };
};

const calculateMetricsForMonth = (techId, ledgerId, mStart, mEnd, jobsList, invoicesList, quotationsList, vouchersList) => {
    const techJobs = jobsList.filter(j =>
        (j.assigned_to === techId || j.technician_id === techId) &&
        j.scheduled_date >= mStart && j.scheduled_date <= mEnd
    );
    const completedJobs = techJobs.filter(j => j.status === 'completed');
    const totalJobs = techJobs.length;

    const techInvoices = invoicesList.filter(inv =>
        (inv.technician_id === techId) &&
        inv.date >= mStart && inv.date <= mEnd
    );
    const monthlyRevenue = techInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const uniqueCustomers = new Set(techInvoices.map(inv => inv.account_id).filter(Boolean)).size;
    const revenuePerCustomer = uniqueCustomers > 0 ? Math.round(monthlyRevenue / uniqueCustomers) : 0;
    const workDays = new Set(completedJobs.map(j => j.scheduled_date)).size || 1;
    const revenuePerDay = Math.round(monthlyRevenue / workDays);

    let onTimeCount = 0, lateCount = 0, arrivedCount = 0;
    completedJobs.forEach(j => {
        const arrivedAt = j.arrived_at;
        if (!arrivedAt || !j.scheduled_time) return;
        arrivedCount++;
        const arrivedDate = new Date(arrivedAt);
        const timeParsed = parseSlotStartTime(j.scheduled_time);
        if (timeParsed) {
            const scheduledDt = new Date(j.scheduled_date);
            scheduledDt.setHours(timeParsed.hours, timeParsed.minutes, 0, 0);
            if (arrivedDate <= new Date(scheduledDt.getTime() + 15 * 60 * 1000)) {
                onTimeCount++;
            } else {
                lateCount++;
            }
        } else {
            const [hrs, mins] = j.scheduled_time.split(':').map(Number);
            if (!isNaN(hrs)) {
                const scheduledDt = new Date(j.scheduled_date);
                scheduledDt.setHours(hrs || 0, mins || 0, 0, 0);
                if (arrivedDate <= new Date(scheduledDt.getTime() + 15 * 60 * 1000)) {
                    onTimeCount++;
                } else {
                    lateCount++;
                }
            } else {
                onTimeCount++;
            }
        }
    });
    const onTimeVisits = arrivedCount > 0 ? Math.round((onTimeCount / arrivedCount) * 100) : 0;
    const lateArrivals = arrivedCount > 0 ? Math.round((lateCount / arrivedCount) * 100) : 0;

    const ratedJobs = completedJobs.filter(j => j.customer_rating > 0);
    const goodRatings = ratedJobs.filter(j => j.customer_rating >= 4).length;
    const badRatings = ratedJobs.filter(j => j.customer_rating < 4).length;
    const feedbackAbove4 = ratedJobs.length > 0 ? Math.round((goodRatings / ratedJobs.length) * 100) : 0;
    const feedbackBelow4 = ratedJobs.length > 0 ? Math.round((badRatings / ratedJobs.length) * 100) : 0;

    const totalRating = ratedJobs.reduce((sum, j) => sum + j.customer_rating, 0);
    const avgRating = ratedJobs.length > 0 ? parseFloat((totalRating / ratedJobs.length).toFixed(1)) : 0;

    let repeatCalls = 0;
    completedJobs.forEach(job => {
        const jobDate = new Date(job.scheduled_date);
        const cutoff = new Date(jobDate.getTime() - 14 * 24 * 60 * 60 * 1000);
        const priorJob = completedJobs.find(other =>
            other.id !== job.id &&
            other.customer_id === job.customer_id &&
            new Date(other.scheduled_date) >= cutoff &&
            new Date(other.scheduled_date) < jobDate
        );
        if (priorJob) repeatCalls++;
    });
    const repeatCallPercent = completedJobs.length > 0 ? Math.round((repeatCalls / completedJobs.length) * 100) : 0;

    const techQuotes = quotationsList.filter(q =>
        q.technician_id === techId &&
        q.date >= mStart && q.date <= mEnd
    );
    const approvedQuotes = techQuotes.filter(q => q.status === 'approved' || q.status === 'finalized').length;
    const quoteConversionRate = techQuotes.length > 0 ? Math.round((approvedQuotes / techQuotes.length) * 100) : 0;

    let totalMinutes = 0, timedJobsCount = 0;
    completedJobs.forEach(j => {
        if (j.arrived_at && j.completed_at) {
            const durationMs = new Date(j.completed_at) - new Date(j.arrived_at);
            const durationMins = Math.round(durationMs / (60 * 1000));
            if (durationMins > 0 && durationMins < 480) {
                totalMinutes += durationMins;
                timedJobsCount++;
            }
        }
    });
    const avgJobDuration = timedJobsCount > 0 ? Math.round(totalMinutes / timedJobsCount) : 0;

    const monthPart = mStart.substring(0, 7);
    const alreadyPaid = (vouchersList || [])
        .filter(v => v.account_id === ledgerId && (v.notes || '').includes(monthPart))
        .reduce((sum, v) => sum + (v.amount || 0), 0);

    return {
        onTimeVisits,
        feedbackAbove4,
        revenuePerCustomer,
        revenuePerDay,
        monthlyRevenue,
        feedbackBelow4,
        repeatCallPercent,
        lateArrivals,
        totalJobs,
        completedJobs: completedJobs.length,
        uniqueCustomers,
        ratedJobs: ratedJobs.length,
        arrivedJobs: arrivedCount,
        quoteConversionRate,
        avgJobDuration,
        avgRating,
        alreadyPaid
    };
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')
        const monthParam = searchParams.get('month')
        const yearParam = searchParams.get('year')

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        // Parse month and year, default to current month
        const now = new Date()
        const month = monthParam ? parseInt(monthParam) : now.getMonth() + 1
        const year = yearParam ? parseInt(yearParam) : now.getFullYear()

        // Fetch technician details to get ledger_id
        const { data: tech, error: techError } = await supabase
            .from('technicians')
            .select('id, name, ledger_id')
            .eq('id', technicianId)
            .single()

        if (techError || !tech) {
            console.error('Error fetching technician details:', techError)
            return NextResponse.json(
                { error: 'Technician not found' },
                { status: 404 }
            )
        }

        // Calculate start and end dates for the month
        const mStart = `${year}-${String(month).padStart(2, '0')}-01`
        const mEnd = new Date(year, month, 0).toISOString().split('T')[0]

        // Fetch jobs for this technician in the month
        const { data: jobsList, error: jobsError } = await supabase
            .from('jobs')
            .select('id, assigned_to, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name')
            .eq('technician_id', technicianId)
            .gte('scheduled_date', mStart)
            .lte('scheduled_date', mEnd)

        if (jobsError) {
            console.error('Error fetching jobs:', jobsError)
        }

        // Fetch sales invoices for this technician in the month
        const { data: invoicesList, error: invoicesError } = await supabase
            .from('sales_invoices')
            .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id')
            .eq('technician_id', technicianId)
            .gte('date', mStart)
            .lte('date', mEnd)
            .neq('status', 'cancelled')

        if (invoicesError) {
            console.error('Error fetching invoices:', invoicesError)
        }

        // Fetch quotations for this technician in the month
        const { data: quotationsList, error: quotationsError } = await supabase
            .from('quotations')
            .select('id, status, date, technician_id, job_id')
            .eq('technician_id', technicianId)
            .gte('date', mStart)
            .lte('date', mEnd)
            .neq('status', 'cancelled')

        if (quotationsError) {
            console.error('Error fetching quotations:', quotationsError)
        }

        // Fetch paid vouchers
        let paidVouchers = []
        if (tech.ledger_id) {
            const { data: vouchers, error: vouchersError } = await supabase
                .from('payment_vouchers')
                .select('account_id, amount, notes, date')
                .eq('account_id', tech.ledger_id)
                .ilike('notes', '%Incentive%')

            if (vouchersError) {
                console.error('Error fetching vouchers:', vouchersError)
            } else {
                paidVouchers = vouchers || []
            }
        }

        // Fetch incentive parameters config
        const { data: paramsSetting } = await supabase
            .from('website_settings')
            .select('value')
            .eq('key', 'incentive-parameters')
            .single()

        const defaultParams = [
            { id: 'p1', name: 'On-Time Visits %', type: 'positive', threshold: 95, rewardType: 'fixed', rewardValue: 5000, enabled: true },
            { id: 'p2', name: 'Customer Feedback (4+ stars)', type: 'positive', threshold: 90, rewardType: 'fixed', rewardValue: 3000, enabled: true },
            { id: 'p3', name: 'Revenue Per Customer', type: 'positive', threshold: 2000, rewardType: 'percentage', rewardValue: 5, enabled: true },
            { id: 'p4', name: 'Revenue Per Day', type: 'positive', threshold: 5000, rewardType: 'percentage', rewardValue: 3, enabled: true },
            { id: 'p5', name: 'Monthly Revenue', type: 'positive', threshold: 100000, rewardType: 'fixed', rewardValue: 10000, enabled: true },
            { id: 'p6', name: 'Quotation Conversion %', type: 'positive', threshold: 70, rewardType: 'fixed', rewardValue: 3000, enabled: true },
            { id: 'p7', name: 'Avg Job Duration (Mins)', type: 'positive', threshold: 90, rewardType: 'fixed', rewardValue: 2000, enabled: true },
            { id: 'p8', name: 'Average Rating (out of 5)', type: 'positive', threshold: 4.5, rewardType: 'fixed', rewardValue: 3000, enabled: true },
            { id: 'n1', name: 'Feedback Below 4 Stars', type: 'negative', threshold: 10, rewardType: 'fixed', rewardValue: 4000, enabled: true },
            { id: 'n2', name: 'Repeat Call %', type: 'negative', threshold: 15, rewardType: 'fixed', rewardValue: 2000, enabled: true },
            { id: 'n3', name: 'Late Arrivals %', type: 'negative', threshold: 10, rewardType: 'percentage', rewardValue: 10, enabled: true }
        ]

        let parameters = paramsSetting && paramsSetting.value ? paramsSetting.value : defaultParams
        // Merge with defaults if any are missing
        const mergedParams = [...parameters]
        defaultParams.forEach(dp => {
            if (!mergedParams.some(mp => mp.id === dp.id)) {
                mergedParams.push(dp)
            }
        })

        // Compute metrics
        const metrics = calculateMetricsForMonth(
            technicianId,
            tech.ledger_id,
            mStart,
            mEnd,
            jobsList || [],
            invoicesList || [],
            quotationsList || [],
            paidVouchers
        )

        // Compute incentives
        let total = 0
        const breakdown = []

        mergedParams.forEach(param => {
            if (!param.enabled) return

            let val = 0
            let qualifies = false

            switch (param.id) {
                case 'p1': val = metrics.onTimeVisits; qualifies = val >= param.threshold; break;
                case 'p2': val = metrics.feedbackAbove4; qualifies = val >= param.threshold; break;
                case 'p3': val = metrics.revenuePerCustomer; qualifies = val >= param.threshold; break;
                case 'p4': val = metrics.revenuePerDay; qualifies = val >= param.threshold; break;
                case 'p5': val = metrics.monthlyRevenue; qualifies = val >= param.threshold; break;
                case 'p6': val = metrics.quoteConversionRate; qualifies = val >= param.threshold; break;
                case 'p7': val = metrics.avgJobDuration; qualifies = val > 0 && val <= param.threshold; break;
                case 'p8': val = metrics.avgRating; qualifies = val >= param.threshold; break;
                case 'n1': val = metrics.feedbackBelow4; qualifies = val > param.threshold; break;
                case 'n2': val = metrics.repeatCallPercent; qualifies = val > param.threshold; break;
                case 'n3': val = metrics.lateArrivals; qualifies = val > param.threshold; break;
            }

            if (qualifies) {
                let amount = 0
                if (param.rewardType === 'fixed') {
                    amount = param.rewardValue
                } else {
                    amount = (val * param.rewardValue) / 100
                }

                if (param.type === 'negative') {
                    amount = -amount
                }

                total += amount
                breakdown.push({
                    category: param.name,
                    amount,
                    description: param.type === 'negative' 
                        ? `Penalty: ${param.name} (${val}%)` 
                        : `Reward: ${param.name} (${param.rewardType === 'fixed' ? 'Fixed' : param.rewardValue + '%'})`
                })
            }
        })

        const totalIncentive = Math.max(0, total)

        return NextResponse.json({
            success: true,
            data: {
                period: `${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`,
                metrics: {
                    jobsCompleted: metrics.completedJobs,
                    revenueGenerated: metrics.monthlyRevenue,
                    rating: metrics.avgRating
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
