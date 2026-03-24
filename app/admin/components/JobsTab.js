'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Grid, Columns, Table as TableIcon, List } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import CreateJobForm from './CreateJobForm';
import JobsCardView from './jobs/JobsCardView';
import JobsTableView from './jobs/JobsTableView';
import JobsListView from './jobs/JobsListView';
import BookingReviewModal from './jobs/BookingReviewModal';
import { jobsAPI } from '@/lib/adminAPI';
import { sortJobs, groupJobsBy } from '@/lib/utils/helpers';
import RepairCalculator from '@/components/common/RepairCalculator';
import JobsSearchPanel from '@/components/shared/JobsSearchPanel';

// ─── Default view ────────────────────────────────────────────────
const DEFAULT_VIEW = {
    viewType: 'kanban',
    groupBy: 'status',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    activeTags: [],
};

const VIEW_KEY = 'admin_jobs_view';

// ─── Apply tag-based filters to a job list ───────────────────────
function applyTags(jobs, tags, searchTerm) {
    let result = [...jobs];

    // Search term
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(j =>
            (j.description || j.jobName || '').toLowerCase().includes(term) ||
            (j.job_number || '').toLowerCase().includes(term) ||
            (j.customer?.name || '').toLowerCase().includes(term) ||
            (j.technician?.name || j.assignedToName || '').toLowerCase().includes(term) ||
            (j.locality || j.property?.address?.locality || '').toLowerCase().includes(term)
        );
    }

    // Tag-based filters
    for (const tag of tags) {
        if (tag.type === 'preset') {
            const f = tag.filter;
            if (f._preset === 'dueToday') {
                result = result.filter(j => {
                    const d = new Date(j.scheduled_date || j.dueDate);
                    return d.toDateString() === new Date().toDateString();
                });
            } else if (f._preset === 'overdue') {
                result = result.filter(j => {
                    const d = new Date(j.scheduled_date || j.dueDate);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
                    return dd < today;
                });
            } else {
                if (f.status)   result = result.filter(j => j.status === f.status);
                if (f.priority) result = result.filter(j => (j.priority || 'normal') === f.priority);
            }
        } else if (tag.type === 'custom' && tag.conditions) {
            for (const cond of tag.conditions) {
                result = result.filter(j => {
                    let fieldVal = '';
                    switch (cond.field) {
                        case 'status':      fieldVal = j.status || ''; break;
                        case 'priority':    fieldVal = j.priority || 'normal'; break;
                        case 'locality':    fieldVal = j.locality || j.property?.address?.locality || ''; break;
                        case 'customer':    fieldVal = j.customer?.name || ''; break;
                        case 'assignee':    fieldVal = j.technician?.name || j.assignedToName || ''; break;
                        case 'dueDate':     fieldVal = j.scheduled_date || j.dueDate || ''; break;
                        case 'createdDate': fieldVal = j.created_at || ''; break;
                        default: fieldVal = '';
                    }
                    const v = cond.value.toLowerCase();
                    const fv = (fieldVal || '').toLowerCase();
                    switch (cond.operator) {
                        case 'is':           return fv === v;
                        case 'is_not':       return fv !== v;
                        case 'contains':     return fv.includes(v);
                        case 'not_contains': return !fv.includes(v);
                        case 'before':       return fieldVal && new Date(fieldVal) < new Date(cond.value);
                        case 'after':        return fieldVal && new Date(fieldVal) > new Date(cond.value);
                        default:             return true;
                    }
                });
            }
        }
    }

    return result;
}

