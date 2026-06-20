import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MapPin, User, Calendar, AlertCircle } from 'lucide-react';
import { getLocalityFromAddress, formatDate, getInitials, isOverdue } from '@/utils/helpers';

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
                <div className="job-card-info-item" style={{ color: getLocalityColor(locality) }}>
                    <MapPin size={14} />
                    <span>{locality}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="job-card-footer">
                <div className="job-card-assignee">
                    <div 
                        className="assignee-avatar"
                        style={{ background: getTechnicianColor(job.assignedToName) }}
                    >
                        {getInitials(job.assignedToName)}
                    </div>
                </div>

                {overdue ? (
                    <div className="job-card-badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{formatDate(job.dueDate)} - Overdue</span>
                    </div>
                ) : (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {job.dueDate && (
                            <div className="job-card-badge" style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                <Calendar size={12} />
                                <span>{formatDate(job.dueDate)}</span>
                            </div>
                        )}
                        {job.tags && job.tags.length > 0 && (
                            <div className={`job-card-badge ${job.tags[0] === 'VIP' ? 'tag-vip' : 'tag-aged'}`}>
                                {job.tags[0]}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobCard;




