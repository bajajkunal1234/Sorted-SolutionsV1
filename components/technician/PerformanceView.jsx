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
    ChevronLeft,
    Loader2,
    Info,
    ChevronRight,
    Filter
} from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';

export default function PerformanceView({ technicianId }) {
    const [datePreset, setDatePreset] = useState('today');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // View state: 'metrics' (dashboard overview) or 'details' (full page jobs list)
    const [viewMode, setViewMode] = useState('metrics');
    const [activeFilter, setActiveFilter] = useState('all');

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

    // Safely retrieve properties with absolute defaults to prevent null-pointer crashes
    const metrics = performanceData?.metrics || {
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
    };
    const jobsList = performanceData?.jobsList || [];

    const getRangeForPreset = (preset) => {
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

        return {
            startStr: start,
            endStr: end
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
                if (resData.success && resData.data) {
                    setPerformanceData(resData.data);
                } else if (resData.success) {
                    // Fallback empty data if success is true but data block is missing (offline cache fallback)
                    setPerformanceData({
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
        setViewMode('metrics'); // Reset view on date preset changes
    }, [technicianId, datePreset, customStart, customEnd]);

    const metricsList = [
        { key: 'revenueGenerated', label: 'Revenue Generated', val: `₹${(metrics.revenueGenerated || 0).toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#22c55e" />, bg: 'rgba(34, 197, 94, 0.08)', colorTheme: '#22c55e', filterTarget: 'revenue' },
        { key: 'jobsAssigned', label: 'Jobs Assigned', val: metrics.jobsAssigned || 0, icon: <Briefcase size={18} color="#3b82f6" />, bg: 'rgba(59, 130, 246, 0.08)', colorTheme: '#3b82f6', filterTarget: 'all' },
        { key: 'visitsDone', label: 'Visits Done', val: metrics.visitsDone || 0, icon: <Clock size={18} color="#0ea5e9" />, bg: 'rgba(14, 165, 233, 0.08)', colorTheme: '#0ea5e9', filterTarget: 'visits' },
        { key: 'jobsClosed', label: 'Jobs Closed', val: metrics.jobsClosed || 0, icon: <CheckCircle size={18} color="#10b981" />, bg: 'rgba(16, 185, 129, 0.08)', colorTheme: '#10b981', filterTarget: 'closed' },
        { key: 'quotationsCreated', label: 'Quotations Created', val: metrics.quotationsCreated || 0, icon: <FileText size={18} color="#8b5cf6" />, bg: 'rgba(139, 92, 246, 0.08)', colorTheme: '#8b5cf6', filterTarget: 'quotations' },
        { key: 'invoicesCreated', label: 'Invoices Created', val: metrics.invoicesCreated || 0, icon: <FileText size={18} color="#6366f1" />, bg: 'rgba(99, 102, 241, 0.08)', colorTheme: '#6366f1', filterTarget: 'invoices' },
        { key: 'feedbacksTaken', label: 'Feedbacks Taken', val: metrics.feedbacksTaken || 0, icon: <MessageSquare size={18} color="#ec4899" />, bg: 'rgba(236, 72, 153, 0.08)', colorTheme: '#ec4899', filterTarget: 'ratings' },
        { key: 'avgRating', label: 'Average Rating', val: (metrics.avgRating || 0) > 0 ? `⭐ ${metrics.avgRating}` : 'N/A', icon: <Star size={18} color="#eab308" />, bg: 'rgba(234, 179, 8, 0.08)', colorTheme: '#eab308', filterTarget: 'ratings' },
        { key: 'avgDaysToClose', label: 'Avg Days to Close', val: (metrics.jobsClosed || 0) > 0 ? `${metrics.avgDaysToClose || 0} days` : 'N/A', icon: <Clock size={18} color="#a855f7" />, bg: 'rgba(168, 85, 247, 0.08)', colorTheme: '#a855f7', filterTarget: 'closed' },
        { key: 'conversionRate', label: 'Conversion %', val: `${metrics.conversionRate || 0}%`, icon: <Percent size={18} color="#f97316" />, bg: 'rgba(249, 115, 22, 0.08)', colorTheme: '#f97316', filterTarget: 'quotations' },
        { key: 'avgRevenuePerJob', label: 'Avg Revenue / Job', val: `₹${(metrics.avgRevenuePerJob || 0).toLocaleString('en-IN')}`, icon: <DollarSign size={18} color="#14b8a6" />, bg: 'rgba(20, 184, 166, 0.08)', colorTheme: '#14b8a6', filterTarget: 'revenue' },
        { key: 'feedbackRate', label: 'Feedback Rate (%)', val: `${metrics.feedbackRate || 0}%`, icon: <Award size={18} color="#f43f5e" />, bg: 'rgba(244, 63, 94, 0.08)', colorTheme: '#f43f5e', filterTarget: 'ratings' }
    ];

    const getFilteredJobs = () => {
        const jobs = jobsList;
        switch (activeFilter) {
            case 'revenue':
                return jobs.filter(j => j.revenue > 0);
            case 'visits':
                return jobs.filter(j => j.visits_count > 0);
            case 'closed':
                return jobs.filter(j => j.status === 'completed' || j.status === 'closed');
            case 'quotations':
                return jobs.filter(j => j.has_quotation);
            case 'invoices':
                return jobs.filter(j => j.has_invoice);
            case 'ratings':
                return jobs.filter(j => j.customer_rating > 0);
            case 'all':
            default:
                return jobs;
        }
    };

    const handleMetricClick = (metric) => {
        setActiveFilter(metric.filterTarget);
        setViewMode('details');
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

    const filterOptions = [
        { key: 'all', label: 'All Jobs', icon: <Briefcase size={14} /> },
        { key: 'revenue', label: 'Revenue', icon: <DollarSign size={14} /> },
        { key: 'visits', label: 'Visits', icon: <Clock size={14} /> },
        { key: 'closed', label: 'Closed', icon: <CheckCircle size={14} /> },
        { key: 'quotations', label: 'Quotations', icon: <FileText size={14} /> },
        { key: 'invoices', label: 'Invoices', icon: <FileText size={14} /> },
        { key: 'ratings', label: 'Ratings', icon: <Star size={14} /> }
    ];

    const filteredJobs = getFilteredJobs();

    // ── RENDER FULL DETAILS VIEW ─────────────────────────────────────────────
    if (viewMode === 'details') {
        return (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                {/* Back Navigation Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                    <button
                        onClick={() => setViewMode('metrics')}
                        style={{
                            border: 'none',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'var(--text-primary)',
                            padding: '8px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, margin: 0 }}>Job-Level Details</h2>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
                            {datePreset === 'custom' 
                                ? `${customStart} to ${customEnd}` 
                                : `Period: ${datePreset.toUpperCase()}`}
                        </p>
                    </div>
                </div>

                {/* Horizontal Filter Buttons Drawer */}
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    overflowX: 'auto', 
                    paddingBottom: '12px', 
                    marginBottom: 'var(--spacing-md)',
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none' 
                }}>
                    {filterOptions.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => setActiveFilter(opt.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                fontSize: '12px',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: activeFilter === opt.key ? '#3b82f6' : 'var(--bg-secondary)',
                                color: activeFilter === opt.key ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {opt.icon}
                            <span>{opt.label}</span>
                        </button>
                    ))}
                </div>

                {/* Results Count Header */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Filter size={12} color="#3b82f6" />
                    Showing {filteredJobs.length} {filterOptions.find(f => f.key === activeFilter)?.label} contributing items
                </div>

                {/* Jobs Cards Container */}
                {filteredJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--text-tertiary)', fontSize: '13px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                        No contributing jobs found for this parameter.
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

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                        <span>Date: {job.scheduled_date}</span>
                                        <span style={{ display: 'flex', gap: '12px' }}>
                                            {job.visits_count > 0 && (
                                                <span style={{ color: '#0ea5e9', fontWeight: 600 }}>
                                                    🚗 {job.visits_count} {job.visits_count === 1 ? 'visit' : 'visits'}
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
        );
    }

    // ── RENDER METRICS GRID VIEW ─────────────────────────────────────────────
    return (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <TrendingUp size={24} color="#3b82f6" />
                    My Performance
                </h2>
                {/* View Details Directly Link */}
                <button
                    onClick={() => {
                        setActiveFilter('all');
                        setViewMode('details');
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                    }}
                >
                    All Jobs
                    <ChevronRight size={14} />
                </button>
            </div>

            {/* Date Preset Selector */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
                {['today', 'yesterday', 'this_week', 'this_month', 'custom'].map((preset) => (
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
                        {preset === 'this_week' ? 'This Week' : preset === 'this_month' ? 'This Month' : preset === 'custom' ? 'Custom Range' : preset}
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
                            onClick={() => handleMetricClick(m)}
                            style={{
                                padding: isDouble ? '24px var(--spacing-md)' : '14px var(--spacing-sm)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                gridColumn: isDouble ? 'span 2' : 'span 1',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
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
                                fontSize: isDouble ? '30px' : '18px', 
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
            
            {/* Quick Helper callout */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px dashed rgba(59, 130, 246, 0.25)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <Info size={16} color="#3b82f6" />
                <span>💡 Click any card to drill down into job-level details.</span>
            </div>
        </div>
    );
}
