'use client'

import { useState, useEffect } from 'react';
import { Plus, ChevronDown, Grid, Columns, Table as TableIcon, List, Bell, ChevronUp, RefreshCw } from 'lucide-react';
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

function JobsTab({ jobToOpen, onJobOpened }) {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState('kanban');
    const [selectedJob, setSelectedJob] = useState(null);
    const [calculatorJob, setCalculatorJob] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Booking Review Modal State
    const [reviewBooking, setReviewBooking] = useState(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [groupBy, setGroupBy] = useState('status');
    const [sortBy, setSortBy] = useState('dueDate');

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const fetchJobs = async () => {
        try {
            setLoading(true);
            const data = await jobsAPI.getAll();
            // Include ALL jobs (including booking_request)
            setJobs(data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError('Failed to load jobs. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const [processedJobs, setProcessedJobs] = useState([]);

    useEffect(() => {
        if (jobToOpen && jobs.length > 0) {
            const matchingJob = jobs.find(j => j.id === jobToOpen.id);
            if (matchingJob) {
                if (matchingJob.status === 'booking_request') {
                    setReviewBooking(matchingJob);
                } else {
                    setSelectedJob(matchingJob);
                }
            }
            if (onJobOpened) onJobOpened();
        }
    }, [jobToOpen, jobs, onJobOpened]);

    useEffect(() => {
        let result = filterJobs(jobs, { searchTerm, status: filterStatus });
        result = sortJobs(result, sortBy);
        setProcessedJobs(result);
    }, [jobs, searchTerm, filterStatus, sortBy]);

    const groupedJobs = groupJobsBy(processedJobs, groupBy);

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

    const refreshJobs = async () => {
        await fetchJobs();
    };

    const handleCreateJob = async (newJob) => {
        try {
            await jobsAPI.create(newJob);
            await refreshJobs();
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating job:', err);
            alert('Failed to create job. Please try again.');
        }
    };

    const handleUpdateJob = async (updatedJob) => {
        // 'deleted' signal comes from JobDetailModal after a successful delete
        if (updatedJob === 'deleted') {
            await refreshJobs();
            setSelectedJob(null);
            return;
        }
        try {
            await jobsAPI.update(updatedJob.id, updatedJob);
            await refreshJobs();
            setSelectedJob(null);
        } catch (err) {
            console.error('Error updating job:', err);
            alert('Failed to update job. Please try again.');
        }
    };

    const handleBookingConverted = async () => {
        setReviewBooking(null);
        await refreshJobs();
    };

    const handleBookingDismissed = async () => {
        setReviewBooking(null);
        await refreshJobs();
    };

    const handleJobClick = (job) => {
        if (job.status === 'booking_request') {
            setReviewBooking(job);
        } else {
            setSelectedJob(job);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Toolbar Row ── */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '80px' }}>Jobs</h2>

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

                <button className="btn btn-primary" onClick={() => setShowCreateForm(true)} style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}>
                    <Plus size={16} /> Create
                </button>
            </div>



            {/* ── View Filter Bar ── */}
            <div style={{
                padding: 'var(--spacing-xs) var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center'
            }}>
                {[
                    { type: 'kanban', Icon: Columns },
                    { type: 'card', Icon: Grid },
                    { type: 'table', Icon: TableIcon },
                    { type: 'list', Icon: List }
                ].map(({ type, Icon }) => (
                    <button
                        key={type}
                        onClick={() => setViewType(type)}
                        title={type.charAt(0).toUpperCase() + type.slice(1)}
                        style={{
                            padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px',
                            backgroundColor: viewType === type ? '#6366f1' : '#334155',
                            color: viewType === type ? 'white' : '#cbd5e1',
                            display: 'flex', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { if (viewType !== type) { e.currentTarget.style.backgroundColor = '#475569'; e.currentTarget.style.color = '#f1f5f9'; } }}
                        onMouseLeave={(e) => { if (viewType !== type) { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#cbd5e1'; } }}
                    >
                        <Icon size={16} />
                    </button>
                ))}

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Status Filter */}
                <div style={{ position: 'relative' }}>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ appearance: 'none', padding: '6px 28px 6px 10px', fontSize: '13px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer', fontWeight: 500 }}>
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="assigned">Assigned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Group By */}
                <div style={{ position: 'relative' }}>
                    <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} style={{ appearance: 'none', padding: '6px 28px 6px 10px', fontSize: '13px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer', fontWeight: 500 }}>
                        <option value="status">Group: Status</option>
                        <option value="assignee">Group: Assignee</option>
                        <option value="dueDate">Group: Due Date</option>
                        <option value="locality">Group: Locality</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Sort By */}
                <div style={{ position: 'relative' }}>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ appearance: 'none', padding: '6px 28px 6px 10px', fontSize: '13px', border: '1px solid #334155', borderRadius: '6px', backgroundColor: '#334155', color: '#cbd5e1', cursor: 'pointer', fontWeight: 500 }}>
                        <option value="dueDate">Sort: Due Date</option>
                        <option value="createdAt">Sort: Created</option>
                        <option value="jobName">Sort: Job Name</option>
                        <option value="customer">Sort: Customer</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
            </div>

            {/* ── Content Area ── */}
            <div style={{ flex: 1, overflow: 'auto' }}>
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
