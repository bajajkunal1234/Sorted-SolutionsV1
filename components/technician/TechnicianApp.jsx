'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Phone, ChevronRight, Navigation, Briefcase, TrendingUp, Settings, User, Moon, Sun, Calendar, DollarSign, Calculator } from 'lucide-react';
import JobDetailView from '@/components/technician/JobDetailView';
import ExpensesList from '@/components/technician/ExpensesList';
import RepairCalculator from '@/components/common/RepairCalculator';
import { logInteraction, logNavigation } from '@/lib/interactions';

function TechnicianApp() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('jobs');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupBy, setGroupBy] = useState('status');
    const [filterStatus, setFilterStatus] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
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

    // Fetch jobs and incentives when technician ID is available
    useEffect(() => {
        if (!technicianId) return;

        const fetchJobs = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/technician/jobs?technicianId=${technicianId}&status=${filterStatus}`);

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
    }, [technicianId, filterStatus]);

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

    // Filter and group jobs
    const filteredJobs = jobs.filter(job => {
        const matchesSearch = !searchTerm ||
            (job.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.locality?.toLowerCase() || '').includes(searchTerm.toLowerCase());

        const matchesFilter = filterStatus === 'all' || job.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    // Group jobs
    const groupedJobs = {};
    filteredJobs.forEach(job => {
        let key;
        if (groupBy === 'status') {
            key = job.status;
        } else if (groupBy === 'due-date') {
            if (!job.dueDate) { key = 'No Date'; }
            else {
                const timeLeft = getTimeLeft(job.dueDate);
                if (timeLeft.urgent) key = 'Urgent';
                else if (new Date(job.dueDate).toDateString() === new Date().toDateString()) key = 'Today';
                else key = 'Later';
            }
        } else if (groupBy === 'warranty') {
            key = job.product?.warranty?.status === 'in-warranty' ? 'In Warranty' : 'Out of Warranty';
        } else if (groupBy === 'priority') {
            key = job.priority;
        }

        if (!groupedJobs[key]) groupedJobs[key] = [];
        groupedJobs[key].push(job);
    });

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
            {/* Compact Filters - Single Row */}
            <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: 'var(--spacing-xs)',
                overflowX: 'auto'
            }}>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, minWidth: '120px', padding: '6px 10px', fontSize: 'var(--font-size-sm)' }}
                />
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="form-input"
                    style={{ width: '90px', padding: '6px 8px', fontSize: 'var(--font-size-sm)' }}
                >
                    <option value="status">Status</option>
                    <option value="due-date">Due</option>
                    <option value="warranty">Warranty</option>
                    <option value="priority">Priority</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="form-input"
                    style={{ width: '110px', padding: '6px 8px', fontSize: 'var(--font-size-sm)' }}
                >
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="repair">Repair</option>
                    <option value="spare-part-needed">Spare Part</option>
                    <option value="quotation-sent">Quotation Sent</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--spacing-xs)',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)'
            }}>
                <div style={{
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>URGENT</div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#ef4444' }}>
                        {jobs.filter(j => j.priority === 'urgent').length}
                    </div>
                </div>
                <div style={{
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>TODAY</div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#3b82f6' }}>
                        {jobs.filter(j => new Date(j.dueDate).toDateString() === new Date().toDateString()).length}
                    </div>
                </div>
                <div style={{
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>PENDING</div>
                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#f59e0b' }}>
                        {jobs.filter(j => j.status === 'open' || j.status === 'confirmed').length}
                    </div>
                </div>
            </div>

            {/* Jobs List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-sm)' }}>
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
                    Object.keys(groupedJobs).map(groupKey => (
                        <div key={groupKey} style={{ marginBottom: 'var(--spacing-md)' }}>
                            <h3 style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                marginBottom: 'var(--spacing-xs)',
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {groupKey} ({groupedJobs[groupKey].length})
                            </h3>

                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {groupedJobs[groupKey].map(job => {
                                    const timeLeft = getTimeLeft(job.dueDate);
                                    const priority = getPriorityBadge(job.priority);

                                    return (
                                        <div
                                            key={job.id}
                                            style={{
                                                backgroundColor: 'var(--bg-elevated)',
                                                border: `2px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`,
                                                borderRadius: 'var(--radius-lg)',
                                                padding: 'var(--spacing-sm)',
                                                cursor: 'pointer',
                                                transition: 'all var(--transition-normal)',
                                                boxShadow: timeLeft.urgent ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none'
                                            }}
                                            onClick={() => handleOpenJob(job)}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            {/* Header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-xs)' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>
                                                        {job.description || job.product?.type || job.issueCategory || 'Service Job'}
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                        {job.customerName}
                                                        {(job.product?.brand && job.product.brand !== 'Unknown') ? <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}> · {job.product.brand}</span> : null}
                                                        {job.description && job.product?.type ? <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}> · {job.product.type}</span> : null}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    padding: '2px 6px',
                                                    backgroundColor: priority.color + '20',
                                                    color: priority.color,
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '10px',
                                                    fontWeight: 600
                                                }}>
                                                    {priority.text}
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={12} color={timeLeft.color} />
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: timeLeft.color, fontWeight: 600 }}>
                                                        {timeLeft.text}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                    <MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                        {job.address
                                                            ? <>{job.address}{(job.locality || job.city) ? <><br /><span style={{ color: 'var(--text-tertiary)' }}>{[job.locality, job.city].filter(Boolean).join(', ')}</span></> : null}</>
                                                            : (job.locality || job.city || 'No location')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Stage Badge */}
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                backgroundColor: getStatusColor(job.status) + '20',
                                                color: getStatusColor(job.status),
                                                borderRadius: 'var(--radius-full)',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                marginBottom: 'var(--spacing-xs)'
                                            }}>
                                                {job.status ? job.status.replace(/-/g, ' ').toUpperCase() : 'OPEN'}
                                            </div>

                                            {/* Defect */}
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                                marginBottom: 'var(--spacing-xs)',
                                                fontStyle: 'italic',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                "{job.defect || 'No defect specified'}"
                                            </div>

                                            {/* Quick Action Buttons */}
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }} onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setCalculatorJob(job)} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                                    🧮 Estimate
                                                </button>
                                                {job.mobile ? (
                                                    <a href={`tel:${job.mobile}`} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none' }}>
                                                        📞 Call
                                                    </a>
                                                ) : null}
                                                {(job.location?.lat && job.location?.lng) ? (
                                                    <a href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none' }}>
                                                        📍 Map
                                                    </a>
                                                ) : (job.locality || job.city || job.address) ? (
                                                    <a href={`https://www.google.com/maps/search/${encodeURIComponent([job.address, job.locality, job.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none' }}>
                                                        📍 Map
                                                    </a>
                                                ) : null}
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
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
                        // Close the modal
                        setSelectedJob(null);
                        // Optionally refetch jobs to ensure data consistency
                        setTimeout(() => {
                            if (technicianId) {
                                fetch(`/api/technician/jobs?technicianId=${technicianId}&status=${filterStatus}`)
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






