'use client'

import React, { useState, useEffect } from 'react';
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
    Loader2
} from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';

export default function PerformanceView({ technicianId }) {
    const [datePreset, setDatePreset] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
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
    }, [technicianId, datePreset, customStart, customEnd]);

    const metricsList = [
        { key: 'revenueGenerated', label: 'Revenue Generated', val: `₹${performanceData.metrics.revenueGenerated.toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#22c55e" />, bg: 'rgba(34, 197, 94, 0.08)' },
        { key: 'jobsAssigned', label: 'Jobs Assigned', val: performanceData.metrics.jobsAssigned, icon: <Briefcase size={18} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.08)' },
        { key: 'visitsDone', label: 'Visits Done', val: performanceData.metrics.visitsDone, icon: <Clock size={18} color="#0ea5e9" />, bg: 'rgba(14, 165, 233, 0.08)' },
        { key: 'jobsClosed', label: 'Jobs Closed', val: performanceData.metrics.jobsClosed, icon: <CheckCircle size={18} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.08)' },
        { key: 'quotationsCreated', label: 'Quotations Created', val: performanceData.metrics.quotationsCreated, icon: <FileText size={18} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.08)' },
        { key: 'invoicesCreated', label: 'Invoices Created', val: performanceData.metrics.invoicesCreated, icon: <FileText size={18} color="#6366f1" />, bg: 'rgba(99, 102, 241, 0.08)' },
        { key: 'feedbacksTaken', label: 'Feedbacks Taken', val: performanceData.metrics.feedbacksTaken, icon: <MessageSquare size={18} color="#ec4899" />, bg: 'rgba(236, 72, 153, 0.08)' },
        { key: 'avgRating', label: 'Average Rating', val: performanceData.metrics.avgRating > 0 ? `⭐ ${performanceData.metrics.avgRating}` : 'N/A', icon: <Star size={18} color="#eab308" />, bg: 'rgba(234, 179, 8, 0.08)' },
        { key: 'avgDaysToClose', label: 'Avg Days to Close', val: performanceData.metrics.jobsClosed > 0 ? `${performanceData.metrics.avgDaysToClose} days` : 'N/A', icon: <Clock size={18} color="#a855f7" />, bg: 'rgba(168, 85, 247, 0.08)' },
        { key: 'conversionRate', label: 'Conversion %', val: `${performanceData.metrics.conversionRate}%`, icon: <Percent size={18} color="#f97316" />, bg: 'rgba(249, 115, 22, 0.08)' },
        { key: 'avgRevenuePerJob', label: 'Avg Revenue / Job', val: `₹${performanceData.metrics.avgRevenuePerJob.toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#14b8a6" />, bg: 'rgba(20, 184, 166, 0.08)' },
        { key: 'feedbackRate', label: 'Feedback Rate (%)', val: `${performanceData.metrics.feedbackRate}%`, icon: <Award size={18} color="#f43f5e" />, bg: 'rgba(244, 63, 94, 0.08)' }
    ];

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
                    return (
                        <div
                            key={m.key}
                            style={{
                                padding: isDouble ? '16px var(--spacing-md)' : '14px var(--spacing-sm)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                gridColumn: isDouble ? 'span 2' : 'span 1'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ padding: '6px', borderRadius: '6px', background: m.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {m.icon}
                                </div>
                                <span style={{ fontSize: isDouble ? '12px' : '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.2 }}>
                                    {m.label}
                                </span>
                            </div>
                            <div style={{ fontSize: isDouble ? '24px' : '18px', fontWeight: 700, color: isDouble ? '#22c55e' : 'var(--text-primary)', paddingLeft: '2px' }}>
                                {loading ? '...' : m.val}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Job-Level Details Section */}
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px' }}>
                Job-Level Details ({performanceData.jobsList.length})
            </h3>

            {/* Jobs List (Read-only) */}
            {performanceData.jobsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                    No jobs recorded in this date range.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    {performanceData.jobsList.map((job) => {
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

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                    <span>Date: {job.scheduled_date}</span>
                                    <span style={{ display: 'flex', gap: '10px' }}>
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
    );
}
