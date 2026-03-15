'use client'

import { Calendar, User, MapPin, AlertCircle } from 'lucide-react';

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

    const getLocality = (property) => {
        if (!property || !property.address) return '';
        const parts = property.address.split(',');
        return parts.length >= 2 ? parts[parts.length - 3]?.trim() || parts[0] : parts[0];
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
                        const overdue = isOverdue(job.dueDate, job.status);
                        const locality = getLocality(job.property);

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
                                                alt={job.jobName}
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
                                                {job.product?.name || job.product} - {job.issue?.name || job.issue}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                {job.brand?.name || job.brand}
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
                                            {locality}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                        {job.assignedToName || 'Unassigned'}
                                    </span>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                        <Calendar size={14} style={{ color: overdue ? 'var(--color-danger)' : 'var(--text-tertiary)' }} />
                                        <span style={{ color: overdue ? 'var(--color-danger)' : 'var(--text-secondary)', fontWeight: overdue ? 600 : 400 }}>
                                            {job.dueDate ? new Date(job.dueDate).toLocaleDateString('en-GB') : '-'}
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



