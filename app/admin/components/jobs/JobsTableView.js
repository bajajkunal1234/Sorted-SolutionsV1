'use client'

import { Calendar, User, MapPin, AlertCircle } from 'lucide-react';
import { getInitials, getLocalityFromAddress } from '@/lib/utils/helpers';

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
                        const isBooking = job.status === 'booking_request';
                        const statusColor = getStatusColor(job.status);
                        // Handle camelCase vs snake_case
                        const dueDate = job.scheduled_date || job.dueDate;
                        const overdue = isOverdue(dueDate, job.status);
                        const locality = getLocalityFromAddress(job.property?.address);
                        const technicianName = job.technician?.name || job.assignedToName || 'Unassigned';
                        const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';

                        let bd = {};
                        if (isBooking) {
                            try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
                        }

                        return (
                            <tr
                                key={job.id}
                                onClick={() => onJobClick?.(job)}
                                style={{
                                    borderBottom: '1px solid var(--border-primary)',
                                    transition: 'background-color var(--transition-fast)',
                                    cursor: 'pointer',
                                    borderLeft: isBooking ? '3px solid #f59e0b' : 'none',
                                    backgroundColor: isBooking ? 'rgba(245,158,11,0.03)' : 'transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isBooking ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isBooking ? 'rgba(245,158,11,0.03)' : 'transparent'}
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
                                            {isBooking && (
                                                <div style={{ color: '#f59e0b', fontSize: '9px', fontWeight: 800, marginBottom: '2px' }}>
                                                    WEBSITE BOOKING
                                                </div>
                                            )}
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
                                            {job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}
                                        </div>
                                        {(job.customer?.phone || (isBooking && bd.customer?.phone)) && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                {job.customer?.phone || bd.customer?.phone}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <span>{locality || (isBooking ? bd.customer?.address?.locality : 'No location')}</span>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    {isBooking ? (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Waiting</span>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 600 }}>
                                                {getInitials(technicianName)}
                                            </div>
                                            <span>{technicianName}</span>
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={overdue && !isBooking ? { color: 'var(--color-danger)', fontWeight: 600 } : {}}>
                                            {isBooking
                                                ? bd.schedule?.date || 'Asap'
                                                : dueDate ? new Date(dueDate).toLocaleDateString() : 'No date'
                                            }
                                        </span>
                                        {overdue && !isBooking && <AlertCircle size={14} color="var(--color-danger)" />}
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    {isBooking ? (
                                        <button className="btn btn-primary" style={{ fontSize: '10px', padding: '2px 8px', backgroundColor: '#f59e0b', border: 'none' }}>
                                            Create & Assign
                                        </button>
                                    ) : (
                                        <span style={{
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 600,
                                            backgroundColor: `${statusColor}20`,
                                            color: statusColor,
                                            textTransform: 'capitalize'
                                        }}>
                                            {job.status.replace('-', ' ')}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {jobs.length === 0 && (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    No jobs found.
                </div>
            )}
        </div>
    );
}

export default JobsTableView;
