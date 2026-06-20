'use client'

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle, Calculator, Phone } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/lib/utils/helpers';
const getTechnicianColor = (name) => {
    if (!name || name === 'Unassigned') {
        return 'linear-gradient(135deg, #64748b, #475569)';
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 65%, 45%), hsl(${(hue + 35) % 360}, 70%, 35%))`;
};

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
    // Job name: prefer description (admin-entered), then category, then appliance
    const jobName = job.description || job.category || job.subcategory || job.appliance || job.job_number || 'Service Job';
    const jobType = job.category || job.appliance || job.subcategory || '';
    const customerName = job.customer_name || job.customer?.name || '';
    const customerPhone = job.customer?.phone || job.customer?.mobile || job.customer_phone || '';
    const dueDate = job.scheduled_date || job.dueDate;

    // Resolve full address from all possible property formats
    const resolveFullAddress = (prop, customerAccount) => {
        if (!prop) return { street: '', locality: '' };

        // Try to enrich from customer.properties by ID
        let enriched = prop;
        const accountProps = customerAccount?.properties;
        if (Array.isArray(accountProps) && prop.id) {
            const match = accountProps.find(p => String(p.id) === String(prop.id));
            if (match) enriched = { ...prop, ...match };
        }

        // NewAccountForm format: flat_number, building_name, address (street)
        if (enriched.flat_number || enriched.building_name) {
            const street = [enriched.flat_number, enriched.building_name, enriched.address].filter(Boolean).join(', ');
            return { street, locality: enriched.locality || enriched.city || '' };
        }
        // PropertyForm format: address: { line1, locality, city }
        if (enriched.address && typeof enriched.address === 'object') {
            const addr = enriched.address;
            const street = [addr.apartment, addr.building, addr.line2, addr.line1].filter(Boolean).join(', ');
            return { street: street || '', locality: addr.locality || addr.city || '' };
        }
        // Flat string
        return {
            street: typeof enriched.address === 'string' ? enriched.address : '',
            locality: enriched.locality || enriched.city || ''
        };
    };

    const { locality } = resolveFullAddress(property, job.customer);
    const mapQuery = locality || customerName;
    const hasCoords = property.latitude && property.longitude;

    const overdue = isOverdue(dueDate);

    if (job.status === 'booking_request' || job.status === 'new_job_request' || job.status === 'enquiry') {
        const isEnquiry = job.status === 'enquiry' || job.source === 'website_enquiry' || job.source === 'Website Organic';
        const isCustomerApp = job.source === 'customer_app';
        const isWebsiteBooking = job.source === 'website_booking' || job.source === 'website';
        let bd = {};
        try { bd = JSON.parse(job.notes || '{}'); } catch (e) { }
        const slot = bd.schedule?.slot || job.scheduled_time || '';
        const day = bd.schedule?.date || (job.scheduled_date ? formatDate(job.scheduled_date) : '');

        const primaryColor = isEnquiry ? '#ef4444' : isCustomerApp ? '#3b82f6' : '#f59e0b';
        const bgColor = isEnquiry ? 'rgba(239,68,68,0.05)' : isCustomerApp ? 'rgba(59,130,246,0.05)' : 'rgba(245,158,11,0.05)';
        const titleText = isEnquiry ? '🔴 WEBSITE ENQUIRY' : isCustomerApp ? '🔵 CUSTOMER APP BOOKING' : '🟢 WEBSITE BOOKING';

        return (
            <div
                ref={setNodeRef}
                style={{ ...style, border: `2px solid ${primaryColor}`, backgroundColor: bgColor }}
                {...attributes}
                {...listeners}
                className="job-card"
                onClick={onClick}
            >
                <div style={{ backgroundColor: primaryColor, color: 'white', padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '4px 4px 0 0', margin: '-12px -12px 10px -12px', textAlign: 'center' }}>
                    {titleText}
                </div>
                <h4 className="job-card-title">{bd.categoryName || jobType}</h4>
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
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '12px', backgroundColor: primaryColor, border: 'none' }}
                >
                    {isCustomerApp ? 'Assign Technician' : 'Create & Assign'}
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

            {/* Job Name (description as primary title) */}
            <h4 className="job-card-title" style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>
                {jobName}
                {jobType && jobType !== jobName ? <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)' }}> &mdash; {jobType}</span> : null}
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
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span>{locality || 'No location'}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="job-card-footer">
                <div className="job-card-assignee">
                    <div 
                        className="assignee-avatar" 
                        title={technicianName}
                        style={{ background: getTechnicianColor(technicianName) }}
                    >
                        {getInitials(technicianName)}
                    </div>
                </div>

                {overdue ? (
                    <div className="job-card-badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{formatDate(dueDate)} - Overdue</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {dueDate && (
                            <div className="job-card-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <Calendar size={12} />
                                <span>{formatDate(dueDate)}</span>
                            </div>
                        )}
                        {job.priority && (
                            <div className={`job-card-badge ${job.priority === 'high' ? 'tag-vip' : 'tag-aged'}`} style={{ textTransform: 'capitalize' }}>
                                {job.priority}
                            </div>
                        )}
                    </div>
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
