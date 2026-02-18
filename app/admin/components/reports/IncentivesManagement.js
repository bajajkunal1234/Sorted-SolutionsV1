'use client'

import { useState, useEffect } from 'react';
import { TrendingUp, Award, DollarSign, Calendar, Settings, Save, Plus, Trash2, Lock, Unlock, FileText, Download, X, Eye, BarChart3, Loader2, RefreshCcw } from 'lucide-react';
import { techniciansAPI, websiteSettingsAPI } from '@/lib/adminAPI';

function IncentivesManagement() {
    const [activeView, setActiveView] = useState('configure'); // configure, performance, history
    const [showPolicyPdf, setShowPolicyPdf] = useState(false);
    const [showTechPdf, setShowTechPdf] = useState(false);
    const [selectedTechForPdf, setSelectedTechForPdf] = useState(null);
    const [activeMonth, setActiveMonth] = useState('2026-02');
    const [isFinalized, setIsFinalized] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Incentive Parameters Configuration
    const [parameters, setParameters] = useState([]);

    // Technician Performance Data with 3-month history
    const [technicians, setTechnicians] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [techsData, paramsData] = await Promise.all([
                techniciansAPI.getAll(),
                websiteSettingsAPI.getByKey('incentive-parameters')
            ]);

            if (paramsData && paramsData.value) {
                setParameters(paramsData.value);
            } else {
                // Default parameters if none found
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

            if (techsData) {
                // Mock metrics for now as they require complex aggregation
                const processedTechs = techsData.map(tech => ({
                    id: tech.id,
                    name: tech.name,
                    currentMetrics: {
                        onTimeVisits: Math.floor(Math.random() * 15) + 85, // 85-100
                        feedbackAbove4: Math.floor(Math.random() * 20) + 80, // 80-100
                        revenuePerCustomer: Math.floor(Math.random() * 1000) + 1800,
                        revenuePerDay: Math.floor(Math.random() * 3000) + 4000,
                        monthlyRevenue: Math.floor(Math.random() * 50000) + 80000,
                        feedbackBelow4: Math.floor(Math.random() * 10),
                        repeatCallPercent: Math.floor(Math.random() * 15),
                        lateArrivals: Math.floor(Math.random() * 8)
                    },
                    history: [
                        { month: '2026-01', incentive: Math.floor(Math.random() * 10000) + 10000, onTimeVisits: 94, feedbackAbove4: 90, monthlyRevenue: 115000 },
                        { month: '2025-12', incentive: Math.floor(Math.random() * 10000) + 8000, onTimeVisits: 92, feedbackAbove4: 88, monthlyRevenue: 105000 },
                        { month: '2025-11', incentive: Math.floor(Math.random() * 10000) + 12000, onTimeVisits: 95, feedbackAbove4: 91, monthlyRevenue: 118000 }
                    ],
                    calculatedIncentive: 0,
                    breakdown: []
                }));
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
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                            {tech.name}
                                        </h4>
                                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                                            ₹{tech.calculatedIncentive.toLocaleString()}
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
                                                    {new Date(record.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
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
                                Incentives Policy Sheet - {new Date(activeMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
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
                                    Effective Period: {new Date(activeMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
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
                                <p style={{ margin: '5px 0' }}>Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
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
                                        {new Date(activeMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
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
                                <p style={{ margin: '5px 0' }}>Generated on: {new Date().toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IncentivesManagement;
