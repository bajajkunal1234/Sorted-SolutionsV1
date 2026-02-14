'use client'

import { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, Grid, Columns, Table as TableIcon, List } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import JobCard from './JobCard';
import JobDetailModal from './JobDetailModal';
import CreateJobForm from './CreateJobForm';
import JobsCardView from '@/components/jobs/JobsCardView';
import JobsTableView from '@/components/jobs/JobsTableView';
import JobsListView from '@/components/jobs/JobsListView';
import { sampleJobs, jobStatuses } from '@/data/sampleData';
import { filterJobs, sortJobs, groupJobsBy } from '@/utils/helpers';

function JobsTab() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [viewType, setViewType] = useState('kanban');
    const [selectedJob, setSelectedJob] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [groupBy, setGroupBy] = useState('status');
    const [sortBy, setSortBy] = useState('scheduledDate');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Fetch jobs from API
    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/admin/jobs');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch jobs');
            }

            setJobs(result.data || []);
        } catch (err) {
            console.error('Error fetching jobs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Apply filters and sorting
    const [processedJobs, setProcessedJobs] = useState([]);

    useEffect(() => {
        let result = filterJobs(jobs, {
            searchTerm,
            status: filterStatus
        });

        result = sortJobs(result, sortBy);
        setProcessedJobs(result);
    }, [jobs, searchTerm, filterStatus, sortBy]);

    // Group jobs for Kanban view
    const groupedJobs = groupJobsBy(processedJobs, groupBy);

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (!over) return;

        // Extract job ID and new status from drag event
        const jobId = active.id;
        const newStatus = over.id;

        // Update job status
        setJobs(prevJobs =>
            prevJobs.map(job =>
                job.id === jobId ? { ...job, status: newStatus } : job
            )
        );
    };

    const handleCreateJob = async (newJob) => {
        try {
            const response = await fetch('/api/admin/jobs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newJob)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create job');
            }

            // Refresh jobs list
            await fetchJobs();
            setShowCreateForm(false);
        } catch (err) {
            console.error('Error creating job:', err);
            alert(`Failed to create job: ${err.message}`);
        }
    };

    const handleUpdateJob = async (updatedJob) => {
        try {
            const response = await fetch('/api/admin/jobs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedJob)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update job');
            }

            // Refresh jobs list
            await fetchJobs();
            setSelectedJob(null);
        } catch (err) {
            console.error('Error updating job:', err);
            alert(`Failed to update job: ${err.message}`);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Row 1: Tab Name + Search + Create Button */}
            <div style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-md)',
                flexWrap: 'wrap'
            }}>
                <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, minWidth: '80px' }}>
                    Jobs
                </h2>

                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: 'var(--spacing-sm)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }}
                    />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            paddingLeft: '2rem',
                            paddingTop: '6px',
                            paddingBottom: '6px',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreateForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Create
                </button>
            </div>

            {/* Row 2: View Buttons + Compact Filter Buttons */}
            <div style={{
                padding: 'var(--spacing-xs) var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                {/* View Type Buttons */}
                {[
                    { type: 'kanban', Icon: Columns, label: 'Kanban' },
                    { type: 'card', Icon: Grid, label: 'Card' },
                    { type: 'table', Icon: TableIcon, label: 'Table' },
                    { type: 'list', Icon: List, label: 'List' }
                ].map(({ type, Icon }) => (
                    <button
                        key={type}
                        onClick={() => setViewType(type)}
                        title={type.charAt(0).toUpperCase() + type.slice(1)}
                        style={{
                            padding: '4px 8px',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: viewType === type ? 'var(--color-primary)' : 'var(--bg-elevated)',
                            color: viewType === type ? 'var(--text-inverse)' : 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        <Icon size={14} />
                    </button>
                ))}

                <span style={{ borderLeft: '1px solid var(--border-primary)', height: '16px', margin: '0 4px' }} />

                {/* Status Filter */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="all">All Status</option>
                        {jobStatuses.map(status => (
                            <option key={status.id} value={status.id}>{status.label}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>

                {/* Group By */}
                <div style={{ position: 'relative' }}>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
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
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            appearance: 'none',
                            padding: '4px 24px 4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            fontWeight: 500
                        }}
                    >
                        <option value="scheduledDate">Sort: Due Date</option>
                        <option value="createdAt">Sort: Created</option>
                        <option value="jobName">Sort: Job Name</option>
                        <option value="customer">Sort: Customer</option>
                    </select>
                    <ChevronDown size={12} style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <div className="loading-spinner"></div>
                    </div>
                ) : error ? (
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--spacing-md)' }}>Error: {error}</p>
                        <button className="btn btn-primary" onClick={fetchJobs}>Retry</button>
                    </div>
                ) : (
                    <>
                        {viewType === 'card' && (
                            <JobsCardView
                                jobs={processedJobs}
                                onJobClick={setSelectedJob}
                            />
                        )}

                        {viewType === 'kanban' && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="kanban-container">
                                    <div className="kanban-board">
                                        {Object.entries(groupedJobs).map(([groupName, groupJobsList]) => (
                                            <div key={groupName} className="kanban-column">
                                                <div className="kanban-column-header">
                                                    <h3 className="kanban-column-title">{groupName}</h3>
                                                    <span className="kanban-column-count">{groupJobsList.length}</span>
                                                </div>

                                                <SortableContext
                                                    items={groupJobsList.map(j => j.id)}
                                                    strategy={verticalListSortingStrategy}
                                                    id={groupName}
                                                >
                                                    <div className="kanban-cards">
                                                        {groupJobsList.map(job => (
                                                            <JobCard
                                                                key={job.id}
                                                                job={job}
                                                                onClick={() => setSelectedJob(job)}
                                                            />
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
                                onJobClick={setSelectedJob}
                            />
                        )}

                        {viewType === 'list' && (
                            <JobsListView
                                jobs={processedJobs}
                                onJobClick={setSelectedJob}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetailModal
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onUpdate={handleUpdateJob}
                />
            )}

            {/* Create Job Form Modal */}
            {showCreateForm && (
                <CreateJobForm
                    onClose={() => setShowCreateForm(false)}
                    onCreate={handleCreateJob}
                />
            )}
        </div>
    );
}

export default JobsTab;





