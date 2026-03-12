'use client'

import { useState, useEffect } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, FileText, Bell, DollarSign, CheckSquare, Clock, UserCheck, AlertCircle } from 'lucide-react';
import JobInteractionsTab from '@/components/jobs/JobInteractionsTab';

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [editedJob, setEditedJob] = useState({ ...job });
    const [technicians, setTechnicians] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'interactions', label: 'Interactions', icon: Clock },
    ];

    // Load technicians list for the dropdown
    useEffect(() => {
        fetch('/api/admin/technicians')
            .then(r => r.json())
            .then(data => {
                if (data.success && Array.isArray(data.data)) {
                    setTechnicians(data.data);
                }
            })
            .catch(() => {});
    }, []);

    const handleSave = async () => {
        setSaving(true);
        setSaveError('');

        // Build a human-readable changelog for the interaction log
        const changes = [];

        if (editedJob.status !== job.status) {
            changes.push(`Status changed: ${job.status} → ${editedJob.status}`);
        }
        if (editedJob.technician_id !== job.technician_id) {
            const tech = technicians.find(t => t.id === editedJob.technician_id);
            const oldTech = technicians.find(t => t.id === job.technician_id);
            const toName = tech?.name || editedJob.technician_id || 'Unassigned';
            const fromName = oldTech?.name || (job.technician_id ? job.technician_id : 'Unassigned');
            changes.push(`Technician reassigned: ${fromName} → ${toName}`);
            // Store technician name alongside ID for display
            editedJob.technician_name = tech?.name || '';
        }
        if (editedJob.priority !== job.priority) {
            changes.push(`Priority changed: ${job.priority} → ${editedJob.priority}`);
        }
        if ((editedJob.scheduled_date || '') !== (job.scheduled_date || '')) {
            changes.push(`Scheduled date updated to ${editedJob.scheduled_date || 'none'}`);
        }
        if ((editedJob.scheduled_time || '') !== (job.scheduled_time || '')) {
            changes.push(`Scheduled time updated to ${editedJob.scheduled_time || 'none'}`);
        }
        if ((editedJob.notes || '') !== (job.notes || '')) {
            changes.push('Notes updated');
        }

        try {
            await onUpdate({ ...editedJob, _changeLog: changes, updated_by: 'Admin' });
            onClose();
        } catch (err) {
            setSaveError(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const jobAddress = () => {
        const prop = job.property || {};
        if (prop.address && typeof prop.address === 'object') {
            return `${prop.address.line1 || ''}, ${prop.address.locality || ''}, ${prop.address.pincode || ''}`.replace(/^,\s*/, '');
        }
        return typeof prop.address === 'string' ? prop.address : prop.locality || job.description || '';
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px', width: '95%' }}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title" style={{ marginBottom: '2px' }}>
                            {job.job_number ? `#${job.job_number}` : 'Job Details'}
                        </h2>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            {job.customer_name || 'Unknown Customer'} · {job.category || ''} {job.appliance || ''}
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', overflowX: 'auto' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', fontSize: 'var(--font-size-xs)', fontWeight: 500,
                                    border: 'none', borderRadius: '20px', cursor: 'pointer',
                                    transition: 'all 0.2s ease', whiteSpace: 'nowrap',
                                    backgroundColor: isActive ? '#6366f1' : 'var(--bg-secondary)',
                                    color: isActive ? '#ffffff' : 'var(--text-primary)',
                                }}
                            >
                                <Icon size={16} />{tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>

                    {activeTab === 'details' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>

                            {/* Customer Info Card */}
                            <div className="card">
                                <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Customer
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                    <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)' }}>{job.customer_name || 'Unknown'}</div>
                                    {(job.customer?.phone || job.customer?.mobile) && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)' }}>
                                            <Phone size={14} color="var(--text-secondary)" />
                                            <a href={`tel:${job.customer?.phone || job.customer?.mobile}`} style={{ color: 'var(--color-primary)' }}>
                                                {job.customer?.phone || job.customer?.mobile}
                                            </a>
                                        </div>
                                    )}
                                    {jobAddress() && (
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: 'var(--font-size-sm)' }}>
                                            <MapPin size={14} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobAddress())}`}
                                                target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--color-primary)' }}
                                            >
                                                {jobAddress()}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Editable Job Fields */}
                            <div className="card">
                                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Job Details (Editable)
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>

                                    {/* Status */}
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.status || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, status: e.target.value })}
                                        >
                                            <option value="open">Open</option>
                                            <option value="booking_request">Booking Request</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

                                    {/* Priority */}
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.priority || 'normal'}
                                            onChange={(e) => setEditedJob({ ...editedJob, priority: e.target.value })}
                                        >
                                            <option value="urgent">🔴 Urgent</option>
                                            <option value="high">🟡 High</option>
                                            <option value="normal">🟢 Normal</option>
                                            <option value="low">⚪ Low</option>
                                        </select>
                                    </div>

                                    {/* Assigned Technician */}
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">
                                            <UserCheck size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            Assigned Technician
                                        </label>
                                        <select
                                            className="form-select"
                                            value={editedJob.technician_id || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, technician_id: e.target.value || null })}
                                        >
                                            <option value="">— Unassigned —</option>
                                            {technicians.map(tech => (
                                                <option key={tech.id} value={tech.id}>
                                                    {tech.name} ({tech.phone || tech.username || tech.id.slice(0, 8)})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Scheduled Date */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            Scheduled Date
                                        </label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={editedJob.scheduled_date || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, scheduled_date: e.target.value })}
                                        />
                                    </div>

                                    {/* Scheduled Time */}
                                    <div className="form-group">
                                        <label className="form-label">Scheduled Time</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.scheduled_time || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, scheduled_time: e.target.value })}
                                        >
                                            <option value="">Select time slot</option>
                                            <option value="09:00 AM - 11:00 AM">09:00 AM – 11:00 AM</option>
                                            <option value="11:00 AM - 01:00 PM">11:00 AM – 01:00 PM</option>
                                            <option value="01:00 PM - 03:00 PM">01:00 PM – 03:00 PM</option>
                                            <option value="03:00 PM - 05:00 PM">03:00 PM – 05:00 PM</option>
                                            <option value="05:00 PM - 07:00 PM">05:00 PM – 07:00 PM</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Notes */}
                                <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                                    <label className="form-label">Notes / Instructions</label>
                                    <textarea
                                        className="form-input"
                                        rows={3}
                                        style={{ resize: 'vertical' }}
                                        placeholder="Add any notes or internal instructions..."
                                        value={editedJob.notes || ''}
                                        onChange={(e) => setEditedJob({ ...editedJob, notes: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Read-only appliance info */}
                            <div className="card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Appliance Info
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Category: </span>{job.category || '—'}</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Appliance: </span>{job.appliance || job.subcategory || '—'}</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Brand: </span>{job.brand || '—'}</div>
                                    <div><span style={{ color: 'var(--text-secondary)' }}>Model: </span>{job.model || '—'}</div>
                                    <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--text-secondary)' }}>Issue: </span>{job.issue || '—'}</div>
                                </div>
                            </div>

                        </div>
                    )}

                    {activeTab === 'interactions' && (
                        <JobInteractionsTab
                            jobId={editedJob.id}
                            jobReference={editedJob.job_number}
                            interactions={editedJob.interactions || []}
                            onAddNote={() => {}}
                            onEditNote={() => {}}
                            onUpdate={() => {}}
                        />
                    )}
                </div>

                {/* Error */}
                {saveError && (
                    <div style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: 'var(--font-size-sm)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <AlertCircle size={14} />{saveError}
                    </div>
                )}

                {/* Footer — only show Save on details tab */}
                {activeTab === 'details' && (
                    <div className="modal-footer">
                        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            <Save size={16} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default JobDetailModal;
