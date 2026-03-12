'use client';

import { useState, useEffect } from 'react';
import { X, Phone, MapPin, Clock, FileText, CheckSquare, Wrench, Menu, Activity, Send, FilePlus, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import JobInteractionsTab from '@/app/admin/components/jobs/JobInteractionsTab';
import SalesInvoiceForm from '@/app/admin/components/accounts/SalesInvoiceForm';
import QuotationForm from '@/app/admin/components/accounts/QuotationForm';
import { transactionsAPI } from '@/lib/adminAPI';

export default function JobDetailView({ job, onClose, onJobUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [editedJob, setEditedJob] = useState(job);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null); // 'quotation' | 'sales-invoice'

    // Fetch fresh job and interactions on mount
    useEffect(() => {
        const fetchFreshData = async () => {
            if (!job?.id) return;
            try {
                // Fetch fresh job
                const jobRes = await fetch(`/api/technician/jobs/${job.id}`);
                const jobData = await jobRes.json();
                
                // Fetch interactions
                const intRes = await fetch(`/api/technician/jobs/${job.id}/interactions`);
                const intData = await intRes.json();
                
                if (jobData.success) {
                    setEditedJob({
                        ...jobData.job,
                        interactions: intData.data || []
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
        { id: 'interactions', label: 'Timeline', icon: Clock },
        { id: 'actions', label: 'Actions', icon: CheckSquare }
    ];

    const handleSaveStatus = async (newStatus) => {
        if (!newStatus || newStatus === editedJob.status) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/technician/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    updated_by_name: editedJob.assigned_technician?.name || 'Technician',
                    _changeLog: [`Status changed: ${editedJob.status} → ${newStatus}`]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update status');

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
        try {
            const payload = {
                type: 'note-added',
                category: note.category || 'communication',
                description: note.description,
                user_name: editedJob.assigned_technician?.name || 'Technician',
                customer_id: editedJob.customerId,
                attachments: note.attachments
            };

            const res = await fetch(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.success) {
                setEditedJob(prev => ({
                    ...prev,
                    interactions: [data.data, ...(prev.interactions || [])]
                }));
            }
        } catch (err) {
            alert('Failed to save note');
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
        // Log the interaction when the technician clicks the navigation link
        handleAddNote({
            description: `Technician started navigation to customer location`,
            category: 'update',
            attachments: []
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

                    {activeTab === 'interactions' && (
                        <div className="card" style={{ minHeight: '100%', boxSizing: 'border-box' }}>
                             {/* Re-use the Admin interactions tab component, it's perfect for this */}
                             <JobInteractionsTab 
                                jobId={editedJob.id}
                                jobReference={editedJob.job_number}
                                interactions={editedJob.interactions || []}
                                onAddNote={handleAddNote}
                                onUpdate={() => {}} // Not strictly needed, local state updates handle it
                             />
                        </div>
                    )}

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
