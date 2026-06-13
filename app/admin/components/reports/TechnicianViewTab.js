'use client'

import { useState, useEffect } from 'react';
import { Users, Calendar, ArrowLeft, ArrowRight, ClipboardList, CheckCircle2, DollarSign, Clock, MapPin, FilePlus, ChevronRight, Activity, X, Loader2, Phone, Award, Wrench } from 'lucide-react';
import JobDetailModal from '../JobDetailModal';

// Whitelist of allowed technician-specific events
const ALLOWED_EVENT_TYPES = [
    'job-reassigned',
    'customer-called',
    'map-navigation-opened',
    'job-started',
    'job_started',
    'job-status-diagnosing_quoting',
    'job-status-work_in_progress',
    'job-status-parts_ordered',
    'job-status-cx_reschedule',
    'job-status-closed',
    'location-verified',
    'location-updated',
    'quotation-created',
    'quotation-sent',
    'quotation-approved',
    'invoice-created',
    'sales-invoice-created',
    'sales-invoice-created-draft',
    'expense-submitted',
    'purchase-invoice-created',
    'job-closed',
    'feedback-received',
    'feedback-given',
    'repair-note-added',
    'payment-received',
    'payment-received-cash',
    'payment-received-online',
    'full-payment-collected'
];

export default function TechnicianViewTab() {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
    const [jobs, setJobs] = useState([]);
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // For job details modal and interactive job filtering
    const [selectedJob, setSelectedJob] = useState(null);
    const [selectedJobFilterId, setSelectedJobFilterId] = useState(null);
    const [resolvedLocalities, setResolvedLocalities] = useState({});

    // Fetch technicians list on mount
    useEffect(() => {
        const fetchTechs = async () => {
            try {
                const res = await fetch('/api/admin/technicians');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setTechnicians(json.data);
                    if (json.data.length > 0) {
                        setSelectedTechId(json.data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to load technicians:", err);
            }
        };
        fetchTechs();
    }, []);

    // Fetch data for selected technician and date
    const fetchDayData = async () => {
        if (!selectedTechId) return;
        setLoading(true);
        setError(null);
        try {
            const selectedTech = technicians.find(t => t.id === selectedTechId);
            const selectedTechName = selectedTech ? selectedTech.name : '';

            // 1. Fetch all jobs for the selected technician
            const jobsRes = await fetch(`/api/admin/jobs?technician_id=${selectedTechId}`);
            const jobsJson = await jobsRes.json();
            if (!jobsJson.success) throw new Error(jobsJson.error || 'Failed to fetch jobs');

            // Filter jobs scheduled or completed on the selected date
            const dayJobs = (jobsJson.data || []).filter(job => {
                const schedDate = job.scheduled_date; // YYYY-MM-DD
                const compDate = job.completed_at ? job.completed_at.split('T')[0] : null;
                return schedDate === selectedDate || compDate === selectedDate;
            });
            setJobs(dayJobs);

            // 2. Fetch all interactions (limit to 1000)
            const intRes = await fetch(`/api/admin/interactions?limit=1000&_t=${Date.now()}`, { cache: 'no-store' });
            const intJson = await intRes.json();
            if (!intJson.success) throw new Error(intJson.error || 'Failed to fetch interactions');

            const allInteractions = intJson.data || [];
            const dayJobIds = dayJobs.map(j => j.id);

            // Filter interactions that:
            // - Occurred on the selected date
            // - AND (were performed by this technician OR belong to one of today's scheduled jobs)
            const dayEvents = allInteractions.filter(i => {
                const iDate = i.timestamp ? i.timestamp.split('T')[0] : (i.created_at ? i.created_at.split('T')[0] : null);
                if (iDate !== selectedDate) return false;

                const isByTechId = i.performed_by === selectedTechId;
                const isByTechName = i.performed_by_name && selectedTechName && 
                    i.performed_by_name.toLowerCase().includes(selectedTechName.toLowerCase());
                const isForDayJob = i.job_id && dayJobIds.includes(i.job_id);

                return isByTechId || isByTechName || isForDayJob;
            });

            // Filter by strictly technician activity whitelist
            let filteredTechEvents = dayEvents.filter(e => ALLOWED_EVENT_TYPES.includes(e.type));

            // De-duplicate: if there is a 'job-closed' event, remove the corresponding 'job-status-closed' for that job
            const closedJobIds = new Set(
                filteredTechEvents.filter(e => e.type === 'job-closed' && e.job_id).map(e => e.job_id)
            );
            filteredTechEvents = filteredTechEvents.filter(e => {
                if (e.type === 'job-status-closed' && e.job_id && closedJobIds.has(e.job_id)) {
                    return false;
                }
                return true;
            });

            // Sort chronologically (oldest to newest)
            filteredTechEvents.sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
            setTimelineEvents(filteredTechEvents);

        } catch (err) {
            console.error("Error loading technician day view:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setSelectedJobFilterId(null);
        fetchDayData();
    }, [selectedTechId, selectedDate, technicians]);

    // Client-side reverse geocoding fallback for events with coordinates but no locality
    useEffect(() => {
        const toResolve = timelineEvents.filter(e => {
            const meta = e.metadata || {};
            return meta.latitude && meta.longitude && !meta.locality;
        });

        if (toResolve.length === 0) return;

        toResolve.forEach(async (event) => {
            const meta = event.metadata;
            const key = `${meta.latitude},${meta.longitude}`;
            if (resolvedLocalities[key]) return; // Already resolved or resolving

            // Set placeholder to prevent duplicate requests
            setResolvedLocalities(prev => ({ ...prev, [key]: 'Resolving...' }));

            try {
                const geoRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${meta.latitude}&lon=${meta.longitude}&format=json`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'SortedSolutions/1.0' } }
                );
                if (geoRes.ok) {
                    const geo = await geoRes.json();
                    const addr = geo.address || {};
                    const loc = addr.suburb || addr.neighbourhood || addr.quarter || addr.village || addr.subdivision || addr.locality || addr.city_district || null;
                    setResolvedLocalities(prev => ({ ...prev, [key]: loc || 'Location' }));
                } else {
                    setResolvedLocalities(prev => ({ ...prev, [key]: 'Location' }));
                }
            } catch (err) {
                console.error("Client geocoding error:", err);
                setResolvedLocalities(prev => ({ ...prev, [key]: 'Location' }));
            }
        });
    }, [timelineEvents]);

    // Quick Date Shift Helper
    const adjustDate = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    // KPI Calculations
    const totalJobsCount = jobs.length;
    const visitedJobsCount = jobs.filter(j => j.arrived_at || ['diagnosing_quoting', 'work_in_progress', 'quotation_sent', 'parts_ordered', 'closed'].includes(j.status)).length;
    const closedJobsCount = jobs.filter(j => j.status === 'closed').length;
    
    const collectedPayments = timelineEvents
        .filter(e => e.type === 'payment-received' || e.type === 'payment-received-cash' || e.type === 'payment-received-online' || e.type === 'full-payment-collected')
        .reduce((sum, e) => sum + (e.metadata?.amount || 0), 0);

    // Timeline Icon/Color Helpers
    const getEventStyling = (event) => {
        const type = event.type || '';
        
        switch (type) {
            case 'job-reassigned':
                return { icon: <Users size={15} />, bg: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', label: 'Assignment' };
            case 'customer-called':
                return { icon: <Phone size={15} />, bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', label: 'Call' };
            case 'map-navigation-opened':
                return { icon: <MapPin size={15} />, bg: 'rgba(167, 139, 250, 0.15)', color: '#a78bfa', label: 'Maps Navigate' };
            case 'job-started':
            case 'job_started':
                return { icon: <Clock size={15} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Start Job' };
            case 'job-status-diagnosing_quoting':
                return { icon: <MapPin size={15} />, bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'Arrived' };
            case 'job-status-work_in_progress':
                return { icon: <Clock size={15} />, bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', label: 'Work In Progress' };
            case 'job-status-parts_ordered':
                return { icon: <Clock size={15} />, bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Parts Ordered' };
            case 'job-status-cx_reschedule':
                return { icon: <Calendar size={15} />, bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Rescheduled' };
            case 'location-verified':
            case 'location-updated':
                return { icon: <MapPin size={15} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Location Pin' };
            case 'quotation-created':
            case 'quotation-sent':
                return { icon: <FilePlus size={15} />, bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', label: 'Quotation' };
            case 'invoice-created':
            case 'sales-invoice-created':
            case 'sales-invoice-created-draft':
                return { icon: <FilePlus size={15} />, bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'Invoice' };
            case 'expense-submitted':
                return { icon: <DollarSign size={15} />, bg: 'rgba(250, 204, 21, 0.15)', color: '#facc15', label: 'Expense' };
            case 'purchase-invoice-created':
                return { icon: <Wrench size={15} />, bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316', label: 'Spare Purchase' };
            case 'job-closed':
            case 'job-status-closed':
                return { icon: <CheckCircle2 size={15} />, bg: 'rgba(20, 184, 166, 0.15)', color: '#14b8a6', label: 'Closed' };
            case 'feedback-received':
            case 'feedback-given':
                return { icon: <Award size={15} />, bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', label: 'Feedback' };
            case 'repair-note-added':
                return { icon: <FilePlus size={15} />, bg: 'rgba(100, 116, 139, 0.15)', color: '#64748b', label: 'Repair Note' };
            case 'quotation-approved':
                return { icon: <CheckCircle2 size={15} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Quotation Approved' };
            case 'payment-received':
            case 'payment-received-cash':
            case 'payment-received-online':
            case 'full-payment-collected':
                return { icon: <DollarSign size={15} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Payment' };
            default:
                return { icon: <Clock size={15} />, bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Update' };
        }
    };

    // Format event time
    const formatTime = (ts) => {
        if (!ts) return '';
        try {
            return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        } catch (e) {
            return '';
        }
    };

    const getCleanTimelineEventTitle = (event) => {
        const type = event.type || '';
        
        switch (type) {
            case 'job-reassigned':
                return 'Job Assigned';
            case 'customer-called':
                return 'Called Customer';
            case 'map-navigation-opened':
                return 'Opened Maps Navigation';
            case 'job-started':
            case 'job_started':
                return 'Started Job';
            case 'job-status-diagnosing_quoting':
                return 'Marked as Arrived';
            case 'job-status-work_in_progress':
                return 'Status set to Work In Progress';
            case 'job-status-parts_ordered':
                return 'Status set to Parts Ordered';
            case 'job-status-cx_reschedule':
                return 'Status set to Cx Reschedule';
            case 'location-verified':
                return 'Customer Pin Verified';
            case 'location-updated':
                return 'Customer Pin Updated';
            case 'quotation-created':
            case 'quotation-sent':
                return 'Quotation Created';
            case 'invoice-created':
            case 'sales-invoice-created':
            case 'sales-invoice-created-draft':
                return 'Sales Invoice Draft Created';
            case 'expense-submitted':
                return 'Expense Claim Filed';
            case 'purchase-invoice-created':
                return 'Spare Purchase Draft Created';
            case 'job-closed':
            case 'job-status-closed':
                return 'Job Closed';
            case 'feedback-received':
            case 'feedback-given':
                return 'Feedback Collected';
            case 'repair-note-added':
                return 'Repair Note Added';
            case 'quotation-approved':
                return 'Quotation Approved';
            case 'payment-received':
            case 'payment-received-cash':
                return 'Payment Collected (Cash/UPI)';
            case 'payment-received-online':
                return 'Payment Received Online';
            case 'full-payment-collected':
                return 'Full Payment Collected';
            default:
                return 'Activity Update';
        }
    };

    const renderEventDescription = (event) => {
        const desc = event.description || event.message || '';
        const type = event.type || '';
        const meta = event.metadata || {};

        if (type === 'customer-called') {
            return <div style={{ color: 'var(--text-primary)' }}>Called the customer to confirm details</div>;
        }
        if (type === 'map-navigation-opened') {
            return <div style={{ color: 'var(--text-primary)' }}>Opened navigation for customer address</div>;
        }
        if (type === 'job-started' || type === 'job_started') {
            return <div style={{ color: 'var(--text-primary)' }}>Technician started the job diagnostics timer</div>;
        }
        if (type === 'job-status-diagnosing_quoting') {
            return <div style={{ color: 'var(--text-primary)' }}>Arrived at customer location. Diagnosing issue...</div>;
        }

        if (type === 'expense-submitted') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{desc}</span>
                    {window.openTechnicianManagement && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.openTechnicianManagement('expenses');
                            }}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(250, 204, 21, 0.15)',
                                color: '#facc15',
                                border: '1px solid rgba(250, 204, 21, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Review Expense Approval
                        </button>
                    )}
                </div>
            );
        }

        if (type === 'purchase-invoice-created') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{desc}</span>
                    {window.openTechnicianManagement && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.openTechnicianManagement('spares-post');
                            }}
                            style={{
                                padding: '2px 8px',
                                fontSize: '10px',
                                fontWeight: 700,
                                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                                color: '#f97316',
                                border: '1px solid rgba(249, 115, 22, 0.3)',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Review Purchase Approval
                        </button>
                    )}
                </div>
            );
        }

        if (type === 'payment-received' || type === 'payment-received-cash' || type === 'payment-received-online' || type === 'full-payment-collected') {
            const amountVal = meta.amount || event.amount || 0;
            const methodVal = meta.method || event.method || 'cash';
            return (
                <div style={{ color: 'var(--text-primary)' }}>
                    Payment of <strong>₹{amountVal.toLocaleString('en-IN')}</strong> collected via <strong>{methodVal.toUpperCase()}</strong>.
                    {desc && desc.includes('Note:') && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                            {desc.substring(desc.indexOf('Note:'))}
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'quotation-approved') {
            return <div style={{ color: 'var(--text-primary)' }}>Quotation approved by customer. Job moved to Work In Progress.</div>;
        }
 
        return <div style={{ color: 'var(--text-primary)' }}>{desc}</div>;
    };

    const renderEventLocation = (event) => {
        const meta = event.metadata || {};
        if (!meta.latitude || !meta.longitude) return null;

        const key = `${meta.latitude},${meta.longitude}`;
        const displayLocality = meta.locality || resolvedLocalities[key] || 'Location';

        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 4, backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 2 }}>
                    📍 <strong>{displayLocality}</strong> <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>({meta.latitude.toFixed(4)}, {meta.longitude.toFixed(4)})</span>
                </span>
                <a 
                    href={`https://www.google.com/maps?q=${meta.latitude},${meta.longitude}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{
                        padding: '2px 8px',
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#3b82f6',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center'
                    }}
                >
                    View on Map
                </a>
            </div>
        );
    };

    const renderMetadataDetails = (event) => {
        const type = event.type || '';
        const meta = event.metadata;
        if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return null;
        
        if (type === 'job-closed') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, backgroundColor: 'rgba(20, 184, 166, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(20, 184, 166, 0.1)' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Point of Contact:</span> <strong style={{ color: 'var(--text-primary)' }}>{meta.poc || 'Customer'}</strong>
                    </div>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Repair Outcome:</span> <strong style={{ color: meta.repair_outcome === 'Repair Done' ? '#14b8a6' : '#f59e0b' }}>{meta.repair_outcome}</strong>
                    </div>
                    {meta.custom_reason && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Reason:</span> <span style={{ color: 'var(--text-primary)' }}>{meta.custom_reason}</span>
                        </div>
                    )}
                    {meta.warranty_explained && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Warranty Explained:</span> <strong style={{ color: meta.warranty_explained === 'Yes' ? '#14b8a6' : '#ef4444' }}>{meta.warranty_explained}</strong>
                            {meta.warranty_reason && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>({meta.warranty_reason})</span>}
                        </div>
                    )}
                    {meta.customer_tested && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Customer Tested:</span> <strong style={{ color: meta.customer_tested === 'Yes' ? '#14b8a6' : '#ef4444' }}>{meta.customer_tested}</strong>
                            {meta.tested_reason && <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>({meta.tested_reason})</span>}
                        </div>
                    )}
                    {meta.notes && !meta.notes.includes('=== MANDATORY CLOSE CALL NOTES ===') && (
                        <div style={{ fontSize: 12, marginTop: 6, whiteSpace: 'pre-line', borderTop: '1px solid rgba(20, 184, 166, 0.1)', paddingTop: 6, color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                            {meta.notes}
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'feedback-received' || type === 'feedback-given') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, backgroundColor: 'rgba(236, 72, 153, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(236, 72, 153, 0.1)' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Feedback Collected:</span> <strong style={{ color: meta.feedback_given === 'yes' ? '#ec4899' : '#f59e0b' }}>{meta.feedback_given === 'yes' ? 'Yes ✓' : 'No / Skipped'}</strong>
                    </div>
                </div>
            );
        }

        if (type === 'repair-note-added' && meta.note_text) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, backgroundColor: 'rgba(100, 116, 139, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(100, 116, 139, 0.1)' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Parts / Repair Needed Note:</span>
                        <div style={{ color: 'var(--text-primary)', marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{meta.note_text}</div>
                    </div>
                </div>
            );
        }
        
        if (meta.amount !== undefined) {
            return (
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', backgroundColor: 'rgba(52, 211, 153, 0.05)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Amount:</span> <strong style={{ color: '#34d399' }}>₹{meta.amount.toLocaleString('en-IN')}</strong>
                    </div>
                    {meta.category && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Category:</span> <strong style={{ color: 'var(--text-primary)' }}>{meta.category}</strong>
                        </div>
                    )}
                </div>
            );
        }
        
        return null;
    };

    const selectedTech = technicians.find(t => t.id === selectedTechId);

    // Apply job interactive filtering
    const filteredEvents = timelineEvents.filter(event => {
        if (selectedJobFilterId) {
            return event.job_id === selectedJobFilterId;
        }
        return true;
    });

    return (
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            
            {/* Controls panel */}
            <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Select Technician</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Users size={16} color="var(--color-primary)" />
                            <select
                                className="form-select"
                                value={selectedTechId}
                                onChange={(e) => setSelectedTechId(e.target.value)}
                                style={{ padding: '8px 12px', minWidth: '180px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)' }}
                            >
                                <option value="" disabled>Select a technician...</option>
                                {technicians.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Target Date</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button className="btn btn-secondary" onClick={() => adjustDate(-1)} style={{ padding: '8px 10px' }} title="Previous Day">
                                <ArrowLeft size={14} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                                <Calendar size={15} style={{ position: 'absolute', left: 10, color: 'var(--text-secondary)' }} />
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    style={{ padding: '8px 12px 8px 30px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: 13 }}
                                />
                            </div>
                            <button className="btn btn-secondary" onClick={() => adjustDate(1)} style={{ padding: '8px 10px' }} title="Next Day">
                                <ArrowRight size={14} />
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: selectedDate === new Date().toISOString().split('T')[0] ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                            >
                                Today
                            </button>
                        </div>
                    </div>
                </div>

                {selectedTech && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                            {selectedTech.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedTech.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{selectedTech.phone || 'No phone'}</div>
                        </div>
                    </div>
                )}
            </div>

            {loading ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
                    <Loader2 size={36} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading daily activities...</span>
                </div>
            ) : error ? (
                <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Error loading activities: {error}</span>
                </div>
            ) : (
                <>
                    {/* KPI Stats cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                        <div className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-primary)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ClipboardList size={20} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{totalJobsCount}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Assigned Jobs</div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-primary)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <MapPin size={20} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{visitedJobsCount}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Customer Visits</div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-primary)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={20} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>{closedJobsCount}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Jobs Closed</div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-primary)' }}>
                            <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(234, 179, 8, 0.1)', color: '#facc15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <DollarSign size={20} />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 22, fontWeight: 700 }}>₹{collectedPayments.toLocaleString('en-IN')}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Payments Collected</div>
                            </div>
                        </div>
                    </div>

                    {/* Dual Column Layout: Jobs List & Chronological Activity Timeline */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--spacing-md)', alignItems: 'start' }}>
                        
                        {/* Day's Jobs List */}
                        <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <ClipboardList size={16} color="var(--color-primary)" />
                                Assigned Jobs ({jobs.length})
                            </h3>

                            {jobs.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                    No jobs assigned or worked on for this date.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {jobs.map(job => (
                                        <div
                                            key={job.id}
                                            onClick={() => {
                                                if (selectedJobFilterId === job.id) {
                                                    setSelectedJobFilterId(null);
                                                } else {
                                                    setSelectedJobFilterId(job.id);
                                                }
                                            }}
                                            style={{
                                                padding: '12px',
                                                borderRadius: 10,
                                                border: selectedJobFilterId === job.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                backgroundColor: selectedJobFilterId === job.id ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8
                                            }}
                                            onMouseEnter={e => {
                                                if (selectedJobFilterId !== job.id) {
                                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (selectedJobFilterId !== job.id) {
                                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                                }
                                            }}
                                        >
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                     <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-primary)' }}>#{job.job_number}</span>
                                                     <span style={{
                                                         padding: '1px 6px',
                                                         borderRadius: 4,
                                                         fontSize: 9,
                                                         fontWeight: 700,
                                                         textTransform: 'uppercase',
                                                         backgroundColor: job.status === 'closed' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                         color: job.status === 'closed' ? '#10b981' : '#3b82f6'
                                                     }}>
                                                         {job.status.replace(/_/g, ' ')}
                                                     </span>
                                                     {selectedJobFilterId === job.id && (
                                                         <span style={{ fontSize: 9, color: 'var(--color-primary)', fontWeight: 600, textTransform: 'uppercase', marginLeft: 4 }}>
                                                             (Filtering)
                                                         </span>
                                                     )}
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: 'var(--text-primary)' }}>
                                                    {job.customer_name || (job.customer && job.customer.name) || 'Customer'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {job.appliance || job.category || 'Appliance'} — {job.issue || 'Service Request'}
                                                </div>
                                            </div>
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedJob(job);
                                                }}
                                                style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, padding: 4, borderRadius: 6, cursor: 'pointer' }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                title="View Job Details"
                                            >
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {job.scheduled_time || 'No Slot'}
                                                </span>
                                                <ChevronRight size={14} color="var(--color-primary)" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chronological Activity Timeline */}
                        <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Activity size={16} color="#ec4899" />
                                    <span>Chronological Activity Timeline</span>
                                    {selectedJobFilterId && (
                                        <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: 12 }}>
                                            Job Filter Active
                                        </span>
                                    )}
                                </div>
                                {selectedJobFilterId && (
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={() => setSelectedJobFilterId(null)}
                                        style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'var(--color-primary)' }}
                                    >
                                        Clear Filter
                                    </button>
                                )}
                            </h3>

                            {filteredEvents.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                    {selectedJobFilterId ? "No activities found for this job." : "No recorded activities for this technician/date."}
                                </div>
                            ) : (
                                <div style={{ position: 'relative', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px dashed var(--border-primary)', margin: '10px 0 10px 10px', textAlign: 'left' }}>
                                    {filteredEvents.map(event => {
                                        const style = getEventStyling(event);
                                        const eventTime = formatTime(event.timestamp || event.created_at);
                                        const relatedJob = jobs.find(j => j.id === event.job_id);

                                        return (
                                            <div key={event.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                
                                                {/* Bullet Point Circle */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '-31px',
                                                    top: '2px',
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    border: `2px solid ${style.color}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: style.color,
                                                    boxShadow: '0 0 8px rgba(0,0,0,0.1)'
                                                }}>
                                                    {style.icon}
                                                </div>

                                                {/* Time & Event Label Row */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                        {eventTime}
                                                    </span>
                                                    <span style={{
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        fontSize: 9,
                                                        fontWeight: 700,
                                                        backgroundColor: style.bg,
                                                        color: style.color,
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {style.label}
                                                    </span>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {getCleanTimelineEventTitle(event)}
                                                    </span>
                                                    {relatedJob && (
                                                        <span
                                                            onClick={() => setSelectedJob(relatedJob)}
                                                            style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', hover: { textDecoration: 'underline' } }}
                                                        >
                                                            #{relatedJob.job_number}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.4, wordBreak: 'break-word', marginTop: 2 }}>
                                                    {renderEventDescription(event)}
                                                </div>

                                                {/* Geolocation locality + view map link */}
                                                {renderEventLocation(event)}

                                                {/* Metadata */}
                                                {renderMetadataDetails(event)}

                                                {/* Performed by badge */}
                                                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>
                                                    Logged by: {event.performed_by_name || 'System'}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                    </div>
                </>
            )}

            {/* Standard Admin Job Details Popup Modal */}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onUpdate={() => {
                        setSelectedJob(null);
                        fetchDayData();
                    }}
                />
            )}
        </div>
    );
}
