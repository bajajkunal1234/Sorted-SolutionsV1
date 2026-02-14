'use client'

import { Calendar, User, MapPin, AlertCircle } from 'lucide-react';
import { getLocalityFromAddress } from '@/lib/utils/helpers';

function JobsTableView({ jobs, onJobClick }) {
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
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 'var(--font-size-sm)'
            }}>
                <thead>
                    <tr style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderBottom: '2px solid var(--border-primary)'
                    }}>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Job</th>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Customer</th>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Location</th>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Technician</th>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'left', fontWeight: 600 }}>Due Date</th>
                        <th style={{ padding: 'var(--spacing-sm)', textAlign: 'center', fontWeight: 600 }}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => {
                        const statusColor = getStatusColor(job.status);
                        // Handle camelCase vs snake_case
                        const dueDate = job.scheduled_date || job.dueDate;
                        const overdue = isOverdue(dueDate, job.status);
                        const locality = getLocalityFromAddress(job.property?.address);
                        const technicianName = job.technician?.name || job.assignedToName || 'Unassigned';
                        const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';

                        return (
                            <tr
                                key={job.id}
                                onClick={() => onJobClick?.(job)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    transition: 'background-color var(--transition-fast)',
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                        {job.thumbnail && (
                                            <img
                                                src={job.thumbnail}
                                                alt={jobTitle}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                        )}
                                        <div>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {jobTitle}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                {job.product?.name || job.product} - {job.brand?.name || job.brand}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {job.customer?.name || job.customer}
                                        </div>
                                        {job.property && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                {job.property.label || job.property.name || 'Property'}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>
                                            {locality || 'No location'}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {technicianName}
                                    </span>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <Calendar size={14} style={{ color: overdue ? 'var(--color-danger)' : 'var(--text-tertiary)' }} />
                                        <span style={{ color: overdue ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: overdue ? 600 : 400 }}>
                                            {dueDate ? new Date(dueDate).toLocaleDateString() : '-'}
                                        </span>
                                        {overdue && <AlertCircle size={14} style={{ color: 'var(--color-danger)' }} />}
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    <span style={{
                                        padding: '4px 10px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        backgroundColor: `${statusColor}20`,
                                        color: statusColor,
                                        textTransform: 'capitalize'
                                    }}>
                                        {job.status.replace('-', ' ')}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

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

export default JobsTableView;
