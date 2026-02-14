'use client'

import { useState, useEffect } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, Tag, FileText, Image as ImageIcon, Bell, DollarSign, CheckSquare, Clock } from 'lucide-react';
import { formatDateTime, generatePreVisitChecklist, getLocalityFromAddress } from '@/lib/utils/helpers';
import JobInteractionsTab from './jobs/JobInteractionsTab';
import LogNoteItem from './LogNoteItem';
import { jobsAPI, interactionsAPI } from '@/lib/adminAPI';

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    // Initialize with passed job, but allowed to be updated by fetch
    const [editedJob, setEditedJob] = useState({ ...job });
    const [loading, setLoading] = useState(false);
    const [newNote, setNewNote] = useState({ description: '', files: [] });
    const [newReminder, setNewReminder] = useState({ type: '', datetime: '', message: '' });

    // Fetch fresh job data on mount to get latest interactions/notes
    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!job?.id) return;
            try {
                setLoading(true);
                // Assume getById returns the full job object with joins
                const freshJob = await jobsAPI.getById(job.id);
                if (freshJob) {
                    setEditedJob(freshJob);
                }
            } catch (err) {
                console.error('Error fetching job details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchJobDetails();
    }, [job?.id]);

    // Helper to get nested or direct values safely
    const customer = editedJob.customer || {};
    const property = editedJob.property || {};
    const product = editedJob.product || {};
    const brand = editedJob.brand || {};
    const issue = editedJob.issue || {};
    const technician = editedJob.technician || {};

    // Fallback for fields that might be directly on the job object or in relations
    const technicianName = technician.name || editedJob.technician_name || 'Unassigned';
    const jobTitle = editedJob.description || editedJob.job_number || 'Job Details';
    const jobAddress = property.address ?
        (property.address.line1 ? `${property.address.line1}, ${property.address.locality || ''}` : property.address) :
        'No address';

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'reminders', label: 'Reminders', icon: Bell },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'checklist', label: 'Pre-Visit', icon: CheckSquare }
    ];

    const handleSave = () => {
        // Create an update object with only changed fields if possible, 
        // but for now passing the edited job structure. 
        // Ensure we don't accidentally send back relations if the API doesn't handle them.
        const updatePayload = {
            id: editedJob.id,
            status: editedJob.status,
            priority: editedJob.priority,
            // Add other editable fields here if needed
        };
        onUpdate(updatePayload);
    };

    const handleAddNote = async (note) => {
        try {
            const payload = {
                job_id: editedJob.id,
                type: 'note-added',
                category: note.category || 'communication',
                description: note.description,
                user_name: 'Admin', // In real app, get from auth context
                attachments: note.attachments
            };

            const createdInteraction = await interactionsAPI.create(payload);

            if (createdInteraction) {
                setEditedJob(prev => ({
                    ...prev,
                    interactions: [...(prev.interactions || []), createdInteraction]
                }));
            }
        } catch (err) {
            console.error('Failed to add note:', err);
            alert('Failed to save note. Please try again.');
        }
    };

    const handleEditNote = (editedNote, editInteraction) => {
        // For now, this just updates local state. 
        // TODO: Implement API for editing interactions
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
                    <div>
                        <h2 className="modal-title">{jobTitle}</h2>
                        {editedJob.job_number && (
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Job #: {editedJob.job_number}
                            </p>
                        )}
                    </div>
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
                                    fontSize: '14px',
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
                                        <strong>Name:</strong> {customer.name || editedJob.customer_name}
                                    </div>
                                    {property && (
                                        <div>
                                            <strong>Property:</strong> {property.property_name || property.label || property.name || 'Property'}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                        <Phone size={16} />
                                        <a href={`tel:${customer.phone}`} style={{ color: 'var(--color-primary)' }}>
                                            {customer.phone || 'N/A'}
                                        </a>
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                                        <MapPin size={16} style={{ marginTop: '2px' }} />
                                        <a
                                            href={jobAddress !== 'No address' ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobAddress)}` : '#'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--color-primary)' }}
                                            onClick={(e) => jobAddress === 'No address' && e.preventDefault()}
                                        >
                                            {jobAddress}
                                        </a>
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ width: 'fit-content' }}
                                        onClick={() => {
                                            // Close this modal
                                            onClose();
                                            // Switch to Accounts tab and open customer account
                                            // This will be handled by parent component
                                            if (window.openCustomerAccount && customer) {
                                                window.openCustomerAccount(customer);
                                            }
                                        }}
                                    >
                                        <DollarSign size={16} />
                                        View Cx Account
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
                                            value={`${product.name || editedJob.appliance || ''} - ${brand.name || editedJob.brand || ''}`}
                                            readOnly
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Issue</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={issue.title || issue.name || editedJob.issue || ''}
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
                                            value={technicianName}
                                            readOnly
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Opening Date</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatDateTime(editedJob.created_at)}
                                                readOnly
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Scheduled Date</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatDateTime(editedJob.scheduled_date)}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                    {editedJob.priority && (
                                        <div className="form-group">
                                            <label className="form-label">Priority</label>
                                            <span className={`tag ${editedJob.priority === 'high' ? 'tag-vip' : 'tag-neutral'}`} style={{ textTransform: 'capitalize' }}>
                                                {editedJob.priority}
                                            </span>
                                        </div>
                                    )}
                                    {editedJob.notes && (
                                        <div className="form-group">
                                            <label className="form-label">Notes</label>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {editedJob.notes}
                                            </p>
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
                            jobReference={editedJob.job_number}
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
