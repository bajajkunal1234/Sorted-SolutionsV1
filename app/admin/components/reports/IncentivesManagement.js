'use client'

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Settings, Save, BarChart3, Calendar, Users, CheckCircle, AlertCircle, Award, Star, User, ChevronRight, DollarSign, Briefcase, RefreshCcw, Loader2 } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI } from '@/lib/adminAPI';
import JobDetailModal from '../JobDetailModal';

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

const isServiceChargeOnlyInvoice = (inv) => {
    const items = inv.items || [];
    if (items.length === 0) return true;
    return items.every(item => {
        const desc = (item.description || item.name || '').toLowerCase();
        return desc.includes('service charge') || desc.includes('visiting charge') || desc.includes('visiting fee') || desc.includes('diagnostic charge');
    });
};

const calculateMetricsForMonth = (techId, ledgerId, mStart, mEnd, jobsList, invoicesList, interactionsList, quotationsList) => {
    // 1. Filter jobs for this technician in this month
    const techJobs = jobsList.filter(j =>
        (j.technician_id === techId) &&
        j.scheduled_date >= mStart && j.scheduled_date <= mEnd
    );
    const totalJobs = techJobs.length;

    // 2. Filter invoices for this technician in this month
    const techInvoices = invoicesList.filter(inv =>
        (inv.technician_id === techId) &&
        inv.date >= mStart && inv.date <= mEnd
    );

    // 3. Revenue total (excluding service-charge-only invoices)
    const repairInvoices = techInvoices.filter(inv => !isServiceChargeOnlyInvoice(inv));
    const totalRevenue = repairInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

    // 4. Visits Done (arrived_at is set, or status is post-arrival/closed)
    const visitedJobs = techJobs.filter(j => !!j.arrived_at);
    const visitsCount = visitedJobs.length;

    // 5. Jobs Closed
    const closedJobs = techJobs.filter(j => j.status === 'closed');
    const closedCount = closedJobs.length;

    // 6. Outcomes: Repair Done vs Closed without Repair
    let repairDoneCount = 0;
    let closedWithoutRepairCount = 0;

    closedJobs.forEach(job => {
        // Find closure interaction
        const closureInt = (interactionsList || []).find(i => 
            i.job_id === job.id && (i.type === 'job-closed' || i.type === 'close-call-no-service')
        );

        let isRepair = false;
        
        // Find invoices for this job
        const jobInvoices = techInvoices.filter(inv => inv.job_id === job.id);
        const hasInvoice = jobInvoices.length > 0;
        
        if (hasInvoice) {
            // Check if any invoice is NOT "only service charge"
            const hasRealRepairInvoice = jobInvoices.some(inv => !isServiceChargeOnlyInvoice(inv));
            if (hasRealRepairInvoice) {
                isRepair = true;
            }
        }
        
        if (closureInt) {
            if (closureInt.type === 'close-call-no-service') {
                isRepair = false;
            } else {
                const outcome = closureInt.metadata?.repair_outcome;
                if (outcome !== 'Repair Done') {
                    isRepair = false;
                }
            }
        }

        if (isRepair) {
            repairDoneCount++;
        } else {
            closedWithoutRepairCount++;
        }
    });

    // Calculate days to close
    let totalDaysToClose = 0;
    let closedJobsWithDays = 0;
    closedJobs.forEach(job => {
        const assignInt = (interactionsList || []).find(i => i.job_id === job.id && i.type === 'job-assigned');
        const assignTime = assignInt ? new Date(assignInt.timestamp) : new Date(job.created_at);

        const closureInt = (interactionsList || []).find(i => 
            i.job_id === job.id && (i.type === 'job-closed' || i.type === 'close-call-no-service')
        );
        const closureTime = closureInt ? new Date(closureInt.timestamp) : (job.completed_at ? new Date(job.completed_at) : null);

        if (closureTime && assignTime) {
            const d1 = new Date(closureTime);
            const d2 = new Date(assignTime);
            d1.setHours(0,0,0,0);
            d2.setHours(0,0,0,0);

            const diffTime = d1.getTime() - d2.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            const daysToClose = Math.max(1, diffDays + 1);

            totalDaysToClose += daysToClose;
            closedJobsWithDays++;
            job.days_to_close = daysToClose;
        } else {
            job.days_to_close = null;
        }
    });
    const avgDaysToClose = closedJobsWithDays > 0 ? parseFloat((totalDaysToClose / closedJobsWithDays).toFixed(1)) : 0;

    // 7. Conversion Ratio
    const conversionRatio = closedCount > 0 ? Math.round((repairDoneCount / closedCount) * 100) : 0;

    // 8. Avg Revenue per Job (among closed jobs)
    const avgRevenuePerJob = closedCount > 0 ? Math.round(totalRevenue / closedCount) : 0;

    // 9. Feedback rate
    const feedbackCount = techJobs.filter(j => j.customer_rating > 0).length;
    const feedbackRate = closedCount > 0 ? Math.round((feedbackCount / closedCount) * 100) : 0;

    // 10. Avg rating
    const ratedJobs = techJobs.filter(j => j.customer_rating > 0);
    const avgRating = ratedJobs.length > 0
        ? parseFloat((ratedJobs.reduce((sum, j) => sum + j.customer_rating, 0) / ratedJobs.length).toFixed(1))
        : 0;

    // 11. Quotations Count
    const techQuotations = (quotationsList || []).filter(q => {
        if (q.technician_id === techId) return true;
        const linkedJob = (jobsList || []).find(j => j.id === q.job_id);
        return linkedJob && linkedJob.technician_id === techId;
    }).filter(q => q.date >= mStart && q.date <= mEnd);
    const quotationsCount = techQuotations.length;

    return {
        visitsCount,
        closedCount,
        repairDoneCount,
        closedWithoutRepairCount,
        conversionRatio,
        totalRevenue,
        avgRevenuePerJob,
        feedbackCount,
        feedbackRate,
        avgRating,
        totalJobs,
        techJobs,
        techInvoices,
        quotationsCount,
        techQuotations,
        avgDaysToClose,
        totalDaysToClose,
        closedJobsWithDays
    };
};

