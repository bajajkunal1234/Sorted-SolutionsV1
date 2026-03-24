'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ChevronDown, Grid, Columns, Table as TableIcon, List, RefreshCw, SlidersHorizontal, BookmarkCheck, RotateCcw, ArrowUpDown, ChevronUp } from 'lucide-react';
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
import { filterJobs, sortJobs, groupJobsBy } from '@/lib/utils/helpers';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';
import RepairCalculator from '@/components/common/RepairCalculator';

// ─── Default view config ─────────────────────────────────────────
const DEFAULT_VIEW = {
    viewType: 'kanban',
    groupBy: 'status',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    filterStatus: 'all',
    filterPriority: 'all',
    filterAssignee: 'all',
    filterLocality: 'all',
};

const VIEW_KEY = 'admin_jobs_view';

// ─── Select styles ───────────────────────────────────────────────
const selStyle = {
    appearance: 'none',
    padding: '5px 26px 5px 8px',
    fontSize: '12px',
    border: '1px solid #334155',
    borderRadius: '6px',
    backgroundColor: '#1e293b',
    color: '#cbd5e1',
    cursor: 'pointer',
    fontWeight: 500,
    minWidth: '100px',
};

// ─── Component ───────────────────────────────────────────────────
function JobsTab({ jobToOpen, onJobOpened }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [calculatorJob, setCalculatorJob] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [reviewBooking, setReviewBooking] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error'

    // View settings — start from defaults, load from Supabase after mount
    const [viewType, setViewType] = useState(DEFAULT_VIEW.viewType);
    const [groupBy, setGroupBy] = useState(DEFAULT_VIEW.groupBy);
    const [sortBy, setSortBy] = useState(DEFAULT_VIEW.sortBy);
    const [sortOrder, setSortOrder] = useState(DEFAULT_VIEW.sortOrder);
    const [filterStatus, setFilterStatus] = useState(DEFAULT_VIEW.filterStatus);
    const [filterPriority, setFilterPriority] = useState(DEFAULT_VIEW.filterPriority);
    const [filterAssignee, setFilterAssignee] = useState(DEFAULT_VIEW.filterAssignee);
    const [filterLocality, setFilterLocality] = useState(DEFAULT_VIEW.filterLocality);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    // ── Load saved view from Supabase on mount ───────────────────
    useEffect(() => {
        const loadSavedView = async () => {
            try {
                const res = await fetch(`/api/admin/job-views?key=${VIEW_KEY}`);
                const json = await res.json();
                if (json.success && json.data) {
                    const v = json.data;
                    if (v.viewType) setViewType(v.viewType);
                    if (v.groupBy) setGroupBy(v.groupBy);
                    if (v.sortBy) setSortBy(v.sortBy);
                    if (v.sortOrder) setSortOrder(v.sortOrder);
                    if (v.filterStatus) setFilterStatus(v.filterStatus);
                    if (v.filterPriority) setFilterPriority(v.filterPriority);
                    if (v.filterAssignee) setFilterAssignee(v.filterAssignee);
                    if (v.filterLocality) setFilterLocality(v.filterLocality);
                }
            } catch (err) {
                // Silently fail — defaults are fine
                console.warn('Could not load saved view:', err);
            }
        };
        loadSavedView();
    }, []);

    // ── Fetch jobs ───────────────────────────────────────────────
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const data = await jobsAPI.getAll();
            setJobs(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load jobs. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    // ── Open job from external notification ──────────────────────
    useEffect(() => {
        if (jobToOpen && jobs.length > 0) {
            const matchingJob = jobs.find(j => j.id === jobToOpen.id);
            if (matchingJob) {
                if (matchingJob.status === 'booking_request') setReviewBooking(matchingJob);
                else setSelectedJob(matchingJob);
            }
            if (onJobOpened) onJobOpened();
        }
    }, [jobToOpen, jobs, onJobOpened]);

    // ── Dynamic filter options derived from jobs ─────────────────
    const assigneeOptions = useMemo(() => {
        const names = new Set();
        jobs.forEach(j => {
            const n = j.technician?.name || j.assignedToName;
            if (n) names.add(n);
        });
        return Array.from(names).sort();
    }, [jobs]);

    const localityOptions = useMemo(() => {
        const locs = new Set();
        jobs.forEach(j => {
            const l = j.property?.address?.locality || j.property?.address?.city || j.locality;
            if (l) locs.add(l);
        });
        return Array.from(locs).sort();
    }, [jobs]);

    // ── Processing pipeline ──────────────────────────────────────
    const processedJobs = useMemo(() => {
        let result = filterJobs(jobs, {
            searchTerm,
            status: filterStatus,
            priority: filterPriority,
            assignee: filterAssignee,
            locality: filterLocality,
        });
        result = sortJobs(result, sortBy, sortOrder);
        return result;
    }, [jobs, searchTerm, filterStatus, filterPriority, filterAssignee, filterLocality, sortBy, sortOrder]);

    const groupedJobs = useMemo(() => groupJobsBy(processedJobs, groupBy), [processedJobs, groupBy]);

    // ── Save view ────────────────────────────────────────────────
    const handleSaveView = async () => {
        setSaveStatus('saving');
        const view = { viewType, groupBy, sortBy, sortOrder, filterStatus, filterPriority, filterAssignee, filterLocality };
        try {
            const res = await fetch('/api/admin/job-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: VIEW_KEY, view }),
            });
            const json = await res.json();
            if (json.success) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(null), 2500);
            } else {
                setSaveStatus('error');
                setTimeout(() => setSaveStatus(null), 3000);
            }
        } catch {
            setSaveStatus('error');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    // ── Reset to defaults ────────────────────────────────────────
    const handleResetView = () => {
        setViewType(DEFAULT_VIEW.viewType);
        setGroupBy(DEFAULT_VIEW.groupBy);
        setSortBy(DEFAULT_VIEW.sortBy);
        setSortOrder(DEFAULT_VIEW.sortOrder);
        setFilterStatus(DEFAULT_VIEW.filterStatus);
        setFilterPriority(DEFAULT_VIEW.filterPriority);
        setFilterAssignee(DEFAULT_VIEW.filterAssignee);
        setFilterLocality(DEFAULT_VIEW.filterLocality);
    };

    // ── Drag and drop ────────────────────────────────────────────
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) return;
        const jobId = active.id;
        const newStatus = over.id;
        const previousJobs = [...jobs];
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
        try {
            await jobsAPI.update(jobId, { status: newStatus });
        } catch (err) {
            console.error('Error updating job status:', err);
            setJobs(previousJobs);
            alert('Failed to update job status.');
        }
    };

    // ── CRUD handlers ────────────────────────────────────────────
    const handleCreateJob = async (newJob) => {
        try {
            await jobsAPI.create(newJob);
            await fetchJobs();
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating job:', err);
            alert('Failed to create job. Please try again.');
        }
    };

    const handleUpdateJob = async (updatedJob) => {
        if (updatedJob === 'deleted') {
            await fetchJobs();
            setSelectedJob(null);
            return;
        }
        try {
            await jobsAPI.update(updatedJob.id, updatedJob);
            await fetchJobs();
            setSelectedJob(null);
        } catch (err) {
            console.error('Error updating job:', err);
            alert('Failed to update job. Please try again.');
        }
    };

    const handleBookingConverted = async () => { setReviewBooking(null); await fetchJobs(); };
    const handleBookingDismissed = async () => { setReviewBooking(null); await fetchJobs(); };

    const handleJobClick = (job) => {
        if (job.status === 'booking_request') setReviewBooking(job);
        else setSelectedJob(job);
    };

    // Active filter count badge
    const activeFilterCount = [
        filterStatus !== 'all',
        filterPriority !== 'all',
        filterAssignee !== 'all',
        filterLocality !== 'all',
    ].filter(Boolean).length;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Top Toolbar ── */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '60px' }}>Jobs</h2>

                <div style={{ flex: 1, minWidth: '200px' }}>
                    <AutocompleteSearch
                        placeholder="Search jobs, customers, IDs..."
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={jobs}
                        onSelect={(item) => setSearchTerm(item.job_number || item.customer?.name || item.description)}
                        searchKey="description"
                        renderSuggestion={(job) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{job.job_number || 'No ID'}</span>
                                    <span style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{job.status}</span>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                    {job.customer?.name || 'Walk-in'} • {job.description || 'No description'}
                                </div>
                            </div>
                        )}
                    />
                </div>

                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* Save View Button */}
                    <button
                        onClick={handleSaveView}
                        disabled={saveStatus === 'saving'}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', fontSize: '12px', fontWeight: 500,
                            border: '1px solid',
                            borderColor: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#6366f1',
                            borderRadius: '6px', cursor: 'pointer',
                            backgroundColor: saveStatus === 'saved' ? 'rgba(16,185,129,0.1)' : saveStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                            color: saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#818cf8',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <BookmarkCheck size={14} />
                        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : saveStatus === 'error' ? 'Error' : 'Save View'}
                    </button>

                    {/* Reset View */}
                    <button
                        onClick={handleResetView}
                        title="Reset to default view"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '6px 10px', fontSize: '12px',
                            border: '1px solid #334155', borderRadius: '6px',
                            backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer',
                        }}
                    >
                        <RotateCcw size={13} />
                        Reset
                    </button>

                    <button className="btn btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '6px 14px', fontSize: '13px' }}>
                        <Plus size={15} /> Create
                    </button>
                </div>
            </div>

            {/* ── Filter / View Bar ── */}
            <div style={{
                padding: '6px var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center'
            }}>
                {/* View Type Buttons */}
                {[
                    { type: 'kanban', Icon: Columns, label: 'Kanban' },
                    { type: 'card', Icon: Grid, label: 'Card' },
                    { type: 'table', Icon: TableIcon, label: 'Table' },
                    { type: 'list', Icon: List, label: 'List' },
                ].map(({ type, Icon, label }) => (
                    <button
                        key={type}
                        onClick={() => setViewType(type)}
                        title={label}
                        style={{
                            padding: '5px 9px', border: '1px solid var(--border-primary)', borderRadius: '6px',
                            backgroundColor: viewType === type ? '#6366f1' : '#1e293b',
                            color: viewType === type ? 'white' : '#94a3b8',
                            display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s',
                        }}
                    >
                        <Icon size={15} />
                    </button>
                ))}

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '18px', margin: '0 2px' }} />

                {/* Group By */}
                <div style={{ position: 'relative' }}>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={selStyle}>
                        <option value="status">Group: Status</option>
                        <option value="assignee">Group: Assignee</option>
                        <option value="dueDate">Group: Due Date</option>
                        <option value="createdDate">Group: Creation Date</option>
                        <option value="locality">Group: Locality</option>
                        <option value="priority">Group: Priority</option>
                        <option value="customer">Group: Customer</option>
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                </div>

                {/* Sort By */}
                <div style={{ position: 'relative' }}>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selStyle}>
                        <option value="dueDate">Sort: Due Date</option>
                        <option value="createdAt">Sort: Creation Date</option>
                        <option value="jobName">Sort: Job Name</option>
                        <option value="customer">Sort: Customer</option>
                        <option value="priority">Sort: Priority</option>
                        <option value="locality">Sort: Locality</option>
                        <option value="assignee">Sort: Assignee</option>
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                </div>

                {/* Sort Order Toggle */}
                <button
                    onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    style={{
                        display: 'flex', alignItems: 'center', padding: '5px 8px',
                        border: '1px solid #334155', borderRadius: '6px',
                        backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer', fontSize: '11px', gap: '3px',
                    }}
                >
                    {sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                </button>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '18px', margin: '0 2px' }} />

                {/* Status Filter */}
                <div style={{ position: 'relative' }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...selStyle, borderColor: filterStatus !== 'all' ? '#6366f1' : '#334155' }}>
                        <option value="all">All Status</option>
                        <option value="booking_request">Booking Request</option>
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="in-progress">In Progress</option>
                        <option value="repair">Repair</option>
                        <option value="part-repairing">Part Repairing</option>
                        <option value="spare-part-needed">Spare Part Needed</option>
                        <option value="quotation-sent">Quotation Sent</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="closed">Closed</option>
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                </div>

                {/* Priority Filter */}
                <div style={{ position: 'relative' }}>
                    <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ ...selStyle, borderColor: filterPriority !== 'all' ? '#6366f1' : '#334155' }}>
                        <option value="all">All Priority</option>
                        <option value="urgent">🔴 Urgent</option>
                        <option value="high">🟡 High</option>
                        <option value="normal">🟢 Normal</option>
                        <option value="low">⚪ Low</option>
                    </select>
                    <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                </div>

                {/* Assignee Filter */}
                {assigneeOptions.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} style={{ ...selStyle, borderColor: filterAssignee !== 'all' ? '#6366f1' : '#334155' }}>
                            <option value="all">All Assignees</option>
                            {assigneeOptions.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                    </div>
                )}

                {/* Locality Filter */}
                {localityOptions.length > 0 && (
                    <div style={{ position: 'relative' }}>
                        <select value={filterLocality} onChange={(e) => setFilterLocality(e.target.value)} style={{ ...selStyle, borderColor: filterLocality !== 'all' ? '#6366f1' : '#334155' }}>
                            <option value="all">All Localities</option>
                            {localityOptions.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                        <ChevronDown size={11} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }} />
                    </div>
                )}

                {/* Active filter badge + count */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px' }}>
                    <SlidersHorizontal size={13} />
                    <span>
                        {processedJobs.length} / {jobs.length} jobs
                        {activeFilterCount > 0 && (
                            <span style={{ marginLeft: '6px', padding: '1px 6px', backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '10px', fontSize: '11px' }}>
                                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
                            </span>
                        )}
                    </span>
                    <button
                        onClick={fetchJobs}
                        title="Refresh"
                        style={{ padding: '4px', border: '1px solid #334155', borderRadius: '5px', backgroundColor: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                        <RefreshCw size={12} />
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading jobs...</div>
                )}
                {!loading && error && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>{error}</div>
                )}
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
                        {viewType === 'list' && <JobsListView jobs={processedJobs} onJobClick={handleJobClick} />}
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {reviewBooking && (
                <BookingReviewModal
                    booking={reviewBooking}
                    onClose={() => setReviewBooking(null)}
                    onConverted={handleBookingConverted}
                    onDismissed={handleBookingDismissed}
                />
            )}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onUpdate={handleUpdateJob}
                />
            )}
            {showCreateForm && <CreateJobForm onClose={() => setShowCreateForm(false)} onCreate={handleCreateJob} />}
            {calculatorJob && (
                <RepairCalculator
                    job={calculatorJob}
                    onClose={() => setCalculatorJob(null)}
                    onCreateQuotation={(items) => {
                        const jobForDetail = calculatorJob;
                        setCalculatorJob(null);
                        setSelectedJob({ ...jobForDetail, _calculatorItems: items });
                    }}
                />
            )}
        </div>
    );
}

export default JobsTab;
