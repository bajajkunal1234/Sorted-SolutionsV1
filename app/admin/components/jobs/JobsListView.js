'use client'

import { Calendar, User, MapPin, AlertCircle, Clock } from 'lucide-react';
import { getInitials, getLocalityFromAddress } from '@/lib/utils/helpers';

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
                    const isBooking = job.status === 'booking_request';
                    const statusColor = getStatusColor(job.status);
                    // Handle camelCase vs snake_case
                    const dueDate = job.scheduled_date || job.dueDate;
                    const overdue = isOverdue(dueDate, job.status);
                    const locality = getLocalityFromAddress(job.property?.address);
                    const technicianName = job.technician?.name || job.assignedToName;
                    const jobTitle = job.description || job.jobName || job.job_number || 'Untitled Job';
                    const priority = job.priority;

                    let bd = {};
                    if (isBooking) {
                        try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
                    }

                    return (
                        <div
                            key={job.id}
                            onClick={() => onJobClick?.(job)}
                            style={{
                                backgroundColor: 'var(--bg-elevated)',
                                border: isBooking ? '2px solid #f59e0b' : '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--spacing-md)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-md)',
                                position: 'relative',
                                overflow: 'visible'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                e.currentTarget.style.borderColor = isBooking ? '#f59e0b' : 'var(--color-primary)';
                                e.currentTarget.style.backgroundColor = isBooking ? 'rgba(245,158,11,0.08)' : 'var(--bg-secondary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = isBooking ? '#f59e0b' : 'var(--border-primary)';
                                e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
                            }}
                        >
                            {isBooking && (
                                <div style={{ position: 'absolute', top: '-10px', left: '20px', backgroundColor: '#f59e0b', color: 'white', padding: '2px 8px', fontSize: '10px', fontWeight: 800, borderRadius: '4px', zIndex: 1 }}>
                                    NEW WEBSITE BOOKING
                                </div>
                            )}

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
                                    {/* Customer */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <User size={14} />
                                        <span>{job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}</span>
                                    </div>

                                    {/* Location */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={14} />
                                        <span>{locality || (isBooking ? bd.customer?.address?.locality : 'No location')}</span>
                                    </div>

                                    {/* Due Date */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={14} />
                                        <span style={overdue && !isBooking ? { color: 'var(--color-danger)', fontWeight: 600 } : {}}>
                                            {isBooking
                                                ? `${bd.schedule?.date || ''} ${bd.schedule?.slot ? `(${bd.schedule.slot})` : ''}`.trim() || 'No schedule'
                                                : dueDate ? new Date(dueDate).toLocaleDateString('en-GB') : 'No date'
                                            }
                                        </span>
                                    </div>

                                    {/* Technician */}
                                    {!isBooking && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 600 }}>
                                                {getInitials(technicianName || 'U')}
                                            </div>
                                            <span>{technicianName || 'Unassigned'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status or Button */}
                            <div style={{ flexShrink: 0 }}>
                                {isBooking ? (
                                    <button className="btn btn-primary" style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#f59e0b', border: 'none' }}>
                                        Create & Assign
                                    </button>
                                ) : (
                                    <div style={{
                                        padding: '4px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 600,
                                        backgroundColor: `${statusColor}20`,
                                        color: statusColor,
                                        textTransform: 'capitalize'
                                    }}>
                                        {job.status.replace('-', ' ')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {jobs.length === 0 && (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No jobs found.
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobsListView;
