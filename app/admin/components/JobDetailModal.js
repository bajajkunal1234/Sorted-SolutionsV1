'use client'

import { useState, useEffect } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, Tag, FileText, Image as ImageIcon, DollarSign, CheckSquare, Clock } from 'lucide-react';
import { formatDateTime, generatePreVisitChecklist, getLocalityFromAddress } from '@/lib/utils/helpers';
import JobInteractionsTab from './jobs/JobInteractionsTab';
import LogNoteItem from './LogNoteItem';
import { jobsAPI, interactionsAPI } from '@/lib/adminAPI';

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    // Initialize with passed job, but allowed to be updated by fetch
    const [editedJob, setEditedJob] = useState({ ...job });
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newNote, setNewNote] = useState({ description: '', files: [] });


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

    // Parse notes if it's a booking request to get temp address/phone
    let bookingData = {};
    if (editedJob.status === 'booking_request' && editedJob.notes) {
        try {
            bookingData = JSON.parse(editedJob.notes);
        } catch (e) { }
    }

    const displayPhone = customer.phone || bookingData.customer?.phone || editedJob.customer_phone || 'N/A';
    const rawAddr = bookingData.customer?.address || {};
    const bookingAddr = rawAddr.locality ? `${rawAddr.apartment || ''}, ${rawAddr.street || ''}, ${rawAddr.locality}, ${rawAddr.city}`.replace(/^, /, '') : null;

    const jobAddress = property.address ?
        (property.address.line1 ? `${property.address.line1}, ${property.address.locality || ''}` : property.address) :
        (bookingAddr || 'No address');

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'checklist', label: 'Pre-Visit', icon: CheckSquare }
    ];

    const handleSave = () => {
        const updatePayload = {
            id: editedJob.id,
            description: editedJob.description,   // job name
            status: editedJob.status,
            priority: editedJob.priority,
        };
        onUpdate(updatePayload);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete job "${editedJob.description || editedJob.job_number}"? This cannot be undone.`)) return;
        try {
            setDeleting(true);
            await jobsAPI.delete(editedJob.id);
            onUpdate('deleted');
            onClose();
        } catch (err) {
            alert('Failed to delete job: ' + err.message);
        } finally {
            setDeleting(false);
        }
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
                                        <a href={`tel:${displayPhone}`} style={{ color: 'var(--color-primary)' }}>
                                            {displayPhone}
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
                                        <label className="form-label">Job Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedJob.description || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, description: e.target.value })}
                                            placeholder="e.g., LG Double Door Bandra West"
                                        />
                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
                                            Brand · Sub-Type · Locality
                                        </div>
                                    </div>
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
                                            <div style={{ padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(editedJob.notes);
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <div><strong>Service:</strong> {parsed.categoryName} {parsed.subcategoryName ? `> ${parsed.subcategoryName}` : ''}</div>
                                                                <div><strong>Issue:</strong> {parsed.issueName || 'Not specified'}</div>
                                                                {parsed.description && <div><strong>Description:</strong> {parsed.description}</div>}
                                                                {parsed.schedule && (
                                                                    <div><strong>Preferred Schedule:</strong> {parsed.schedule.date} {parsed.schedule.slot ? `(${parsed.schedule.slot})` : ''}</div>
                                                                )}
                                                            </div>
                                                        );
                                                    } catch (e) {
                                                        return editedJob.notes;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                </div>
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
                    <button
                        className="btn"
                        onClick={handleDelete}
                        disabled={deleting}
                        style={{ marginRight: 'auto', backgroundColor: '#ef444415', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 'var(--radius-sm)', padding: '6px 14px', cursor: deleting ? 'not-allowed' : 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {deleting ? '🗑 Deleting...' : '🗑 Delete Job'}
                    </button>
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
