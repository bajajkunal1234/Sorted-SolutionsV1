'use client'

import { useState, useEffect } from 'react';
import { Users, Calendar, ArrowLeft, ArrowRight, ClipboardList, CheckCircle2, DollarSign, Clock, MapPin, FilePlus, ChevronRight, Activity, X, Loader2, Sparkles, Phone, Award } from 'lucide-react';
import JobDetailModal from '../JobDetailModal';

export default function TechnicianViewTab() {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTechId, setSelectedTechId] = useState('');
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
    const [jobs, setJobs] = useState([]);
    const [timelineEvents, setTimelineEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // For job details modal
    const [selectedJob, setSelectedJob] = useState(null);

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

            // Sort chronologically (oldest to newest)
            dayEvents.sort((a, b) => new Date(a.timestamp || a.created_at) - new Date(b.timestamp || b.created_at));
            setTimelineEvents(dayEvents);

        } catch (err) {
            console.error("Error loading technician day view:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDayData();
    }, [selectedTechId, selectedDate, technicians]);

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
        .filter(e => e.type === 'payment-received' || e.type === 'full-payment-collected')
        .reduce((sum, e) => sum + (e.metadata?.amount || 0), 0);

    // Timeline Icon/Color Helpers
    const getEventStyling = (event) => {
        const type = event.type || '';
        const desc = (event.description || '').toLowerCase();
        
        if (type === 'payment-received' || type === 'full-payment-collected' || desc.includes('payment') || desc.includes('paid')) {
            return { icon: <DollarSign size={15} />, bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', label: 'Payment' };
        }
        if (type === 'close-call-no-service' || desc.includes('no service') || desc.includes('cancelled')) {
            return { icon: <X size={15} />, bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', label: 'No Service' };
        }
        if (type === 'job-closed' || type === 'job-status-closed' || desc.includes('closed') || desc.includes('repair done')) {
            return { icon: <CheckCircle2 size={15} />, bg: 'rgba(52, 211, 153, 0.15)', color: '#34d399', label: 'Job Closed' };
        }
        if (type === 'on-way' || desc.includes('on the way')) {
            return { icon: <MapPin size={15} />, bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', label: 'On Way' };
        }
        if (type === 'status-changed' && desc.includes('arrived')) {
            return { icon: <MapPin size={15} />, bg: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', label: 'Arrived' };
        }
        if (type === 'quotation-sent' || type === 'sales-invoice-created' || desc.includes('invoice') || desc.includes('quotation') || desc.includes('estimate')) {
            return { icon: <FilePlus size={15} />, bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', label: 'Billing' };
        }
        return { icon: <Clock size={15} />, bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', label: 'Update' };
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

    // Timeline formatting helpers
    const statusLabels = {
        new_job_request: 'New Request',
        scheduled: 'Scheduled',
        diagnosing_quoting: 'Diagnosing / Quoting',
        work_in_progress: 'Work in Progress',
        quotation_sent: 'Quotation Sent',
        parts_ordered: 'Parts Ordered',
        closed: 'Closed',
        cancelled: 'Cancelled',
        job_scheduled: 'Scheduled',
        job_assigned: 'Assigned',
        arrived: 'Arrived',
        start_job: 'Started Job',
        on_way: 'On Way',
        close_call_no_service: 'Closed (No Service)'
    };

    const formatStatus = (status) => {
        if (!status) return '';
        const clean = status.trim().toLowerCase();
        return statusLabels[clean] || status.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    const getStatusChangeDetails = (desc) => {
        const match = desc.match(/Status changed:\s*([a-zA-Z0-9_]+)\s*(?:->|→)\s*([a-zA-Z0-9_]+)/i) ||
                      desc.match(/status changed:\s*([a-zA-Z0-9_]+)\s*(?:->|→)\s*([a-zA-Z0-9_]+)/i);
        if (match) {
            return {
                oldStatus: formatStatus(match[1]),
                newStatus: formatStatus(match[2])
            };
        }
        return null;
    };

    const cleanChangeValue = (val) => {
        if (!val) return 'none';
        val = String(val).trim();
        // Remove wrapping quotes if they exist
        if (val.startsWith('"') && val.endsWith('"') && val.length > 1) {
            val = val.slice(1, -1);
        }
        // Check if it's a JSON string
        if (val.startsWith('{') && val.endsWith('}')) {
            try {
                // Replace escaped quotes and backslashes
                const normalized = val.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                const parsed = JSON.parse(normalized);
                
                let parts = [];
                if (parsed.categoryName) parts.push(parsed.categoryName);
                if (parsed.subcategoryName) parts.push(parsed.subcategoryName);
                if (parsed.issueName) parts.push(parsed.issueName);
                
                const cust = parsed.customer || parsed;
                if (cust.firstName || cust.name) {
                    const name = cust.name || `${cust.firstName || ''} ${cust.lastName || ''}`.trim();
                    const phone = cust.phone ? ` (Ph: ${cust.phone})` : '';
                    parts.push(`Customer: ${name}${phone}`);
                }
                
                if (parts.length > 0) {
                    return parts.join(' - ');
                }
                return 'Updated Details';
            } catch (e) {
                return 'Custom Settings';
            }
        }
        return val;
    };

    const parseChangeItem = (item) => {
        if (!item) return { text: '', type: 'raw' };
        // Case 1: "Label changed: 'Old' -> 'New'" or "Label changed: Old → New"
        const match = item.match(/^(.*?)\s*changed:\s*"(.*?)"\s*(?:->|→)\s*"(.*?)"$/i) ||
                      item.match(/^(.*?)\s*changed:\s*(.*?)\s*(?:->|→)\s*(.*?)$/i);
        if (match) {
            const label = match[1].trim();
            const oldVal = cleanChangeValue(match[2]);
            const newVal = cleanChangeValue(match[3]);
            return { label, oldVal, newVal, type: 'change' };
        }

        // Case 2: "Label updated to Value"
        const matchUpdate = item.match(/^(.*?)\s*updated\s*to\s*(.*?)$/i);
        if (matchUpdate) {
            const label = matchUpdate[1].trim();
            const newVal = cleanChangeValue(matchUpdate[2]);
            return { label, newVal, type: 'update' };
        }

        // Fallback
        return { text: item, type: 'raw' };
    };

    const getCleanTimelineEventTitle = (event) => {
        const desc = event.description || event.message || '';
        const type = event.type || '';
        
        if (type === 'job-edited' || type === 'edited' || desc.includes('updated by') || desc.includes('edited by')) {
            return `Job Details Updated`;
        }
        if (type === 'payment-received' || type === 'full-payment-collected') {
            return `Payment Collected`;
        }
        if (type === 'close-call-no-service') {
            return `Closed - No Service`;
        }
        if (type === 'job-closed' || type === 'job-status-closed') {
            return `Closed - Repair Done`;
        }
        if (desc.includes('Status changed:')) {
            return `Status Updated`;
        }
        return 'Activity Update';
    };

    const renderEventDescription = (event) => {
        const desc = event.description || event.message || '';
        const type = event.type || '';
        
        // Check if it's a status change
        if (desc.includes('Status changed:') || desc.includes('status changed:')) {
            const parsedStatus = getStatusChangeDetails(desc);
            if (parsedStatus) {
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Status updated:</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{parsedStatus.oldStatus}</span>
                        <span style={{ color: '#ec4899', fontWeight: 700 }}>➔</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{parsedStatus.newStatus}</span>
                    </div>
                );
            }
        }
        
        if (type === 'job-edited' || type === 'edited' || desc.includes('updated by') || desc.includes('edited by')) {
            return <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Modified the job details:</div>;
        }
        
        let cleanText = desc;
        Object.keys(statusLabels).forEach(key => {
            const regex = new RegExp(`\\b${key}\\b`, 'gi');
            cleanText = cleanText.replace(regex, statusLabels[key]);
        });
        
        return <div style={{ color: 'var(--text-primary)' }}>{cleanText}</div>;
    };

    const renderMetadataDetails = (event) => {
        const meta = event.metadata;
        if (!meta || typeof meta !== 'object' || Object.keys(meta).length === 0) return null;
        
        if (Array.isArray(meta.changes)) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, paddingLeft: 8, borderLeft: '2px solid var(--border-primary)' }}>
                    {meta.changes.map((item, idx) => {
                        const parsed = parseChangeItem(item);
                        if (parsed.type === 'change') {
                            return (
                                <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    🔹 <strong style={{ color: 'var(--text-primary)' }}>{parsed.label}</strong> changed: 
                                    <span style={{ textDecoration: 'line-through', opacity: 0.6, marginLeft: 4 }}>"{parsed.oldVal}"</span>
                                    <span style={{ marginLeft: 4, color: '#38bdf8', fontWeight: 600 }}>➔</span>
                                    <span style={{ marginLeft: 4, fontWeight: 500, color: '#34d399' }}>"{parsed.newVal}"</span>
                                </div>
                            );
                        } else if (parsed.type === 'update') {
                            return (
                                <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    🔹 <strong style={{ color: 'var(--text-primary)' }}>{parsed.label}</strong> updated to <span style={{ fontWeight: 500, color: '#34d399' }}>"{parsed.newVal}"</span>
                                </div>
                            );
                        } else {
                            return (
                                <div key={idx} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    🔹 {parsed.text}
                                </div>
                            );
                        }
                    })}
                </div>
            );
        }
        
        if (meta.amount !== undefined) {
            return (
                <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap', backgroundColor: 'rgba(52, 211, 153, 0.05)', padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                    {meta.amount !== undefined && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Amount:</span> <strong style={{ color: '#34d399' }}>₹{meta.amount.toLocaleString('en-IN')}</strong>
                        </div>
                    )}
                    {meta.paymentMethod && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Method:</span> <strong style={{ color: 'var(--text-primary)' }}>{meta.paymentMethod}</strong>
                        </div>
                    )}
                    {meta.payment_method && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Method:</span> <strong style={{ color: 'var(--text-primary)' }}>{meta.payment_method}</strong>
                        </div>
                    )}
                    {meta.reference && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Ref/Voucher:</span> <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{meta.reference}</strong>
                        </div>
                    )}
                    {meta.notes && (
                        <div style={{ fontSize: 12, width: '100%' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Notes:</span> <span style={{ color: 'var(--text-primary)' }}>{meta.notes}</span>
                        </div>
                    )}
                </div>
            );
        }

        if (meta.closed_by || meta.closure_reason || meta.closure_option) {
            const option = meta.closure_option || meta.closure_reason || 'repair_done';
            const formattedOption = option.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6, backgroundColor: 'rgba(52, 211, 153, 0.05)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                    <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Closure Type:</span> <strong style={{ color: '#34d399' }}>{formattedOption}</strong>
                    </div>
                    {meta.closure_notes && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Closure Notes:</span> <span style={{ color: 'var(--text-primary)' }}>{meta.closure_notes}</span>
                        </div>
                    )}
                    {meta.no_service_charge_taken !== undefined && (
                        <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Service Charge Collected:</span> <strong style={{ color: meta.no_service_charge_taken ? '#f87171' : '#34d399' }}>{meta.no_service_charge_taken ? 'No (Waived)' : 'Yes'}</strong>
                        </div>
                    )}
                </div>
            );
        }
        
        if (meta.notes || meta.message) {
            return (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, fontStyle: 'italic' }}>
                    "{meta.notes || meta.message}"
                </div>
            );
        }

        const keys = Object.keys(meta).filter(k => typeof meta[k] !== 'object' && typeof meta[k] !== 'function');
        if (keys.length > 0) {
            return (
                <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    {keys.map(k => (
                        <div key={k} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span> <strong style={{ color: 'var(--text-primary)' }}>{String(meta[k])}</strong>
                        </div>
                    ))}
                </div>
            );
        }
        
        return null;
    };

    const selectedTech = technicians.find(t => t.id === selectedTechId);

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
                                            onClick={() => setSelectedJob(job)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: 10,
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 8
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                                                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                                                e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
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
                                                </div>
                                                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4, color: 'var(--text-primary)' }}>
                                                    {job.customer_name || (job.customer && job.customer.name) || 'Customer'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {job.appliance || job.category || 'Appliance'} — {job.issue || 'Service Request'}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                    {job.scheduled_time || 'No Slot'}
                                                </span>
                                                <ChevronRight size={14} color="var(--text-tertiary)" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Chronological Activity Timeline */}
                        <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid var(--border-primary)', paddingBottom: 10 }}>
                                <Activity size={16} color="#ec4899" />
                                Chronological Activity Timeline
                            </h3>

                            {timelineEvents.length === 0 ? (
                                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                                    No recorded activities for this technician/date.
                                </div>
                            ) : (
                                <div style={{ position: 'relative', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '20px', borderLeft: '2px dashed var(--border-primary)', margin: '10px 0 10px 10px', textAlign: 'left' }}>
                                    {timelineEvents.map(event => {
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
