'use client';

import { useState, useEffect } from 'react';
import { X, Phone, MapPin, Clock, FileText, CheckSquare, Wrench, Menu, Activity, Send, FilePlus, ChevronDown, CheckCircle, AlertCircle, Package, Shield } from 'lucide-react';
import JobInteractionsTab from '@/app/admin/components/jobs/JobInteractionsTab';
import SalesInvoiceForm from '@/app/admin/components/accounts/SalesInvoiceForm';
import QuotationForm from '@/app/admin/components/accounts/QuotationForm';
import { transactionsAPI } from '@/lib/adminAPI';
import { logInteraction } from '@/lib/interactions';
import RepairCalculator from '@/components/common/RepairCalculator';
import QuotationWhatsAppPopup from '@/components/common/QuotationWhatsAppPopup';
import LiveMap from '@/components/common/LiveMap';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const TechnicianDirectionsMap = dynamic(
    () => import('@/components/technician/TechnicianDirectionsMap'),
    { ssr: false, loading: () => <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>Loading map...</div> }
);

export default function JobDetailView({ job, onClose, onJobUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    const [editedJob, setEditedJob] = useState(job);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [calculatorItems, setCalculatorItems] = useState(null);
    const [savedQuotation, setSavedQuotation] = useState(null);
    const [showWhatsappPopup, setShowWhatsappPopup] = useState(false);
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [markingArrival, setMarkingArrival] = useState(false);

    // Tracking State — use stored coordinates from property if available
    const [isTracking, setIsTracking] = useState(job?.status === 'in-progress');
    const [techLocation, setTechLocation] = useState(null);
    
    // Use stored lat/lng from property (if available) — no geocoding needed
    const storedLat = job?.property?.latitude || job?.latitude;
    const storedLng = job?.property?.longitude || job?.longitude;
    const [custLocation, setCustLocation] = useState(
        storedLat && storedLng ? [storedLat, storedLng]
        : job?.location?.lat && job?.location?.lng ? [job.location.lat, job.location.lng] 
        : null
    );
    const hasStoredCoords = !!(storedLat && storedLng);

    // Live Tracking Broadcaster
    useEffect(() => {
        let watchId;
        let channel;

        if (editedJob?.status === 'in-progress') {
            setIsTracking(true);
            channel = supabase.channel(`tracking:job_${editedJob.id}`, {
                config: { broadcast: { self: true, ack: false } }
            });
            channel.subscribe();

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const loc = [pos.coords.latitude, pos.coords.longitude];
                    setTechLocation(loc);
                    channel.send({
                        type: 'broadcast',
                        event: 'location_update',
                        payload: { latitude: loc[0], longitude: loc[1], timestamp: new Date().toISOString() }
                    });
                },
                (err) => console.error('GPS Watch Error:', err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        } else {
            setIsTracking(false);
            setTechLocation(null);
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (channel) supabase.removeChannel(channel);
        };
    }, [editedJob?.status, editedJob?.id]);

    // Geocoding Fallback — only run if we don't have stored coordinates
    useEffect(() => {
        if (hasStoredCoords) return; // Skip geocoding if we have stored coordinates
        const addressString = editedJob?.address || editedJob?.locality || (editedJob?.customer?.address && typeof editedJob.customer.address === 'string' ? editedJob.customer.address : '');
        if (!custLocation && addressString) {
            const query = encodeURIComponent(addressString + ', Mumbai, India');
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        setCustLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                    } else {
                        setCustLocation([19.0760, 72.8777]); // Mumbai fallback
                    }
                })
                .catch(() => setCustLocation([19.0760, 72.8777]));
        } else if (!custLocation) {
            setCustLocation([19.0760, 72.8777]); // Mumbai fallback
        }
    }, [editedJob?.address, editedJob?.locality, custLocation, hasStoredCoords]);

    // Fetch fresh job and interactions on mount
    useEffect(() => {
        const fetchFreshData = async () => {
            if (!job?.id) return;
            try {
                // Fetch fresh job + both interaction sources simultaneously
                const [jobRes, intRes, jobIntRes, quotaRes] = await Promise.all([
                    fetch(`/api/technician/jobs/${job.id}`),
                    fetch(`/api/admin/interactions?job_id=${job.id}`),
                    fetch(`/api/technician/jobs/${job.id}/interactions`),
                    fetch(`/api/admin/transactions?type=quotation&job_id=${job.id}`)
                ]);
                const jobData = await jobRes.json();
                const intData = await intRes.json().catch(() => ({ data: [] }));
                const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));
                
                try {
                    const quotaData = await quotaRes.json();
                    if (quotaData.success && quotaData.data?.length > 0) {
                        setSavedQuotation(quotaData.data[0]);
                    }
                } catch (e) { console.error('Failed to load quotation', e); }

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
        { id: 'map', label: 'Map', icon: MapPin },
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
                    _changeLog: [`Status changed: ${editedJob.status} ΓåÆ ${newStatus}`]
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

    const handleMarkArrived = async () => {
        setMarkingArrival(true);
        const arrivedAt = new Date().toISOString();
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        try {
            // 1. Update arrived_at on job
            await fetch(`/api/technician/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ arrived_at: arrivedAt, updated_by_name: techName, source: 'Technician App' })
            });
            // 2. Log arrival as a job interaction
            await fetch(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'arrived',
                    category: 'job',
                    message: `${techName} marked arrival at customer location`,
                    user_name: techName,
                    customer_id: editedJob.customerId || null
                })
            });
            setEditedJob(prev => ({ ...prev, arrived_at: arrivedAt }));
        } catch (err) {
            alert('Could not mark arrival: ' + err.message);
        } finally {
            setMarkingArrival(false);
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
                                const text = await uploadRes.text();
                                console.error('Error text:', text);
                                continue; // Skip to next instead of failing note
                            }
                            
                            const uploadData = await uploadRes.json();
                            if (uploadData.success) {
                                uploadedUrls.push(uploadData.url);
                            } else {
                                console.error('Upload false success:', uploadData.error);
                            }
                        } catch (uploadErr) {
                            console.error('Error during fetch or json parse of /api/upload:', uploadErr);
                            // We do not throw here, so the note still saves without the broken image
                            // But we show a soft alert to the tech
                            alert('Warning: Image attachment failed to upload. The note will be saved without it. (Error: ' + uploadErr.message + ')');
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
                                console.error('Upload failed with status in edit:', uploadRes.status);
                                continue;
                            }
                            
                            const uploadData = await uploadRes.json();
                            if (uploadData.success) {
                                uploadedUrls.push(uploadData.url);
                            }
                        } catch (uploadErr) {
                            console.error('Edit upload error:', uploadErr);
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
            const logDesc = `Generated ${docName} for Γé╣${data.total_amount || 0}`;
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {editedJob.customerName || 'Customer'}
                        </h2>
                        {/* Job name — most important, shown prominently */}
                        {(editedJob.description || editedJob.product?.type || editedJob.issueCategory) && (
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#3b82f6', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                🔧 {editedJob.description || editedJob.product?.type || editedJob.issueCategory}
                            </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>Job #{editedJob.job_number || editedJob.id?.split('-')[0]}</span>
                            <span>•</span>
                            <span style={{
                                color: editedJob.status === 'completed' ? '#10b981' :
                                       editedJob.status === 'cancelled' ? '#ef4444' : '#f59e0b',
                                fontWeight: 600, textTransform: 'uppercase', fontSize: '11px'
                            }}>{editedJob.status}</span>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        padding: 'var(--spacing-xs)', backgroundColor: 'transparent',
                        border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: 8
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

                    {activeTab === 'map' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={18} color="#3b82f6" /> Live Location Tracking
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
                                    Sharing your live location allows the customer to track your arrival in real-time.
                                </p>

                                {editedJob.status === 'assigned' && (
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                        onClick={async () => {
                                            if (!navigator.geolocation) return alert('GPS not supported on this device');
                                            navigator.geolocation.getCurrentPosition(async () => {
                                                await handleSaveStatus('in-progress');
                                            }, (err) => alert('Please enable GPS permissions to Start Job.'));
                                        }}
                                        disabled={loading}
                                    >
                                        🚀 Start Job & Share Location
                                    </button>
                                )}

                                {editedJob.status === 'in-progress' && (
                                    <div style={{ padding: '16px', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ color: '#10b981', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', animation: 'pulse 2s infinite' }}></span>
                                            Location Sharing Active
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            The customer can safely track your arrival. Tracking will stop automatically once you complete this job or send a quotation.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* In-App Directions Map */}
                            <div className="card" style={{ overflow: 'hidden', borderRadius: 12 }}>
                                <TechnicianDirectionsMap
                                    techLocation={techLocation}
                                    custLocation={custLocation}
                                    height="360px"
                                    onNavigateExternal={custLocation ? () => {
                                        const url = storedLat && storedLng
                                            ? `https://www.google.com/maps?q=${storedLat},${storedLng}`
                                            : `https://www.google.com/maps/dir/?api=1&destination=${custLocation[0]},${custLocation[1]}`;
                                        window.open(url, '_blank');
                                    } : undefined}
                                />
                            </div>
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
                                        <MapPin size={16} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
                                            {editedJob.address && (
                                                <div style={{ fontWeight: 500 }}>{editedJob.address}</div>
                                            )}
                                            {(editedJob.locality || editedJob.city) && (
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                    {[editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                            {!editedJob.address && !editedJob.locality && (
                                                <span style={{ color: 'var(--text-tertiary)' }}>No address on file</span>
                                            )}
                                            <a
                                                href={
                                                    storedLat && storedLng
                                                        ? `https://www.google.com/maps?q=${storedLat},${storedLng}`
                                                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([editedJob.address, editedJob.locality, editedJob.city].filter(Boolean).join(', '))}`
                                                }
                                                target="_blank" rel="noreferrer"
                                                onClick={handleMapClick}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none', backgroundColor: '#3b82f6', padding: '5px 12px', borderRadius: 6, fontWeight: 600 }}
                                            >
                                                {storedLat && storedLng ? '📍 Navigate (Precise)' : 'Open in Maps ›'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Appliance Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Appliance Details</h3>
                                    {editedJob.priority && (
                                        <div style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                            backgroundColor: editedJob.priority === 'urgent' ? '#fee2e2' : editedJob.priority === 'high' ? '#ffedd5' : 'var(--bg-elevated)',
                                            color: editedJob.priority === 'urgent' ? '#ef4444' : editedJob.priority === 'high' ? '#f59e0b' : 'var(--text-secondary)'
                                        }}>
                                            {editedJob.priority}
                                        </div>
                                    )}
                                </div>

                                {/* Thumbnail */}
                                {(editedJob.thumbnail || editedJob._raw_property?.thumbnail || editedJob._raw_property?.images?.[0]) && (
                                    <div style={{ marginBottom: '12px' }}>
                                        <img
                                            src={editedJob.thumbnail || editedJob._raw_property?.thumbnail || editedJob._raw_property?.images?.[0]}
                                            alt="Appliance"
                                            style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-primary)' }}
                                        />
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                    {/* Job Name / Description */}
                                    {(editedJob.description || editedJob.job_number) && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Job Name</div>
                                            <div style={{ fontWeight: 600, fontSize: '15px' }}>{editedJob.description || `Job #${editedJob.job_number}`}</div>
                                        </div>
                                    )}

                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Category</div>
                                        <div style={{ fontWeight: 500 }}>{editedJob.product?.type || editedJob.issueCategory || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Brand</div>
                                        <div style={{ fontWeight: 500 }}>{editedJob.product?.brand || 'N/A'}</div>
                                    </div>
                                    {editedJob.product?.name && (
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Model / Item</div>
                                            <div style={{ fontWeight: 500 }}>{editedJob.product.name}</div>
                                        </div>
                                    )}

                                    {/* Warranty Status */}
                                    <div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '4px' }}>Warranty</div>
                                        {(() => {
                                            const w = editedJob.product?.warranty || editedJob.warranty_status || '';
                                            const inWarranty = w && !w.toLowerCase().includes('out') && !w.toLowerCase().includes('no');
                                            return (
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    padding: '3px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                                    backgroundColor: inWarranty ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                                                    color: inWarranty ? '#10b981' : '#ef4444',
                                                    border: `1px solid ${inWarranty ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                                                }}>
                                                    {inWarranty ? 'Γ£ô In Warranty' : (w || 'Out of Warranty')}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Reported Issue</div>
                                        <div style={{ fontWeight: 500, color: '#ef4444' }}>{editedJob.defect || 'Not specified'}</div>
                                        {editedJob.notes && (
                                            <div style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-primary)', fontStyle: 'italic', backgroundColor: 'var(--bg-elevated)', padding: '8px', borderRadius: '6px' }}>
                                                "{editedJob.notes}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Scheduling Card */}
                            {(editedJob.dueDate || editedJob.confirmedVisitTime) && (
                                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} color="var(--text-secondary)" /> Scheduling
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                        {editedJob.dueDate && (
                                            <div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Preferred Date</div>
                                                <div style={{ fontWeight: 500 }}>{new Date(editedJob.dueDate).toLocaleDateString()}</div>
                                            </div>
                                        )}
                                        {editedJob.confirmedVisitTime && (
                                            <div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Time Slot</div>
                                                <div style={{ fontWeight: 500 }}>{editedJob.confirmedVisitTime}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Linked Agreement Card */}
                            {editedJob.rental_id && editedJob.rental && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid #10b981' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Package size={20} color="#10b981" />
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#10b981' }}>Linked Rental</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Started On</div>
                                            <div style={{ fontWeight: 500 }}>{new Date(editedJob.rental.start_date).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Status</div>
                                            <div style={{ fontWeight: 600, color: editedJob.rental.status === 'active' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                                                {editedJob.rental.status || 'Active'}
                                            </div>
                                        </div>
                                    </div>
                                    {editedJob.rental.notes && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            "{editedJob.rental.notes}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {editedJob.amc_id && editedJob.amc && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid #8b5cf6' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                        <Shield size={20} color="#8b5cf6" />
                                        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#8b5cf6' }}>Linked AMC Contract</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Started On</div>
                                            <div style={{ fontWeight: 500 }}>{new Date(editedJob.amc.start_date).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Status</div>
                                            <div style={{ fontWeight: 600, color: editedJob.amc.status === 'active' ? '#10b981' : '#f59e0b', textTransform: 'uppercase' }}>
                                                {editedJob.amc.status || 'Active'}
                                            </div>
                                        </div>
                                    </div>
                                    {editedJob.amc.notes && (
                                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                                            "{editedJob.amc.notes}"
                                        </div>
                                    )}
                                </div>
                            )}

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

                            {/* Mark as Arrived — shown for assigned jobs */}
                            {editedJob.status === 'assigned' && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: editedJob.arrived_at ? '1px solid rgba(16,185,129,0.4)' : '2px solid #3b82f6' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={18} color={editedJob.arrived_at ? '#10b981' : '#3b82f6'} />
                                        {editedJob.arrived_at ? 'Arrival Confirmed ✓' : 'At Customer Location?'}
                                    </h3>
                                    {editedJob.arrived_at ? (
                                        <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, textAlign: 'center', fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                                            ✓ Arrived at {new Date(editedJob.arrived_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>Arrival time recorded for performance tracking</div>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                                Tap when you reach the customer's location — this records your on-time arrival for monthly incentive tracking.
                                            </p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleMarkArrived}
                                                disabled={markingArrival}
                                                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                                            >
                                                {markingArrival ? '...' : '📍 Mark as Arrived'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

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
                                    <option value="booking_request">Booking Request</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="in-progress">In Progress</option>
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
                                    <button
                                        className="btn"
                                        style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)' }}
                                        onClick={() => setActiveForm('calculator')}
                                    >
                                        ≡ƒº« Calculate Repair Estimate
                                    </button>
                                    <button className="btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', backgroundColor: savedQuotation ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)', color: savedQuotation ? '#8b5cf6' : 'var(--text-primary)', border: savedQuotation ? '1px solid rgba(139,92,246,0.4)' : '1px solid var(--border-primary)' }} onClick={() => { setActiveForm('quotation'); }}>
                                        <FileText size={18} style={{ marginRight: '8px' }} /> {savedQuotation ? '✏️ Edit Quotation' : 'Create Quotation (Blank)'}
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
            <div onClick={e => e.stopPropagation()}>
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
                            } catch (e) {
                                console.error('Failed to save quotation to DB', e);
                            }
                            
                            setSavedQuotation(savedData);
                            // Auto-update job status to quotation-sent
                            try {
                                await fetch(`/api/admin/jobs`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: editedJob.id, status: 'quotation-sent' })
                                });
                                setEditedJob(prev => ({ ...prev, status: 'quotation-sent' }));
                                if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'quotation-sent' });
                            } catch (e) { console.error('Status update failed', e); }
                            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'quotation-created', category: 'billing', description: `Quotation ${savedData?.quote_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`, user_name: 'Technician', customer_id: editedJob.customerId || null })
                            }).catch(() => {});
                            setActiveForm(null); setCalculatorItems(null);
                            setShowWhatsappPopup(true);
                        }}
                        defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
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
                            } catch (e) { console.error('Failed to save sales invoice', e); }
                            
                            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Sales invoice ${savedData?.invoice_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`, user_name: 'Technician', customer_id: editedJob.customerId || null })
                            }).catch(() => {});
                            setActiveForm(null);
                        }}
                        defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
                        prefillItems={savedQuotation?.items || calculatorItems}
                    />
                )}
                {showWhatsappPopup && (
                    <QuotationWhatsAppPopup
                        quotation={savedQuotation}
                        job={{ id: editedJob.id, job_number: editedJob.job_number, customer_name: editedJob.customerName, customer_phone: editedJob.customer?.mobile || editedJob.customer?.phone }}
                        onClose={() => setShowWhatsappPopup(false)}
                    />
                )}
            </div>
        </div>
    );
}
