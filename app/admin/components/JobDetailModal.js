'use client'

import { useState, useEffect } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, Tag, FileText, Image as ImageIcon, DollarSign, CheckSquare, Clock, Activity } from 'lucide-react';
import { formatDateTime, generatePreVisitChecklist, getLocalityFromAddress } from '@/lib/utils/helpers';
import JobInteractionsTab from './jobs/JobInteractionsTab';
import LogNoteItem from './LogNoteItem';
import SalesInvoiceForm from './accounts/SalesInvoiceForm';
import QuotationForm from './accounts/QuotationForm';
import { jobsAPI, interactionsAPI } from '@/lib/adminAPI';
import RepairCalculator from '@/components/common/RepairCalculator';
import QuotationWhatsAppPopup from '@/components/common/QuotationWhatsAppPopup';

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    // Initialize with passed job, but allowed to be updated by fetch
    const [editedJob, setEditedJob] = useState({ ...job });
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newNote, setNewNote] = useState({ description: '', files: [] });
    const [activeForm, setActiveForm] = useState(null); // 'quotation' | 'sales-invoice' | 'calculator'
    const [calculatorItems, setCalculatorItems] = useState(null); // pre-filled items from calculator
    const [savedQuotation, setSavedQuotation] = useState(null); // last saved quotation for this session
    const [showWhatsappPopup, setShowWhatsappPopup] = useState(false);

    const [technicians, setTechnicians] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [amcs, setAmcs] = useState([]);

    // Fetch fresh job data and technicians on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!job?.id) return;
            try {
                setLoading(true);
                const [freshJob, techRes, intRes, jobIntRes, quotaRes] = await Promise.all([
                    jobsAPI.getById(job.id),
                    fetch('/api/admin/technicians').then(r => r.json()).catch(() => ({ data: [] })),
                    // Global interactions table filtered by job_id
                    fetch(`/api/admin/interactions?job_id=${job.id}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
                    // Legacy job_interactions table
                    fetch(`/api/technician/jobs/${job.id}/interactions`).then(r => r.json()).catch(() => ({ data: [] })),
                    // Existing quotation
                    fetch(`/api/admin/transactions?type=quotation&job_id=${job.id}`).then(r => r.json()).catch(() => ({ data: [] }))
                ]);
                
                if (quotaRes?.success && quotaRes.data?.length > 0) {
                    setSavedQuotation(quotaRes.data[0]);
                }
                
                if (freshJob) {
                    // Fetch related rentals and AMCs for this customer
                    if (freshJob.customer_id) {
                        const [rentalsRes, amcsRes] = await Promise.all([
                            fetch(`/api/admin/rentals?type=active&customer_id=${freshJob.customer_id}`).then(r => r.json()).catch(() => ({ data: [] })),
                            fetch(`/api/admin/amc?type=active&customer_id=${freshJob.customer_id}`).then(r => r.json()).catch(() => ({ data: [] }))
                        ]);
                        if (rentalsRes?.success) setRentals(rentalsRes.data || []);
                        if (amcsRes?.success) setAmcs(amcsRes.data || []);
                    }
                    // Merge both interaction sources, deduplicate by id, sort by timestamp
                    const allInt = [
                        ...(intRes?.data || []),
                        ...(jobIntRes?.data || []).map(ji => ({
                            ...ji,
                            // Normalise job_interactions fields to global interactions format
                            performed_by_name: ji.user_name || ji.performed_by_name || 'System',
                            description: ji.message || ji.description || '',
                            timestamp: ji.created_at || ji.timestamp,
                        }))
                    ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

                    setEditedJob({
                        ...freshJob,
                        interactions: allInt
                    });
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
    // Note: Even if status is no longer 'booking_request', we still need to parse 
    // original booking details from notes if they exist.
    let bookingData = {};
    if (typeof editedJob.notes === 'string' && editedJob.notes.startsWith('{')) {
        try {
            bookingData = JSON.parse(editedJob.notes);
        } catch (e) { }
    }

    const displayPhone = customer.mobile || customer.phone || bookingData.customer?.phone || editedJob.customer_phone || 'N/A';
    const rawAddr = bookingData.customer?.address || {};
    const bookingAddr = rawAddr.locality ? `${rawAddr.apartment || ''}, ${rawAddr.street || ''}, ${rawAddr.locality}, ${rawAddr.city}`.replace(/^, /, '') : null;

    let jobAddress = 'No address';
    if (property.address) {
        if (typeof property.address === 'object' && property.address.line1) {
            jobAddress = `${property.address.line1}, ${property.address.locality || ''}`;
        } else {
            jobAddress = `${property.address}${property.locality ? ', ' + property.locality : ''}`;
        }
    } else if (bookingAddr) {
        jobAddress = bookingAddr;
    }

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'checklist', label: 'Pre-Visit', icon: CheckSquare },
        { id: 'actions', label: 'Billing/Actions', icon: Tag }
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
        
        if (editedJob.rental_id !== job.rental_id) {
            changes.push(`Linked Rental Agreement updated`);
        }
        if (editedJob.amc_id !== job.amc_id) {
            changes.push(`Linked AMC updated`);
        }

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
            rental_id: editedJob.rental_id || null,
            amc_id: editedJob.amc_id || null,
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
            // Upload new attachments if any
            const uploadedUrls = [];
            if (note.attachments && note.attachments.length > 0) {
                for (const att of note.attachments) {
                    if (att.file) {
                        try {
                            const formData = new FormData();
                            const safeFileName = att.file.name ? att.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') : 'image.jpg';
                            const finalFileName = safeFileName || 'upload.jpg';
                            formData.append('file', att.file, finalFileName);
                            const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (!uploadRes.ok) {
                                console.error('Upload failed with status:', uploadRes.status);
                                continue;
                            }
                            
                            const uploadData = await uploadRes.json();
                            if (uploadData.success) {
                                uploadedUrls.push(uploadData.url);
                            }
                        } catch (uploadErr) {
                            console.error('Upload error in modal:', uploadErr);
                            alert('Warning: Image failed to upload. The note will be saved without it. (Error: ' + uploadErr.message + ')');
                        }
                    } else if (att.url && !att.url.startsWith('blob:')) {
                        uploadedUrls.push(att.url);
                    }
                }
            }

            // POST directly to job-specific endpoint so job_id and customer_id are set correctly
            const res = await fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'note-added',
                    category: note.category || 'communication',
                    description: note.description,
                    customer_id: editedJob.customer_id || null,
                    customer_name: editedJob.customer_name || null,
                    user_name: 'Admin',
                    metadata: { attachments: uploadedUrls },
                }),
            });
            const result = await res.json();
            if (result.success && result.data) {
                setEditedJob(prev => ({
                    ...prev,
                    interactions: [result.data, ...(prev.interactions || [])]
                }));
            }
        } catch (err) {
            console.error('Failed to add note:', err);
            alert('Failed to save note. Please try again.');
        }
    };

    const handleEditNote = async (editedNote, editInteraction) => {
        try {
            // 1. Upload new attachments if any
            const uploadedUrls = [];
            if (editedNote.attachments && editedNote.attachments.length > 0) {
                for (const att of editedNote.attachments) {
                    if (att.file) {
                        try {
                            const formData = new FormData();
                            const safeFileName = att.file.name ? att.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') : 'image.jpg';
                            const finalFileName = safeFileName || 'upload.jpg';
                            formData.append('file', att.file, finalFileName);
                            const uploadRes = await fetch('/api/upload', {
                                method: 'POST',
                                body: formData
                            });
                            
                            if (!uploadRes.ok) {
                                console.error('Upload failed with status:', uploadRes.status);
                                continue;
                            }
                            
                            const uploadData = await uploadRes.json();
                            if (uploadData.success) {
                                uploadedUrls.push(uploadData.url);
                            }
                        } catch (uploadErr) {
                            console.error('Edit upload error in modal:', uploadErr);
                            alert('Warning: Image failed to upload. The note edit will continue without new images. (Error: ' + uploadErr.message + ')');
                        }
                    } else if (att.url && !att.url.startsWith('blob:')) {
                        uploadedUrls.push(att.url);
                    }
                }
            }

            // 2. Patch the original note
            const patchRes = await fetch('/api/admin/interactions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editedNote.id,
                    description: editedNote.description,
                    metadata: { ...editedNote.metadata, attachments: uploadedUrls }
                })
            });
            const patchData = await patchRes.json();
            if (!patchRes.ok || !patchData.success) {
                throw new Error(patchData.error || 'Failed to update note');
            }

            // 3. Insert the edit interaction history log
            const interactionPayload = {
                job_id: editedJob.id,
                customer_id: editedJob.customer_id || null,
                type: 'note-edited',
                category: editInteraction.category || 'communication',
                description: editInteraction.description,
                performed_by_name: 'Admin',
                source: 'Admin App',
                timestamp: new Date().toISOString(),
                metadata: editInteraction.metadata,
            };

            const postRes = await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interactionPayload),
            });
            const postData = await postRes.json();

            // 4. Update UI state directly by mapping and prepend new history log
            setEditedJob(prev => {
                const prevInts = prev.interactions || [];
                const updatedInts = prevInts.map(int => 
                    int.id === editedNote.id ? { ...int, description: patchData.data.description, metadata: patchData.data.metadata } : int
                );
                
                // If the post succeeded, prepend it
                if (postData.success) {
                    return { ...prev, interactions: [postData.data, ...updatedInts] };
                }
                
                return { ...prev, interactions: updatedInts };
            });

        } catch (err) {
            console.error('Failed to edit note:', err);
            alert(`Failed to edit note: ${err.message}`);
        }
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
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
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
                            
                            {/* Linked Agreements */}
                            <div className="card mb-md" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Linked Agreements</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Rental Agreement</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.rental_id || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, rental_id: e.target.value || null })}
                                            disabled={rentals.length === 0}
                                        >
                                            <option value="">— None —</option>
                                            {rentals.map(rental => (
                                                <option key={rental.id} value={rental.id}>
                                                    {rental.rental_plans?.product_name || 'Item'} (Started: {new Date(rental.start_date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        {rentals.length === 0 && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>No active rentals for this customer</div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">AMC Contract</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.amc_id || ''}
                                            onChange={(e) => setEditedJob({ ...editedJob, amc_id: e.target.value || null })}
                                            disabled={amcs.length === 0}
                                        >
                                            <option value="">— None —</option>
                                            {amcs.map(amc => (
                                                <option key={amc.id} value={amc.id}>
                                                    {amc.amc_plans?.name || 'Plan'} (Started: {new Date(amc.start_date).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        {amcs.length === 0 && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>No active AMCs for this customer</div>
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

                            {/* Service Feedback & Arrival — read-only, auto-shown when data exists */}
                            {(editedJob.arrived_at || editedJob.customer_rating) && (
                                <div className="card mb-md" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        Service Feedback &amp; Arrival
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: editedJob.arrived_at && editedJob.customer_rating ? '1fr 1fr' : '1fr', gap: 'var(--spacing-md)' }}>
                                        {editedJob.arrived_at && (() => {
                                            const arrivedDt = new Date(editedJob.arrived_at);
                                            let onTime = null;
                                            if (editedJob.scheduled_time && editedJob.scheduled_date) {
                                                const [hrs, mins] = (editedJob.scheduled_time || '').split(':').map(Number);
                                                const sched = new Date(editedJob.scheduled_date);
                                                sched.setHours(hrs || 0, mins || 0, 0, 0);
                                                onTime = arrivedDt <= new Date(sched.getTime() + 15 * 60 * 1000);
                                            }
                                            return (
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>TECHNICIAN ARRIVAL</div>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                        {arrivedDt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                                        {arrivedDt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </div>
                                                    {onTime !== null && (
                                                        <span style={{
                                                            fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                                            backgroundColor: onTime ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                            color: onTime ? '#10b981' : '#ef4444',
                                                            border: `1px solid ${onTime ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                                                        }}>
                                                            {onTime ? '✓ On Time' : '⚠ Late'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {editedJob.customer_rating && (() => {
                                            const rating = editedJob.customer_rating;
                                            const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'];
                                            const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];
                                            return (
                                                <div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>CUSTOMER RATING</div>
                                                    <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
                                                        {[1,2,3,4,5].map(s => (
                                                            <span key={s} style={{ fontSize: '18px', color: s <= rating ? colors[rating] : 'var(--border-primary)' }}>
                                                                {s <= rating ? '★' : '☆'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: colors[rating], marginBottom: '4px' }}>
                                                        {rating}/5 — {labels[rating]}
                                                    </div>
                                                    {editedJob.rating_note && (
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '6px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                                                            "{editedJob.rating_note}"
                                                        </div>
                                                    )}
                                                    {editedJob.rated_at && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                                            Rated {new Date(editedJob.rated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            )}

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

                    {activeTab === 'actions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} color="#3b82f6" /> Status & Priority
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Job Status</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.status}
                                            onChange={(e) => setEditedJob({ ...editedJob, status: e.target.value })}
                                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                                        >
                                            <option value="booking_request">Booking Request</option>
                                            <option value="assigned">Assigned</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="quotation-sent">Quotation Sent</option>
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
                                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                                        >
                                            <option value="urgent">🔴 Urgent</option>
                                            <option value="high">🟡 High</option>
                                            <option value="normal">🟢 Normal</option>
                                            <option value="low">⚪ Low</option>
                                        </select>
                                    </div>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Status changes will be logged in the timeline when you Save Changes.</p>
                            </div>

                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Tag size={18} color="#10b981" /> Documents & Billing
                                </h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <button
                                        className="btn"
                                        style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 700, fontSize: '15px' }}
                                        onClick={() => setActiveForm('calculator')}
                                    >
                                        🧮 Calculate Repair Estimate
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', backgroundColor: savedQuotation ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)', color: savedQuotation ? '#8b5cf6' : 'var(--text-primary)', border: savedQuotation ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-primary)' }} onClick={() => { setActiveForm('quotation'); }}>
                                        <FileText size={18} style={{ marginRight: '8px' }} /> {savedQuotation ? '✏️ Edit Quotation' : 'Create Quotation (Blank)'}
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', backgroundColor: '#10b981', color: '#fff', border: 'none' }} onClick={() => setActiveForm('sales-invoice')}>
                                        <CheckSquare size={18} style={{ marginRight: '8px' }} /> Create Sales Voucher
                                    </button>
                                </div>
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

            {/* Document Generation Forms overlaid over the modal */}
            {activeForm === 'calculator' && (
                <RepairCalculator
                    job={editedJob}
                    onClose={() => setActiveForm(null)}
                    onCreateQuotation={(items) => {
                        setCalculatorItems(items);
                        setActiveForm('quotation');
                    }}
                />
            )}
            {activeForm === 'quotation' && (
                <QuotationForm 
                    onClose={() => { setActiveForm(null); setCalculatorItems(null); }}
                    onSave={async (data) => {
                        // 1. Save quotation to DB properly
                        const type = 'quotation';
                        let savedData = data;
                        try {
                            const saveRes = await fetch(`/api/admin/transactions?type=${type}`, {
                                method: data.id ? 'PUT' : 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...data, job_id: editedJob.id })
                            });
                            const saveJson = await saveRes.json();
                            if (saveJson.success) savedData = saveJson.data;
                        } catch (e) { console.error('Failed to save quotation to DB', e); }

                        // 2. Save quotation in local state
                        setSavedQuotation(savedData);
                        // 3. Auto-update job status → quotation-sent
                        try {
                            await fetch(`/api/admin/jobs`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: editedJob.id, status: 'quotation-sent' })
                            });
                            setEditedJob(prev => ({ ...prev, status: 'quotation-sent' }));
                        } catch (e) { console.error('Status update failed', e); }
                        // 4. Log to interactions
                        fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'quotation-created', category: 'billing', description: `Quotation ${savedData?.quote_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`, user_name: 'Admin', customer_id: editedJob.customer_id || null })
                        }).catch(() => {});
                        // 5. Close form and show WhatsApp popup
                        setActiveForm(null);
                        setCalculatorItems(null);
                        setShowWhatsappPopup(true);
                    }}
                    defaultAccount={job.customer_id ? { id: job.customer_id } : null}
                    prefillItems={calculatorItems}
                    existingQuotation={savedQuotation}
                />
            )}
            {activeForm === 'sales-invoice' && (
                <SalesInvoiceForm 
                    onClose={() => setActiveForm(null)}
                    onSave={async (data) => {
                        // 1. Save sales invoice to DB
                        let savedData = data;
                        try {
                            const saveRes = await fetch(`/api/admin/transactions?type=sales`, {
                                method: data.id ? 'PUT' : 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...data, job_id: editedJob.id })
                            });
                            const saveJson = await saveRes.json();
                            if (saveJson.success) savedData = saveJson.data;
                        } catch (e) { console.error('Failed to save sales invoice to DB', e); }

                        // 2. Log invoice creation to job interactions timeline
                        fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Sales invoice ${savedData?.invoice_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`, user_name: 'Admin', customer_id: editedJob.customer_id || null })
                        }).catch(() => {});
                        setActiveForm(null);
                    }}
                    defaultAccount={job.customer_id ? { id: job.customer_id } : null}
                    prefillItems={savedQuotation?.items || calculatorItems}
                />
            )}
            {showWhatsappPopup && (
                <QuotationWhatsAppPopup
                    quotation={savedQuotation}
                    job={{ ...editedJob, customer_phone: editedJob.customer?.mobile || editedJob.customer?.phone || editedJob.customer_phone }}
                    onClose={() => setShowWhatsappPopup(false)}
                />
            )}
        </div>
    );
}

export default JobDetailModal;
