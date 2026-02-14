'use client'

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/lib/utils/helpers';

function JobCard({ job, onClick }) {
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
    const jobTitle = job.description || job.job_number || 'Untitled Job';
    const dueDate = job.scheduled_date || job.dueDate; // Fallback to camelCase if needed, but prefer snake_case

    const locality = getLocalityFromAddress(property.address);
    const overdue = isOverdue(dueDate);

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
                    alt={jobTitle}
                    className="job-card-thumbnail"
                />
            )}

            {/* Job Name */}
            <h4 className="job-card-title">{jobTitle}</h4>

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
        </div>
    );
}

export default JobCard;
