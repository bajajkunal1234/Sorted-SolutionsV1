'use client'

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle, Calculator, Phone } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/lib/utils/helpers';

function JobCard({ job, onClick, onCalculate }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: job.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // Safe accessors for Supabase data
    const property = job.property || {};
    const technicianName = job.technician?.name || job.technician_name || 'Unassigned';
    const jobType = job.category || job.subcategory || job.appliance || job.description || job.job_number || 'Service Job';
    const jobSubtype = job.subcategory && job.subcategory !== jobType ? job.subcategory : null;
    const customerName = job.customer_name || job.customer?.name || '';
    const customerPhone = job.customer?.phone || job.customer?.mobile || job.customer_phone || '';
    const dueDate = job.scheduled_date || job.dueDate;

    // Location: try multiple sources
    const propAddress = property.address || {};
    const locality = (typeof propAddress === 'object' ? propAddress.locality : null)
        || getLocalityFromAddress(property.address)
        || (typeof propAddress === 'string' ? propAddress : '')
        || property.locality
        || property.city
        || '';
    const mapQuery = locality || customerName;
    const hasCoords = property.latitude && property.longitude;

    const overdue = isOverdue(dueDate);

    if (job.status === 'booking_request') {
        let bd = {};
        try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
        const slot = bd.schedule?.slot || job.scheduled_time || '';
        const day = bd.schedule?.date || (job.scheduled_date ? formatDate(job.scheduled_date) : '');

        return (
            <div
                ref={setNodeRef}
                style={{ ...style, border: '2px solid #f59e0b', backgroundColor: 'rgba(245,158,11,0.05)' }}
                {...attributes}
                {...listeners}
                className="job-card"
                onClick={onClick}
            >
                <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '4px 4px 0 0', margin: '-12px -12px 10px -12px', textAlign: 'center' }}>
                    NEW WEBSITE BOOKING
                </div>
                <h4 className="job-card-title">{jobType}</h4>
                {customerName && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>{customerName}</div>}
                <div className="job-card-info">
                    <div className="job-card-info-item">
                        <MapPin size={14} />
                        <span>{bd.customer?.address?.locality || locality || 'No location'}</span>
                    </div>
                    {(day || slot) && (
                        <div className="job-card-info-item">
                            <Calendar size={14} />
                            <span>{day} {slot ? `(${slot})` : ''}</span>
                        </div>
                    )}
                </div>
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '12px', backgroundColor: '#f59e0b', border: 'none' }}
                >
                    Create & Assign
                </button>
            </div>
        );
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="job-card"
            onClick={onClick}
        >
            {/* Thumbnail - (Only if available in schema/data) */}
            {job.thumbnail && (
                <img
                    src={job.thumbnail}
                    alt={jobType}
                    className="job-card-thumbnail"
                />
            )}

            {/* Job Name (Category as primary title) */}
            <h4 className="job-card-title" style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>
                {jobType}
                {jobSubtype && <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}> — {jobSubtype}</span>}
            </h4>

            {/* Customer Name */}
            {customerName && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px' }}>
                    {customerName}
                </div>
            )}

            {/* Info */}
            <div className="job-card-info">
                <div className="job-card-info-item">
                    <MapPin size={14} />
                    <span>{locality || 'No location'}</span>
                </div>

                <div className="job-card-info-item">
                    <User size={14} />
                    <span>{technicianName}</span>
                </div>

                {dueDate && (
                    <div className="job-card-info-item">
                        <Calendar size={14} />
                        <span>{formatDate(dueDate)}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="job-card-footer">
                <div className="job-card-assignee">
                    <div className="assignee-avatar" title={technicianName}>
                        {getInitials(technicianName)}
                    </div>
                </div>

                {overdue ? (
                    <div className="job-card-badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        Overdue
                    </div>
                ) : (
                    job.priority && (
                        <div className={`job-card-badge ${job.priority === 'high' ? 'tag-vip' : 'tag-aged'}`} style={{ textTransform: 'capitalize' }}>
                            {job.priority}
                        </div>
                    )
                )}
            </div>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: '5px', marginTop: '8px' }} onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => onCalculate && onCalculate(job)}
                    style={{ flex: 1, padding: '5px 4px', backgroundColor: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                >
                    <Calculator size={11} /> Estimate
                </button>
                {customerPhone && (
                    <a
                        href={`tel:${customerPhone}`}
                        style={{ flex: 1, padding: '5px 4px', backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none' }}
                    >
                        <Phone size={11} /> Call
                    </a>
                )}
                {mapQuery && (
                    <a
                        href={hasCoords
                            ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
                            : `https://www.google.com/maps/search/${encodeURIComponent(mapQuery)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ flex: 1, padding: '5px 4px', backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', textDecoration: 'none' }}
                    >
                        <MapPin size={11} /> Map
                    </a>
                )}
            </div>
        </div>
    );
}

export default JobCard;
