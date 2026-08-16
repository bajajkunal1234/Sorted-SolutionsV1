'use client'

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle, Calculator, Phone } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/lib/utils/helpers';
const getTechnicianColor = (name) => {
    if (!name || name === 'Unassigned') {
        return 'linear-gradient(135deg, #64748b, #475569)';
    }
    const cleanName = name.toLowerCase().trim();
    if (cleanName.includes('kunal') || cleanName.includes('bajaj') || cleanName === 'kb') {
        return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    }
    if (cleanName.includes('vinod') || cleanName.includes('gupta') || cleanName === 'vg') {
        return 'linear-gradient(135deg, #ec4899, #be185d)';
    }
    if (cleanName.includes('sandeep') || cleanName.includes('yadav')) {
        return 'linear-gradient(135deg, #10b981, #047857)';
    }
    if (cleanName.includes('arjun') || cleanName.includes('ruby')) {
        return 'linear-gradient(135deg, #f97316, #c2410c)';
    }
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 65%, 45%), hsl(${(hue + 35) % 360}, 70%, 35%))`;
};

const getLocalityColor = (locality) => {
    if (!locality) return 'var(--text-secondary)';
    const cleanLoc = locality.toLowerCase().trim();
    if (cleanLoc.includes('aarey')) {
        return '#fbbf24';
    }
    if (cleanLoc.includes('goregaon east')) {
        return '#38bdf8';
    }
    if (cleanLoc.includes('goregaon west')) {
        return '#818cf8';
    }
    if (cleanLoc.includes('bandra')) {
        return '#f472b6';
    }
    if (cleanLoc.includes('kandivali')) {
        return '#34d399';
    }
    let hash = 0;
    for (let i = 0; i < locality.length; i++) {
        hash = locality.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 85%, 75%)`;
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
        position: 'relative',
        overflow: 'hidden',
        ...(job.priority === 'urgent' ? {
            border: '2px solid #ef4444',
            boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.15)'
        } : {})
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

    const assignedDate = new Date(job.assignedAt || job.createdAt || job.created_at);
    const diffMs = Date.now() - assignedDate.getTime();
    const hoursCrossed = Math.max(0, Math.floor(diffMs / (3600 * 1000)));
    let ribbonColor = '#3b82f6';
    if (hoursCrossed >= 25 && hoursCrossed <= 48) {
        ribbonColor = '#f97316';
    } else if (hoursCrossed > 48) {
        ribbonColor = '#ef4444';
    }

    const isRequest = job.status === 'booking_request' || job.status === 'new_job_request' || job.status === 'enquiry';
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

    const resolvedLocality = (isRequest && bd.customer?.address?.locality) || locality || '';
    const resolvedJobName = (isRequest && bd.categoryName) || jobName;
    const resolvedCustomerName = customerName || bd.customer?.name || '';
    const resolvedCustomerPhone = customerPhone || bd.customer?.phone || bd.customer?.mobile || '';
    const displayDueDate = dueDate ? formatDate(dueDate) : (day || '');
    const resolvedOverdue = dueDate ? isOverdue(dueDate) : false;

    const isRepeat = job.warranty || String(job.description || '').toLowerCase().startsWith('repeat');
    const isOver100Hours = hoursCrossed >= 100;

    const cardStyle = {
        ...style,
        position: 'relative',
        overflow: 'hidden',
        ...(isRepeat ? {
            backgroundColor: 'rgba(249, 115, 22, 0.08)',
            border: '1px solid rgba(249, 115, 22, 0.25)'
        } : {}),
        ...(isOver100Hours ? {
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
        } : {}),
        ...(isRequest ? { border: `2px solid ${primaryColor}`, backgroundColor: bgColor } : {}),
        ...(job.priority === 'urgent' ? {
            border: '2px solid #ef4444',
            boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.15)'
        } : {})
    };

    console.log('[JobCard]', job.job_number, { status: job.status, technicianName, resolvedCustomerPhone, mapQuery, displayDueDate, resolvedOverdue });

    return (
        <div
            ref={setNodeRef}
            style={cardStyle}
            {...attributes}
            {...listeners}
            className="job-card"
            onClick={onClick}
        >
            {/* Top banner if request */}
            {isRequest && (
                <div style={{ backgroundColor: primaryColor, color: 'white', padding: '4px 8px', fontSize: '11px', fontWeight: 700, borderRadius: '4px 4px 0 0', margin: '-12px -12px 10px -12px', textAlign: 'center', marginBottom: '8px' }}>
                    {titleText}
                </div>
            )}

            {/* Hours Crossed Ribbon */}
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: ribbonColor,
                color: '#ffffff',
                padding: '3px 8px',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '0 0 0 8px',
                zIndex: 2
            }}>
                {hoursCrossed} hrs
            </div>

            {/* Thumbnail */}
            {job.thumbnail && (
                <img
                    src={job.thumbnail}
                    alt={jobType}
                    className="job-card-thumbnail"
                />
            )}

            {/* Job Title */}
            <h4 className="job-card-title" style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>
                {resolvedJobName}
                {jobType && jobType !== resolvedJobName ? <span style={{ fontWeight: 400, fontSize: '11px', color: 'var(--text-secondary)' }}> &mdash; {jobType}</span> : null}
            </h4>

            {/* Customer Name */}
            {resolvedCustomerName && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{resolvedCustomerName}</span>
                    {resolvedCustomerPhone && (
                        <a
                            href={`tel:${resolvedCustomerPhone}`}
                            title={`Call ${resolvedCustomerName}`}
                            onClick={e => e.stopPropagation()}
                            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)', transition: 'all 0.15s', cursor: 'pointer', flexShrink: 0 }}
                        >
                            <Phone size={10} />
                        </a>
                    )}
                </div>
            )}

            {/* Locality */}
            <div className="job-card-info" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <div className="job-card-info-item" style={{ fontSize: '13px', fontWeight: 'bold', color: getLocalityColor(resolvedLocality), display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>
                    <MapPin size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolvedLocality || 'No location'}</span>
                </div>
                {mapQuery && (
                    <a
                        href={hasCoords
                            ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
                            : `https://www.google.com/maps/search/${encodeURIComponent(mapQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Google Maps"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.25)', transition: 'all 0.15s', cursor: 'pointer', flexShrink: 0 }}
                    >
                        <MapPin size={10} />
                    </a>
                )}
            </div>

            {/* Request CTA Button */}
            {isRequest && (
                <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '12px', padding: '6px', fontSize: '12px', backgroundColor: primaryColor, border: 'none', marginBottom: '8px' }}
                >
                    {isCustomerApp ? 'Assign Technician' : 'Create & Assign'}
                </button>
            )}

            {/* Footer */}
            <div className="job-card-footer">
                <div className="job-card-assignee" style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative' }}>
                    <div 
                        className="assignee-avatar" 
                        title={technicianName}
                        style={{ background: getTechnicianColor(technicianName) }}
                    >
                        {getInitials(technicianName)}
                    </div>
                    {job.priority_note && (
                        <div style={{
                            backgroundColor: '#ffffff',
                            color: '#000000',
                            border: '1.5px solid #000000',
                            borderRadius: '12px 12px 12px 1px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            zIndex: 10
                        }}>
                            ☁️ {job.priority_note}
                        </div>
                    )}
                </div>

                {resolvedOverdue ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <div className="job-card-badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} />
                            <span>{displayDueDate} - Overdue</span>
                        </div>
                        {isRepeat && (
                            <div className="job-card-badge" style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', textTransform: 'capitalize' }}>
                                🔁 Repeat
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {displayDueDate && (
                            <div className="job-card-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <Calendar size={12} />
                                <span>{displayDueDate} {isRequest && slot ? `(${slot})` : ''}</span>
                            </div>
                        )}
                        {job.priority && (
                            <div className={`job-card-badge ${job.priority === 'high' ? 'tag-vip' : 'tag-aged'}`} style={{ textTransform: 'capitalize' }}>
                                {job.priority}
                            </div>
                        )}
                        {isRepeat && (
                            <div className="job-card-badge" style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.3)', textTransform: 'capitalize' }}>
                                🔁 Repeat
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobCard;
