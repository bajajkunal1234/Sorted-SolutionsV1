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

    const [technicians, setTechnicians] = useState([]);

    // Fetch fresh job data and technicians on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!job?.id) return;
            try {
                setLoading(true);
                const [freshJob, techRes] = await Promise.all([
                    jobsAPI.getById(job.id),
                    fetch('/api/admin/technicians').then(r => r.json()).catch(() => ({ data: [] }))
                ]);
                if (freshJob) {
                    setEditedJob(freshJob);
                }
                if (techRes?.success && Array.isArray(techRes.data)) {
                    setTechnicians(techRes.data);
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
        // Build changelog for interaction tracking
        const changes = [];
        if (editedJob.status !== job.status) changes.push(`Status changed: ${job.status} → ${editedJob.status}`);
        if (editedJob.priority !== job.priority) changes.push(`Priority changed: ${job.priority || 'normal'} → ${editedJob.priority || 'normal'}`);
        if (editedJob.technician_id !== job.technician_id) {
            const tech = technicians.find(t => t.id === editedJob.technician_id);
            const oldTech = technicians.find(t => t.id === job.technician_id);
            changes.push(`Technician reassigned: ${oldTech?.name || job.technician_name || 'Unassigned'} → ${tech?.name || 'Unassigned'}`);
            if (tech) editedJob.technician_name = tech.name;
        }
        if ((editedJob.scheduled_date || '') !== (job.scheduled_date || '')) changes.push(`Scheduled date updated to ${editedJob.scheduled_date || 'none'}`);
        if ((editedJob.scheduled_time || '') !== (job.scheduled_time || '')) changes.push(`Scheduled time updated to ${editedJob.scheduled_time || 'none'}`);
        if ((editedJob.notes || '') !== (job.notes || '')) changes.push('Notes updated');

        const updatePayload = {
            id: editedJob.id,
            description: editedJob.description,
            status: editedJob.status,
            priority: editedJob.priority,
            technician_id: editedJob.technician_id || null,
            technician_name: editedJob.technician_name,
            scheduled_date: editedJob.scheduled_date,
            scheduled_time: editedJob.scheduled_time,
            notes: editedJob.notes,
            _changeLog: changes
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Job Name / Description</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editedJob.description || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, description: e.target.value })}
                                            placeholder="e.g., LG Double Door Bandra West"
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
                                            <option value="booking_request">Booking Request</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>

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

                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Assigned Technician</label>
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

                                    <div className="form-group">
                                        <label className="form-label">Scheduled Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={editedJob.scheduled_date || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, scheduled_date: e.target.value })}
                                        />
                                    </div>

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

                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Notes / Instructions</label>
                                        <textarea
                                            className="form-input"
                                            rows={3}
                                            style={{ resize: 'vertical' }}
                                            placeholder="Add any internal notes or instructions for the technician..."
                                            value={typeof editedJob.notes === 'string' && !editedJob.notes.startsWith('{') ? editedJob.notes : (editedJob.description_notes || '')}
                                            onChange={(e) => setEditedJob({ ...editedJob, notes: e.target.value })}
                                        />
                                        {/* Show initial booking notes if they were JSON structured */}
                                        {editedJob.notes && editedJob.notes.startsWith('{') && (
                                            <div style={{ padding: '8px', marginTop: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border-primary)' }}>
                                                <strong>Original Booking Info:</strong>
                                                <pre style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-secondary)' }}>
                                                    {(() => {
                                                        try {
                                                            const p = JSON.parse(editedJob.notes);
                                                            return `${p.categoryName || ''} > ${p.subcategoryName || ''}\nIssue: ${p.issueName || ''}\n${p.description ? 'Desc: ' + p.description : ''}`;
                                                        } catch(e) { return editedJob.notes; }
                                                    })()}
                                                </pre>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                            
                            <div className="card mb-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Appliance Info (Read Only)</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <input type="text" className="form-input" value={product.name || editedJob.category || editedJob.appliance || ''} readOnly />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Brand</label>
                                        <input type="text" className="form-input" value={brand.name || editedJob.brand || ''} readOnly />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label className="form-label">Issue</label>
                                        <input type="text" className="form-input" value={issue.title || issue.name || editedJob.issue || ''} readOnly />
                                    </div>
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
