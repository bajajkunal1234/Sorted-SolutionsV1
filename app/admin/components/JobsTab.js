'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Grid, Columns, Table as TableIcon, List, Settings, Map } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import dynamic from 'next/dynamic';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import CreateJobForm from './CreateJobForm';
import JobsCardView from './jobs/JobsCardView';
import JobsTableView from './jobs/JobsTableView';
import JobsListView from './jobs/JobsListView';

const JobsMapView = dynamic(() => import('./jobs/JobsMapView'), { ssr: false });
import BookingReviewModal from './jobs/BookingReviewModal';
import { jobsAPI } from '@/lib/adminAPI';
import { sortJobs, groupJobsBy, STATUS_ORDER } from '@/lib/utils/helpers';
import RepairCalculator from '@/components/common/RepairCalculator';
import JobsSearchPanel from '@/components/shared/JobsSearchPanel';

// ─── Helpers ──────────────────────────────────────────────────────
const VIEWS_API = '/api/admin/job-views';

const DEFAULTS = { viewType: 'kanban', groupBy: 'none', sortBy: 'dueDate', sortOrder: 'asc', activeTags: [] };

/** Generate a random short id */
const uid = () => Math.random().toString(36).slice(2, 9);

/** Apply tag-based filters + search to job list */
function applyTags(jobs, tags, searchTerm) {
    let result = [...jobs];
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(j => {
            const prop = j.property || {};
            const propStr = typeof prop === 'string'
                ? prop
                : `${prop.flat_number || ''} ${prop.building_name || ''} ${prop.address || ''} ${prop.locality || ''} ${prop.pincode || ''} ${prop.property_name || ''}`;
            
            return (
                (j.description || j.jobName || '').toLowerCase().includes(term) ||
                (j.job_number || '').toLowerCase().includes(term) ||
                (j.customer?.name || '').toLowerCase().includes(term) ||
                (j.customer?.mobile || j.customer?.phone || '').toLowerCase().includes(term) ||
                (j.technician?.name || j.assignedToName || '').toLowerCase().includes(term) ||
                (j.locality || '').toLowerCase().includes(term) ||
                propStr.toLowerCase().includes(term)
            );
        });
    }
    for (const tag of tags) {
        if (tag.type === 'preset') {
            const f = tag.filter;
            if (f._preset === 'dueToday') {
                result = result.filter(j => new Date(j.scheduled_date || j.dueDate).toDateString() === new Date().toDateString());
            } else if (f._preset === 'overdue') {
                result = result.filter(j => {
                    const d = new Date(j.scheduled_date || j.dueDate); d.setHours(0, 0, 0, 0);
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    return d < today;
                });
            } else {
                if (f.status)   result = result.filter(j => j.status === f.status);
                if (f.priority) result = result.filter(j => (j.priority || 'normal') === f.priority);
            }
        } else if (tag.type === 'custom' && tag.conditions) {
            for (const cond of tag.conditions) {
                result = result.filter(j => {
                    let fv = '';
                    switch (cond.field) {
                        case 'status':      fv = j.status || ''; break;
                        case 'priority':    fv = j.priority || 'normal'; break;
                        case 'locality':    fv = j.locality || j.property?.address?.locality || ''; break;
                        case 'customer':    fv = j.customer?.name || ''; break;
                        case 'assignee':    fv = j.technician?.name || j.assignedToName || ''; break;
                        case 'dueDate':     fv = j.scheduled_date || j.dueDate || ''; break;
                        case 'createdDate': fv = j.created_at || ''; break;
                    }
                    const v = cond.value.toLowerCase(), val = (fv || '').toLowerCase();
                    switch (cond.operator) {
                        case 'is':           return val === v;
                        case 'is_not':       return val !== v;
                        case 'contains':     return val.includes(v);
                        case 'not_contains': return !val.includes(v);
                        case 'before':       return fv && new Date(fv) < new Date(cond.value);
                        case 'after':        return fv && new Date(fv) > new Date(cond.value);
                        default:             return true;
                    }
                });
            }
        }
    }
    return result;
}

