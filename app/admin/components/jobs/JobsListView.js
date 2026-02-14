'use client'

import { Calendar, User, MapPin, AlertCircle, Clock } from 'lucide-react';
import { getLocalityFromAddress } from '@/lib/utils/helpers';

function JobsListView({ jobs, onJobClick }) {
    const getStatusColor = (status) => {
        const colors = {
            'pending': '#f59e0b',
            'assigned': '#3b82f6',
            'in-progress': '#8b5cf6',
            'completed': '#10b981',
            'cancelled': '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    const isOverdue = (dueDate, status) => {
        if (status === 'completed' || status === 'cancelled') return false;
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {jobs.map(job => {
                    const statusColor = getStatusColor(job.status);
                    // Handle camelCase vs snake_case
                    const dueDate = job.scheduled_date || job.dueDate;
                    const overdue = isOverdue(dueDate, job.status);
                    const locality = getLocalityFromAddress(job.property?.address);
                    const technicianName = job.technician?.name || job.assignedToName;
                    const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';
                    const priority = job.priority;

                    return (
                        <div
                            key={job.id}
                            onClick={() => onJobClick?.(job)}
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--spacing-md)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-md)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                e.currentTarget.style.borderColor = 'var(--color-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = 'var(--border-primary)';
                            }}
                        >
                            {/* Thumbnail */}
                            {job.thumbnail && (
                                <img
                                    src={job.thumbnail}
                                    alt={jobTitle}
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        borderRadius: 'var(--radius-md)',
                                        objectFit: 'cover',
                                        flexShrink: 0
                                    }}
                                />
                            )}

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                /* Title */
                                <h3 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: 'var(--spacing-xs)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {jobTitle}
                                </h3>

                                {/* Details Row */}
                                <div style={{
                                    display: 'flex',
                                    gap: 'var(--spacing-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--text-secondary)',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <User size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        {job.customer?.name || job.customer}
                                    </div>

                                    {locality && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                            <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                                            {locality}
                                        </div>
                                    )}

                                    {technicianName && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                            <Clock size={14} style={{ color: 'var(--text-tertiary)' }} />
                                            {technicianName}
                                        </div>
                                    )}

                                    {dueDate && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                            <Calendar size={14} style={{ color: overdue ? 'var(--color-danger)' : 'var(--text-tertiary)' }} />
                                            <span style={{ color: overdue ? 'var(--color-danger)' : 'inherit', fontWeight: overdue ? 600 : 400 }}>
                                                {new Date(dueDate).toLocaleDateString()}
                                            </span>
                                            {overdue && <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />}
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                {(priority || (job.tags && job.tags.length > 0)) && (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                                        {priority && (
                                            <span
                                                style={{
                                                    padding: '2px 6px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: priority === 'high' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                    color: priority === 'high' ? 'var(--color-secondary)' : 'var(--color-warning)',
                                                    fontWeight: 500,
                                                    textTransform: 'capitalize'
                                                }}
                                            >
                                                {priority}
                                            </span>
                                        )}
                                        {job.tags && job.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                style={{
                                                    padding: '2px 6px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    color: 'var(--text-secondary)',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Status Badge */}
                            <div style={{
                                padding: '8px 16px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 600,
                                backgroundColor: `${statusColor}20`,
                                color: statusColor,
                                textTransform: 'capitalize',
                                flexShrink: 0
                            }}>
                                {job.status.replace('-', ' ')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {jobs.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)'
                }}>
                    No jobs found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default JobsListView;
