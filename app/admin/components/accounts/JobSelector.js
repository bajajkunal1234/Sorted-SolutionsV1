'use client'

import { useState, useEffect, useRef } from 'react';
import { Briefcase, X, Search, ChevronDown } from 'lucide-react';
import { jobsAPI } from '@/lib/adminAPI';

function JobSelector({ value, onChange, accountId, label = 'Link to Job (optional)' }) {
    const [jobs, setJobs] = useState([]);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState(null);
    const ref = useRef(null);

    // Fetch jobs once (filter by accountId if provided)
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const filters = {};
                if (accountId) filters.customer_id = accountId;
                const data = await jobsAPI.getAll(filters);
                // Only show completed / in-progress jobs that make sense to link
                setJobs(data || []);
                // If there's a pre-selected value, find and set it
                if (value) {
                    const found = (data || []).find(j => j.id === value || j.job_number === value);
                    if (found) setSelectedJob(found);
                }
            } catch (e) {
                console.error('JobSelector load error:', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [accountId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync external value changes
    useEffect(() => {
        if (!value) { setSelectedJob(null); return; }
        const found = jobs.find(j => j.id === value || j.job_number === value);
        if (found) setSelectedJob(found);
    }, [value, jobs]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = jobs.filter(j => {
        const q = search.toLowerCase();
        return (
            (j.job_number || '').toLowerCase().includes(q) ||
            (j.customer_name || '').toLowerCase().includes(q) ||
            (j.description || '').toLowerCase().includes(q) ||
            (j.category || '').toLowerCase().includes(q)
        );
    }).slice(0, 20);

    const statusColor = (s) => {
        const m = { completed: '#10b981', in_progress: '#3b82f6', 'in-progress': '#3b82f6', scheduled: '#f59e0b', cancelled: '#ef4444' };
        return m[s] || '#6b7280';
    };

    const clear = (e) => {
        e.stopPropagation();
        setSelectedJob(null);
        onChange(null);
        setSearch('');
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>
                <Briefcase size={13} style={{ display: 'inline', marginRight: 4 }} />
                {label}
            </label>

            {/* Trigger */}
            <div
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)',
                    cursor: 'pointer', minHeight: '38px', gap: 8
                }}
            >
                {selectedJob ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700,
                            backgroundColor: `${statusColor(selectedJob.status)}20`,
                            color: statusColor(selectedJob.status)
                        }}>
                            {selectedJob.job_number || 'JOB'}
                        </span>
                        <span style={{ fontSize: 13, flex: 1 }}>
                            {selectedJob.customer_name || '—'} · {selectedJob.category || selectedJob.description || '—'}
                        </span>
                        <button onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-tertiary)' }}>
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: 13, flex: 1 }}>
                        {loading ? 'Loading jobs...' : 'Select a job...'}
                    </span>
                )}
                <ChevronDown size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </div>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 999,
                    backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    marginTop: 4, overflow: 'hidden'
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Search size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by job number, customer, category..."
                            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, width: '100%', color: 'var(--text-primary)' }}
                        />
                    </div>
                    {/* List */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {/* Clear option */}
                        {selectedJob && (
                            <div
                                onClick={() => { setSelectedJob(null); onChange(null); setOpen(false); setSearch(''); }}
                                style={{ padding: '8px 12px', fontSize: 12, color: '#ef4444', cursor: 'pointer', borderBottom: '1px solid var(--border-primary)' }}
                            >
                                ✕ Clear selection
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--text-tertiary)' }}>
                                {loading ? 'Loading...' : 'No jobs found'}
                            </div>
                        ) : (
                            filtered.map(job => (
                                <div
                                    key={job.id}
                                    onClick={() => { setSelectedJob(job); onChange(job.id); setOpen(false); setSearch(''); }}
                                    style={{
                                        padding: '9px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                                        backgroundColor: selectedJob?.id === job.id ? 'rgba(59,130,246,0.08)' : 'transparent',
                                        borderBottom: '1px solid var(--border-primary)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = selectedJob?.id === job.id ? 'rgba(59,130,246,0.08)' : 'transparent'}
                                >
                                    <span style={{
                                        padding: '2px 6px', borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0,
                                        backgroundColor: `${statusColor(job.status)}20`, color: statusColor(job.status)
                                    }}>
                                        {job.job_number || 'JOB'}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {job.customer_name || 'Unknown Customer'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {[job.category, job.subcategory, job.description].filter(Boolean).join(' · ')}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0, textAlign: 'right' }}>
                                        {job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                        {job.amount ? <><br />₹{Number(job.amount).toLocaleString()}</> : ''}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default JobSelector;
