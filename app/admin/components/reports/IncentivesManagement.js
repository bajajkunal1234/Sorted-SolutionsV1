'use client'

import { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Calendar, Settings, Save, Plus, Trash2, Lock, Unlock, FileText, Download, X, Eye, BarChart3, Loader2, RefreshCcw, CreditCard } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI, transactionsAPI } from '@/lib/adminAPI';

function IncentivesManagement() {
    const [activeView, setActiveView] = useState('configure'); // configure, performance, history
    const [showPolicyPdf, setShowPolicyPdf] = useState(false);
    const [showTechPdf, setShowTechPdf] = useState(false);
    const [selectedTechForPdf, setSelectedTechForPdf] = useState(null);
    const now = new Date();
    const [activeMonth, setActiveMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    const [isFinalized, setIsFinalized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [payingTechId, setPayingTechId] = useState(null);

    // Incentive Parameters Configuration
    const [parameters, setParameters] = useState([]);

    // Technician Performance Data with 3-month history
    const [technicians, setTechnicians] = useState([]);

    useEffect(() => {
        fetchData();
    }, [activeMonth]); // re-fetch whenever the month changes

    const fetchData = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('@/lib/supabase');

            const [techsData, paramsData] = await Promise.all([
                techniciansAPI.getAll(),
                websiteSettingsAPI.getByKey('incentive-parameters')
            ]);

            if (paramsData && paramsData.value) {
                setParameters(paramsData.value);
            } else {
                setParameters([
                    { id: 'p1', name: 'On-Time Visits %', type: 'positive', threshold: 95, rewardType: 'fixed', rewardValue: 5000, enabled: true },
                    { id: 'p2', name: 'Customer Feedback (4+ stars)', type: 'positive', threshold: 90, rewardType: 'fixed', rewardValue: 3000, enabled: true },
                    { id: 'p3', name: 'Revenue Per Customer', type: 'positive', threshold: 2000, rewardType: 'percentage', rewardValue: 5, enabled: true },
                    { id: 'p4', name: 'Revenue Per Day', type: 'positive', threshold: 5000, rewardType: 'percentage', rewardValue: 3, enabled: true },
                    { id: 'p5', name: 'Monthly Revenue', type: 'positive', threshold: 100000, rewardType: 'fixed', rewardValue: 10000, enabled: true },
                    { id: 'n1', name: 'Feedback Below 4 Stars', type: 'negative', threshold: 10, rewardType: 'fixed', rewardValue: 4000, enabled: true },
                    { id: 'n2', name: 'Repeat Call %', type: 'negative', threshold: 15, rewardType: 'fixed', rewardValue: 2000, enabled: true },
                    { id: 'n3', name: 'Late Arrivals %', type: 'negative', threshold: 10, rewardType: 'percentage', rewardValue: 10, enabled: true }
                ]);
            }

            if (techsData && techsData.length > 0) {
                // Build date range for the selected month
                const [yr, mo] = activeMonth.split('-').map(Number);
                const monthStart = `${activeMonth}-01`;
                const monthEnd = new Date(yr, mo, 0).toISOString().split('T')[0]; // last day

                // Fetch all jobs for this month across all techs in one query
                const { data: monthJobs } = await supabase
                    .from('jobs')
                    .select('id, assigned_to, technician_id, status, scheduled_date, scheduled_time, created_at, amount, customer_id')
                    .gte('scheduled_date', monthStart)
                    .lte('scheduled_date', monthEnd)
                    .not('assigned_to', 'is', null);

                // Fetch arrival interactions for on-time tracking
                const jobIds = (monthJobs || []).map(j => j.id);
                let invoicesByJob = {};
                let arrivalsByJob = {};

                const { data: paidVouchers } = await supabase
                    .from('payment_vouchers')
                    .select('account_id, amount, notes')
                    .ilike('notes', `%Incentive%${activeMonth}%`);

                if (jobIds.length > 0) {
                    // Revenue from linked sales_invoices
                    const { data: invoices } = await supabase
                        .from('sales_invoices')
                        .select('job_id, total_amount')
                        .in('job_id', jobIds);
                    (invoices || []).forEach(inv => {
                        invoicesByJob[inv.job_id] = (invoicesByJob[inv.job_id] || 0) + (inv.total_amount || 0);
                    });

                    // Arrival events from job_interactions
                    const { data: arrivals } = await supabase
                        .from('job_interactions')
                        .select('job_id, created_at')
                        .eq('type', 'arrived')
                        .in('job_id', jobIds);
                    (arrivals || []).forEach(a => {
                        arrivalsByJob[a.job_id] = a.created_at;
                    });

                    // Also pull arrived_at directly from jobs table (new column)
                    const { data: jobsWithArrival } = await supabase
                        .from('jobs')
                        .select('id, arrived_at, scheduled_time, scheduled_date, customer_rating, rating_note, customer_id')
                        .in('id', jobIds);
                    (jobsWithArrival || []).forEach(j => {
                        if (j.arrived_at) arrivalsByJob[j.id] = arrivalsByJob[j.id] || j.arrived_at;
                    });

                    // Merge customer_rating into monthJobs for easy access
                    (jobsWithArrival || []).forEach(jw => {
                        const idx = (monthJobs || []).findIndex(j => j.id === jw.id);
                        if (idx !== -1) {
                            monthJobs[idx].customer_rating = jw.customer_rating;
                            monthJobs[idx].arrived_at = jw.arrived_at;
                            monthJobs[idx].scheduled_time = jw.scheduled_time || monthJobs[idx].scheduled_time;
                        }
                    });
                }

                const processedTechs = techsData.map(tech => {
                    const techJobs = (monthJobs || []).filter(j =>
                        j.assigned_to === tech.id || j.technician_id === tech.id
                    );
                    const completedJobs = techJobs.filter(j => j.status === 'completed');
                    const totalJobs = techJobs.length;

                    // ── Revenue metrics (p3, p4, p5) ──────────────────
                    const monthlyRevenue = completedJobs.reduce((sum, j) => sum + (invoicesByJob[j.id] || j.amount || 0), 0);
                    const uniqueCustomers = new Set(completedJobs.map(j => j.customer_id)).size;
                    const revenuePerCustomer = uniqueCustomers > 0 ? Math.round(monthlyRevenue / uniqueCustomers) : 0;
                    const workDays = new Set(completedJobs.map(j => j.scheduled_date)).size || 1;
                    const revenuePerDay = Math.round(monthlyRevenue / workDays);

                    // ── On-time / Late arrivals (p1, n3) ──────────────
                    // Compare arrived_at timestamp vs scheduled_time string (HH:MM)
                    let onTimeCount = 0, lateCount = 0, arrivedCount = 0;
                    completedJobs.forEach(j => {
                        const arrivedAt = arrivalsByJob[j.id];
                        if (!arrivedAt || !j.scheduled_time) return; // no data → skip
                        arrivedCount++;
                        const arrivedDate = new Date(arrivedAt);
                        // Parse scheduled_time as HH:MM on the scheduled_date
                        const [hrs, mins] = (j.scheduled_time || '').split(':').map(Number);
                        const scheduledDt = new Date(j.scheduled_date);
                        scheduledDt.setHours(hrs || 0, mins || 0, 0, 0);
                        // Allow 15min grace period
                        if (arrivedDate <= new Date(scheduledDt.getTime() + 15 * 60 * 1000)) {
                            onTimeCount++;
                        } else {
                            lateCount++;
                        }
                    });
                    const onTimeVisits = arrivedCount > 0 ? Math.round((onTimeCount / arrivedCount) * 100) : 0;
                    const lateArrivals = arrivedCount > 0 ? Math.round((lateCount / arrivedCount) * 100) : 0;

                    // ── Customer Feedback (p2, n1) ─────────────────────
                    const ratedJobs = completedJobs.filter(j => j.customer_rating > 0);
                    const goodRatings = ratedJobs.filter(j => j.customer_rating >= 4).length;
                    const badRatings = ratedJobs.filter(j => j.customer_rating < 4).length;
                    const feedbackAbove4 = ratedJobs.length > 0 ? Math.round((goodRatings / ratedJobs.length) * 100) : 0;
                    const feedbackBelow4 = ratedJobs.length > 0 ? Math.round((badRatings / ratedJobs.length) * 100) : 0;

                    // ── Repeat Call % (n2) ─────────────────────────────
                    // A repeat call = a completed job where the same customer had a different
                    // completed job in the 14 days before this one (comeback within 2 weeks)
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
                    const repeatCallPercent = completedJobs.length > 0
                        ? Math.round((repeatCalls / completedJobs.length) * 100)
                        : 0;

                    // ── Already paid incentive this month ──────────────
                    const alreadyPaid = (paidVouchers || [])
                        .filter(v => v.account_id === tech.ledger_id)
                        .reduce((s, v) => s + (v.amount || 0), 0);

                    // ── 3-month history placeholders ───────────────────
                    const history = [-1, -2, -3].map(offset => {
                        const d = new Date(yr, mo - 1 + offset, 1);
                        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        return { month: mStr, incentive: 0, onTimeVisits: 0, feedbackAbove4: 0, monthlyRevenue: 0 };
                    });

                    return {
                        id: tech.id,
                        ledger_id: tech.ledger_id,
                        name: tech.name,
                        alreadyPaid,
                        currentMetrics: {
                            onTimeVisits,      // p1 — real (from arrived_at vs scheduled_time)
                            feedbackAbove4,    // p2 — real (from customer_rating >= 4)
                            revenuePerCustomer,// p3 — real
                            revenuePerDay,     // p4 — real
                            monthlyRevenue,    // p5 — real
                            feedbackBelow4,    // n1 — real (from customer_rating < 4)
                            repeatCallPercent, // n2 — real (same customer within 14 days)
                            lateArrivals,      // n3 — real (from arrived_at > scheduled_time)
                            totalJobs,
                            completedJobs: completedJobs.length,
                            uniqueCustomers,
                            ratedJobs: ratedJobs.length,
                            arrivedJobs: arrivedCount,
                        },
                        history,
                        calculatedIncentive: 0,
                        breakdown: []
                    };
                });
                setTechnicians(processedTechs);
            }
        } catch (err) {
            console.error('Failed to fetch incentives data:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateIncentives = () => {
        const updated = technicians.map(tech => {
            let total = 0;
            const breakdown = [];

            parameters.forEach(param => {
                if (!param.enabled) return;

                let metricValue = 0;
                let qualifies = false;

                // Map parameter to metric
                const metrics = tech.currentMetrics;
                switch (param.id) {
                    case 'p1': metricValue = metrics.onTimeVisits; qualifies = metricValue >= param.threshold; break;
                    case 'p2': metricValue = metrics.feedbackAbove4; qualifies = metricValue >= param.threshold; break;
                    case 'p3': metricValue = metrics.revenuePerCustomer; qualifies = metricValue >= param.threshold; break;
                    case 'p4': metricValue = metrics.revenuePerDay; qualifies = metricValue >= param.threshold; break;
                    case 'p5': metricValue = metrics.monthlyRevenue; qualifies = metricValue >= param.threshold; break;
                    case 'n1': metricValue = metrics.feedbackBelow4; qualifies = metricValue > param.threshold; break;
                    case 'n2': metricValue = metrics.repeatCallPercent; qualifies = metricValue > param.threshold; break;
                    case 'n3': metricValue = metrics.lateArrivals; qualifies = metricValue > param.threshold; break;
                }

                if (qualifies) {
                    let amount = 0;
                    if (param.rewardType === 'fixed') {
                        amount = param.rewardValue;
                    } else {
                        amount = (metricValue * param.rewardValue) / 100;
                    }

                    if (param.type === 'negative') {
                        amount = -amount;
                    }

                    total += amount;
                    breakdown.push({
                        parameter: param.name,
                        type: param.type,
                        metricValue,
                        threshold: param.threshold,
                        amount
                    });
                }
            });

            return {
                ...tech,
                calculatedIncentive: Math.max(0, total),
                breakdown
            };
        });

        setTechnicians(updated);
    };

    const addParameter = () => {
        const newParam = {
            id: `custom_${Date.now()}`,
            name: 'New Parameter',
            type: 'positive',
            threshold: 0,
            rewardType: 'fixed',
            rewardValue: 0,
            enabled: true
        };
        setParameters([...parameters, newParam]);
    };

    const updateParameter = (id, field, value) => {
        setParameters(parameters.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const deleteParameter = (id) => {
        if (window.confirm('Delete this parameter?')) {
            setParameters(parameters.filter(p => p.id !== id));
        }
    };

    const finalizeMonth = async () => {
        const day = new Date().getDate();
        if (day > 5) {
            alert('Monthly incentives can only be finalized before the 5th of the month!');
            return;
        }
        if (window.confirm('Finalize incentives for this month? This cannot be undone.')) {
            try {
                setSaving(true);
                calculateIncentives();
                setIsFinalized(true);

                // Persist parameters when finalizing too
                await websiteSettingsAPI.save('incentive-parameters', parameters, 'Technician incentive policy parameters');

                // In a real app, we would also save the calculated incentives for this month to a dedicated table
                // For now, we'll just save the finalized status to settings for demo
                await websiteSettingsAPI.save(`incentives-finalized-${activeMonth}`, true, `Incentives finalized status for ${activeMonth}`);

                alert('Incentives finalized successfully!');
            } catch (err) {
                console.error('Failed to finalize incentives:', err);
                alert('Failed to finalize');
            } finally {
                setSaving(false);
            }
        }
    };

    const handleSaveParameters = async () => {
        try {
            setSaving(true);
            await websiteSettingsAPI.save('incentive-parameters', parameters, 'Technician incentive policy parameters');
            alert('Parameters saved successfully!');
        } catch (err) {
            console.error('Failed to save incentive parameters:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const payIncentive = async (tech) => {
        if (!tech.ledger_id) {
            alert(`No ledger account linked to ${tech.name}. Please link a ledger account in Technician Management first.`);
            return;
        }
        const amount = tech.calculatedIncentive;
        if (amount <= 0) {
            alert('Calculated incentive is ₹0 — nothing to pay.');
            return;
        }
        if (!window.confirm(`Pay ₹${amount.toLocaleString()} incentive to ${tech.name} for ${activeMonth}?`)) return;
        try {
            setPayingTechId(tech.id);
            await transactionsAPI.create({
                type: 'payment',
                date: new Date().toISOString().split('T')[0],
                account_id: tech.ledger_id,
                account_name: tech.name,
                amount,
                payment_mode: 'bank_transfer',
                notes: `Incentive for ${activeMonth} — ${tech.currentMetrics.completedJobs} jobs, ₹${tech.currentMetrics.monthlyRevenue.toLocaleString()} revenue`,
                status: 'finalized',
            });
            // Mark as paid in settings
            await websiteSettingsAPI.save(
                `incentive-paid-${activeMonth}-${tech.id}`,
                { amount, paidOn: new Date().toISOString() },
                `Incentive paid to ${tech.name} for ${activeMonth}`
            );
            // Update local state to reflect payment
            setTechnicians(ts => ts.map(t => t.id === tech.id ? { ...t, alreadyPaid: (t.alreadyPaid || 0) + amount } : t));
            alert(`✓ Payment voucher created for ₹${amount.toLocaleString()} — ${tech.name}`);
        } catch (err) {
            console.error('Pay incentive error:', err);
            alert('Failed to create payment: ' + err.message);
        } finally {
            setPayingTechId(null);
        }
    };

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
                            Incentives Management
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Configure parameters, track performance, and manage technician incentives
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowPolicyPdf(true)}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        >
                            <FileText size={14} />
                            View Policy Sheet
                        </button>
                        <input
                            type="month"
                            value={activeMonth}
                            onChange={(e) => setActiveMonth(e.target.value)}
                            disabled={isFinalized}
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-sm)' }}
                        />
                        {isFinalized ? (
                            <div style={{
                                padding: '6px 12px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--color-success)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Lock size={14} />
                                Finalized
                            </div>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={finalizeMonth}
                                disabled={saving || loading}
                                style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {saving ? <Loader2 size={16} className="spin" /> : <Lock size={16} />}
                                Finalize Month
                            </button>
                        )}
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
                                    Incentive Parameters
                                </h4>
                                <button
                                    className="btn btn-secondary"
                                    onClick={addParameter}
                                    disabled={isFinalized}
                                    style={{ padding: '4px 10px', fontSize: 'var(--font-size-xs)' }}
                                >
                                    <Plus size={14} />
                                    Add Parameter
                                </button>
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)', maxHeight: '500px', overflow: 'auto' }}>
                                {parameters.map(param => (
                                    <div
                                        key={param.id}
                                        style={{
                                            padding: 'var(--spacing-sm)',
                                            backgroundColor: param.type === 'positive' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                            border: `1px solid ${param.type === 'positive' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                                            gap: 'var(--spacing-xs)',
                                            alignItems: 'center',
                                            fontSize: 'var(--font-size-xs)'
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={param.name}
                                            onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                                            disabled={isFinalized}
                                            className="form-input"
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
                                        />
                                        <input
                                            type="number"
                                            value={param.threshold}
                                            onChange={(e) => updateParameter(param.id, 'threshold', parseFloat(e.target.value))}
                                            disabled={isFinalized}
                                            placeholder="Threshold"
                                            className="form-input"
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
                                        />
                                        <select
                                            value={param.rewardType}
                                            onChange={(e) => updateParameter(param.id, 'rewardType', e.target.value)}
                                            disabled={isFinalized}
                                            className="form-input"
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
                                        >
                                            <option value="fixed">Fixed</option>
                                            <option value="percentage">%</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={param.rewardValue}
                                            onChange={(e) => updateParameter(param.id, 'rewardValue', parseFloat(e.target.value))}
                                            disabled={isFinalized}
                                            placeholder="Amount"
                                            className="form-input"
                                            style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
                                        />
                                        <button
                                            onClick={() => deleteParameter(param.id)}
                                            disabled={isFinalized}
                                            style={{
                                                padding: '4px',
                                                border: 'none',
                                                background: 'none',
                                                color: 'var(--color-danger)',
                                                cursor: isFinalized ? 'not-allowed' : 'pointer',
                                                opacity: isFinalized ? 0.5 : 1
                                            }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                className="btn btn-primary"
                                onClick={calculateIncentives}
                                disabled={isFinalized || loading}
                                style={{ width: '100%', marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)' }}
                            >
                                Calculate Incentives
                            </button>

                            {!isFinalized && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleSaveParameters}
                                    disabled={saving || loading}
                                    style={{ width: '100%', marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                    Save Config Parameters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Technician Results */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {loading ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                                <Loader2 className="spin" size={40} style={{ margin: '0 auto' }} />
                                <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-sm)' }}>Fetching technicians...</p>
                            </div>
                        ) : technicians.length === 0 ? (
                            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                                <p style={{ color: 'var(--text-secondary)' }}>No technicians found.</p>
                            </div>
                        ) : (
                            technicians.map(tech => (
                                <div
                                    key={tech.id}
                                    style={{
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-lg)',
                                        padding: 'var(--spacing-md)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                        <div>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {tech.name}
                                            </h4>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, display: 'flex', gap: 12 }}>
                                                <span>{tech.currentMetrics.completedJobs ?? 0} jobs completed</span>
                                                <span>₹{(tech.currentMetrics.monthlyRevenue || 0).toLocaleString()} revenue</span>
                                                {tech.alreadyPaid > 0 && (
                                                    <span style={{ color: '#10b981', fontWeight: 600 }}>✓ ₹{tech.alreadyPaid.toLocaleString()} paid</span>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                                ₹{tech.calculatedIncentive.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>calculated incentive</div>
                                        </div>
                                    </div>

                                    {tech.breakdown.length > 0 && (
                                        <>
                                            <div style={{ fontSize: 'var(--font-size-xs)' }}>
                                                <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Breakdown:</div>
                                                {tech.breakdown.map((item, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            padding: '4px 0',
                                                            borderBottom: '1px solid var(--border-primary)'
                                                        }}
                                                    >
                                                        <span style={{ color: item.type === 'positive' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                            {item.type === 'positive' ? '✓' : '✗'} {item.parameter}
                                                        </span>
                                                        <span style={{ fontWeight: 600, color: item.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                            {item.amount >= 0 ? '+' : ''}₹{item.amount.toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setSelectedTechForPdf(tech);
                                                    setShowTechPdf(true);
                                                }}
                                                style={{ width: '100%', marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)' }}
                                            >
                                                <FileText size={14} />
                                                View Incentive Sheet (PDF)
                                            </button>

                                            {/* Pay Incentive Button */}
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => payIncentive(tech)}
                                                disabled={payingTechId === tech.id || tech.calculatedIncentive <= 0 || (tech.alreadyPaid >= tech.calculatedIncentive)}
                                                style={{
                                                    width: '100%',
                                                    marginTop: 'var(--spacing-xs)',
                                                    padding: 'var(--spacing-sm)',
                                                    backgroundColor: tech.alreadyPaid >= tech.calculatedIncentive && tech.calculatedIncentive > 0 ? '#10b981' : undefined,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                }}
                                            >
                                                {payingTechId === tech.id
                                                    ? <><Loader2 size={14} className="spin" /> Processing...</>
                                                    : tech.alreadyPaid >= tech.calculatedIncentive && tech.calculatedIncentive > 0
                                                        ? <><CreditCard size={14} /> Already Paid</>
                                                        : <><CreditCard size={14} /> Pay Incentive ₹{tech.calculatedIncentive.toLocaleString()}</>}
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Performance View */}
            {activeView === 'performance' && (
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
                                    {tech.name} - Live Performance
                                </h4>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>On-Time Visits</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: tech.currentMetrics.onTimeVisits >= 95 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                            {tech.currentMetrics.onTimeVisits}%
                                        </div>
                                    </div>

                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Customer Feedback</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                                            {tech.currentMetrics.feedbackAbove4}%
                                        </div>
                                    </div>

                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Revenue/Customer</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                                            ₹{tech.currentMetrics.revenuePerCustomer.toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Monthly Revenue</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                                            ₹{tech.currentMetrics.monthlyRevenue.toLocaleString()}
                                        </div>
                                    </div>

                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Repeat Calls</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: tech.currentMetrics.repeatCallPercent > 15 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {tech.currentMetrics.repeatCallPercent}%
                                        </div>
                                    </div>

                                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>Late Arrivals</div>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: tech.currentMetrics.lateArrivals > 10 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                                            {tech.currentMetrics.lateArrivals}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
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
                                    {tech.name} - 3-Month History
                                </h4>

                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left' }}>Month</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>On-Time %</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>Feedback %</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Revenue</th>
                                            <th style={{ padding: 'var(--spacing-sm)', textAlign: 'right' }}>Incentive</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tech.history.map((record, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                                    {new Date(record.month + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                                    {record.onTimeVisits}%
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>
                                                    {record.feedbackAbove4}%
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 600 }}>
                                                    ₹{record.monthlyRevenue.toLocaleString()}
                                                </td>
                                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'right', fontWeight: 700, color: 'var(--color-success)' }}>
                                                    ₹{record.incentive.toLocaleString()}
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

            {/* Policy PDF Modal */}
            {showPolicyPdf && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: '#1e293b',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTopLeftRadius: 'var(--radius-lg)',
                            borderTopRightRadius: 'var(--radius-lg)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                Incentives Policy Sheet - {new Date(activeMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                            </h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    className="btn"
                                    onClick={() => alert('PDF download - integrate jsPDF')}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        border: 'none'
                                    }}
                                >
                                    <Download size={16} />
                                    Download PDF
                                </button>
                                <button
                                    onClick={() => setShowPolicyPdf(false)}
                                    style={{
                                        padding: '6px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* PDF Content */}
                        <div style={{
                            padding: '40px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            fontFamily: 'Arial, sans-serif'
                        }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #1e293b', paddingBottom: '20px' }}>
                                <h1 style={{ margin: 0, fontSize: '32px', color: '#1e293b' }}>AC Repair Services</h1>
                                <p style={{ margin: '5px 0', fontSize: '16px', color: '#64748b', fontWeight: 600 }}>Technician Incentives Policy</p>
                                <p style={{ margin: '5px 0', fontSize: '14px', color: '#64748b' }}>
                                    Effective Period: {new Date(activeMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            {/* Positive Parameters */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px', color: '#10b981', borderBottom: '2px solid #10b981', paddingBottom: '8px' }}>
                                    ✓ Positive Performance Parameters
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #10b981' }}>Parameter</th>
                                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #10b981' }}>Threshold</th>
                                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #10b981' }}>Reward</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parameters.filter(p => p.type === 'positive' && p.enabled).map((param, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>{param.name}</td>
                                                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                                                    ≥ {param.threshold}{param.name.includes('%') ? '%' : ''}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#10b981' }}>
                                                    {param.rewardType === 'fixed' ? `₹${param.rewardValue.toLocaleString()}` : `${param.rewardValue}%`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Negative Parameters */}
                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px', color: '#ef4444', borderBottom: '2px solid #ef4444', paddingBottom: '8px' }}>
                                    ✗ Negative Performance Parameters (Penalties)
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ef4444' }}>Parameter</th>
                                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ef4444' }}>Threshold</th>
                                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #ef4444' }}>Penalty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parameters.filter(p => p.type === 'negative' && p.enabled).map((param, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>{param.name}</td>
                                                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                                                    &gt; {param.threshold}{param.name.includes('%') ? '%' : ''}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 600, color: '#ef4444' }}>
                                                    -{param.rewardType === 'fixed' ? `₹${param.rewardValue.toLocaleString()}` : `${param.rewardValue}%`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Terms */}
                            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', color: '#1e293b' }}>Important Notes:</h4>
                                <ul style={{ fontSize: '12px', color: '#64748b', margin: 0, paddingLeft: '20px' }}>
                                    <li>Incentives are calculated monthly based on performance metrics</li>
                                    <li>All parameters must be met for respective rewards/penalties to apply</li>
                                    <li>Final incentive amount cannot be negative (minimum ₹0)</li>
                                    <li>Incentives must be finalized before the 5th of each month</li>
                                    <li>This policy is subject to review and modification</li>
                                </ul>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                                <p style={{ margin: '5px 0' }}>This is an official company policy document</p>
                                <p style={{ margin: '5px 0' }}>Generated on: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                                <p style={{ margin: '5px 0' }}>For queries, contact: hr@acrepair.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Technician PDF Modal - (Same as before, keeping existing) */}
            {showTechPdf && selectedTechForPdf && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '800px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: '#1e293b',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderTopLeftRadius: 'var(--radius-lg)',
                            borderTopRightRadius: 'var(--radius-lg)'
                        }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                                Incentive Sheet - {selectedTechForPdf.name}
                            </h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    className="btn"
                                    onClick={() => alert('PDF download - integrate jsPDF')}
                                    style={{
                                        padding: '6px 12px',
                                        backgroundColor: '#10b981',
                                        color: '#ffffff',
                                        border: 'none'
                                    }}
                                >
                                    <Download size={16} />
                                    Download
                                </button>
                                <button
                                    onClick={() => {
                                        setShowTechPdf(false);
                                        setSelectedTechForPdf(null);
                                    }}
                                    style={{
                                        padding: '6px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div style={{
                            padding: '40px',
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            fontFamily: 'Arial, sans-serif'
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #1e293b', paddingBottom: '20px' }}>
                                <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>AC Repair Services</h1>
                                <p style={{ margin: '5px 0', fontSize: '14px', color: '#64748b' }}>Monthly Incentive Statement</p>
                            </div>

                            <div style={{ marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '12px' }}>Technician:</strong>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>{selectedTechForPdf.name}</div>
                                </div>
                                <div>
                                    <strong style={{ color: '#64748b', fontSize: '12px' }}>Period:</strong>
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>
                                        {new Date(activeMonth + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '15px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                    Incentive Breakdown
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                                            <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #cbd5e1' }}>Parameter</th>
                                            <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #cbd5e1' }}>Achieved</th>
                                            <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #cbd5e1' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTechForPdf.breakdown.map((item, idx) => (
                                            <tr key={idx}>
                                                <td style={{ padding: '10px', borderBottom: '1px solid #e2e8f0' }}>
                                                    <span style={{ color: item.type === 'positive' ? '#10b981' : '#ef4444', marginRight: '8px' }}>
                                                        {item.type === 'positive' ? '✓' : '✗'}
                                                    </span>
                                                    {item.parameter}
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>
                                                    {item.metricValue}{item.parameter.includes('%') ? '%' : ''}
                                                </td>
                                                <td style={{
                                                    padding: '10px',
                                                    textAlign: 'right',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    fontWeight: 600,
                                                    color: item.amount >= 0 ? '#10b981' : '#ef4444'
                                                }}>
                                                    {item.amount >= 0 ? '+' : ''}₹{item.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#1e293b', color: '#ffffff' }}>
                                            <td colSpan="2" style={{ padding: '15px', fontSize: '16px', fontWeight: 600 }}>
                                                Total Incentive
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'right', fontSize: '20px', fontWeight: 700 }}>
                                                ₹{selectedTechForPdf.calculatedIncentive.toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '2px solid #e2e8f0', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                                <p style={{ margin: '5px 0' }}>This is a system-generated document</p>
                                <p style={{ margin: '5px 0' }}>Generated on: {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IncentivesManagement;
