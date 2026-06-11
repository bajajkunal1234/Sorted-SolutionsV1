'use client'

import { useState, useEffect } from 'react';
import { TrendingUp, Settings, Save, BarChart3, Calendar, Users, CheckCircle, AlertCircle, Award, Star, User, ChevronRight, DollarSign, Briefcase, RefreshCcw, Loader2 } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI } from '@/lib/adminAPI';

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

const calculateMetricsForMonth = (techId, ledgerId, mStart, mEnd, jobsList, invoicesList, interactionsList) => {
    // 1. Filter jobs for this technician in this month
    const techJobs = jobsList.filter(j =>
        (j.assigned_to === techId || j.technician_id === techId) &&
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
    const visitedJobs = techJobs.filter(j =>
        j.arrived_at ||
        ['diagnosing_quoting', 'work_in_progress', 'quotation_sent', 'parts_ordered', 'closed'].includes(j.status)
    );
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
        techInvoices
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
        const dayStr = new Date(d).toISOString().split('T')[0];
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
            const isVisited = job.arrived_at || ['diagnosing_quoting', 'work_in_progress', 'quotation_sent', 'parts_ordered', 'closed'].includes(job.status);
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

function IncentivesManagement() {
    const [activeView, setActiveView] = useState('configure'); // configure, performance, history
    const now = new Date();
    const [activeMonth, setActiveMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [parameters, setParameters] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [allInteractions, setAllInteractions] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState(null);

    useEffect(() => {
        fetchData();
    }, [activeMonth]);

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
                { id: 't7', name: 'Average Rating (out of 5)', threshold: 4.5, enabled: true }
            ];

            const allowedIds = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'];
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
                const [yr, mo] = activeMonth.split('-').map(Number);
                const monthStart = `${activeMonth}-01`;
                const monthEnd = new Date(yr, mo, 0).toISOString().split('T')[0];

                const historyStartObj = new Date(yr, mo - 4, 1);
                const historyStart = `${historyStartObj.getFullYear()}-${String(historyStartObj.getMonth() + 1).padStart(2, '0')}-01`;

                const { data: allJobs } = await supabase
                    .from('jobs')
                    .select('id, job_number, assigned_to, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id, on_way_at, arrived_at, completed_at, customer_rating, rating_note, customer_name, technician_name, appliance_type, brand')
                    .gte('scheduled_date', historyStart)
                    .lte('scheduled_date', monthEnd);

                const { data: allInvoices } = await supabase
                    .from('sales_invoices')
                    .select('id, total_amount, date, job_id, technician_id, technician_name, status, account_id, items')
                    .gte('date', historyStart)
                    .lte('date', monthEnd)
                    .neq('status', 'cancelled');

                const { data: allInteractionsData } = await supabase
                    .from('interactions')
                    .select('job_id, type, metadata, timestamp')
                    .gte('timestamp', historyStart)
                    .in('type', ['job-closed', 'close-call-no-service']);

                setAllInteractions(allInteractionsData || []);

                const processedTechs = techsData.map(tech => {
                    const currentMetrics = calculateMetricsForMonth(
                        tech.id,
                        tech.ledger_id,
                        monthStart,
                        monthEnd,
                        allJobs || [],
                        allInvoices || [],
                        allInteractionsData || []
                    );

                    const history = [-1, -2, -3].map(offset => {
                        const d = new Date(yr, mo - 1 + offset, 1);
                        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        const histStart = `${mStr}-01`;
                        const histEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

                        const metrics = calculateMetricsForMonth(
                            tech.id,
                            tech.ledger_id,
                            histStart,
                            histEnd,
                            allJobs || [],
                            allInvoices || [],
                            allInteractionsData || []
                        );

                        const historyTargets = evaluatePerformanceTargets([{ currentMetrics: metrics }], mergedParams)[0];

                        return {
                            month: mStr,
                            visitsCount: metrics.visitsCount,
                            closedCount: metrics.closedCount,
                            conversionRatio: metrics.conversionRatio,
                            totalRevenue: metrics.totalRevenue,
                            feedbackRate: metrics.feedbackRate,
                            avgRating: metrics.avgRating,
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
                        if (prev && calculatedTechs.some(t => t.id === prev)) return prev;
                        return calculatedTechs[0].id;
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

    const selectedTech = technicians.find(t => t.id === selectedTechId) || technicians[0];
    const [yr, mo] = activeMonth.split('-').map(Number);
    const monthStart = `${activeMonth}-01`;
    const monthEnd = selectedTech ? new Date(yr, mo, 0).toISOString().split('T')[0] : '';
    
    const dailyPerformanceData = selectedTech 
        ? calculateDailyPerformance(selectedTech.currentMetrics.techJobs, selectedTech.currentMetrics.techInvoices, allInteractions, monthStart, monthEnd)
        : [];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                            Performance Analytics
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Configure target parameters, track live daily metrics, and monitor technician achievements
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <input
                            type="month"
                            value={activeMonth}
                            onChange={(e) => setActiveMonth(e.target.value)}
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-sm)' }}
                        />
                        <button
                            className="btn btn-secondary"
                            onClick={fetchData}
                            disabled={loading}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCcw size={14} className={loading ? "spin" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* View Tabs */}
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
                    {[
                        { id: 'configure', label: 'Configure Parameters', icon: Settings },
                        { id: 'performance', label: 'Live Performance', icon: BarChart3 },
                        { id: 'history', label: '3-Month History', icon: Calendar }
                    ].map(view => (
                        <button
                            key={view.id}
                            onClick={() => setActiveView(view.id)}
                            style={{
                                padding: '8px 16px',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                backgroundColor: activeView === view.id ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                color: activeView === view.id ? 'var(--text-inverse)' : 'var(--text-primary)',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            <view.icon size={14} />
                            {view.label}
                        </button>
                    ))}
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
                                                step={param.id === 't7' ? '0.1' : '1'}
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
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
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
                    {/* Technician Selector Header */}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--spacing-sm)',
                        overflowX: 'auto',
                        paddingBottom: 'var(--spacing-xs)',
                        borderBottom: '1px solid var(--border-primary)'
                    }}>
                        {technicians.map(tech => (
                            <button
                                key={tech.id}
                                onClick={() => setSelectedTechId(tech.id)}
                                style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: `2px solid ${selectedTechId === tech.id ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                    backgroundColor: selectedTechId === tech.id ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-elevated)',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    minWidth: '180px',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                            >
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <User size={16} color={selectedTechId === tech.id ? 'var(--color-primary)' : 'var(--text-secondary)'} />
                                    {tech.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {tech.achievedCount} of {tech.totalTargets} Targets Met ({tech.scorePercent}%)
                                </div>
                            </button>
                        ))}
                    </div>

                    {selectedTech ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                            {/* KPI Metrics Cards */}
                            <div>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)' }}>
                                    Month Performance Goals ({activeMonth})
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    {selectedTech.breakdown.map((item, idx) => {
                                        const unit = item.id === 't3' || item.id === 't6' ? '%' : item.id === 't7' ? ' ★' : '';
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

                            {/* Daily Performance Breakdown Table */}
                            <div style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 'var(--spacing-md)',
                                overflow: 'hidden'
                            }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                    Daily Breakdown
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Date</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visits Done</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Jobs Closed</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Repair Done</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Closed No Repair</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Daily Conversion %</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Daily Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dailyPerformanceData.length === 0 ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                        No daily logs found for this period.
                                                    </td>
                                                </tr>
                                            ) : (
                                                dailyPerformanceData.map((day, idx) => {
                                                    const conversion = day.closed > 0 ? Math.round((day.repairDone / day.closed) * 100) : 0;
                                                    return (
                                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                            <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                                {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </td>
                                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{day.visits}</td>
                                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>{day.closed}</td>
                                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', color: 'var(--color-success)', fontWeight: 500 }}>{day.repairDone}</td>
                                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', color: 'var(--text-secondary)' }}>{day.closedWithoutRepair}</td>
                                                            <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>{conversion}%</td>
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
                                    Job-Level Details
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Job Number</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Appliance</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Scheduled Date</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visit Status</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Closure Outcome</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Revenue</th>
                                                <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Feedback</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(!selectedTech.currentMetrics.techJobs || selectedTech.currentMetrics.techJobs.length === 0) ? (
                                                <tr>
                                                    <td colSpan="7" style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                        No jobs logged for this period.
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedTech.currentMetrics.techJobs
                                                    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date))
                                                    .map((job) => {
                                                        const isVisited = job.arrived_at || ['diagnosing_quoting', 'work_in_progress', 'quotation_sent', 'parts_ordered', 'closed'].includes(job.status);
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
                                                            <tr key={job.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                                <td style={{ padding: 'var(--spacing-sm)', fontWeight: 500 }}>
                                                                    #{job.job_number || job.id.slice(0, 8)}
                                                                </td>
                                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                                    {job.brand ? `${job.brand} ` : ''}{job.appliance_type || 'Unknown'}
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

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Month</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Visits Done</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Jobs Closed</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Conversion %</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Total Revenue</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Feedback Rate</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Average Rating</th>
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
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default IncentivesManagement;
