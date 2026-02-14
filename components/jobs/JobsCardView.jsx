'use client'

import { Calendar, MapPin, User, AlertCircle } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

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

    // Extract locality from property address
    const getLocality = (property) => {
        if (!property || !property.address) return '';
        const parts = property.address.split(',');
        return parts.length >= 2 ? parts[parts.length - 3]?.trim() || parts[0] : parts[0];
    };

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 'var(--spacing-md)'
        }}>
            {jobs.map(job => {
                const statusColor = getStatusColor(job.status);
                const overdue = isOverdue(job.dueDate, job.status);
                const locality = getLocality(job.property);

                return (
                    <div
                        key={job.id}
                        onClick={() => onJobClick?.(job)}
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }}
                    >
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
                        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
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
                                {job.product?.name || job.product} - {job.issue?.name || job.issue}
                            </h3>

                            {/* Customer */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                <User size={14} color="var(--text-secondary)" />
                                <div>
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                        {job.customer?.name || job.customer}
                                    </span>
                                    {job.property && (
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginLeft: 'var(--spacing-xs)' }}>
                                            • {job.property.label || job.property.name || 'Property'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Location */}
                            {locality && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <MapPin size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {locality}
                                    </span>
                                </div>
                            )}

                            {/* Due Date */}
                            {job.dueDate && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                        {new Date(job.dueDate).toLocaleDateString()}
                                    </span>
                                </div>
                            )}

                            {/* Tags */}
                            {job.tags && job.tags.length > 0 && (
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                    {job.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                padding: '2px 6px',
                                                fontSize: 'var(--font-size-xs)',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: tag === 'VIP' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                color: tag === 'VIP' ? 'var(--color-secondary)' : 'var(--color-warning)',
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
                                {/* Technician */}
                                {job.assignedToName && (
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
                                            {getInitials(job.assignedToName)}
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {job.assignedToName}
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



