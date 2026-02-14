'use client'

import { useState } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, Tag, FileText, Image, Bell, DollarSign, CheckSquare, Clock } from 'lucide-react';
import { formatDateTime, generatePreVisitChecklist, getLocalityFromAddress } from '@/utils/helpers';
import JobInteractionsTab from '@/components/jobs/JobInteractionsTab';
import LogNoteItem from './LogNoteItem';

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [editedJob, setEditedJob] = useState({ ...job });
    const [newNote, setNewNote] = useState({ description: '', files: [] });
    const [newReminder, setNewReminder] = useState({ type: '', datetime: '', message: '' });

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'reminders', label: 'Reminders', icon: Bell },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'checklist', label: 'Pre-Visit', icon: CheckSquare }
    ];

    const handleSave = () => {
        onUpdate(editedJob);
    };

    const handleAddNote = (note) => {
        const updatedJob = {
            ...editedJob,
            interactions: [...(editedJob.interactions || []), note]
        };
        setEditedJob(updatedJob);
    };

    const handleEditNote = (editedNote, editInteraction) => {
        const updatedInteractions = editedJob.interactions.map(interaction =>
            interaction.id === editedNote.id ? editedNote : interaction
        );

        const updatedJob = {
            ...editedJob,
            interactions: [...updatedInteractions, editInteraction]
        };
        setEditedJob(updatedJob);
    };

    const handleInteractionsUpdate = () => {
        // Callback for when transactions are edited
        // In real implementation, this would refresh data from backend
        console.log('Interactions updated');
    };

    const handleAddReminder = () => {
        if (!newReminder.type || !newReminder.datetime) return;

        const reminder = {
            id: Date.now().toString(),
            type: newReminder.type,
            datetime: newReminder.datetime,
            message: newReminder.message,
            createdBy: 'Admin',
            createdAt: new Date().toISOString()
        };

        setEditedJob({
            ...editedJob,
            reminders: [...(editedJob.reminders || []), reminder]
        });

        setNewReminder({ type: '', datetime: '', message: '' });
    };

    const preVisitChecklist = generatePreVisitChecklist(editedJob);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">{job.jobName}</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    overflowX: 'auto'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 16px',
                                    fontSize: 'var(--font-size-xs)',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    backgroundColor: isActive ? '#10b981' : 'var(--bg-secondary)',
                                    color: isActive ? '#ffffff' : 'var(--text-primary)',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                <div className="modal-body">
                    {activeTab === 'details' && (
                        <div>
                            {/* Customer Info */}
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Customer Information</h3>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <strong>Name:</strong> {job.customer?.name}
                                    </div>
                                    {job.property && (
                                        <div>
                                            <strong>Property:</strong> {job.property.label || job.property.name || 'Property'}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                        <Phone size={16} />
                                        <a href={`tel:${job.customer?.phone}`} style={{ color: 'var(--color-primary)' }}>
                                            {job.customer?.phone}
                                        </a>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                                        <MapPin size={16} style={{ marginTop: '2px' }} />
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.property?.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--color-primary)' }}
                                        >
                                            {job.property?.address?.line1
                                                ? `${job.property.address.line1}, ${job.property.address.locality}, ${job.property.address.pincode}`
                                                : job.property?.address || 'No address specified'}
                                        </a>
                                    </div>
                                    <button className="btn btn-secondary" style={{ width: 'fit-content' }}>
                                        <DollarSign size={16} />
                                        View Customer Ledger
                                    </button>
                                </div>
                            </div>

                            {/* Job Details */}
                            <div className="card mb-md">
                                <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Job Details</h3>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Product</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={`${job.product?.name} - ${job.brand?.name}`}
                                            readOnly
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Issue</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={job.issue?.name}
                                            readOnly
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.status}
                                            onChange={(e) => setEditedJob({ ...editedJob, status: e.target.value })}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assigned To</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={job.assignedToName}
                                            readOnly
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Opening Date</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatDateTime(job.openingDate)}
                                                readOnly
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Due Date</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatDateTime(job.dueDate)}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    {job.tags && job.tags.length > 0 && (
                                        <div>
                                            <label className="form-label">Tags</label>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                                {job.tags.map(tag => (
                                                    <span key={tag} className={`tag ${tag === 'VIP' ? 'tag-vip' : 'tag-aged'}`}>
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'reminders' && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Reminders</h3>

                            {/* Add Reminder Form */}
                            <div className="card mb-md">
                                <div className="form-group">
                                    <label className="form-label">Reminder Type</label>
                                    <select
                                        className="form-select"
                                        value={newReminder.type}
                                        onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value })}
                                    >
                                        <option value="">Select type...</option>
                                        <option value="visit">Visit Time Reminder</option>
                                        <option value="invoice">Invoice Reminder</option>
                                        <option value="sms">Send SMS (Promotional/Feedback)</option>
                                        <option value="followup">Follow-up Reminder</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={newReminder.datetime}
                                        onChange={(e) => setNewReminder({ ...newReminder, datetime: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Message (Optional)</label>
                                    <textarea
                                        className="form-textarea"
                                        placeholder="Additional notes for this reminder..."
                                        value={newReminder.message}
                                        onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                                    />
                                </div>
                                <button className="btn btn-primary" onClick={handleAddReminder}>
                                    <Bell size={16} />
                                    Add Reminder
                                </button>
                            </div>

                            {/* Reminders List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {editedJob.reminders && editedJob.reminders.length > 0 ? (
                                    editedJob.reminders.map(reminder => (
                                        <div key={reminder.id} className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                <div>
                                                    <strong style={{ textTransform: 'capitalize' }}>{reminder.type} Reminder</strong>
                                                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>
                                                        <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                                        {formatDateTime(reminder.datetime)}
                                                    </div>
                                                    {reminder.message && (
                                                        <p style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)' }}>
                                                            {reminder.message}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                                        No reminders set. Add a reminder above.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'interactions' && (
                        <JobInteractionsTab
                            jobId={editedJob.id}
                            jobReference={editedJob.reference}
                            interactions={editedJob.interactions || []}
                            onAddNote={handleAddNote}
                            onEditNote={handleEditNote}
                            onUpdate={handleInteractionsUpdate}
                        />
                    )}

                    {activeTab === 'checklist' && (
                        <div>
                            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Pre-Visit Requirements</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                                Items the technician should carry for this visit:
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {preVisitChecklist.map(item => (
                                    <div
                                        key={item.id}
                                        className="card"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-md)',
                                            padding: 'var(--spacing-md)',
                                            backgroundColor: item.priority === 'high' ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-elevated)'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={() => { }}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ flex: 1, fontWeight: item.priority === 'high' ? 600 : 400 }}>
                                            {item.item}
                                            {item.priority === 'high' && (
                                                <span style={{ color: 'var(--color-danger)', marginLeft: 'var(--spacing-xs)' }}>
                                                    (Priority)
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

export default JobDetailModal;





