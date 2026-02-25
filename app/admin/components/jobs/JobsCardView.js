'use client'

import { Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import { getInitials, getLocalityFromAddress } from '@/lib/utils/helpers';

function JobsCardView({ jobs, onJobClick }) {
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
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--spacing-md)'
        }}>
            {jobs.map(job => {
                const isBooking = job.status === 'booking_request';
                const statusColor = getStatusColor(job.status);
                // Handle different field names (camelCase vs snake_case)
                const dueDate = job.scheduled_date || job.dueDate;
                const overdue = isOverdue(dueDate, job.status);
                const locality = getLocalityFromAddress(job.property?.address);
                const technicianName = job.technician?.name || job.assignedToName || 'Unassigned';
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
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            e.currentTarget.style.borderColor = isBooking ? '#f59e0b' : 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = isBooking ? '#f59e0b' : 'var(--border-primary)';
                        }}
                    >
                        {isBooking && (
                            <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 8px', fontSize: '10px', fontWeight: 800, textAlign: 'center' }}>
                                NEW WEBSITE BOOKING
                            </div>
                        )}
                        {/* Thumbnail */}
                        {job.thumbnail && (
                            <div style={{
                                width: '100%',
                                height: '140px',
                                backgroundColor: 'var(--bg-secondary)',
                                backgroundImage: `url(${job.thumbnail})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative'
                            }}>
                                {overdue && (
                                    <div style={{
                                        position: 'absolute',
                                        top: 'var(--spacing-xs)',
                                        right: 'var(--spacing-xs)',
                                        padding: '4px 8px',
                                        backgroundColor: 'var(--color-danger)',
                                        color: 'var(--text-inverse)',
                                        fontSize: 'var(--font-size-xs)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 600,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <AlertCircle size={12} />
                                        OVERDUE
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Content */}
                        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', flex: 1 }}>
                            {/* Title */}
                            <h3 style={{
                                fontSize: 'var(--font-size-base)',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '2px',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {jobTitle}
                            </h3>

                            {/* Product Info Subtitle */}
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                {job.product?.name || job.product} - {job.brand?.name || job.brand} ({job.issue?.name || job.issue})
                            </div>

                            {/* Customer */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                <User size={14} color="var(--text-secondary)" />
                                <div>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                        {job.customer?.name || job.customer || (isBooking ? (bd.customer?.name || 'New Customer') : 'Walk-in')}
                                    </span>
                                    {job.property && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginLeft: 'var(--spacing-xs)' }}>
                                            • {job.property.label || job.property.name || 'Property'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Location */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {locality || (isBooking ? bd.customer?.address?.locality : 'No location')}
                                </span>
                            </div>

                            {/* Due Date / Slot */}
                            {(dueDate || isBooking) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {isBooking
                                            ? `${bd.schedule?.date || ''} ${bd.schedule?.slot ? `(${bd.schedule.slot})` : ''}`.trim() || 'No schedule'
                                            : new Date(dueDate).toLocaleDateString()
                                        }
                                    </span>
                                </div>
                            )}

                            {/* Priority / Tags */}
                            {(priority || (job.tags && job.tags.length > 0)) && (
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
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

                            {/* Footer */}
                            <div style={{
                                paddingTop: 'var(--spacing-sm)',
                                borderTop: '1px solid var(--border-primary)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: 'auto'
                            }}>
                                {isBooking ? (
                                    <button className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '6px', backgroundColor: '#f59e0b', border: 'none' }}>
                                        Create & Assign
                                    </button>
                                ) : (
                                    <>
                                        {/* Technician */}
                                        {technicianName && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                                <div style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-inverse)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600
                                                }}>
                                                    {getInitials(technicianName)}
                                                </div>
                                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    {technicianName}
                                                </span>
                                            </div>
                                        )}

                                        {/* Status Badge */}
                                        <div style={{
                                            padding: '4px 10px',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 600,
                                            backgroundColor: `${statusColor}20`,
                                            color: statusColor,
                                            textTransform: 'capitalize'
                                        }}>
                                            {job.status.replace('-', ' ')}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {jobs.length === 0 && (
                <div style={{
                    gridColumn: '1 / -1',
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

export default JobsCardView;