const evaluatePerformanceTargets = (techsList, paramsList) => {
    return techsList.map(tech => {
        const breakdown = [];
        const metrics = tech.currentMetrics;

        paramsList.forEach(param => {
            if (!param.enabled) return;

            let metricValue = 0;
            let qualifies = false;

            switch (param.id) {
                case 't1': metricValue = metrics.visitsCount; qualifies = metricValue >= param.threshold; break;
                case 't2': metricValue = metrics.closedCount; qualifies = metricValue >= param.threshold; break;
                case 't3': metricValue = metrics.conversionRatio; qualifies = metricValue >= param.threshold; break;
                case 't4': metricValue = metrics.totalRevenue; qualifies = metricValue >= param.threshold; break;
                case 't5': metricValue = metrics.avgRevenuePerJob; qualifies = metricValue >= param.threshold; break;
                case 't6': metricValue = metrics.feedbackRate; qualifies = metricValue >= param.threshold; break;
                case 't7': metricValue = metrics.avgRating; qualifies = metricValue >= param.threshold; break;
                case 't8': metricValue = metrics.avgDaysToClose; qualifies = metricValue > 0 && metricValue <= param.threshold; break;
            }

            breakdown.push({
                id: param.id,
                name: param.name,
                target: param.threshold,
                actual: metricValue,
                achieved: qualifies
            });
        });

        const achievedCount = breakdown.filter(b => b.achieved).length;
        const totalTargets = breakdown.length;
        const scorePercent = totalTargets > 0 ? Math.round((achievedCount / totalTargets) * 100) : 0;

        return {
            ...tech,
            scorePercent,
            achievedCount,
            totalTargets,
            breakdown
        };
    });
};

const calculateDailyPerformance = (techJobs, techInvoices, interactionsList, mStart, mEnd) => {
    const start = new Date(mStart);
    const end = new Date(mEnd);
    const dailyMap = {};

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dayStr = `${year}-${month}-${day}`;
        dailyMap[dayStr] = {
            date: dayStr,
            visits: 0,
            closed: 0,
            repairDone: 0,
            closedWithoutRepair: 0,
            revenue: 0,
        };
    }

    (techJobs || []).forEach(job => {
        const dayStr = job.scheduled_date;
        if (dailyMap[dayStr]) {
            const isVisited = !!job.arrived_at;
            if (isVisited) {
                dailyMap[dayStr].visits++;
            }

            if (job.status === 'closed') {
                dailyMap[dayStr].closed++;

                const closureInt = (interactionsList || []).find(i => 
                    i.job_id === job.id && (i.type === 'job-closed' || i.type === 'close-call-no-service')
                );

                let isRepair = false;
                const jobInvoices = (techInvoices || []).filter(inv => inv.job_id === job.id);
                const hasInvoice = jobInvoices.length > 0;
                
                if (hasInvoice) {
                    const hasRealRepairInvoice = jobInvoices.some(inv => !isServiceChargeOnlyInvoice(inv));
                    if (hasRealRepairInvoice) {
                        isRepair = true;
                    }
                }

                if (closureInt) {
                    if (closureInt.type === 'close-call-no-service') {
                        isRepair = false;
                    } else {
                        const outcome = closureInt.metadata?.repair_outcome;
                        if (outcome !== 'Repair Done') {
                            isRepair = false;
                        }
                    }
                }

                if (isRepair) {
                    dailyMap[dayStr].repairDone++;
                } else {
                    dailyMap[dayStr].closedWithoutRepair++;
                }
            }
        }
    });

    (techInvoices || []).forEach(inv => {
        const dayStr = inv.date;
        if (dailyMap[dayStr] && !isServiceChargeOnlyInvoice(inv)) {
            dailyMap[dayStr].revenue += (inv.total_amount || 0);
        }
    });

    return Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
};

