import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/utils/helpers';

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

    const locality = getLocalityFromAddress(job.property?.address);
    const overdue = isOverdue(job.dueDate);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="job-card"
            onClick={onClick}
        >
            {/* Thumbnail */}
            {job.thumbnail && (
                <img
                    src={job.thumbnail}
                    alt={job.jobName}
                    className="job-card-thumbnail"
                />
            )}

            {/* Job Name */}
            <h4 className="job-card-title">{job.jobName}</h4>

            {/* Info */}
            <div className="job-card-info">
                <div className="job-card-info-item">
                    <MapPin size={14} />
                    <span>{locality}</span>
                </div>

                <div className="job-card-info-item">
                    <User size={14} />
                    <span>{job.assignedToName}</span>
                </div>

                {job.dueDate && (
                    <div className="job-card-info-item">
                        <Calendar size={14} />
                        <span>{formatDate(job.dueDate)}</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="job-card-footer">
                <div className="job-card-assignee">
                    <div className="assignee-avatar">
                        {getInitials(job.assignedToName)}
                    </div>
                </div>

                {overdue ? (
                    <div className="job-card-badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        Overdue
                    </div>
                ) : (
                    job.tags && job.tags.length > 0 && (
                        <div className={`job-card-badge ${job.tags[0] === 'VIP' ? 'tag-vip' : 'tag-aged'}`}>
                            {job.tags[0]}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default JobCard;




