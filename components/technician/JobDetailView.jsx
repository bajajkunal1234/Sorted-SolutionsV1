'use client';

import { useState, useEffect } from 'react';
import { X, Phone, MapPin, Clock, FileText, CheckSquare, Wrench, Menu, Activity, Send, FilePlus, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import JobInteractionsTab from '@/app/admin/components/jobs/JobInteractionsTab';
import SalesInvoiceForm from '@/app/admin/components/accounts/SalesInvoiceForm';
import QuotationForm from '@/app/admin/components/accounts/QuotationForm';
import { transactionsAPI } from '@/lib/adminAPI';
import { logInteraction } from '@/lib/interactions';

export default function JobDetailView({ job, onClose, onJobUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [editedJob, setEditedJob] = useState(job);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null); // 'quotation' | 'sales-invoice'
    const [isAddingNote, setIsAddingNote] = useState(false);

    // Fetch fresh job and interactions on mount
    useEffect(() => {
        const fetchFreshData = async () => {
            if (!job?.id) return;
            try {
                // Fetch fresh job + both interaction sources simultaneously
                const [jobRes, intRes, jobIntRes] = await Promise.all([
                    fetch(`/api/technician/jobs/${job.id}`),
                    fetch(`/api/admin/interactions?job_id=${job.id}`),
                    fetch(`/api/technician/jobs/${job.id}/interactions`),
                ]);
                const jobData = await jobRes.json();
                const intData = await intRes.json().catch(() => ({ data: [] }));
                const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));

                if (jobData.success) {
                    // Merge and sort both interaction sources
                    const allInt = [
                        ...(intData.data || []),
                        ...(jobIntData.data || []).map(ji => ({
                            ...ji,
                            performed_by_name: ji.user_name || ji.performed_by_name || 'Technician',
                            description: ji.message || ji.description || '',
                            timestamp: ji.created_at || ji.timestamp,
                        }))
                    ].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

                    setEditedJob({
                        ...jobData.job,
                        interactions: allInt
                    });
                }
            } catch (err) {
                console.error('Failed to load fresh job details', err);
            }
        };
        fetchFreshData();
    }, [job?.id]);

    if (!job) return null;

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'actions', label: 'Actions', icon: CheckSquare }
    ];

    const handleSaveStatus = async (newStatus) => {
        if (!newStatus || newStatus === editedJob.status) return;
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/technician/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    updated_by_name: techName,
                    source: 'Technician App',
                    _changeLog: [`Status changed: ${editedJob.status} → ${newStatus}`]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update status');

            // Log to global interactions (client-side, fire-and-forget)
            logInteraction({
                type: `job-status-${newStatus.replace(/[^a-z0-9]/gi, '-')}`,
                category: 'job',
                jobId: String(job.id),
                customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
                customerName: editedJob.customerName || editedJob.customer_name,
                description: `Status changed to "${newStatus}" by technician ${techName}`,
                performedByName: techName,
                source: 'Technician App',
            });

            setEditedJob(prev => ({ ...prev, status: newStatus }));
            if (onJobUpdate) onJobUpdate(data.job);
            alert('Status updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (note) => {
        setIsAddingNote(true);
        // Read name from local storage or passed technician data
        const storedTech = localStorage.getItem('technicianData');
        let techName = 'Technician';
        if (storedTech) {
            try { techName = JSON.parse(storedTech).name || techName; } catch(e){}
        } else if (editedJob.assigned_technician?.name) {
            techName = editedJob.assigned_technician.name;
        } else if (editedJob.technician_name) {
            techName = editedJob.technician_name;
        }

        try {
            // 1. Upload attachments first if any exist
            const uploadedUrls = [];
            if (note.attachments && note.attachments.length > 0) {
                for (const att of note.attachments) {
                    if (att.file) {
                        const formData = new FormData();
                        formData.append('file', att.file);
                        const uploadRes = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const uploadData = await uploadRes.json();
                        if (uploadData.success) {
                            uploadedUrls.push(uploadData.url);
                        }
                    } else if (att.url && !att.url.startsWith('blob:')) {
                        // Already uploaded URL
                        uploadedUrls.push(att.url);
                    }
                }
            }

            // 2. Save the interaction
            const payload = {
                job_id: editedJob.id,
                customer_id: editedJob.customerId || editedJob.customer_id || null,
                type: 'note-added',
                category: note.category || 'communication',
                description: note.description,
                performed_by_name: techName, // Ensures the By: field isn't generic
                source: 'Technician App',
                timestamp: new Date().toISOString(),
                metadata: { attachments: uploadedUrls },
            };

            const res = await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || `Server error ${res.status}`);
            }

            // 3. Prepend to local interactions list
            setEditedJob(prev => ({
                ...prev,
                interactions: [data.data, ...(prev.interactions || [])]
            }));
        } catch (err) {
            console.error('Failed to save note:', err);
            alert(`Failed to save note: ${err.message}`);
        } finally {
            setIsAddingNote(false);
        }
    };

    const handleEditNote = async (editedNote, editInteractionData) => {
        setIsAddingNote(true);
        // Get author name
        const storedTech = localStorage.getItem('technicianData');
        let techName = 'Technician';
        if (storedTech) {
            try { techName = JSON.parse(storedTech).name || techName; } catch(e){}
        } else if (editedJob.assigned_technician?.name) {
            techName = editedJob.assigned_technician.name;
        } else if (editedJob.technician_name) {
            techName = editedJob.technician_name;
        }

        try {
            // 1. Upload new attachments if any
            const uploadedUrls = [];
            if (editedNote.attachments && editedNote.attachments.length > 0) {
                for (const att of editedNote.attachments) {
                    if (att.file) {
                        const formData = new FormData();
                        formData.append('file', att.file);
                        const uploadRes = await fetch('/api/upload', {
                            method: 'POST',
                            body: formData
                        });
                        const uploadData = await uploadRes.json();
                        if (uploadData.success) {
                            uploadedUrls.push(uploadData.url);
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
                customer_id: editedJob.customerId || editedJob.customer_id || null,
                type: 'note-edited',
                category: editInteractionData.category || 'communication',
                description: editInteractionData.description,
                performed_by_name: techName,
                source: 'Technician App',
                timestamp: new Date().toISOString(),
                metadata: editInteractionData.metadata,
            };

            const postRes = await fetch('/api/admin/interactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(interactionPayload),
            });
            const postData = await postRes.json();
            
            if (!postRes.ok || !postData.success) {
                console.error("Failed to log edit interaction history:", postData.error);
                // We don't throw here because the main action (editing the note) succeeded
            }

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
        } finally {
            setIsAddingNote(false);
        }
    };

    const handleFormSave = async (data) => {
        try {
            const type = activeForm === 'quotation' ? 'quotation' : 'sales';
            await transactionsAPI.create(data, type);
            
            const docName = activeForm === 'quotation' ? 'Quotation' : 'Sales Voucher';
            const logDesc = `Generated ${docName} for ₹${data.total_amount || 0}`;
            await handleAddNote({
                description: logDesc,
                category: activeForm === 'quotation' ? 'communication' : 'sales',
                attachments: []
            });

            alert(`${docName} created successfully!`);
            setActiveForm(null);
        } catch (err) {
            alert(`Failed to create document: ${err.message}`);
        }
    };

    const handleMapClick = () => {
        logInteraction({
            type: 'map-navigation-opened',
            category: 'job',
            jobId: String(job.id),
            customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
            customerName: editedJob.customerName || editedJob.customer_name,
            description: `Technician opened maps navigation for job at: ${editedJob.address || editedJob.locality || 'customer location'}`,
            source: 'Technician App',
        });
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-primary)', width: '100%', height: '90vh',
                borderTopLeftRadius: 'var(--radius-xl)', borderTopRightRadius: 'var(--radius-xl)',
                display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease-out',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: 'var(--bg-elevated)', flexShrink: 0
                }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '4px' }}>
                            {editedJob.customerName || 'Customer'}
                        </h2>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Job #: {editedJob.job_number || editedJob.id.split('-')[0]} 
                            <span style={{ margin: '0 8px' }}>•</span>
                            <span style={{
                                color: editedJob.status === 'completed' ? '#10b981' : 
                                       editedJob.status === 'cancelled' ? '#ef4444' : '#f59e0b',
                                fontWeight: 600, textTransform: 'uppercase'
                            }}>{editedJob.status}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        padding: 'var(--spacing-xs)', backgroundColor: 'transparent',
                        border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)', overflowX: 'auto', flexShrink: 0
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '8px 16px', fontSize: '14px', fontWeight: 500,
                                    border: 'none', borderRadius: '20px', cursor: 'pointer',
                                    transition: 'all 0.2s ease', flexShrink: 0,
                                    backgroundColor: isActive ? '#3b82f6' : 'var(--bg-secondary)',
                                    color: isActive ? '#fff' : 'var(--text-primary)',
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)' }}>
                    {error && (
                        <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Customer Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Customer Info</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={16} color="var(--text-secondary)" />
                                        <a href={`tel:${editedJob.mobile}`} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>{editedJob.mobile}</a>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <MapPin size={16} color="var(--text-secondary)" style={{ marginTop: '2px' }} />
                                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.4 }}>
                                            {editedJob.address}
                                            {editedJob.locality && <span>, {editedJob.locality}</span>}
                                            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedJob.address)}`} 
                                               target="_blank" rel="noreferrer"
                                               onClick={handleMapClick}
                                               style={{ display: 'block', marginTop: '4px', color: '#3b82f6', fontSize: '12px', textDecoration: 'none' }}>
                                                Open in Maps
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Appliance Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Appliance Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Category</div>
                                        <div style={{ fontWeight: 500 }}>{editedJob.product?.type || editedJob.issueCategory || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Brand</div>
                                        <div style={{ fontWeight: 500 }}>{editedJob.product?.brand || 'N/A'}</div>
                                    </div>
                                    {editedJob.product?.name && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Model / Item</div>
                                            <div style={{ fontWeight: 500 }}>{editedJob.product.name}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Issue Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Issue Reported</h3>
                                <div style={{ fontWeight: 500, fontSize: '15px' }}>{editedJob.defect || 'General Service'}</div>
                                {editedJob.notes && (
                                    <div style={{ marginTop: '8px', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        {editedJob.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'interactions' && (() => {
                        const storedTech = localStorage.getItem('technicianData');
                        let techName = 'Technician';
                        if (storedTech) {
                            try { techName = JSON.parse(storedTech).name || techName; } catch(e){}
                        } else if (editedJob.assigned_technician?.name) {
                            techName = editedJob.assigned_technician.name;
                        } else if (editedJob.technician_name) {
                            techName = editedJob.technician_name;
                        }
                        
                        return (
                            <div className="card" style={{ minHeight: '100%', boxSizing: 'border-box' }}>
                                 {/* Re-use the Admin interactions tab component, it's perfect for this */}
                                 <JobInteractionsTab 
                                    jobId={editedJob.id}
                                    jobReference={editedJob.job_number}
                                    interactions={editedJob.interactions || []}
                                    onAddNote={handleAddNote}
                                    onEditNote={handleEditNote}
                                    onUpdate={() => {}} // Not strictly needed, local state updates handle it
                                    isSubmitting={isAddingNote}
                                    currentUserName={techName}
                                 />
                            </div>
                        );
                    })()}

                    {activeTab === 'actions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} color="#3b82f6" /> Job Status
                                </h3>
                                
                                <select 
                                    className="form-select" 
                                    value={editedJob.status}
                                    onChange={(e) => handleSaveStatus(e.target.value)}
                                    disabled={loading}
                                    style={{ width: '100%', marginBottom: '12px', padding: '12px', fontSize: '15px', fontWeight: 500 }}
                                >
                                    <option value="assigned">Assigned / Open</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="spare-part-needed">Spare Part Needed</option>
                                    <option value="quotation-sent">Quotation Sent</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Changing status automatically updates the admin timeline and notifies the team.</p>
                            </div>

                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FilePlus size={18} color="#10b981" /> Documents & Billing
                                </h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <button className="btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }} onClick={() => setActiveForm('quotation')}>
                                        <FileText size={18} style={{ marginRight: '8px' }} /> Create Quotation
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', backgroundColor: '#10b981', color: '#fff', border: 'none' }} onClick={() => setActiveForm('sales-invoice')}>
                                        <CheckCircle size={18} style={{ marginRight: '8px' }} /> Create Sales Voucher
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Document Generation Forms */}
            {activeForm === 'quotation' && (
                <QuotationForm 
                    onClose={() => setActiveForm(null)}
                    onSave={handleFormSave}
                    defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
                />
            )}
            {activeForm === 'sales-invoice' && (
                <SalesInvoiceForm 
                    onClose={() => setActiveForm(null)}
                    onSave={handleFormSave}
                    defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
                />
            )}
        </div>
    );
}