// ─── Component ───────────────────────────────────────────────────
function JobsTab({ jobToOpen, onJobOpened }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [calculatorJob, setCalculatorJob] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

    // View state
    const [viewType, setViewType] = useState(DEFAULT_VIEW.viewType);
    const [groupBy, setGroupBy] = useState(DEFAULT_VIEW.groupBy);
    const [sortBy, setSortBy] = useState(DEFAULT_VIEW.sortBy);
    const [sortOrder, setSortOrder] = useState(DEFAULT_VIEW.sortOrder);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTags, setActiveTags] = useState([]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // ── Load saved view from Supabase ─────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/admin/job-views?key=${VIEW_KEY}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const v = json.data;
                    if (v.viewType)    setViewType(v.viewType);
                    if (v.groupBy)     setGroupBy(v.groupBy);
                    if (v.sortBy)      setSortBy(v.sortBy);
                    if (v.sortOrder)   setSortOrder(v.sortOrder);
                    if (v.activeTags)  setActiveTags(v.activeTags);
                }
            } catch { /* silently fail */ }
        };
        load();
    }, []);

    // ── Fetch jobs ────────────────────────────────────────────────
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await jobsAPI.getAll();
            setJobs(data || []);
            setError(null);
        } catch (err) {
            console.error('Error:', err);
            setError('Failed to load jobs.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // ── Open job from notification ────────────────────────────────
    useEffect(() => {
        if (jobToOpen && jobs.length > 0) {
            const j = jobs.find(j => j.id === jobToOpen.id);
            if (j) { if (j.status === 'booking_request') setReviewBooking(j); else setSelectedJob(j); }
            if (onJobOpened) onJobOpened();
        }
    }, [jobToOpen, jobs, onJobOpened]);

    // ── Processing pipeline ───────────────────────────────────────
    const processedJobs = useMemo(() => {
        const filtered = applyTags(jobs, activeTags, searchTerm);
        return sortJobs(filtered, sortBy, sortOrder);
    }, [jobs, activeTags, searchTerm, sortBy, sortOrder]);

    const groupedJobs = useMemo(() => groupJobsBy(processedJobs, groupBy), [processedJobs, groupBy]);

    // ── Tag management ────────────────────────────────────────────
    const handleAddTag = (tag) => setActiveTags(prev => [...prev.filter(t => t.id !== tag.id), tag]);
    const handleRemoveTag = (id) => setActiveTags(prev => prev.filter(t => t.id !== id));

    // ── Save / Reset ──────────────────────────────────────────────
    const handleSaveView = async () => {
        setSaveStatus('saving');
        const view = { viewType, groupBy, sortBy, sortOrder, activeTags };
        try {
            const res = await fetch('/api/admin/job-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: VIEW_KEY, view }),
            });
            const json = await res.json();
            setSaveStatus(json.success ? 'saved' : 'error');
            setTimeout(() => setSaveStatus(null), 2500);
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const handleResetView = () => {
        setViewType(DEFAULT_VIEW.viewType);
        setGroupBy(DEFAULT_VIEW.groupBy);
        setSortBy(DEFAULT_VIEW.sortBy);
        setSortOrder(DEFAULT_VIEW.sortOrder);
        setActiveTags([]);
        setSearchTerm('');
    };

    // ── Drag & Drop ───────────────────────────────────────────────
    const handleDragEnd = async ({ active, over }) => {
        if (!over) return;
        const jobId = active.id;
        const newStatus = over.id;
        const prev = [...jobs];
        setJobs(j => j.map(jj => jj.id === jobId ? { ...jj, status: newStatus } : jj));
        try { await jobsAPI.update(jobId, { status: newStatus }); }
        catch { setJobs(prev); alert('Failed to update job status.'); }
    };

    // ── CRUD ──────────────────────────────────────────────────────
    const handleCreateJob = async (newJob) => {
        try { await jobsAPI.create(newJob); await fetchJobs(); setShowCreateForm(false); }
        catch { alert('Failed to create job.'); }
    };

    const handleUpdateJob = async (updatedJob) => {
        if (updatedJob === 'deleted') { await fetchJobs(); setSelectedJob(null); return; }
        try { await jobsAPI.update(updatedJob.id, updatedJob); await fetchJobs(); setSelectedJob(null); }
        catch { alert('Failed to update job.'); }
    };

    const handleJobClick = (job) => {
        if (job.status === 'booking_request') setReviewBooking(job);
        else setSelectedJob(job);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Top Bar ── */}
            <div style={{
                padding: '8px 12px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
            }}>
                {/* View Type Buttons */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[
                        { type: 'kanban', Icon: Columns },
                        { type: 'card',   Icon: Grid },
                        { type: 'table',  Icon: TableIcon },
                        { type: 'list',   Icon: List },
                    ].map(({ type, Icon }) => (
                        <button
                            key={type}
                            onClick={() => setViewType(type)}
                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                            style={{
                                padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '6px',
                                backgroundColor: viewType === type ? '#6366f1' : '#1e293b',
                                color: viewType === type ? 'white' : '#94a3b8',
                                display: 'flex', cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <Icon size={15} />
                        </button>
                    ))}
                </div>

                {/* Search Panel — takes remaining space */}
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
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onSaveView={handleSaveView}
                    saveStatus={saveStatus}
                    onResetView={handleResetView}
                    showAssignee={true}
                />

                {/* Count + Create */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {processedJobs.length}/{jobs.length}
                    </span>
                    <button className="btn btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Plus size={14} /> Create
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading jobs...</div>}
                {!loading && error && <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{error}</div>}
                {!loading && !error && (
                    <>
                        {viewType === 'card' && <JobsCardView jobs={processedJobs} onJobClick={handleJobClick} />}

                        {viewType === 'kanban' && (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                                <div className="kanban-container">
                                    <div className="kanban-board">
                                        {Object.entries(groupedJobs).map(([groupName, groupJobsList]) => (
                                            <div key={groupName} className="kanban-column">
                                                <div className="kanban-column-header">
                                                    <h3 className="kanban-column-title">{groupName}</h3>
                                                    <span className="kanban-column-count">{groupJobsList.length}</span>
                                                </div>
                                                <SortableContext items={groupJobsList.map(j => j.id)} strategy={verticalListSortingStrategy} id={groupName}>
                                                    <div className="kanban-cards">
                                                        {groupJobsList.map(job => (
                                                            <JobCard key={job.id} job={job} onClick={() => handleJobClick(job)} onCalculate={(j) => setCalculatorJob(j)} />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DndContext>
                        )}

                        {viewType === 'table' && <JobsTableView jobs={processedJobs} onJobClick={handleJobClick} />}
                        {viewType === 'list'  && <JobsListView  jobs={processedJobs} onJobClick={handleJobClick} />}
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {reviewBooking && <BookingReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onConverted={async () => { setReviewBooking(null); await fetchJobs(); }} onDismissed={async () => { setReviewBooking(null); await fetchJobs(); }} />}
            {selectedJob   && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onUpdate={handleUpdateJob} />}
            {showCreateForm && <CreateJobForm onClose={() => setShowCreateForm(false)} onCreate={handleCreateJob} />}
            {calculatorJob && (
                <RepairCalculator
                    job={calculatorJob}
                    onClose={() => setCalculatorJob(null)}
                    onCreateQuotation={(items) => { const j = calculatorJob; setCalculatorJob(null); setSelectedJob({ ...j, _calculatorItems: items }); }}
                />
            )}
        </div>
    );
}

export default JobsTab;