function IncentivesManagement({ initialSubTab }) {
    const [activeView, setActiveView] = useState(initialSubTab || 'configure'); // configure, performance, history

    useEffect(() => {
        if (initialSubTab) {
            setActiveView(initialSubTab);
        }
    }, [initialSubTab]);

    const now = new Date();
    const [activeMonth, setActiveMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [parameters, setParameters] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [allInteractions, setAllInteractions] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState(null);

    const [datePreset, setDatePreset] = useState('this_month'); // today, yesterday, this_week, this_month, custom
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [allQuotations, setAllQuotations] = useState([]);
    const [selectedDateFilter, setSelectedDateFilter] = useState(null);
    const [viewingJob, setViewingJob] = useState(null);

    const getDatesForPreset = (preset) => {
        const d = new Date();
        const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
        const nowIST = new Date(utc + (3600000 * 5.5));
        
        let start = '';
        let end = '';

        const formatDate = (dateObj) => {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        if (preset === 'today') {
            start = formatDate(nowIST);
            end = formatDate(nowIST);
        } else if (preset === 'yesterday') {
            const yest = new Date(nowIST);
            yest.setDate(yest.getDate() - 1);
            start = formatDate(yest);
            end = formatDate(yest);
        } else if (preset === 'this_week') {
            const currentDay = nowIST.getDay();
            const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
            const monday = new Date(nowIST);
            monday.setDate(nowIST.getDate() + distanceToMonday);
            
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            start = formatDate(monday);
            end = formatDate(sunday);
        } else if (preset === 'this_month') {
            const firstDay = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1);
            const lastDay = new Date(nowIST.getFullYear(), nowIST.getMonth() + 1, 0);
            start = formatDate(firstDay);
            end = formatDate(lastDay);
        }
        return { start, end };
    };

    useEffect(() => {
        if (datePreset !== 'custom') {
            const { start, end } = getDatesForPreset(datePreset);
            setStartDate(start);
            setEndDate(end);
        }
    }, [datePreset]);

    useEffect(() => {
        // Only fetch if we have valid dates
        if (startDate && endDate) {
            fetchData();
        }
    }, [startDate, endDate, activeMonth]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('@/lib/supabase');

            const [techsData, paramsData] = await Promise.all([
                techniciansAPI.getAll(),
                websiteSettingsAPI.getByKey('incentive-parameters')
            ]);

            const defaultParams = [
                { id: 't1', name: 'Visits Done', threshold: 40, enabled: true },
                { id: 't2', name: 'Jobs Closed', threshold: 30, enabled: true },
                { id: 't3', name: 'Conversion Ratio (%)', threshold: 70, enabled: true },
                { id: 't4', name: 'Total Revenue (₹)', threshold: 100000, enabled: true },
                { id: 't5', name: 'Avg Revenue per Job (₹)', threshold: 2500, enabled: true },
                { id: 't6', name: 'Feedback Rate (%)', threshold: 80, enabled: true },
                { id: 't7', name: 'Average Rating (out of 5)', threshold: 4.5, enabled: true },
                { id: 't8', name: 'Avg Days to Close', threshold: 3, enabled: true }
            ];

            let loadedParams = paramsData && paramsData.value ? paramsData.value : defaultParams;
            
            const mergedParams = defaultParams.map(dp => {
                const existing = loadedParams.find(lp => lp.id === dp.id);
                if (existing) {
                    return {
                        ...dp,
                        threshold: existing.threshold !== undefined ? existing.threshold : dp.threshold,
                        enabled: existing.enabled !== undefined ? existing.enabled : dp.enabled
                    };
                }
                return dp;
            });
            setParameters(mergedParams);

            if (techsData && techsData.length > 0) {
                const startD = startDate || `${activeMonth}-01`;
                const endD = endDate || `${activeMonth}-31`;
                const [yr, mo] = startD.split('-').map(Number);
                const historyStartObj = new Date(yr, mo - 4, 1);
                const historyStart = `${historyStartObj.getFullYear()}-${String(historyStartObj.getMonth() + 1).padStart(2, '0')}-01`;

                const { data: allJobs } = await supabase
                    .from('jobs')
                    .select('id, job_number, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name, appliance, brand')
                    .gte('scheduled_date', historyStart)
                    .lte('scheduled_date', endD);

                const { data: allInvoices } = await supabase
                    .from('sales_invoices')
                    .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id, items')
                    .gte('date', historyStart)
                    .lte('date', endD)
                    .neq('status', 'cancelled');

                const { data: allInteractionsData } = await supabase
                    .from('interactions')
                    .select('job_id, type, metadata, timestamp')
                    .gte('timestamp', historyStart)
                    .in('type', ['job-closed', 'close-call-no-service', 'job-assigned']);

                const { data: allQuotesData } = await supabase
                    .from('quotations')
                    .select('id, date, job_id, technician_id, total_amount, status')
                    .gte('date', historyStart)
                    .lte('date', endD);

                setAllInteractions(allInteractionsData || []);
                setAllQuotations(allQuotesData || []);

                const processedTechs = techsData.filter(tech => tech.is_active === true).map(tech => {
                    const currentMetrics = calculateMetricsForMonth(
                        tech.id,
                        tech.ledger_id,
                        startD,
                        endD,
                        allJobs || [],
                        allInvoices || [],
                        allInteractionsData || [],
                        allQuotesData || []
                    );

                    const history = [-1, -2, -3].map(offset => {
                        const d = new Date(yr, mo - 1 + offset, 1);
                        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const histStart = `${mStr}-01`;
                        const histEnd = `${mStr}-${String(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;

                        const metrics = calculateMetricsForMonth(
                            tech.id,
                            tech.ledger_id,
                            histStart,
                            histEnd,
                            allJobs || [],
                            allInvoices || [],
                            allInteractionsData || [],
                            allQuotesData || []
                        );

                        const historyTargets = evaluatePerformanceTargets([{ currentMetrics: metrics }], mergedParams)[0];

                        return {
                            month: mStr,
                            totalJobs: metrics.totalJobs,
                            visitsCount: metrics.visitsCount,
                            closedCount: metrics.closedCount,
                            conversionRatio: metrics.conversionRatio,
                            totalRevenue: metrics.totalRevenue,
                            feedbackRate: metrics.feedbackRate,
                            avgRating: metrics.avgRating,
                            avgDaysToClose: metrics.avgDaysToClose,
                            achievedCount: historyTargets.achievedCount,
                            totalTargets: historyTargets.totalTargets,
                            scorePercent: historyTargets.scorePercent
                        };
                    });

                    return {
                        id: tech.id,
                        name: tech.name,
                        currentMetrics,
                        history,
                        achievedCount: 0,
                        totalTargets: 0,
                        scorePercent: 0,
                        breakdown: []
                    };
                });

                const calculatedTechs = evaluatePerformanceTargets(processedTechs, mergedParams);
                setTechnicians(calculatedTechs);
                
                if (calculatedTechs.length > 0) {
                    setSelectedTechId(prev => {
                        if (prev && (prev === 'all' || calculatedTechs.some(t => t.id === prev))) return prev;
                        return 'all';
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch performance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateParameter = (id, field, value) => {
        setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleSaveParameters = async () => {
        try {
            setSaving(true);
            await websiteSettingsAPI.save('incentive-parameters', parameters, 'Technician performance target parameters');
            setTechnicians(prev => evaluatePerformanceTargets(prev, parameters));
            alert('Parameters saved successfully!');
        } catch (err) {
            console.error('Failed to save performance parameters:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const overallStats = useMemo(() => {
        let totalJobs = 0;
        let totalVisits = 0;
        let totalClosed = 0;
        let totalQuotes = 0;
        let totalFeedbacks = 0;
        let totalRatingSum = 0;
        let totalRatingCount = 0;
        let totalRevenue = 0;
        let totalRepairDone = 0;
        let totalDaysToClose = 0;
        let closedJobsWithDays = 0;

        technicians.forEach(tech => {
            const m = tech.currentMetrics;
            if (m) {
                totalJobs += m.totalJobs || 0;
                totalVisits += m.visitsCount || 0;
                totalClosed += m.closedCount || 0;
                totalQuotes += m.quotationsCount || 0;
                totalFeedbacks += m.feedbackCount || 0;
                totalRevenue += m.totalRevenue || 0;
                totalRepairDone += m.repairDoneCount || 0;
                totalDaysToClose += m.totalDaysToClose || 0;
                closedJobsWithDays += m.closedJobsWithDays || 0;
                
                const ratedJobs = (m.techJobs || []).filter(j => j.customer_rating > 0);
                totalRatingSum += ratedJobs.reduce((sum, j) => sum + j.customer_rating, 0);
                totalRatingCount += ratedJobs.length;
            }
        });

        const avgRating = totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(1) : '—';
        const conversion = totalClosed > 0 ? Math.round((totalRepairDone / totalClosed) * 100) : 0;
        const avgDaysToClose = closedJobsWithDays > 0 ? (totalDaysToClose / closedJobsWithDays).toFixed(1) : '—';

        return {
            totalJobs,
            totalVisits,
            totalClosed,
            totalQuotes,
            totalFeedbacks,
            totalRevenue,
            avgRating,
            conversion,
            avgDaysToClose
        };
    }, [technicians]);

    const selectedTech = selectedTechId === 'all'
        ? {
            id: 'all',
            name: 'All Technicians',
            currentMetrics: {
                techJobs: technicians.flatMap(t => t.currentMetrics?.techJobs || []),
                techInvoices: technicians.flatMap(t => t.currentMetrics?.techInvoices || []),
                techQuotations: technicians.flatMap(t => t.currentMetrics?.techQuotations || [])
            },
            breakdown: []
          }
        : (technicians.find(t => t.id === selectedTechId) || technicians[0] || null);
    const [yr, mo] = activeMonth.split('-').map(Number);
    const monthStart = `${activeMonth}-01`;
    const monthEnd = selectedTech ? `${activeMonth}-${String(new Date(yr, mo, 0).getDate()).padStart(2, '0')}` : '';
    
    const startRange = startDate || monthStart;
    const endRange = endDate || monthEnd;

    const dailyPerformanceData = selectedTech && selectedTech.currentMetrics
        ? calculateDailyPerformance(selectedTech.currentMetrics.techJobs || [], selectedTech.currentMetrics.techInvoices || [], allInteractions, startRange, endRange)
        : [];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Compact Toolbar */}
            <div className="performance-toolbar">
                {/* View Tabs */}
                <div className="performance-tabs-container">
                    {[
                        { id: 'configure', label: 'Configure Parameters', icon: Settings },
                        { id: 'performance', label: 'Live Performance', icon: BarChart3 },
                        { id: 'history', label: '3-Month History', icon: Calendar }
                    ].map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            style={{
                                padding: '6px 12px',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 500,
                                backgroundColor: activeView === view.id ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                color: activeView === view.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all var(--transition-fast)',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <view.icon size={12} />
                            {view.label}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {activeView === 'history' && (
                        <input
                            type="month"
                            value={activeMonth}
                            onChange={(e) => setActiveMonth(e.target.value)}
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px', height: 'auto' }}
                        />
                    )}
                    <button
                        className="btn btn-secondary"
                        onClick={fetchData}
                        disabled={loading}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <RefreshCcw size={12} className={loading ? "spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Configure View */}
            {activeView === 'configure' && (
                <div style={{ flex: 1, overflow: 'auto', display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)' }}>
                    {/* Parameters Configuration */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-md)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                    Performance Targets Configuration
                                </h4>
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', overflow: 'auto' }}>
                                {parameters.map(param => (
                                    <div
                                        key={param.id}
                                        style={{
                                            padding: 'var(--spacing-sm)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr auto',
                                            gap: 'var(--spacing-xs)',
                                            alignItems: 'center',
                                            fontSize: 'var(--font-size-xs)'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {param.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Target:</span>
                                            <input
                                                type="number"
                                                step={param.id === 't7' || param.id === 't8' ? '0.1' : '1'}
                                                value={param.threshold}
                                                onChange={(e) => updateParameter(param.id, 'threshold', parseFloat(e.target.value))}
                                                className="form-input"
                                                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px', width: '80px' }}
                                            />
                                        </div>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={param.enabled}
                                                onChange={(e) => updateParameter(param.id, 'enabled', e.target.checked)}
                                            />
                                            <span>Enabled</span>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={handleSaveParameters}
                                disabled={saving || loading}
                                style={{ width: '100%', marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                Save Config Parameters
                            </button>
                        </div>
                    </div>

                    {/* Technician Summary Scorecard */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        <div style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-md)',
                            flex: 1,
                            overflowY: 'auto'
                        }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Technician Target Completion
                            </h4>
                            {loading ? (
                                <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                                    <Loader2 className="spin" size={40} style={{ margin: '0 auto' }} />
                                    <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-sm)' }}>Loading...</p>
                                </div>
                            ) : technicians.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No technicians found.</p>
                            ) : (
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    {technicians.map(tech => (
                                        <div
                                            key={tech.id}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                                    {tech.name}
                                                </div>
                                                <div style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 'var(--radius-full)',
                                                    backgroundColor: tech.scorePercent >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                    color: tech.scorePercent >= 70 ? 'var(--color-success)' : 'var(--color-warning)'
                                                }}>
                                                    {tech.achievedCount} / {tech.totalTargets} Targets Met ({tech.scorePercent}%)
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                {tech.breakdown.map((item, idx) => (
                                                    <span
                                                        key={idx}
                                                        title={`${item.name}: Target ${item.target}, Actual ${item.actual}`}
                                                        style={{
                                                            fontSize: '10px',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            backgroundColor: item.achieved ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                            color: item.achieved ? 'var(--color-success)' : 'var(--color-danger)',
                                                            whiteSpace: 'nowrap',
                                                            flexShrink: 0,
                                                            border: `1px solid ${item.achieved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                        }}
                                                    >
                                                        {item.name.split(' ')[0]} {item.achieved ? '✓' : '✗'}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Live Performance View */}
            {activeView === 'performance' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {/* Date Selector and Preset row */}
                    <div className="performance-filters-container" style={{ flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'yesterday', label: 'Yesterday' },
                                { id: 'this_week', label: 'This Week' },
                                { id: 'this_month', label: 'This Month' },
                                { id: 'custom', label: 'Custom Range' }
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => setDatePreset(preset.id)}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        borderRadius: 'var(--radius-md)',
                                        border: datePreset === preset.id ? 'none' : '1px solid var(--border-primary)',
                                        backgroundColor: datePreset === preset.id ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                        color: datePreset === preset.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>From:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    disabled={datePreset !== 'custom'}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="form-input"
                                    style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px', width: '130px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>To:</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    disabled={datePreset !== 'custom'}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="form-input"
                                    style={{ fontSize: 'var(--font-size-xs)', padding: '4px 8px', width: '130px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Overall Summary Cards */}
                    <div className="performance-summary-grid">
                        {[
                            { label: 'Jobs Assigned', value: overallStats.totalJobs },
                            { label: 'Total Visits Done', value: overallStats.totalVisits },
                            { label: 'Total Jobs Closed', value: overallStats.totalClosed },
                            { label: 'Total Quotes Created', value: overallStats.totalQuotes },
                            { label: 'Total Feedbacks Taken', value: overallStats.totalFeedbacks },
                            { label: 'Overall Revenue', value: `₹${overallStats.totalRevenue.toLocaleString()}` },
                            { label: 'Avg Rating', value: overallStats.avgRating === '—' ? '—' : `${overallStats.avgRating} ★` },
                            { label: 'Overall Conversion %', value: `${overallStats.conversion}%` },
                            { label: 'Avg Days to Close', value: overallStats.avgDaysToClose === '—' ? '—' : `${overallStats.avgDaysToClose} days` }
                        ].map((stat, idx) => (
                            <div key={idx} className="performance-summary-card">
                                <span className="performance-summary-card-label">{stat.label}</span>
                                <span className="performance-summary-card-value">{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* All Technicians Summary Table */}
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                All Technicians Summary ({new Date(startRange).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(endRange).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })})
                            </h4>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Technician Name</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Jobs Assigned</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Visits Done</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Jobs Closed</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Quotations Created</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Feedbacks Taken</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Average Rating</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Avg Days to Close</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>Revenue Generated</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Conversion %</th>
                                        <th style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Targets Met</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {technicians.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                No technician records found for this range.
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {technicians.map((tech) => {
                                                const m = tech.currentMetrics || {};
                                                const isSelected = selectedTechId === tech.id;
                                                return (
                                                    <tr
                                                        key={tech.id}
                                                        onClick={() => {
                                                            setSelectedTechId(tech.id);
                                                            setSelectedDateFilter(null);
                                                        }}
                                                        style={{
                                                            borderBottom: '1px solid var(--border-primary)',
                                                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                            outline: isSelected ? '1px solid var(--color-primary)' : 'none'
                                                        }}
                                                        className="hover-row"
                                                    >
                                                        <td style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <User size={15} color="var(--text-secondary)" />
                                                            {tech.name}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 500 }}>{m.totalJobs || 0}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{m.visitsCount || 0}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{m.closedCount || 0}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 500 }}>{m.quotationsCount || 0}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{m.feedbackCount || 0}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600, color: '#eab308' }}>
                                                            {m.avgRating > 0 ? `${m.avgRating} ★` : '—'}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 500 }}>
                                                            {m.avgDaysToClose > 0 ? `${m.avgDaysToClose} days` : '—'}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                            ₹{(m.totalRevenue || 0).toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                                            {m.conversionRatio || 0}%
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 700,
                                                                padding: '2px 8px',
                                                                borderRadius: 'var(--radius-full)',
                                                                backgroundColor: tech.scorePercent >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                                color: tech.scorePercent >= 70 ? 'var(--color-success)' : 'var(--color-warning)'
                                                            }}>
                                                                {tech.achievedCount} / {tech.totalTargets} ({tech.scorePercent}%)
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {/* Combined totals row */}
                                            {(() => {
                                                const isAllSelected = selectedTechId === 'all';
                                                const totalAchievedCount = technicians.reduce((sum, t) => sum + (t.achievedCount || 0), 0);
                                                const totalTargetsCount = technicians.reduce((sum, t) => sum + (t.totalTargets || 0), 0);
                                                const totalTargetsPercent = totalTargetsCount > 0 ? Math.round((totalAchievedCount / totalTargetsCount) * 100) : 0;
                                                return (
                                                    <tr
                                                        onClick={() => {
                                                            setSelectedTechId('all');
                                                            setSelectedDateFilter(null);
                                                        }}
                                                        style={{
                                                            borderTop: '2px solid var(--border-primary)',
                                                            backgroundColor: isAllSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s',
                                                            fontWeight: 'bold',
                                                            outline: isAllSelected ? '1px solid var(--color-primary)' : 'none'
                                                        }}
                                                        className="hover-row"
                                                    >
                                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <Users size={15} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                                                            All Technicians (Combined)
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{overallStats.totalJobs}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{overallStats.totalVisits}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{overallStats.totalClosed}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{overallStats.totalQuotes}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>{overallStats.totalFeedbacks}</td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', color: '#eab308' }}>
                                                            {overallStats.avgRating === '—' ? '—' : `${overallStats.avgRating} ★`}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                                            {overallStats.avgDaysToClose === '—' ? '—' : `${overallStats.avgDaysToClose} days`}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'right', color: 'var(--text-primary)' }}>
                                                            ₹{overallStats.totalRevenue.toLocaleString()}
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                                            {overallStats.conversion}%
                                                        </td>
                                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                                            <span style={{
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 700,
                                                                padding: '2px 8px',
                                                                borderRadius: 'var(--radius-full)',
                                                                backgroundColor: totalTargetsPercent >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                                color: totalTargetsPercent >= 70 ? 'var(--color-success)' : 'var(--color-warning)'
                                                            }}>
                                                                {totalAchievedCount} / {totalTargetsCount} ({totalTargetsPercent}%)
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {selectedTech ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0, color: 'var(--color-primary)' }}>
                                    Detailed Drill-down: {selectedTech.name}
                                </h3>
                                <button
                                    onClick={() => setSelectedDateFilter(null)}
                                    className="btn btn-secondary"
                                    style={{
                                        display: selectedDateFilter ? 'inline-block' : 'none',
                                        fontSize: 'var(--font-size-xs)',
                                        padding: '4px 8px'
                                    }}
                                >
                                    ✕ Clear Date Filter ({selectedDateFilter})
                                </button>
                            </div>

                            {/* KPI Metrics Cards */}
                            <div>
                                <h4 style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                    Month Performance Goals ({activeMonth})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    {selectedTech.breakdown.map((item, idx) => {
                                        const unit = item.id === 't3' || item.id === 't6' ? '%' : item.id === 't7' ? ' ★' : item.id === 't8' ? ' days' : '';
                                        const prefix = item.id === 't4' || item.id === 't5' ? '₹' : '';
                                        return (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: 'var(--spacing-md)',
                                                    backgroundColor: 'var(--bg-elevated)',
                                                    border: `1px solid ${item.achieved ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-lg)',
                                                    boxShadow: 'var(--shadow-sm)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'space-between',
                                                    minHeight: '110px'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase' }}>
                                                        {item.name}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                        <span style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: item.achieved ? 'var(--color-success)' : 'var(--text-primary)' }}>
                                                            {prefix}{item.actual.toLocaleString()}{unit}
                                                        </span>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                            / Target: {prefix}{item.target.toLocaleString()}{unit}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {item.achieved ? (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            padding: '2px 8px',
                                                            borderRadius: 'var(--radius-full)',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                            color: 'var(--color-success)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <CheckCircle size={12} /> Target Met
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 500,
                                                            padding: '2px 8px',
                                                            borderRadius: 'var(--radius-full)',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            color: 'var(--text-secondary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <AlertCircle size={12} /> Target Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Two Column Layout for Breakdown & Jobs */}
                            <div className="performance-drilldown-grid" style={{ alignItems: 'start' }}>
                                {/* Daily Performance Breakdown Table */}
                                <div style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    overflow: 'hidden'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '2px' }}>
                                        Daily Breakdown
                                    </h4>
                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                                        Click a day to filter job details
                                    </p>
                                    <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
                                        <table style={{ width: '100%', minWidth: '320px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Date</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visits</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Closed</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Revenue</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyPerformanceData.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="4" style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            No daily logs found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    dailyPerformanceData.map((day, idx) => {
                                                        const isFiltered = selectedDateFilter === day.date;
                                                        return (
                                                            <tr 
                                                                key={idx} 
                                                                onClick={() => setSelectedDateFilter(isFiltered ? null : day.date)}
                                                                style={{ 
                                                                    borderBottom: '1px solid var(--border-primary)',
                                                                    cursor: 'pointer',
                                                                    backgroundColor: isFiltered ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                                                    transition: 'all 0.15s'
                                                                }}
                                                                className="hover-row"
                                                            >
                                                                <td style={{ padding: 'var(--spacing-sm)', fontWeight: isFiltered ? 700 : 500 }}>
                                                                    {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                                                </td>
                                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{day.visits}</td>
                                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{day.closed}</td>
                                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>₹{day.revenue.toLocaleString()}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Job-Level Performance Grid */}
                                <div style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    overflow: 'hidden'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                        Job-Level Details {selectedDateFilter ? `for ${new Date(selectedDateFilter).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                                    </h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                            <thead>
                                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Job Number</th>
                                                    {selectedTechId === 'all' && <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Technician</th>}
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Appliance</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Scheduled Date</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visit Status</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Closure Outcome</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Days to Close</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Revenue</th>
                                                    <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Feedback</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(!selectedTech.currentMetrics.techJobs || selectedTech.currentMetrics.techJobs.length === 0) ? (
                                                    <tr>
                                                        <td colSpan={selectedTechId === 'all' ? 9 : 8} style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                            No jobs logged for this period.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    selectedTech.currentMetrics.techJobs
                                                        .filter(job => !selectedDateFilter || job.scheduled_date === selectedDateFilter)
                                                        .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
                                                        .map((job) => {
                                                            const isVisited = !!job.arrived_at;
                                                            const jobInvoices = selectedTech.currentMetrics.techInvoices.filter(inv => inv.job_id === job.id);
                                                            const hasRealRepairInvoice = jobInvoices.some(inv => !isServiceChargeOnlyInvoice(inv));
                                                            const jobRev = jobInvoices.filter(inv => !isServiceChargeOnlyInvoice(inv)).reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

                                                            let closureOutcome = 'In Progress';
                                                            let isRepair = false;
                                                            if (job.status === 'closed') {
                                                                const closureInt = allInteractions.find(i => 
                                                                    i.job_id === job.id && (i.type === 'job-closed' || i.type === 'close-call-no-service')
                                                                );
                                                                if (closureInt) {
                                                                    if (closureInt.type === 'close-call-no-service') {
                                                                        closureOutcome = 'Closed No Repair';
                                                                    } else {
                                                                        const outcome = closureInt.metadata?.repair_outcome;
                                                                        closureOutcome = outcome || 'Closed';
                                                                        if (outcome === 'Repair Done') {
                                                                            isRepair = true;
                                                                        }
                                                                    }
                                                                } else {
                                                                    if (hasRealRepairInvoice) {
                                                                        closureOutcome = 'Repair Done';
                                                                        isRepair = true;
                                                                    } else {
                                                                        closureOutcome = 'Closed No Repair';
                                                                    }
                                                                }
                                                            }

                                                            return (
                                                                <tr 
                                                                    key={job.id} 
                                                                    onClick={() => setViewingJob(job)}
                                                                    style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer' }}
                                                                    className="hover-row"
                                                                >
                                                                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                                        #{job.job_number || job.id.slice(0, 8)}
                                                                    </td>
                                                                    {selectedTechId === 'all' && (
                                                                        <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>
                                                                            {job.technician_name || 'Unassigned'}
                                                                        </td>
                                                                    )}
                                                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                                                        {job.brand ? `${job.brand} ` : ''}{job.appliance || 'Unknown'}
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)' }}>
                                                                        {new Date(job.scheduled_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                                        <span style={{
                                                                            fontSize: 'var(--font-size-xs)',
                                                                            fontWeight: 600,
                                                                            padding: '2px 8px',
                                                                            borderRadius: 'var(--radius-full)',
                                                                            backgroundColor: isVisited ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                                            color: isVisited ? 'var(--color-success)' : 'var(--color-danger)'
                                                                        }}>
                                                                            {isVisited ? 'Visited' : 'Not Visited'}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                                        <span style={{
                                                                            fontSize: 'var(--font-size-xs)',
                                                                            fontWeight: 600,
                                                                            padding: '2px 8px',
                                                                            borderRadius: 'var(--radius-full)',
                                                                            backgroundColor: job.status === 'closed'
                                                                                ? (isRepair ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)')
                                                                                : 'rgba(245, 158, 11, 0.15)',
                                                                            color: job.status === 'closed'
                                                                                ? (isRepair ? 'var(--color-success)' : 'var(--text-secondary)')
                                                                                : 'var(--color-warning)'
                                                                        }}>
                                                                            {closureOutcome}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                                        {job.days_to_close ? `${job.days_to_close} ${job.days_to_close === 1 ? 'day' : 'days'}` : '—'}
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                                        ₹{jobRev.toLocaleString()}
                                                                    </td>
                                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                                        {job.customer_rating > 0 ? (
                                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: '#eab308', fontWeight: 600 }} title={job.rating_note}>
                                                                                <Star size={14} fill="#eab308" />
                                                                                {job.customer_rating}
                                                                            </div>
                                                                        ) : (
                                                                            <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>—</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No technician selected.
                        </div>
                    )}
                </div>
            )}

            {/* History View */}
            {activeView === 'history' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                    <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                        {technicians.map(tech => (
                            <div
                                key={tech.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-lg)'
                                }}
                            >
                                <h4 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                    {tech.name} - Performance History
                                </h4>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Month</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Jobs Assigned</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visits Done</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Jobs Closed</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Conversion %</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Total Revenue</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Feedback Rate</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Average Rating</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Avg Days to Close</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Goals Achieved</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tech.history.map((record, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                    <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                        {new Date(record.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        {record.totalJobs || 0}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        {record.visitsCount}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        {record.closedCount}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                                        {record.conversionRatio}%
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                        ₹{record.totalRevenue.toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        {record.feedbackRate}%
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600, color: '#eab308' }}>
                                                        {record.avgRating} ★
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        {record.avgDaysToClose > 0 ? `${record.avgDaysToClose} days` : '—'}
                                                    </td>
                                                    <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                                        <span style={{
                                                            fontSize: 'var(--font-size-xs)',
                                                            fontWeight: 700,
                                                            padding: '2px 8px',
                                                            borderRadius: 'var(--radius-full)',
                                                            backgroundColor: record.scorePercent >= 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                                            color: record.scorePercent >= 70 ? 'var(--color-success)' : 'var(--color-warning)'
                                                        }}>
                                                            {record.achievedCount} / {record.totalTargets}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {viewingJob && (
                <JobDetailModal
                    job={viewingJob}
                    onClose={() => setViewingJob(null)}
                    onUpdate={() => {
                        fetchData();
                        setViewingJob(null);
                    }}
                />
            )}
        </div>
    );
}

export default IncentivesManagement;
