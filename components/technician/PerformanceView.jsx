'use client'

import React, { useState, useEffect, useRef } from 'react';
import { 
    TrendingUp, 
    Calendar, 
    Briefcase, 
    Clock, 
    CheckCircle, 
    FileText, 
    Award, 
    DollarSign, 
    Percent, 
    MessageSquare, 
    Star, 
    RefreshCw, 
    ChevronRight,
    Loader2,
    Info
} from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';

export default function PerformanceView({ technicianId }) {
    const [datePreset, setDatePreset] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedMetric, setSelectedMetric] = useState(null);
    
    const detailsSectionRef = useRef(null);

    const [performanceData, setPerformanceData] = useState({
        metrics: {
            jobsAssigned: 0,
            visitsDone: 0,
            jobsClosed: 0,
            quotationsCreated: 0,
            invoicesCreated: 0,
            feedbacksTaken: 0,
            avgRating: 0,
            avgDaysToClose: 0,
            revenueGenerated: 0,
            conversionRate: 0,
            avgRevenuePerJob: 0,
            feedbackRate: 0
        },
        jobsList: []
    });

    const getRangeForPreset = (preset) => {
        const today = new Date();
        const start = new Date(today);
        const end = new Date(today);

        switch (preset) {
            case 'today':
                break;
            case 'yesterday':
                start.setDate(today.getDate() - 1);
                end.setDate(today.getDate() - 1);
                break;
            case 'week':
                start.setDate(today.getDate() - 7);
                break;
            case 'month':
                start.setDate(today.getDate() - 30);
                break;
            default:
                break;
        }

        return {
            startStr: start.toISOString().split('T')[0],
            endStr: end.toISOString().split('T')[0]
        };
    };

    const fetchPerformance = async () => {
        if (!technicianId) return;
        setLoading(true);
        setError(null);

        let startStr, endStr;
        if (datePreset === 'custom') {
            if (!customStart || !customEnd) {
                setLoading(false);
                return;
            }
            startStr = customStart;
            endStr = customEnd;
        } else {
            const range = getRangeForPreset(datePreset);
            startStr = range.startStr;
            endStr = range.endStr;
        }

        try {
            const response = await apiCall(`/api/technician/performance?technicianId=${technicianId}&startDate=${startStr}&endDate=${endStr}`);
            if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                    setPerformanceData(resData.data);
                } else {
                    throw new Error(resData.error || 'Failed to load performance metrics');
                }
            } else {
                throw new Error('Failed to load performance metrics');
            }
        } catch (err) {
            console.error('Error fetching performance:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerformance();
        setSelectedMetric(null); // Reset active metric filter on date preset changes
    }, [technicianId, datePreset, customStart, customEnd]);

    const metricsList = [
        { key: 'revenueGenerated', label: 'Revenue Generated', val: `₹${performanceData.metrics.revenueGenerated.toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#22c55e" />, bg: 'rgba(34, 197, 94, 0.08)', colorTheme: '#22c55e' },
        { key: 'jobsAssigned', label: 'Jobs Assigned', val: performanceData.metrics.jobsAssigned, icon: <Briefcase size={18} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.08)', colorTheme: '#3b82f6' },
        { key: 'visitsDone', label: 'Visits Done', val: performanceData.metrics.visitsDone, icon: <Clock size={18} color="#0ea5e9" />, bg: 'rgba(14, 165, 233, 0.08)', colorTheme: '#0ea5e9' },
        { key: 'jobsClosed', label: 'Jobs Closed', val: performanceData.metrics.jobsClosed, icon: <CheckCircle size={18} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.08)', colorTheme: '#10b981' },
        { key: 'quotationsCreated', label: 'Quotations Created', val: performanceData.metrics.quotationsCreated, icon: <FileText size={18} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.08)', colorTheme: '#8b5cf6' },
        { key: 'invoicesCreated', label: 'Invoices Created', val: performanceData.metrics.invoicesCreated, icon: <FileText size={18} color="#6366f1" />, bg: 'rgba(99, 102, 241, 0.08)', colorTheme: '#6366f1' },
        { key: 'feedbacksTaken', label: 'Feedbacks Taken', val: performanceData.metrics.feedbacksTaken, icon: <MessageSquare size={18} color="#ec4899" />, bg: 'rgba(236, 72, 153, 0.08)', colorTheme: '#ec4899' },
        { key: 'avgRating', label: 'Average Rating', val: performanceData.metrics.avgRating > 0 ? `⭐ ${performanceData.metrics.avgRating}` : 'N/A', icon: <Star size={18} color="#eab308" />, bg: 'rgba(234, 179, 8, 0.08)', colorTheme: '#eab308' },
        { key: 'avgDaysToClose', label: 'Avg Days to Close', val: performanceData.metrics.jobsClosed > 0 ? `${performanceData.metrics.avgDaysToClose} days` : 'N/A', icon: <Clock size={18} color="#a855f7" />, bg: 'rgba(168, 85, 247, 0.08)', colorTheme: '#a855f7' },
        { key: 'conversionRate', label: 'Conversion %', val: `${performanceData.metrics.conversionRate}%`, icon: <Percent size={18} color="#f97316" />, bg: 'rgba(249, 115, 22, 0.08)', colorTheme: '#f97316' },
        { key: 'avgRevenuePerJob', label: 'Avg Revenue / Job', val: `₹${performanceData.metrics.avgRevenuePerJob.toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#14b8a6" />, bg: 'rgba(20, 184, 166, 0.08)', colorTheme: '#14b8a6' },
        { key: 'feedbackRate', label: 'Feedback Rate (%)', val: `${performanceData.metrics.feedbackRate}%`, icon: <Award size={18} color="#f43f5e" />, bg: 'rgba(244, 63, 94, 0.08)', colorTheme: '#f43f5e' }
    ];

    const getFilteredJobs = () => {
        if (!selectedMetric) return [];
        const jobs = performanceData.jobsList;

        switch (selectedMetric) {
            case 'revenueGenerated':
            case 'avgRevenuePerJob':
                return jobs.filter(j => j.revenue > 0);
            case 'jobsAssigned':
                return jobs;
            case 'visitsDone':
                return jobs.filter(j => j.visits_count > 0);
            case 'jobsClosed':
            case 'avgDaysToClose':
                return jobs.filter(j => j.status === 'completed' || j.status === 'closed');
            case 'quotationsCreated':
                return jobs.filter(j => j.has_quotation);
            case 'invoicesCreated':
                return jobs.filter(j => j.has_invoice);
            case 'feedbacksTaken':
            case 'avgRating':
            case 'feedbackRate':
                return jobs.filter(j => j.customer_rating > 0);
            case 'conversionRate':
                return jobs.filter(j => j.has_quotation);
            default:
                return jobs;
        }
    };

    const getMetricLabel = () => {
        const metricObj = metricsList.find(m => m.key === selectedMetric);
        return metricObj ? metricObj.label : '';
    };

    const handleMetricClick = (key) => {
        if (selectedMetric === key) {
            setSelectedMetric(null);
        } else {
            setSelectedMetric(key);
            setTimeout(() => {
                detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const formatStatus = (status) => {
        if (!status) return 'New';
        return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
            case 'closed':
                return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
            case 'parts_ordered':
                return { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
            case 'work_in_progress':
                return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
            case 'cancelled':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
            default:
                return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8' };
        }
    };

    const filteredJobs = getFilteredJobs();

    return (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            {/* Header */}
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <TrendingUp size={24} color="#3b82f6" />
                My Performance
            </h2>

            {/* Date Preset Selector */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                {['today', 'yesterday', 'week', 'month', 'custom'].map((preset) => (
                    <button
                        key={preset}
                        onClick={() => setDatePreset(preset)}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                            borderRadius: '20px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: datePreset === preset ? '#3b82f6' : 'var(--bg-secondary)',
                            color: datePreset === preset ? 'white' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        {preset === 'week' ? 'Last 7 Days' : preset === 'month' ? 'Last 30 Days' : preset}
                    </button>
                ))}
            </div>

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <input
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>to</div>
                    <div style={{ flex: 1 }}>
                        <input
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                fontSize: '13px'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Refresh Button & Loader */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-sm)' }}>
                <button
                    onClick={fetchPerformance}
                    disabled={loading}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}
                >
                    {loading ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <RefreshCw size={14} />
                    )}
                    Refresh
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ padding: 'var(--spacing-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: 'var(--radius-md)', fontSize: '13px', marginBottom: 'var(--spacing-md)' }}>
                    {error}
                </div>
            )}

            {/* Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                {metricsList.map((m, index) => {
                    const isDouble = index === 0;
                    const isSelected = selectedMetric === m.key;
                    return (
                        <div
                            key={m.key}
                            onClick={() => handleMetricClick(m.key)}
                            style={{
                                padding: isDouble ? '20px var(--spacing-md)' : '14px var(--spacing-sm)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: isSelected 
                                    ? `2px solid ${m.colorTheme}` 
                                    : '1px solid var(--border-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                gridColumn: isDouble ? 'span 2' : 'span 1',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isSelected ? `0 4px 12px ${m.bg}` : 'none',
                                ...(isDouble ? {
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center'
                                } : {})
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: isDouble ? 'center' : 'flex-start' }}>
                                <div style={{ padding: '6px', borderRadius: '6px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {m.icon}
                                </div>
                                <span style={{ fontSize: isDouble ? '12px' : '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                    {m.label}
                                </span>
                            </div>
                            <div style={{ 
                                fontSize: isDouble ? '28px' : '18px', 
                                fontWeight: 700, 
                                color: isDouble ? '#22c55e' : 'var(--text-primary)', 
                                paddingLeft: isDouble ? '0' : '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isDouble ? 'center' : 'flex-start',
                                gap: '6px'
                            }}>
                                {loading ? '...' : m.val}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dynamic Job-Level Details Section */}
            <div ref={detailsSectionRef} style={{ scrollMarginTop: '16px' }}>
                {!selectedMetric ? (
                    <div style={{
                        padding: 'var(--spacing-lg) var(--spacing-md)',
                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                        border: '1px dashed rgba(59, 130, 246, 0.25)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Info size={20} color="#3b82f6" />
                        <div>
                            <strong>Tap on any metric or figure above</strong> to view contributing jobs and details.
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '8px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                {getMetricLabel()} Details ({filteredJobs.length})
                            </h3>
                            <button 
                                onClick={() => setSelectedMetric(null)} 
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    color: '#ef4444',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Close Details
                            </button>
                        </div>

                        {filteredJobs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                No jobs contributing to this metric.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {filteredJobs.map((job) => {
                                    const colors = getStatusColor(job.status);
                                    return (
                                        <div
                                            key={job.id}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {job.job_number}
                                                </span>
                                                <span style={{
                                                    padding: '3px 8px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                    borderRadius: '12px',
                                                    backgroundColor: colors.bg,
                                                    color: colors.color
                                                }}>
                                                    {formatStatus(job.status)}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                Customer: <strong style={{ color: 'var(--text-primary)' }}>{job.customer_name}</strong>
                                            </div>

                                            {/* Contextual Metric Breakdown inside the Job Card */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                <span>Date: {job.scheduled_date}</span>
                                                <span style={{ display: 'flex', gap: '12px' }}>
                                                    {selectedMetric === 'visitsDone' && (
                                                        <span style={{ color: '#0ea5e9', fontWeight: 600 }}>
                                                            Visits: {job.visits_count}
                                                        </span>
                                                    )}
                                                    {job.revenue > 0 && (
                                                        <span style={{ color: '#22c55e', fontWeight: 600 }}>
                                                            ₹{job.revenue.toLocaleString('en-IN')}
                                                        </span>
                                                    )}
                                                    {job.customer_rating > 0 && (
                                                        <span style={{ color: '#eab308', fontWeight: 600 }}>
                                                            ⭐ {job.customer_rating}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
