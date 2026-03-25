'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Phone, ChevronRight, Navigation, Briefcase, TrendingUp, Settings, User, Moon, Sun, Calendar, DollarSign, Calculator, LayoutGrid, List, Columns, Maximize } from 'lucide-react';
import JobDetailView from '@/components/technician/JobDetailView';
import ExpensesList from '@/components/technician/ExpensesList';
import RepairCalculator from '@/components/common/RepairCalculator';
import { logInteraction, logNavigation } from '@/lib/interactions';
import JobsSearchPanel from '@/components/shared/JobsSearchPanel';

function TechnicianApp() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('jobs');
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('techViewMode') || 'kanban';
        return 'kanban';
    });
    
    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('techViewMode', viewMode);
    }, [viewMode]);

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupBy, setGroupBy] = useState('status');
    const [sortBy, setSortBy] = useState('dueDate');
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTags, setActiveTags] = useState([]);
    const [savedViews, setSavedViews] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [calculatorJob, setCalculatorJob] = useState(null); // job to open in RepairCalculator
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('techDarkMode');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveStartDate, setLeaveStartDate] = useState('');
    const [leaveEndDate, setLeaveEndDate] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [technicianData, setTechnicianData] = useState(null);
    const [technicianId, setTechnicianId] = useState(null);

    // Incentive Data State
    const [incentiveData, setIncentiveData] = useState({
        metrics: {
            jobsCompleted: 0,
            revenueGenerated: 0,
            rating: 0
        },
        incentive: {
            total: 0,
            breakdown: []
        },
        period: ''
    });

    // Check authentication and get technician ID
    useEffect(() => {
        const session = localStorage.getItem('technicianSession');
        const storedTechData = localStorage.getItem('technicianData');

        if (!session) {
            router.push('/technician/login');
            return;
        }

        try {
            const sessionData = JSON.parse(session);
            const techData = JSON.parse(storedTechData);
            setTechnicianId(sessionData.technicianId);
            setTechnicianData(techData);
        } catch (err) {
            console.error('Error parsing session:', err);
            router.push('/technician/login');
        }
    }, [router]);

    // Load saved views from Supabase after technicianId is ready
    useEffect(() => {
        if (!technicianId) return;
        const loadViews = async () => {
            try {
                const res = await fetch(`/api/technician/job-views?technicianId=${technicianId}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setSavedViews(json.data);
                    const def = json.data.find(v => v.isDefault);
                    if (def) applyViewConfig(def.config);
                }
            } catch (err) {
                console.warn('Could not load saved views:', err);
            }
        };
        loadViews();
    }, [technicianId]);

    const applyViewConfig = (config) => {
        if (!config) return;
        if (config.groupBy)    setGroupBy(config.groupBy);
        if (config.sortBy)     setSortBy(config.sortBy);
        if (config.sortOrder)  setSortOrder(config.sortOrder);
        if (config.activeTags) setActiveTags(config.activeTags);
    };

    // Fetch jobs and incentives when technician ID is available
    useEffect(() => {
        if (!technicianId) return;

        const fetchJobs = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/technician/jobs?technicianId=${technicianId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch jobs');
                }

                const data = await response.json();
                setJobs(data.jobs || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                setError('Failed to load jobs. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        const fetchIncentives = async () => {
            try {
                const response = await fetch(`/api/technician/incentives?technicianId=${technicianId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setIncentiveData(data.data);
                    }
                }
            } catch (err) {
                console.error('Error fetching incentives:', err);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await fetch(`/api/technician/profile?technicianId=${technicianId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setTechnicianData(data.technician);
                        // Update local storage to keep it fresh
                        localStorage.setItem('technicianData', JSON.stringify(data.technician));
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchJobs();
        fetchIncentives();
        fetchProfile();

        // Setup real-time listener
        const channel = supabase
            .channel(`technician:jobs:${technicianId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'jobs',
                    filter: `technician_id=eq.${technicianId}`
                },
                (payload) => {
                    fetchJobs();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [technicianId]);

    // Logout handler
    const handleLogout = () => {
        if (window.confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('technicianSession');
            localStorage.removeItem('technicianData');
            // Force a hard reload to clear any in-memory state
            window.location.href = '/technician/login';
        }

    };

    // Calculate time left to due
    const getTimeLeft = (dueDate) => {
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (diff < 0) return { text: 'Overdue', color: '#ef4444', urgent: true };
        if (hours < 2) return { text: `${hours}h ${minutes}m`, color: '#ef4444', urgent: true };
        if (hours < 6) return { text: `${hours}h ${minutes}m`, color: '#f59e0b', urgent: false };
        return { text: `${hours}h ${minutes}m`, color: '#10b981', urgent: false };
    };

    // Get status badge color
    const getStatusColor = (status) => {
        const colors = {
            'open': '#3b82f6',
            'confirmed': '#06b6d4',
            'in-progress': '#f59e0b',
            'quotation-sent': '#8b5cf6',
            'repair': '#f97316',
            'completed': '#10b981',
            'closed': '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    // Get priority badge
    const getPriorityBadge = (priority) => {
        const badges = {
            'urgent': { text: '🔴 URGENT', color: '#ef4444' },
            'high': { text: '🟡 HIGH', color: '#f59e0b' },
            'normal': { text: '🟢 NORMAL', color: '#10b981' },
            'low': { text: '⚪ LOW', color: '#6b7280' }
        };
        return badges[priority] || badges.normal;
    };

    // Apply tag-based filters (mirrors admin applyTags logic)
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = !searchTerm ||
            (job.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.locality?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        for (const tag of activeTags) {
            if (tag.type === 'preset') {
                const f = tag.filter;
                if (f._preset === 'dueToday') {
                    const d = new Date(job.dueDate);
                    if (d.toDateString() !== new Date().toDateString()) return false;
                } else if (f._preset === 'overdue') {
                    const d = new Date(job.dueDate); d.setHours(0,0,0,0);
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (!(d < today)) return false;
                } else {
                    if (f.status   && job.status !== f.status) return false;
                    if (f.priority && (job.priority || 'normal') !== f.priority) return false;
                }
            } else if (tag.type === 'custom' && tag.conditions) {
                for (const cond of tag.conditions) {
                    let fieldVal = '';
                    switch (cond.field) {
                        case 'status':      fieldVal = job.status || ''; break;
                        case 'priority':    fieldVal = job.priority || 'normal'; break;
                        case 'locality':    fieldVal = job.locality || ''; break;
                        case 'customer':    fieldVal = job.customerName || ''; break;
                        case 'dueDate':     fieldVal = job.dueDate || ''; break;
                        case 'createdDate': fieldVal = job.created_at || ''; break;
                        default: fieldVal = '';
                    }
                    const v = cond.value.toLowerCase();
                    const fv = (fieldVal || '').toLowerCase();
                    let passes = true;
                    switch (cond.operator) {
                        case 'is':           passes = fv === v; break;
                        case 'is_not':       passes = fv !== v; break;
                        case 'contains':     passes = fv.includes(v); break;
                        case 'not_contains': passes = !fv.includes(v); break;
                        case 'before':       passes = !!fieldVal && new Date(fieldVal) < new Date(cond.value); break;
                        case 'after':        passes = !!fieldVal && new Date(fieldVal) > new Date(cond.value); break;
                    }
                    if (!passes) return false;
                }
            }
        }
        return true;
    });

    // Sort jobs
    const sortedJobs = [...filteredJobs].sort((a, b) => {
        let aVal, bVal;
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        switch (sortBy) {
            case 'dueDate':
                aVal = new Date(a.dueDate || a.scheduled_date || 0);
                bVal = new Date(b.dueDate || b.scheduled_date || 0);
                break;
            case 'createdAt':
                aVal = new Date(a.created_at || a.createdAt || 0);
                bVal = new Date(b.created_at || b.createdAt || 0);
                break;
            case 'customer':
                aVal = (a.customerName || '').toLowerCase();
                bVal = (b.customerName || '').toLowerCase();
                break;
            case 'priority':
                aVal = priorityOrder[a.priority] ?? 2;
                bVal = priorityOrder[b.priority] ?? 2;
                break;
            case 'locality':
                aVal = (a.locality || '').toLowerCase();
                bVal = (b.locality || '').toLowerCase();
                break;
            default:
                return 0;
        }
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    // Group sorted jobs
    const groupedJobs = {};
    sortedJobs.forEach(job => {
        let key;
        if (groupBy === 'status') {
            key = job.status ? job.status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
        } else if (groupBy === 'due-date') {
            if (!job.dueDate) { key = 'No Date'; }
            else {
                const d = new Date(job.dueDate);
                d.setHours(0, 0, 0, 0);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                if (d < today) key = 'Overdue';
                else if (d.getTime() === today.getTime()) key = 'Today';
                else if (d.getTime() === tomorrow.getTime()) key = 'Tomorrow';
                else key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }
        } else if (groupBy === 'priority') {
            const pMap = { urgent: '🔴 Urgent', high: '🟡 High', normal: '🟢 Normal', low: '⚪ Low' };
            key = pMap[job.priority] || '🟢 Normal';
        } else if (groupBy === 'locality') {
            key = job.locality || job.city || 'Unknown Area';
        } else if (groupBy === 'customer') {
            key = job.customerName || 'Walk-in';
        } else if (groupBy === 'warranty') {
            key = job.product?.warranty?.status === 'in-warranty' ? 'In Warranty' : 'Out of Warranty';
        } else {
            key = 'All Jobs';
        }

        if (!groupedJobs[key]) groupedJobs[key] = [];
        groupedJobs[key].push(job);
    });

    // ── Named View Helpers ────────────────────────────────────────
    const uid = () => Math.random().toString(36).slice(2, 9);

    const persistViews = async (views) => {
        setSavedViews(views);
        try {
            await fetch('/api/technician/job-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianId, views }),
            });
        } catch (e) { console.error('persist views failed', e); }
    };

    const handleSaveNamedView = async (name) => {
        setSaveStatus('saving');
        const config = { groupBy, sortBy, sortOrder, activeTags };
        const existing = savedViews.find(v => v.name.toLowerCase() === name.toLowerCase());
        let updated;
        if (existing) {
            updated = savedViews.map(v => v.name.toLowerCase() === name.toLowerCase() ? { ...v, config } : v);
        } else {
            const isFirst = savedViews.length === 0;
            updated = [...savedViews, { id: uid(), name, isDefault: isFirst, config }];
        }
        await persistViews(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleApplyView = (view) => applyViewConfig(view.config);

    const handleDeleteView = async (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        if (savedViews.find(v => v.id === id)?.isDefault && updated.length > 0) {
            updated[0] = { ...updated[0], isDefault: true };
        }
        await persistViews(updated);
    };

    const handleSetDefaultView = async (id) => {
        await persistViews(savedViews.map(v => ({ ...v, isDefault: v.id === id })));
    };

    const handleResetView = () => {
        setGroupBy('status');
        setSortBy('dueDate');
        setSortOrder('asc');
        setActiveTags([]);
        setSearchTerm('');
    };

    const handleCallCustomer = (mobile, customerName = 'Customer', jobId = null, customerId = null) => {
        logInteraction({
            type: 'call-customer',
            category: 'action',
            jobId: jobId ? String(jobId) : undefined,
            customerId: customerId ? String(customerId) : undefined,
            customerName: customerName,
            description: `Technician called customer: ${customerName} for job`,
            source: 'Technician App',
            performedBy: technicianId,
            performedByName: technicianData?.name
        });
        window.location.href = `tel:${mobile}`;
    };

    const handleOpenJob = (job) => {
        logInteraction({
            type: 'job-opened',
            category: 'job',
            jobId: String(job.id),
            customerId: job.customerId ? String(job.customerId) : undefined,
            customerName: job.customerName,
            description: `Technician opened job: ${job.customerName} — ${job.category || job.product?.type || 'Service'}`,
            source: 'Technician App',
            performedBy: technicianId,
            performedByName: technicianData?.name
        });
        setSelectedJob(job);
    };

    const handleViewLocation = (job) => {
        logInteraction({
            type: 'map-navigation-opened',
            category: 'job',
            jobId: String(job.id),
            customerId: job.customerId ? String(job.customerId) : undefined,
            customerName: job.customerName,
            description: `Technician opened maps navigation for: ${job.customerName} (${job.locality || job.address || ''})`,
            source: 'Technician App',
            performedBy: technicianId,
            performedByName: technicianData?.name
        });
        const addr = encodeURIComponent(job.address || job.locality || job.customerName);
        window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
    };

    // Jobs Tab Content
    const renderJobsTab = () => (
        <>
            {/* ── Search Panel ── */}
            <div style={{
                padding: '8px 10px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
            }}>
                <JobsSearchPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    activeTags={activeTags}
                    onAddTag={(tag) => setActiveTags(prev => [...prev.filter(t => t.id !== tag.id), tag])}
                    onRemoveTag={(id) => setActiveTags(prev => prev.filter(t => t.id !== id))}
                    savedViews={savedViews}
                    onSaveNamedView={handleSaveNamedView}
                    onApplyView={handleApplyView}
                    onDeleteView={handleDeleteView}
                    onSetDefaultView={handleSetDefaultView}
                    saveStatus={saveStatus}
                    onResetView={handleResetView}
                    showAssignee={false}
                    groupByOptions={[
                        { value: 'status',   label: 'Status' },
                        { value: 'due-date', label: 'Due Date' },
                        { value: 'priority', label: 'Priority' },
                        { value: 'locality', label: 'Locality' },
                        { value: 'customer', label: 'Customer' },
                        { value: 'warranty', label: 'Warranty' },
                    ]}
                    sortByOptions={[
                        { value: 'dueDate',   label: 'Due Date' },
                        { value: 'createdAt', label: 'Creation Date' },
                        { value: 'customer',  label: 'Customer' },
                        { value: 'priority',  label: 'Priority' },
                        { value: 'locality',  label: 'Locality' },
                    ]}
                />
                {/* Count + Refresh */}
                {/* View Options + Count + Refresh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-primary)' }}>
                        <button onClick={() => setViewMode('card')} title="Card View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'card' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'card' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setViewMode('list')} title="List View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'list' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <List size={16} />
                        </button>
                        <button onClick={() => setViewMode('kanban')} title="Kanban View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'kanban' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'kanban' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Columns size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {sortedJobs.length} / {jobs.length} jobs
                        </span>
                        <button
                            onClick={() => {
                                setLoading(true);
                                fetch(`/api/technician/jobs?technicianId=${technicianId}`)
                                    .then(r => r.json())
                                    .then(d => { setJobs(d.jobs || []); setError(null); })
                                    .catch(() => setError('Failed to refresh.'))
                                    .finally(() => setLoading(false));
                            }}
                            title="Refresh jobs"
                            style={{
                                padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                                border: '1px solid var(--border-primary)', borderRadius: '5px',
                                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                        >
                            ↻ Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-sm)', paddingBottom: '70px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
                            Loading jobs...
                        </div>
                    </div>
                ) : error ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        margin: 'var(--spacing-md)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>
                            {error}
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => window.location.reload()}
                            style={{ marginTop: 'var(--spacing-sm)' }}
                        >
                            Retry
                        </button>
                    </div>
                ) : Object.keys(groupedJobs).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        No jobs found
                    </div>
                ) : (
                    viewMode === 'kanban' ? (
                        <div style={{ display: 'flex', gap: '16px', height: '100%', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
                            {Object.keys(groupedJobs).map(groupKey => (
                                <div key={groupKey} style={{ minWidth: '320px', width: '320px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-primary)', maxHeight: '100%' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {groupKey} 
                                        <span style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-primary)' }}>
                                            {groupedJobs[groupKey].length}
                                        </span>
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', flex: 1 }}>
                                        {groupedJobs[groupKey].map(job => {
                                            const timeLeft = getTimeLeft(job.dueDate);
                                            const priority = getPriorityBadge(job.priority);
                                            
                                            // Kanban uses standard card view layout inside columns
                                            return (
                                                <div key={job.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `2px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: timeLeft.urgent ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none' }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? ` · ${job.product.brand}` : ''}</div>
                                                        </div>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{priority.text}</div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color={timeLeft.color} /><span style={{ fontSize: '11px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}><MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} /><span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{job.locality || job.city || 'No location'}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {Object.keys(groupedJobs).map(groupKey => (
                                <div key={groupKey}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px' }}>
                                        {groupKey} ({groupedJobs[groupKey].length})
                                    </h3>
                                    <div style={{ 
                                        display: viewMode === 'list' ? 'flex' : 'grid', 
                                        flexDirection: 'column',
                                        gridTemplateColumns: viewMode === 'detail' ? 'repeat(auto-fill, minmax(350px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                                        gap: viewMode === 'list' ? '8px' : '16px' 
                                    }}>
                                        {groupedJobs[groupKey].map(job => {
                                            const timeLeft = getTimeLeft(job.dueDate);
                                            const priority = getPriorityBadge(job.priority);
                                            const isDetail = viewMode === 'detail';
                                            
                                            // LIST MODE RENDERER
                                            if (viewMode === 'list') {
                                                return (
                                                    <div key={job.id} onClick={() => handleOpenJob(job)} style={{ backgroundColor: 'var(--bg-elevated)', border: `1px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s', boxShadow: timeLeft.urgent ? '0 0 0 1px rgba(239, 68, 68, 0.2)' : 'none' }}>
                                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '6px', fontSize: '11px', fontWeight: 600, width: '90px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {job.status ? job.status.replace(/-/g, ' ').toUpperCase() : 'OPEN'}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {job.customerName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {job.description || job.product?.type || 'Service'}</span>
                                                                </div>
                                                            </div>
                                                            {job.locality && (
                                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <MapPin size={12} /> {job.locality}
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '12px', color: timeLeft.color, fontWeight: 600, width: '80px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                                <Clock size={12} /> {timeLeft.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // CARD & DETAIL MODE RENDERER
                                            return (
                                                <div key={job.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `2px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: isDetail ? '16px' : '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: timeLeft.urgent ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none', display: 'flex', flexDirection: 'column' }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: isDetail ? '18px' : '16px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                                {job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.brand}</span> : null}{job.description && job.product?.type ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.type}</span> : null}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{priority.text}</div>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color={timeLeft.color} /><span style={{ fontSize: '12px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}><MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} /><span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{job.locality || job.city || job.address || 'No location'}</span></div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: isDetail ? 'wrap' : 'nowrap' }}>
                                                        <div style={{ padding: '2px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '12px', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>{job.status ? job.status.replace(/-/g, ' ').toUpperCase() : 'OPEN'}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1, whiteSpace: isDetail ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{job.defect || 'No defect specified'}"</div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => setCalculatorJob(job)} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>🧮 Estimate</button>
                                                        {job.mobile ? <a href={`tel:${job.mobile}`} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📞 Call</a> : null}
                                                        {(job.location?.lat && job.location?.lng) ? <a href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a> : (job.locality || job.city || job.address) ? <a href={`https://www.google.com/maps/search/${encodeURIComponent([job.address, job.locality, job.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a> : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        {calculatorJob && (
            <RepairCalculator
                job={calculatorJob}
                onClose={() => setCalculatorJob(null)}
                onCreateQuotation={(items) => {
                    setCalculatorJob(null);
                    setSelectedJob({ ...calculatorJob, _calculatorItems: items });
                }}
            />
        )}
        </>
    );

    // Incentives Tab Content
    const renderIncentivesTab = () => (
        <div style={{ padding: 'var(--spacing-md)', overflow: 'auto', paddingBottom: '80px' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <TrendingUp size={24} color="#10b981" />
                My Incentives
            </h2>

            {/* This Month Summary */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid #10b981',
                marginBottom: 'var(--spacing-md)',
                textAlign: 'center'
            }}>
                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                    TOTAL INCENTIVE FOR {incentiveData.period.toUpperCase()}
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981' }}>
                    ₹{incentiveData.incentive.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
            </div>

            {/* Performance Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        JOBS COMPLETED
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                        {incentiveData.metrics.jobsCompleted}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        REVENUE GENERATED
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                        ₹{(incentiveData.metrics.revenueGenerated / 1000).toFixed(1)}K
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        AVERAGE RATING
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                        ⭐ {incentiveData.metrics.rating}
                    </div>
                </div>
            </div>

            {/* Incentive Parameters */}
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                Incentive Breakdown
            </h3>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                overflow: 'hidden'
            }}>
                {incentiveData.incentive.breakdown.length > 0 ? (
                    incentiveData.incentive.breakdown.map((item, index) => (
                        <div key={index} style={{
                            padding: 'var(--spacing-md)',
                            borderBottom: index < incentiveData.incentive.breakdown.length - 1 ? '1px solid var(--border-primary)' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{item.category}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{item.description}</div>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#10b981' }}>
                                ₹{item.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No incentives earned yet this month.
                    </div>
                )}
            </div>
        </div>
    );

    // Settings Tab Content
    const renderSettingsTab = () => (
        <div style={{ padding: 'var(--spacing-md)', overflow: 'auto', paddingBottom: '80px' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Settings size={24} color="#3b82f6" />
                Settings & Profile
            </h2>

            {/* Profile Section */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Profile Information
                </h3>

                {/* Profile Picture */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--spacing-sm)',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'white'
                    }}>
                        {technicianData?.name ? technicianData.name.split(' ').map(n => n[0]).join('') : 'T'}
                    </div>
                </div>

                {/* Profile Details */}
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    <div>
                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Name</label>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{technicianData?.name || 'Loading...'}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Employee ID</label>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{technicianData?.id || '...'}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Phone</label>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{technicianData?.phone || '...'}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Email</label>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>{technicianData?.email || '...'}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Joined</label>
                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                            {technicianData?.joinDate ? new Date(technicianData.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '...'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leave Marking */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    Leave Management
                </h3>
                <button
                    onClick={() => setShowLeaveModal(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)' }}
                >
                    <Calendar size={16} />
                    Mark Leave / Request Time Off
                </button>
            </div>

            {/* Appearance */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    Appearance
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Dark Mode</span>
                    </div>
                    <button
                        onClick={() => {
                            const next = !darkMode;
                            setDarkMode(next);
                            localStorage.setItem('techDarkMode', String(next));
                            if (next) {
                                document.documentElement.setAttribute('data-theme', 'dark');
                            } else {
                                document.documentElement.removeAttribute('data-theme');
                            }
                        }}
                        style={{
                            width: '50px',
                            height: '28px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: darkMode ? '#3b82f6' : 'var(--bg-tertiary)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: darkMode ? '25px' : '3px',
                            transition: 'all var(--transition-fast)'
                        }}></div>
                    </button>
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ width: '100%', padding: '10px' }}
            >
                Logout
            </button>
        </div>
    );

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {/* Top Bar */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <h1 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    🔧 Technician Portal
                </h1>
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {activeTab === 'jobs' && renderJobsTab()}
                {activeTab === 'expenses' && <ExpensesList technicianId={technicianId} />}
                {activeTab === 'incentives' && renderIncentivesTab()}
                {activeTab === 'settings' && renderSettingsTab()}
            </div>

            {/* Bottom Tabs */}
            <nav className="bottom-tabs">
                <button
                    className={`tab-item ${activeTab === 'jobs' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('jobs');
                        logNavigation('Jobs', 'Technician', 'Technician App');
                    }}
                >
                    <Briefcase size={20} />
                    <span>Jobs</span>
                </button>
                <button
                    className={`tab-item ${activeTab === 'expenses' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('expenses');
                        logNavigation('Expenses', 'Technician', 'Technician App');
                    }}
                >
                    <DollarSign size={20} />
                    <span>Expenses</span>
                </button>
                <button
                    className={`tab-item ${activeTab === 'incentives' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('incentives');
                        logNavigation('Incentives', 'Technician', 'Technician App');
                    }}
                >
                    <TrendingUp size={20} />
                    <span>Incentives</span>
                </button>
                <button
                    className={`tab-item ${activeTab === 'settings' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('settings');
                        logNavigation('Settings', 'Technician', 'Technician App');
                    }}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </nav>



            {/* Leave Marking Modal */}
            {showLeaveModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}
                    onClick={() => setShowLeaveModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            width: '100%',
                            boxShadow: 'var(--shadow-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Request Leave
                        </h3>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={leaveStartDate}
                                onChange={(e) => setLeaveStartDate(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={leaveEndDate}
                                onChange={(e) => setLeaveEndDate(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Reason
                            </label>
                            <textarea
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                placeholder="Enter reason for leave..."
                                className="form-input"
                                rows="3"
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button
                                onClick={() => {
                                    setShowLeaveModal(false);
                                    setLeaveStartDate('');
                                    setLeaveEndDate('');
                                    setLeaveReason('');
                                }}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!leaveStartDate || !leaveEndDate) {
                                        alert('Please select start and end dates');
                                        return;
                                    }
                                    alert(`Leave request submitted!\nFrom: ${leaveStartDate}\nTo: ${leaveEndDate}\nReason: ${leaveReason || 'Not specified'}`);
                                    setShowLeaveModal(false);
                                    setLeaveStartDate('');
                                    setLeaveEndDate('');
                                    setLeaveReason('');
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetailView
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onJobUpdate={(updatedJob) => {
                        // Update the job in the jobs list
                        setJobs(prevJobs =>
                            prevJobs.map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j)
                        );
                        // Do not close the modal here to allow WhatsApp popup or manual exit
                        // Optionally refetch jobs to ensure data consistency
                        setTimeout(() => {
                            if (technicianId) {
                                fetch(`/api/technician/jobs?technicianId=${technicianId}`)
                                    .then(res => res.json())
                                    .then(data => setJobs(data.jobs || []))
                                    .catch(err => console.error('Error refreshing jobs:', err));
                            }
                        }, 1000);
                    }}
                />
            )}
        </div>
    );
}

export default TechnicianApp;