// ─── Component ────────────────────────────────────────────────────
function JobsTab({ jobToOpen, onJobOpened }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [editJobFormJob, setEditJobFormJob] = useState(null);
    const [calculatorJob, setCalculatorJob] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [saveStatus, setSaveStatus] = useState(null);

    // Active view state
    const [viewType, setViewType] = useState(DEFAULTS.viewType);
    const [groupBy, setGroupBy] = useState(DEFAULTS.groupBy);
    const [sortBy, setSortBy] = useState(DEFAULTS.sortBy);
    const [sortOrder, setSortOrder] = useState(DEFAULTS.sortOrder);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTags, setActiveTags] = useState([]);

    // Column visibility for Table View
    const [visibleColumns, setVisibleColumns] = useState({
        job: true,
        customer: true,
        locality: true,
        brand: true,
        technician: true,
        dueDate: true,
        visited: true,
        quotation: true,
        invoice: true,
        status: true,
        appliance: true,
        applianceType: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // Close column dropdown on click outside
    useEffect(() => {
        if (!showColumnDropdown) return;
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.column-toggler-container-admin')) {
                setShowColumnDropdown(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showColumnDropdown]);

    // Named saved views
    const [savedViews, setSavedViews] = useState([]);

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

    // ── Load saved views from Supabase on mount ───────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(VIEWS_API);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setSavedViews(json.data);
                    // auto-apply default view
                    const def = json.data.find(v => v.isDefault);
                    if (def) applyViewConfig(def.config);
                }
            } catch { /* silently fail */ }
        };
        load();
    }, []);

    const applyViewConfig = (config) => {
        if (!config) return;
        if (config.viewType)   setViewType(config.viewType);
        if (config.groupBy)    setGroupBy(config.groupBy);
        if (config.sortBy)     setSortBy(config.sortBy);
        if (config.sortOrder)  setSortOrder(config.sortOrder);
        if (config.activeTags) setActiveTags(config.activeTags);
    };

    // ── Save helpers ──────────────────────────────────────────────
    const persistViews = async (views) => {
        setSavedViews(views);
        try {
            await fetch(VIEWS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ views }),
            });
        } catch (e) { console.error('persist views failed', e); }
    };

    const handleSaveNamedView = async (name) => {
        setSaveStatus('saving');
        const config = { viewType, groupBy, sortBy, sortOrder, activeTags };
        const existing = savedViews.find(v => v.name.toLowerCase() === name.toLowerCase());
        let updated;
        if (existing) {
            // overwrite same-name view
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
        // if we deleted the default, make the first one default
        if (savedViews.find(v => v.id === id)?.isDefault && updated.length > 0) {
            updated[0] = { ...updated[0], isDefault: true };
        }
        await persistViews(updated);
    };

    const handleSetDefaultView = async (id) => {
        const updated = savedViews.map(v => ({ ...v, isDefault: v.id === id }));
        await persistViews(updated);
    };

    // ── Fetch jobs ────────────────────────────────────────────────
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await jobsAPI.getAll();
            setJobs(data || []);
            setError(null);
        } catch (err) {
            setError(`Failed to load jobs: ${err.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    useEffect(() => {
        if (jobToOpen && jobs.length > 0) {
            const j = jobs.find(j => j.id === jobToOpen.id);
            if (j) { if (j.status === 'booking_request') setReviewBooking(j); else setSelectedJob(j); }
            if (onJobOpened) onJobOpened();
        }
    }, [jobToOpen, jobs, onJobOpened]);

    // ── Processing ────────────────────────────────────────────────
    const processedJobs = useMemo(() => {
        const filtered = applyTags(jobs, activeTags, searchTerm);
        return sortJobs(filtered, sortBy, sortOrder);
    }, [jobs, activeTags, searchTerm, sortBy, sortOrder]);

    const effectiveGroupBy = viewType === 'kanban' && (groupBy === 'none' || !groupBy) ? 'status' : (groupBy || 'none');

    const groupedJobs = useMemo(() => {
        const raw = groupJobsBy(processedJobs, effectiveGroupBy);
        if (effectiveGroupBy !== 'status') return raw;
        // Sort columns in canonical 9-status lifecycle order
        const ordered = {};
        STATUS_ORDER.forEach(statusKey => {
            // groupJobsBy title-cases the status key for the group name
            const groupName = statusKey.replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            if (raw[groupName]) ordered[groupName] = raw[groupName];
        });
        // Append any remaining groups not in STATUS_ORDER (safety net)
        Object.keys(raw).forEach(k => { if (!ordered[k]) ordered[k] = raw[k]; });
        return ordered;
    }, [processedJobs, effectiveGroupBy]);

    // ── Sorting callback for Table View headers ──
    const handleSort = (key) => {
        if (sortBy === key) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
    };

    // ── Tag management ────────────────────────────────────────────
    const handleAddTag = (tag) => setActiveTags(prev => [...prev.filter(t => t.id !== tag.id), tag]);
    const handleRemoveTag = (id) => setActiveTags(prev => prev.filter(t => t.id !== id));

    const handleResetView = () => {
        setViewType(DEFAULTS.viewType); setGroupBy(DEFAULTS.groupBy);
        setSortBy(DEFAULTS.sortBy); setSortOrder(DEFAULTS.sortOrder);
        setActiveTags([]); setSearchTerm('');
    };

    // ── Drag & Drop ───────────────────────────────────────────────
    const handleDragEnd = async ({ active, over }) => {
        if (!over) return;
        if (groupBy !== 'status') {
            alert('Drag & drop is only supported when grouped by Status.');
            return;
        }

        let targetStatus = over.id;
        
        // If dropped over a job card, get the status of that job
        const overJob = jobs.find(j => j.id === over.id);
        if (overJob) {
            targetStatus = overJob.status;
        } else {
            // Normalise: column group names are title-cased — convert back to snake_case status value
            targetStatus = targetStatus.toLowerCase().replace(/ /g, '_');
        }

        if (active.id === over.id || !targetStatus) return;

        const prev = [...jobs];
        setJobs(j => j.map(jj => jj.id === active.id ? { ...jj, status: targetStatus } : jj));
        try { await jobsAPI.update(active.id, { status: targetStatus }); }
        catch { setJobs(prev); alert('Failed to update job status.'); }
    };

    // ── CRUD ──────────────────────────────────────────────────────
    const handleCreateJob   = async (newJob) => { try { await jobsAPI.create(newJob); await fetchJobs(); setShowCreateForm(false); } catch (err) { alert('Failed to create job: ' + err.message); } };
    const handleUpdateJob   = async (updated) => { if (updated === 'deleted') { await fetchJobs(); setSelectedJob(null); return; } try { await jobsAPI.update(updated.id, updated); await fetchJobs(); setSelectedJob(null); } catch (err) { alert('Failed to update job: ' + err.message); } };
    const handleUpdateJobFromForm = async (updated) => { try { await jobsAPI.update(editJobFormJob.id, updated); await fetchJobs(); setEditJobFormJob(null); } catch (err) { alert('Failed to update job: ' + err.message); } };

    const handleJobClick    = (job) => { 
        if ((job.status === 'booking_request' || job.status === 'new_job_request' || job.status === 'enquiry') && job.source !== 'customer_app') {
            setReviewBooking(job); 
        } else if ((job.status === 'booking_request' || job.status === 'new_job_request') && job.source === 'customer_app') {
            setEditJobFormJob(job);
        } else {
            setSelectedJob(job); 
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Row 1: Title + Search ── */}
            <div className="tab-header-row" style={{ padding: '8px 12px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="tab-title" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>Jobs</span>
                <JobsSearchPanel
                    searchTerm={searchTerm} onSearchChange={setSearchTerm}
                    groupBy={groupBy} onGroupByChange={setGroupBy}
                    sortBy={sortBy} onSortByChange={setSortBy}
                    sortOrder={sortOrder} onSortOrderChange={setSortOrder}
                    activeTags={activeTags} onAddTag={handleAddTag} onRemoveTag={handleRemoveTag}
                    savedViews={savedViews}
                    onSaveNamedView={handleSaveNamedView}
                    onApplyView={handleApplyView}
                    onDeleteView={handleDeleteView}
                    onSetDefaultView={handleSetDefaultView}
                    saveStatus={saveStatus}
                    onResetView={handleResetView}
                    showAssignee={true}
                    hideSortGroup={viewType === 'map'}
                />
            </div>

            {/* ── Row 2: View Types + Refresh + Count + Create ── */}
            <div className="tab-controls-row" style={{ padding: '6px 12px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* View Type toggles */}
                <div style={{ display: 'flex', gap: '4px' }}>
                    {[{ type: 'kanban', Icon: Columns, label: 'Kanban' }, { type: 'card', Icon: Grid, label: 'Cards' }, { type: 'table', Icon: TableIcon, label: 'Table' }, { type: 'list', Icon: List, label: 'List' }, { type: 'map', Icon: Map, label: 'Map' }].map(({ type, Icon, label }) => (
                        <button key={type} onClick={() => setViewType(type)} title={label}
                            style={{ padding: '5px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: viewType === type ? '#6366f1' : 'transparent', color: viewType === type ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}>
                            <Icon size={13} />{label}
                        </button>
                    ))}
                </div>

                <div style={{ flex: 1 }} />

                {/* Refresh + Count */}
                <button
                    onClick={fetchJobs}
                    title="Refresh jobs"
                    style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    ↻ Refresh
                </button>

                {/* Columns Selection Dropdown (Table View only) */}
                {viewType === 'table' && (
                    <div className="column-toggler-container-admin" style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowColumnDropdown(!showColumnDropdown);
                            }}
                            style={{
                                padding: '5px 10px',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '6px',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s'
                            }}
                        >
                            <Settings size={13} />
                            <span>Columns</span>
                        </button>
                        {showColumnDropdown && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                boxShadow: 'var(--shadow-lg)',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                minWidth: '160px',
                                zIndex: 110
                            }}>
                                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 8px', borderBottom: '1px solid var(--border-primary)', marginBottom: '4px' }}>
                                    Toggle Columns
                                </div>
                                {Object.keys(visibleColumns).map(col => (
                                    <label
                                        key={col}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[col]}
                                            onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {col === 'dueDate' ? 'Due Date' : col === 'visited' ? 'Visited?' : col === 'applianceType' ? 'Appliance Type' : col}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <span style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {processedJobs.length} / {jobs.length} jobs
                </span>

                {/* Create */}
                <button className="btn btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '6px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    <Plus size={14} /> Create
                </button>
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
                                                            <JobCard key={job.id} job={job} onClick={() => handleJobClick(job)} onCalculate={j => setCalculatorJob(j)} />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </DndContext>
                        )}
                        {viewType === 'table' && (
                            <JobsTableView 
                                jobs={processedJobs} 
                                onJobClick={handleJobClick} 
                                visibleColumns={visibleColumns} 
                                groupBy={effectiveGroupBy} 
                                groupedJobs={groupedJobs}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                            />
                        )}
                        {viewType === 'list'  && <JobsListView  jobs={processedJobs} onJobClick={handleJobClick} />}
                        {viewType === 'map'   && <JobsMapView   jobs={processedJobs} onUpdateJob={handleUpdateJob} />}
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {reviewBooking && <BookingReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onConverted={async () => { setReviewBooking(null); await fetchJobs(); }} onDismissed={async () => { setReviewBooking(null); await fetchJobs(); }} />}
            {selectedJob   && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} onUpdate={handleUpdateJob} />}
            {showCreateForm && <CreateJobForm onClose={() => setShowCreateForm(false)} onCreate={handleCreateJob} />}
            {editJobFormJob && <CreateJobForm existingJob={editJobFormJob} onClose={() => setEditJobFormJob(null)} onCreate={handleUpdateJobFromForm} />}
            {calculatorJob && <RepairCalculator job={calculatorJob} onClose={() => setCalculatorJob(null)} onCreateQuotation={(items) => { const j = calculatorJob; setCalculatorJob(null); setSelectedJob({ ...j, _calculatorItems: items }); }} />}
        </div>
    );
}

export default JobsTab;
