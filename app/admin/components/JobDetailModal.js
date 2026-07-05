'use client'

import { useState, useEffect } from 'react';
import { X, Save, Phone, MapPin, Calendar, User, Tag, FileText, Image as ImageIcon, DollarSign, CheckSquare, Clock, Activity, CheckCircle, Loader2, FilePlus, Package, Shield, Wrench, MessageCircle, Camera } from 'lucide-react';
import { formatDateTime, getLocalityFromAddress, formatRelativeTime } from '@/lib/utils/helpers';
import { getStatusConfig, SOURCE_LABELS, JOB_STATUSES } from '@/lib/jobStatuses';
import JobInteractionsTab from './jobs/JobInteractionsTab';
import LogNoteItem from './LogNoteItem';
import SalesInvoiceForm from './accounts/SalesInvoiceForm';
import QuotationForm from './accounts/QuotationForm';
import { jobsAPI, interactionsAPI } from '@/lib/adminAPI';
import RepairCalculator from '@/components/common/RepairCalculator';
import DocumentWhatsAppPopup from '@/components/common/DocumentWhatsAppPopup';
import CollectPaymentFlow from '@/components/shared/CollectPaymentFlow';
import FeedbackAndCloseCallFlow from '@/components/shared/FeedbackAndCloseCallFlow';
import { formatMobileNumber } from '@/lib/utils/validation';
import { supabase } from '@/lib/supabase';

const deduplicateInteractions = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const result = [];
    const sorted = [...list].sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
    for (const item of sorted) {
        const timestamp = item.timestamp || item.created_at;
        const timeKey = timestamp ? new Date(timestamp).toISOString().slice(0, 16) : '';
        const descNormalized = (item.description || item.message || '').toLowerCase().trim();
        const typeNormalized = (item.type || '').toLowerCase().trim();
        const key = `${typeNormalized}_${timeKey}_${descNormalized.substring(0, 50)}`;
        if (!seen.has(key)) {
            seen.add(key);
            result.push(item);
        }
    }
    return result.sort((a, b) => new Date(b.timestamp || b.created_at || 0) - new Date(a.timestamp || a.created_at || 0));
};

const VisitsLogTab = ({ interactions = [], onTabChange }) => {
    const list = [...interactions].sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
    const beforeInteractions = list.filter(i => i.type === 'before-photos-uploaded');
    const afterInteractions = list.filter(i => i.type === 'after-photos-uploaded');

    const visits = beforeInteractions.map((before, idx) => {
        const after = afterInteractions[idx] || null;
        return {
            visitNumber: idx + 1,
            technician: before.performed_by_name || before.user_name || 'Technician',
            checkInTime: before.timestamp || before.created_at,
            checkOutTime: after ? (after.timestamp || after.created_at) : null,
            beforeNote: before.description ? before.description.replace(/^Before Photos uploaded for Visit #\d+\.\nNote:\s*/, '').replace(/^Before Photos uploaded\.\nNote:\s*/, '') : '',
            beforeImages: before.metadata?.attachments || [],
            afterNote: after ? (after.description ? after.description.replace(/^After Photos uploaded\.\nNote:\s*/, '') : 'Completed') : null,
            afterImages: after ? (after.metadata?.attachments || []) : []
        };
    }).reverse();

    if (visits.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Camera size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No Visits Recorded</h3>
                <p style={{ fontSize: 13, maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>When a technician starts a job and completes check-in, the visit details will appear here.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Camera size={18} color="#10b981" /> Job Visits History ({visits.length})
                </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {visits.map((visit) => (
                    <div 
                        key={visit.visitNumber} 
                        className="card" 
                        style={{ 
                            padding: '16px', 
                            border: '1px solid var(--border-primary)', 
                            backgroundColor: 'var(--bg-elevated)', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '14px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '20px', 
                                    fontSize: '13px', 
                                    fontWeight: 700, 
                                    backgroundColor: 'rgba(16,185,129,0.15)', 
                                    color: '#10b981' 
                                }}>
                                    Visit #{visit.visitNumber}
                                </span>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    By: <strong style={{ color: 'var(--text-primary)' }}>{visit.technician}</strong>
                                </span>
                            </div>
                            
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                📅 {new Date(visit.checkInTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', backgroundColor: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>CHECK-IN TIME</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    ⏱️ {new Date(visit.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>CHECK-OUT TIME</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: visit.checkOutTime ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                                    {visit.checkOutTime ? (
                                        `⏱️ ${new Date(visit.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                    ) : (
                                        '🕒 In Progress / Active'
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderRight: '1px solid var(--border-primary)', paddingRight: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    📸 Check-in details
                                </div>
                                {visit.beforeNote && (
                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-primary)', minHeight: '34px', whiteSpace: 'pre-wrap' }}>
                                        {visit.beforeNote}
                                    </p>
                                )}
                                {visit.beforeImages && visit.beforeImages.length > 0 && (
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                        {visit.beforeImages.map((url, idx) => (
                                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                                <img 
                                                    src={url} 
                                                    alt={`Visit ${visit.visitNumber} check-in ${idx + 1}`} 
                                                    style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-primary)' }} 
                                                />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '4px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ✨ Check-out details
                                </div>
                                {visit.checkOutTime ? (
                                    <>
                                        {visit.afterNote && (
                                            <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-primary)', minHeight: '34px', whiteSpace: 'pre-wrap' }}>
                                                {visit.afterNote}
                                            </p>
                                        )}
                                        {visit.afterImages && visit.afterImages.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                {visit.afterImages.map((url, idx) => (
                                                    <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                                        <img 
                                                            src={url} 
                                                            alt={`Visit ${visit.visitNumber} check-out ${idx + 1}`} 
                                                            style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover', border: '1px solid var(--border-primary)' }} 
                                                        />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '12px', backgroundColor: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px dotted var(--border-primary)', textAlign: 'center' }}>
                                        Check-out photo/notes pending completion of this visit
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

function JobDetailModal({ job, onClose, onUpdate }) {
    const [activeTab, setActiveTab] = useState('details');
    // Initialize with passed job, but allowed to be updated by fetch
    const [editedJob, setEditedJob] = useState({ ...job });
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [newNote, setNewNote] = useState({ description: '', files: [] });
    const [activeForm, setActiveForm] = useState(null); // 'quotation' | 'sales-invoice' | 'calculator'
    const [calculatorItems, setCalculatorItems] = useState(null);
    const [savedQuotation, setSavedQuotation] = useState(null);
    const [savedQuotations, setSavedQuotations] = useState([]);
    const [isNewQuotationOption, setIsNewQuotationOption] = useState(false);
    const [savedInvoice, setSavedInvoice] = useState(null);
    const [showWhatsappPopup, setShowWhatsappPopup] = useState(null); // { type, doc }
    const [showCollectPayment, setShowCollectPayment] = useState(false);
    const [showFeedbackCloseFlow, setShowFeedbackCloseFlow] = useState(false);
    const [markingArrival, setMarkingArrival] = useState(false);
    const [showPartsNoteModal, setShowPartsNoteModal] = useState(false);
    const [partsNoteText, setPartsNoteText] = useState('');
    const [partsNoteLoading, setPartsNoteLoading] = useState(false);

    const [technicians, setTechnicians] = useState([]);
    const [rentals, setRentals] = useState([]);
    const [amcs, setAmcs] = useState([]);
    const [invoices, setInvoices] = useState([]);

    const [availableSlots, setAvailableSlots] = useState([]);
    const [fetchingSlots, setFetchingSlots] = useState(false);

    useEffect(() => {
        if (!editedJob.scheduled_date) {
            setAvailableSlots([]);
            return;
        }
        const fetchSlots = async () => {
            setFetchingSlots(true);
            try {
                const res = await fetch(`/api/booking/available-slots?days=1&startDate=${editedJob.scheduled_date}&bypassFilter=true`);
                const data = await res.json();
                if (data.success && data.data[editedJob.scheduled_date]) {
                    setAvailableSlots(data.data[editedJob.scheduled_date]);
                } else {
                    setAvailableSlots([]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setFetchingSlots(false);
            }
        };
        fetchSlots();
    }, [editedJob.scheduled_date]);

    // Fetch fresh job data and technicians on mount
    useEffect(() => {
        const fetchData = async () => {
            if (!job?.id) return;
            try {
                setLoading(true);
                const [freshJob, techRes, intRes, jobIntRes, quotaRes, invRes] = await Promise.all([
                    jobsAPI.getById(job.id),
                    fetch('/api/admin/technicians').then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`/api/admin/interactions?job_id=${job.id}&_t=${Date.now()}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`/api/technician/jobs/${job.id}/interactions`).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`/api/admin/transactions?type=quotation&job_id=${job.id}`).then(r => r.json()).catch(() => ({ data: [] })),
                    fetch(`/api/technician/jobs/${job.id}/invoice`).then(r => r.json()).catch(() => ({ success: false }))
                ]);
                if (invRes?.success && invRes.data?.length > 0) setSavedInvoice(invRes.data[0]);
                else if (invRes?.success && invRes.invoice) setSavedInvoice(invRes.invoice);
                
                if (quotaRes?.success && quotaRes.data?.length > 0) {
                    setSavedQuotations(quotaRes.data);
                    setSavedQuotation(quotaRes.data[0]);
                } else {
                    setSavedQuotations([]);
                    setSavedQuotation(null);
                }
                
                if (freshJob) {
                    // Fetch related rentals and AMCs for this customer
                    if (freshJob.customer_id) {
                        const ninetyDaysAgo = new Date();
                        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                        const startDateStr = ninetyDaysAgo.toISOString().split('T')[0];

                        const [rentalsRes, amcsRes, invoicesRes] = await Promise.all([
                            fetch(`/api/admin/rentals?type=active&customer_id=${freshJob.customer_id}`).then(r => r.json()).catch(() => ({ data: [] })),
                            fetch(`/api/admin/amc?type=active&customer_id=${freshJob.customer_id}`).then(r => r.json()).catch(() => ({ data: [] })),
                            fetch(`/api/admin/transactions?type=sales&customer_id=${freshJob.customer_id}&start_date=${startDateStr}`).then(r => r.json()).catch(() => ({ data: [] }))
                        ]);
                        if (rentalsRes?.success) setRentals(rentalsRes.data || []);
                        if (amcsRes?.success) setAmcs(amcsRes.data || []);
                        if (invoicesRes?.success) setInvoices(invoicesRes.data || []);
                    }
                    const allInt = deduplicateInteractions([
                        ...(intRes?.data || []),
                        ...(jobIntRes?.data || []).map(ji => ({
                            ...ji,
                            // Normalise job_interactions fields to global interactions format
                            performed_by_name: ji.user_name || ji.performed_by_name || 'System',
                            description: ji.message || ji.description || '',
                            timestamp: ji.created_at || ji.timestamp,
                        }))
                    ]);

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

    const displayPhoneRaw = customer.mobile || customer.phone || bookingData.customer?.phone || editedJob.customer_phone || 'N/A';
    const displayPhone = displayPhoneRaw !== 'N/A' ? formatMobileNumber(displayPhoneRaw) : 'N/A';
    const rawAddr = bookingData.customer?.address || {};
    const bookingAddr = rawAddr.locality ? `${rawAddr.apartment || ''}, ${rawAddr.street || ''}, ${rawAddr.locality}, ${rawAddr.city}`.replace(/^, /, '') : null;

    let jobAddress = 'No address';
    let jobAddressParts = []; // structured parts for multi-line display

    if (property && (property.address || property.locality || property.flat_number || property.building_name)) {
        // Property is the most reliable address source
        const addr = property.address || {};
        if (typeof addr === 'object' && addr.line1) {
            // Structured address object (line1/line2/locality/city/pincode)
            jobAddressParts = [
                [addr.line1, addr.line2].filter(Boolean).join(', '),
                [addr.locality, addr.city].filter(Boolean).join(', '),
                addr.pincode
            ].filter(Boolean);
        } else {
            // Flat property columns: flat_number, building_name, address (street), locality, city, pincode
            const line1 = [property.flat_number, property.building_name, typeof addr === 'string' ? addr : property.address].filter(Boolean).join(', ');
            const line2 = [property.locality, property.city || 'Mumbai'].filter(Boolean).join(', ');
            const line3 = property.pincode;
            jobAddressParts = [line1, line2, line3].filter(Boolean);
        }
        jobAddress = jobAddressParts.join(', ');
    } else if (bookingAddr) {
        // Booking request address from notes JSON
        const rawAddrFull = bookingData.customer?.address || {};
        jobAddressParts = [
            [rawAddrFull.apartment, rawAddrFull.street].filter(Boolean).join(', '),
            [rawAddrFull.locality, rawAddrFull.city].filter(Boolean).join(', '),
            rawAddrFull.pincode
        ].filter(Boolean);
        jobAddress = jobAddressParts.join(', ') || bookingAddr;
    } else if (customer.address || customer.locality) {
        // Fallback: customer account address fields
        const line1 = typeof customer.address === 'string' ? customer.address : '';
        const line2 = [customer.locality, customer.city].filter(Boolean).join(', ');
        const line3 = customer.pincode;
        jobAddressParts = [line1, line2, line3].filter(Boolean);
        jobAddress = jobAddressParts.join(', ');
    }


    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'interactions', label: 'Interactions/Visit Log', icon: Clock },
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
            warranty: editedJob.warranty,
            warranty_proof: editedJob.warranty_proof,
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
        console.log('Interactions updated');
    };

    const handleSaveStatus = async (newStatus) => {
        if (!newStatus || newStatus === editedJob.status) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/technician/jobs/${editedJob.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, updated_by_name: 'Admin', source: 'Admin App', _changeLog: [`Status changed: ${editedJob.status} → ${newStatus}`] })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update status');
            const merged = { ...editedJob, status: newStatus };
            setEditedJob(merged);
            if (onUpdate) onUpdate(merged);
        } catch (err) {
            alert('Status update failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkArrived = async () => {
        setMarkingArrival(true);
        try {
            const res = await fetch(`/api/technician/jobs/${editedJob.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'mark_arrived', updated_by_name: 'Admin' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to mark arrival');
            const newStatus = data.job?.status || (editedJob.status === 'scheduled' ? 'diagnosing_quoting' : editedJob.status);
            setEditedJob(prev => ({ ...prev, arrived_at: data.job?.arrived_at || new Date().toISOString(), status: newStatus }));
            if (onUpdate) onUpdate(data.job || { ...editedJob, arrived_at: data.job?.arrived_at || new Date().toISOString(), status: newStatus });
        } catch (err) {
            alert('Could not mark arrival: ' + err.message);
        } finally {
            setMarkingArrival(false);
        }
    };





    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: 700, marginBottom: '2px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || 'Customer'}
                        </h2>
                        {(editedJob.description || editedJob.job_type || editedJob.issueCategory) && (
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#10b981', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                🔧 {editedJob.description || editedJob.job_type || editedJob.issueCategory}
                            </div>
                        )}
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>Job #{editedJob.job_number || editedJob.id?.split('-')[0]}</span>
                            <span>•</span>
                            {(() => {
                                const cfg = getStatusConfig(editedJob.status);
                                return (
                                    <span style={{ color: cfg.color, fontWeight: 700, textTransform: 'uppercase', fontSize: '11px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '1px 6px' }}>
                                        {cfg.label}
                                    </span>
                                );
                            })()}
                            {/* Sub-status badge for New Job Request */}
                            {editedJob.status === 'new_job_request' && editedJob.source && SOURCE_LABELS[editedJob.source] && (
                                <span style={{ fontSize: '11px', fontWeight: 600, color: SOURCE_LABELS[editedJob.source].color, background: `${SOURCE_LABELS[editedJob.source].color}18`, border: `1px solid ${SOURCE_LABELS[editedJob.source].color}30`, borderRadius: 5, padding: '1px 6px' }}>
                                    {SOURCE_LABELS[editedJob.source].emoji} {SOURCE_LABELS[editedJob.source].label}
                                </span>
                            )}
                            {editedJob.service_coverage === 'amc' && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 5, padding: '1px 6px' }}>
                                    🛡️ AMC Covered
                                </span>
                            )}
                            {editedJob.service_coverage === 'rental' && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 5, padding: '1px 6px' }}>
                                    📦 Rental
                                </span>
                            )}
                            {editedJob.service_coverage === 'warranty' && (
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 5, padding: '1px 6px' }}>
                                    📜 Warranty
                                </span>
                            )}
                        </div>
                        {editedJob.created_at && (
                            <div style={{ fontSize: '12px', color: 'var(--color-primary)', marginTop: '4px', fontWeight: 500 }}>
                                Booked: {formatDateTime(editedJob.created_at)} ({formatRelativeTime(editedJob.created_at)})
                            </div>
                        )}
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ flexShrink: 0, marginLeft: 8 }}>
                        <X size={24} />
                    </button>
                </div>


                {/* Tabs */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
                    columnGap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
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
                                    justifyContent: 'center',
                                    gap: '6px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    border: 'none',
                                    borderRadius: '20px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s ease, color 0.2s ease',
                                    backgroundColor: isActive ? '#10b981' : 'var(--bg-secondary)',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    minWidth: 0
                                }}
                            >
                                <Icon size={16} style={{ flexShrink: 0 }} />
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
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <Phone size={16} />
                                        <a href={`tel:${displayPhone}`} style={{ color: 'var(--color-primary)' }}>
                                            {displayPhone}
                                        </a>
                                        {displayPhoneRaw && displayPhoneRaw !== 'N/A' && (
                                            <a
                                                href={`https://wa.me/${displayPhoneRaw.replace(/\D/g, '').length === 10 ? '91' + displayPhoneRaw.replace(/\D/g, '') : displayPhoneRaw.replace(/\D/g, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-secondary"
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '12px',
                                                    height: 'auto',
                                                    backgroundColor: 'rgba(34,197,94,0.08)',
                                                    color: '#22c55e',
                                                    border: '1px solid rgba(34,197,94,0.25)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    marginLeft: 'var(--spacing-xs)',
                                                }}
                                            >
                                                <MessageCircle size={12} /> WhatsApp
                                            </a>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-start' }}>
                                        <MapPin size={16} style={{ marginTop: '3px', flexShrink: 0, color: 'var(--text-secondary)' }} />
                                        <div style={{ lineHeight: 1.6 }}>
                                            {jobAddressParts.length > 0 ? (
                                                <>
                                                    {jobAddressParts.map((part, i) => (
                                                        <div key={i} style={{
                                                            fontSize: i === 0 ? '14px' : '13px',
                                                            fontWeight: i === 0 ? 500 : 400,
                                                            color: i === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
                                                        }}>{part}</div>
                                                    ))}
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobAddress)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none', backgroundColor: '#3b82f6', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}
                                                    >
                                                        📍 Open in Maps
                                                    </a>
                                                </>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No address on file</span>
                                            )}
                                        </div>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                                    
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
                                            {technicians.filter(tech => tech.is_active !== false || tech.id === editedJob.technician_id).map(tech => (
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
                                        <div style={{ display: 'flex' }}>
                                            <input
                                                type="text"
                                                list="edit-time-slots"
                                                className="form-input"
                                                placeholder={fetchingSlots ? 'Loading slots...' : !editedJob.scheduled_date ? 'Select a date first' : 'Time or Slot (e.g. 10:00 AM)'}
                                                value={editedJob.scheduled_time || ''}
                                                onChange={(e) => setEditedJob({ ...editedJob, scheduled_time: e.target.value })}
                                            />
                                            <datalist id="edit-time-slots">
                                                {availableSlots.map(slot => {
                                                    const slotLabel = slot.label || `${slot.startTime}–${slot.endTime}`;
                                                    return (
                                                        <option key={slot.id || slotLabel} value={slotLabel}>{slotLabel}</option>
                                                    );
                                                })}
                                            </datalist>
                                        </div>
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
                                    
                                    <div className="form-group">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', height: '100%', paddingTop: '8px' }}>
                                            <input
                                                type="checkbox"
                                                checked={editedJob.warranty || false}
                                                onChange={(e) => setEditedJob({ ...editedJob, warranty: e.target.checked })}
                                                style={{ width: '18px', height: '18px' }}
                                            />
                                            <span className="form-label" style={{ marginBottom: 0 }}>Under Warranty</span>
                                        </label>
                                    </div>

                                    {editedJob.warranty && (
                                        <div className="form-group">
                                            <label className="form-label">Warranty Proof (Invoice / AMC / Rental)</label>
                                            <select
                                                className="form-select"
                                                value={editedJob.warranty_proof || ''}
                                                onChange={(e) => setEditedJob({ ...editedJob, warranty_proof: e.target.value })}
                                            >
                                                <option value="">Select Contract / Invoice</option>
                                                
                                                {invoices.length > 0 && (
                                                    <optgroup label="Recent Invoices (90 Days)">
                                                        {invoices.map(inv => (
                                                            <option key={`inv-${inv.id}`} value={`Invoice #${inv.transaction_number || inv.id}`}>
                                                                Invoice #{inv.transaction_number || inv.id} ({new Date(inv.date || inv.created_at).toLocaleDateString()}) - ₹{inv.amount}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {amcs.length > 0 && (
                                                    <optgroup label="Active AMC Contracts">
                                                        {amcs.map(amc => (
                                                            <option key={`amc-${amc.id}`} value={`AMC: ${amc.plan_name || amc.category}`}>
                                                                AMC: {amc.plan_name || amc.category} (Ends {new Date(amc.end_date).toLocaleDateString()})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {rentals.length > 0 && (
                                                    <optgroup label="Active Rental Contracts">
                                                        {rentals.map(rental => (
                                                            <option key={`rental-${rental.id}`} value={`Rental: ${rental.product_name || rental.product_type}`}>
                                                                Rental: {rental.product_name || rental.product_type} (Ends {new Date(rental.end_date).toLocaleDateString()})
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                )}

                                                {/* Fallback to allow custom text if existing job had a free text value not in the dropdown */}
                                                {editedJob.warranty_proof && 
                                                 !invoices.find(i => `Invoice #${i.transaction_number || i.id}` === editedJob.warranty_proof) &&
                                                 !amcs.find(a => `AMC: ${a.plan_name || a.category}` === editedJob.warranty_proof) &&
                                                 !rentals.find(r => `Rental: ${r.product_name || r.product_type}` === editedJob.warranty_proof) &&
                                                (
                                                    <optgroup label="Custom / Legacy">
                                                        <option value={editedJob.warranty_proof}>{editedJob.warranty_proof}</option>
                                                    </optgroup>
                                                )}
                                            </select>
                                        </div>
                                    )}

                                </div>
                            </div>
                            
                            {/* Linked Agreements */}
                            <div className="card mb-md" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Linked Agreements</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
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
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
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
                            {(editedJob.on_way_at || editedJob.arrived_at || editedJob.customer_rating) && (
                                <div className="card mb-md" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)' }}>
                                    <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                        Service Tracking &amp; Feedback
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
                                        {editedJob.on_way_at && (
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', fontWeight: 600 }}>STARTED JOB AT</div>
                                                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                    {new Date(editedJob.on_way_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                    {new Date(editedJob.on_way_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        )}
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


                    {activeTab === 'visits' && (
                        <VisitsLogTab 
                            interactions={editedJob.interactions || []}
                            onTabChange={setActiveTab}
                        />
                    )}

                    {activeTab === 'interactions' && (
                        <JobInteractionsTab
                            jobId={editedJob.id}
                            jobReference={editedJob.job_number}
                            interactions={editedJob.interactions || []}
                            onAddNote={handleAddNote}
                            onEditNote={handleEditNote}
                            onUpdate={handleInteractionsUpdate}
                            onTabChange={setActiveTab}
                        />
                    )}



                    {activeTab === 'actions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Start Job & Share Location / Mark as Arrived buttons flow */}
                            {(() => {
                                const isCurrentlyOnWay = editedJob.on_way_at && (!editedJob.arrived_at || new Date(editedJob.on_way_at) > new Date(editedJob.arrived_at));
                                const nextVisitNum = (editedJob.interactions || []).filter(i => i.type === 'before-photos-uploaded').length + 1;

                                return (
                                    <>
                                        {/* On Way Banner */}
                                        {editedJob.status !== 'closed' && editedJob.status !== 'cancelled' && isCurrentlyOnWay && (
                                            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', fontSize: 13, color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: '12px' }}>
                                                 On the way — customer notified. Location sharing active.
                                            </div>
                                        )}

                                        {/* Start Job Button */}
                                        {editedJob.status !== 'closed' && editedJob.status !== 'cancelled' && !isCurrentlyOnWay && (
                                            <div className="card" style={{ padding: 'var(--spacing-md)', border: '2px solid #38bdf8', backgroundColor: 'rgba(56,189,248,0.04)' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                     Ready to Head Out? (Visit {nextVisitNum})
                                                </h3>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                                    Tap below to start GPS sharing with the customer. This locks their cancel/reschedule option so you won't face last-minute changes.
                                                </p>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)' }}
                                                    onClick={async () => {
                                                        if (!navigator.geolocation) return alert('GPS not supported on this device');
                                                        navigator.geolocation.getCurrentPosition(async () => {
                                                            const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Admin';
                                                            await fetch(`/api/technician/jobs/${job.id}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ action: 'mark_on_way', updated_by_name: techName })
                                                            });
                                                            const nowStr = new Date().toISOString();
                                                            setEditedJob(prev => ({ 
                                                                ...prev, 
                                                                on_way_at: nowStr,
                                                                interactions: [
                                                                    {
                                                                        type: 'on-way',
                                                                        performed_by_name: techName,
                                                                        description: `Technician is on the way (Visit #${nextVisitNum})`,
                                                                        timestamp: nowStr
                                                                    },
                                                                    ...(prev.interactions || [])
                                                                ]
                                                            }));
                                                        }, () => alert('Please enable GPS permissions.'));
                                                    }}
                                                    disabled={loading}
                                                >
                                                     Start Job & Share Location (Visit {nextVisitNum})
                                                </button>
                                            </div>
                                        )}

                                        {/* Mark as Arrived Button */}
                                        {editedJob.status !== 'closed' && editedJob.status !== 'cancelled' && isCurrentlyOnWay && (
                                            <div className="card" style={{ padding: 'var(--spacing-md)', border: '2px solid #8b5cf6' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <MapPin size={18} color="#8b5cf6" />
                                                    At Customer Location? (Visit {nextVisitNum})
                                                </h3>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                                    Tap when you reach the customer — status will auto-advance to Diagnosing & Quoting (if scheduled) and arrival is recorded.
                                                </p>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleMarkArrived}
                                                    disabled={markingArrival}
                                                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
                                                >
                                                    {markingArrival ? ' Recording...' : `Mark as Arrived (Visit ${nextVisitNum})`}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} color="#3b82f6" /> Status & Priority
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label">Job Status</label>
                                        <select
                                            className="form-select"
                                            value={editedJob.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value;
                                                if (newStatus === 'parts_ordered') {
                                                    setShowPartsNoteModal(true);
                                                } else {
                                                    setEditedJob({ ...editedJob, status: newStatus });
                                                }
                                            }}
                                            style={{ backgroundColor: 'var(--bg-elevated)' }}
                                        >
                                            <option value="new_job_request">🔵 New Job Request</option>
                                            <option value="scheduled">📅 Scheduled</option>
                                            <option value="diagnosing_quoting">🔍 Diagnosing &amp; Quoting</option>
                                            <option value="quotation_sent">📋 Quotation Sent</option>
                                            <option value="parts_ordered">🔩 Parts Ordered</option>
                                            <option value="work_in_progress">🔧 Work In Progress</option>
                                            <option value="cx_reschedule">📆 Cx Reschedule</option>
                                            <option value="cancelled">❌ Cancelled</option>
                                            <option value="closed">✅ Closed</option>
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

                                    {editedJob.status === 'closed' && (() => {
                                        const getClosureDetails = () => {
                                            const closeInt = (editedJob.interactions || []).find(i => i.type === 'job-closed' || i.type === 'close-call-no-service');
                                            if (closeInt) {
                                                return {
                                                    type: closeInt.type,
                                                    description: closeInt.description,
                                                    performed_by_name: closeInt.performed_by_name,
                                                    timestamp: closeInt.timestamp
                                                };
                                            }
                                            if (typeof editedJob.notes === 'string') {
                                                if (editedJob.notes.includes('Close Call — No Service') || editedJob.notes.includes('=== MANDATORY CLOSE CALL NOTES ===')) {
                                                    return {
                                                        type: editedJob.notes.includes('Close Call — No Service') ? 'close-call-no-service' : 'job-closed',
                                                        description: editedJob.notes,
                                                        performed_by_name: editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician',
                                                        timestamp: editedJob.updated_at || editedJob.closed_at
                                                    };
                                                }
                                            }
                                            // Fallback 1: check if there's any payment collected info
                                            const paymentInt = (editedJob.interactions || []).find(i => i.type === 'payment-received');
                                            if (paymentInt) {
                                                return {
                                                    type: 'job-closed',
                                                    description: paymentInt.description || `Payment of ₹${paymentInt.metadata?.amount || ''} collected.`,
                                                    performed_by_name: paymentInt.performed_by_name || 'Technician',
                                                    timestamp: paymentInt.timestamp
                                                };
                                            }
                                            // Fallback 2: check if there is a saved invoice
                                            if (savedInvoice) {
                                                return {
                                                    type: 'job-closed',
                                                    description: `Invoice ${savedInvoice.invoice_number || ''} created for ₹${(savedInvoice.total_amount || 0).toLocaleString('en-IN')}. Status: ${savedInvoice.status || 'Paid'}.`,
                                                    performed_by_name: savedInvoice.technician_name || 'Admin',
                                                    timestamp: savedInvoice.created_at || editedJob.completed_at
                                                };
                                            }
                                            // Fallback 3: generic notes or completed timestamp
                                            const displayNotes = typeof editedJob.notes === 'string' && !editedJob.notes.startsWith('{') 
                                                ? editedJob.notes 
                                                : (editedJob.description_notes || '');
                                            return {
                                                type: 'job-closed',
                                                description: displayNotes || "Job closed. No detailed closure logs found.",
                                                performed_by_name: editedJob.assigned_technician?.name || editedJob.technician_name || 'System',
                                                timestamp: editedJob.completed_at || editedJob.updated_at
                                            };
                                        };
                                        const closure = getClosureDetails();
                                        if (!closure) return null;
                                        const isNoService = closure.type === 'close-call-no-service' || closure.description?.includes('No Service');
                                        return (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                marginTop: '4px',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                backgroundColor: isNoService ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                                                border: `1px solid ${isNoService ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`,
                                            }}>
                                                <div style={{
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    color: isNoService ? '#f87171' : '#34d399',
                                                    marginBottom: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <span>{isNoService ? '❌' : '✅'}</span>
                                                    <span>Closure Method: {isNoService ? 'Close Call — No Service' : 'Closed Call with Service'}</span>
                                                </div>
                                                <div style={{
                                                    fontSize: '12px',
                                                    color: 'var(--text-secondary)',
                                                    whiteSpace: 'pre-wrap',
                                                    lineHeight: 1.5
                                                }}>
                                                    {closure.description}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--text-tertiary)',
                                                    marginTop: '8px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between'
                                                }}>
                                                    <span>Closed by: {closure.performed_by_name || 'N/A'}</span>
                                                    {closure.timestamp && (
                                                        <span>{new Date(closure.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Status changes will be logged in the timeline when you Save Changes.</p>
                            </div>

                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FilePlus size={18} color="#10b981" /> Quotation Approval & Billing
                                </h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {savedInvoice ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>Invoice {savedInvoice.invoice_number || ''}</div>
                                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total: ₹{(savedInvoice.total_amount || 0).toLocaleString('en-IN')}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn"
                                                    style={{ flex: 1, padding: '8px 16px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600, fontSize: '13px', borderRadius: 'var(--radius-md)' }}
                                                    onClick={() => setShowWhatsappPopup({ type: 'invoice', doc: savedInvoice })}
                                                >
                                                    View / Send
                                                </button>
                                                {editedJob.status === 'closed' ? (
                                                    <div
                                                        style={{ padding: '8px 16px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 6 }}
                                                    >
                                                        <CheckCircle size={14} /> Closed & Paid
                                                    </div>
                                                ) : editedJob.interactions?.some(i => i.type === 'payment-received') ? (
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '8px 16px', backgroundColor: 'rgba(99,102,241,0.9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                        onClick={() => setShowFeedbackCloseFlow(true)}
                                                    >
                                                        <CheckCircle size={14} /> Close Call
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn"
                                                onClick={() => setShowCollectPayment(true)}
                                                    >
                                                        <CheckCircle size={14} /> Collect Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : savedQuotation ? (
                                        <>
                                            {/* Quotation Options Tab Selector */}
                                            {savedQuotations.length > 0 && (
                                                <div style={{ marginBottom: '14px' }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '6px' }}>
                                                        Quotation Options ({savedQuotations.length}/2):
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        {(() => {
                                                            const sortedQuotes = [...savedQuotations].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                                                            return sortedQuotes.map((q, idx) => {
                                                                const label = idx === 0 ? 'Option 1 (Quotation)' : 'Option 2 (Service Charge)';
                                                                const isActive = savedQuotation?.id === q.id;
                                                                return (
                                                                    <button
                                                                        key={q.id}
                                                                        type="button"
                                                                        onClick={() => setSavedQuotation(q)}
                                                                        style={{
                                                                            padding: '8px 12px',
                                                                            fontSize: '13px',
                                                                            fontWeight: 700,
                                                                            borderRadius: '6px',
                                                                            border: isActive ? '2px solid #8b5cf6' : '1px solid var(--border-primary)',
                                                                            backgroundColor: isActive ? 'rgba(139,92,246,0.1)' : 'var(--bg-secondary)',
                                                                            color: isActive ? '#8b5cf6' : 'var(--text-primary)',
                                                                            cursor: 'pointer',
                                                                            flex: 1,
                                                                            textAlign: 'center',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                    >
                                                                        {label} · ₹{q.total_amount?.toLocaleString('en-IN')}
                                                                    </button>
                                                                );
                                                            });
                                                        })()}
                                                        {savedQuotations.length < 2 && !['work_in_progress', 'completed', 'closed'].includes(editedJob.status) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsNewQuotationOption(true);
                                                                    setCalculatorItems([]);
                                                                    setActiveForm('calculator');
                                                                }}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '6px',
                                                                    border: '1px dashed #f59e0b',
                                                                    backgroundColor: 'rgba(245,158,11,0.05)',
                                                                    color: '#f59e0b',
                                                                    cursor: 'pointer',
                                                                    flex: 1,
                                                                    textAlign: 'center',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                Service Charge Close
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Quotation {savedQuotation.quote_number || ''}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total: ₹{(savedQuotation.total_amount || 0).toLocaleString('en-IN')}</div>
                                                </div>
                                                {!['work_in_progress', 'completed', 'closed'].includes(editedJob.status) && (
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '8px 16px', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 600, fontSize: '13px', borderRadius: 'var(--radius-md)' }}
                                                        onClick={() => setActiveForm('quotation')}
                                                    >
                                                        Edit / Send
                                                    </button>
                                                )}
                                            </div>

                                            {(() => {
                                                const sortedQuotes = [...savedQuotations].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                                                const isServiceChargeSelected = savedQuotations.length === 2 && savedQuotation?.id === sortedQuotes[1]?.id;

                                                if (isServiceChargeSelected) {
                                                    if (editedJob.status === 'closed') return null;
                                                    return (
                                                        <button
                                                            className="btn"
                                                            disabled={loading}
                                                            style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 700, fontSize: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                                            onClick={async () => {
                                                                setLoading(true);
                                                                try {
                                                                    const serviceQuote = sortedQuotes[1];
                                                                    if (!serviceQuote) throw new Error('Service charge quotation option not found');
                                                                    const res = await fetch(`/api/admin/transactions?type=sales`, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({
                                                                            account_id: serviceQuote.account_id,
                                                                            account_name: serviceQuote.account_name || editedJob.customer?.name || 'Customer',
                                                                            accountGSTIN: serviceQuote.accountGSTIN || '',
                                                                            accountState: serviceQuote.accountState || 'Maharashtra',
                                                                            billing_address: serviceQuote.billing_address || [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                                                                            job_id: editedJob.id,
                                                                            date: new Date().toISOString().split('T')[0],
                                                                            due_date: new Date().toISOString().split('T')[0],
                                                                            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                                                            reference: serviceQuote.quote_number,
                                                                            status: 'unpaid',
                                                                            items: serviceQuote.items,
                                                                            subtotal: serviceQuote.subtotal,
                                                                            cgst: serviceQuote.cgst,
                                                                            sgst: serviceQuote.sgst,
                                                                            igst: serviceQuote.igst,
                                                                            total_tax: serviceQuote.total_tax,
                                                                            total_amount: serviceQuote.total_amount,
                                                                            notes: 'Auto-generated from service charge quotation',
                                                                            terms: serviceQuote.terms,
                                                                            technician_id: serviceQuote.technician_id || editedJob.technician_id || null,
                                                                            technician_name: serviceQuote.technician_name || editedJob.technician_name || editedJob.technician?.name || ''
                                                                        })
                                                                    });
                                                                    const data = await res.json();
                                                                    if (data.success) {
                                                                        setSavedInvoice(data.data);
                                                                        
                                                                        await fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Final invoice ${data.data.invoice_number} created from service charge quotation ${serviceQuote.quote_number}`, user_name: 'Admin' })
                                                                        }).catch(() => {});
                                                                        
                                                                        await fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ type: 'approve_quotation', category: 'billing', description: `Customer proceeded with Service Charge Option 2.`, user_name: 'Admin' })
                                                                        }).catch(() => {});
                                                                        
                                                                        setShowCollectPayment(true);
                                                                    } else throw new Error(data.error);
                                                                } catch (e) {
                                                                    alert('Failed to auto-create invoice: ' + e.message);
                                                                } finally {
                                                                    setLoading(false);
                                                                }
                                                            }}
                                                        >
                                                            ⚙️ {loading ? 'Processing...' : 'Proceed with Service Charge'}
                                                        </button>
                                                    );
                                                } else {
                                                    if (['work_in_progress', 'completed', 'closed'].includes(editedJob.status)) {
                                                        return (
                                                            <>
                                                                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                                    <CheckCircle size={16} /> 
                                                                    {editedJob.interactions?.some(i => i.type === 'approve_quotation' && i.performed_by_name?.toLowerCase()?.includes('customer')) 
                                                                        ? 'Cx Approved from App' 
                                                                        : 'Cx Said to Proceed'}
                                                                </div>
                                                                <button
                                                                    className="btn"
                                                                    style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                                                                    disabled={loading}
                                                                    onClick={async () => {
                                                                        setLoading(true);
                                                                        try {
                                                                            const res = await fetch(`/api/admin/transactions?type=sales`, {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    account_id: savedQuotation.account_id,
                                                                                    account_name: savedQuotation.account_name || editedJob.customer?.name || 'Customer',
                                                                                    accountGSTIN: savedQuotation.accountGSTIN || '',
                                                                                    accountState: savedQuotation.accountState || 'Maharashtra',
                                                                                    billing_address: savedQuotation.billing_address || [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                                                                                    job_id: editedJob.id,
                                                                                    date: new Date().toISOString().split('T')[0],
                                                                                    due_date: new Date().toISOString().split('T')[0],
                                                                                    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                                                                    reference: savedQuotation.quote_number,
                                                                                    status: 'unpaid',
                                                                                    items: savedQuotation.items,
                                                                                    subtotal: savedQuotation.subtotal,
                                                                                    cgst: savedQuotation.cgst,
                                                                                    sgst: savedQuotation.sgst,
                                                                                    igst: savedQuotation.igst,
                                                                                    total_tax: savedQuotation.total_tax,
                                                                                    total_amount: savedQuotation.total_amount,
                                                                                    notes: 'Auto-generated from approved quotation',
                                                                                    terms: savedQuotation.terms,
                                                                                    technician_id: savedQuotation.technician_id || editedJob.technician_id || null,
                                                                                    technician_name: savedQuotation.technician_name || editedJob.technician_name || editedJob.technician?.name || ''
                                                                                })
                                                                            });
                                                                            const data = await res.json();
                                                                            if (data.success) {
                                                                                setSavedInvoice(data.data);
                                                                                fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Final invoice created from quotation ${savedQuotation.quote_number}`, user_name: 'Admin' })
                                                                                }).catch(() => {});
                                                                                setShowWhatsappPopup({ type: 'invoice', doc: data.data });
                                                                            } else throw new Error(data.error);
                                                                        } catch (e) { alert('Failed to auto-create invoice: ' + e.message); }
                                                                        finally { setLoading(false); }
                                                                    }}
                                                                >
                                                                    {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Auto-Create Final Invoice'}
                                                                </button>
                                                            </>
                                                        );
                                                    } else {
                                                        return (
                                                            <button
                                                                className="btn"
                                                                style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#38bdf815', color: '#38bdf8', border: '1px solid #38bdf840', fontWeight: 700, fontSize: '14px', borderRadius: 'var(--radius-md)' }}
                                                                onClick={async () => {
                                                                    await handleSaveStatus('work_in_progress');
                                                                    fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ type: 'approve_quotation', category: 'billing', description: `Quotation ${savedQuotation.quote_number} manually approved by customer`, user_name: 'Admin' })
                                                                    }).catch(() => {});
                                                                    setEditedJob(prev => ({ ...prev, interactions: [{ type: 'approve_quotation', performed_by_name: 'Admin', timestamp: new Date().toISOString() }, ...(prev.interactions||[])] }));
                                                                }}
                                                            >
                                                                ✓ Mark as Customer Approved
                                                            </button>
                                                        );
                                                    }
                                                }
                                            })()}
                                        </>
                                    ) : (
                                        <button
                                            className="btn"
                                            style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)' }}
                                            onClick={() => setActiveForm('calculator')}
                                        >
                                             Calculate Repair Estimate
                                        </button>
                                    )}
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

            {/* ── Parts Ordered Gate Modal ── */}
            {showPartsNoteModal && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '28px 24px' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Parts Ordered — Repair Note Required
                        </h3>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, lineHeight: 1.5 }}>
                            Describe the part(s) you have ordered. This note is sent to the customer and logged for admin visibility.
                        </p>
                        <textarea
                            value={partsNoteText}
                            onChange={e => setPartsNoteText(e.target.value)}
                            placeholder="e.g. Ordered Samsung WM drain pump — ETA 3 days. Will call to reschedule once received."
                            style={{
                                width: '100%', minHeight: 100, padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                color: '#f8fafc', resize: 'vertical', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button
                                onClick={() => { setShowPartsNoteModal(false); setPartsNoteText(''); }}
                                style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!partsNoteText.trim() || partsNoteLoading}
                                onClick={async () => {
                                    if (!partsNoteText.trim()) return;
                                    setPartsNoteLoading(true);
                                    try {
                                        const noteRes = await fetch(`/api/technician/jobs/${job.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'add_repair_note', repair_note: partsNoteText.trim(), updated_by_name: 'Admin' })
                                        });
                                        const noteData = await noteRes.json();
                                        if (!noteRes.ok) throw new Error(noteData.error || 'Failed to add repair note');
                                        await handleSaveStatus('parts_ordered');
                                        setEditedJob(prev => ({ ...prev, repair_note_added_at: noteData.job?.repair_note_added_at || new Date().toISOString() }));
                                        setShowPartsNoteModal(false);
                                        setPartsNoteText('');
                                    } catch (err) {
                                        alert('Could not save repair note: ' + err.message);
                                    } finally {
                                        setPartsNoteLoading(false);
                                    }
                                }}
                                style={{
                                    flex: 2, padding: '14px', borderRadius: 12,
                                    background: partsNoteText.trim() ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(249,115,22,0.3)',
                                    border: 'none', color: '#fff', fontWeight: 700, cursor: partsNoteText.trim() ? 'pointer' : 'not-allowed', fontSize: 14
                                }}
                            >
                                {partsNoteLoading ? 'Saving...' : 'Confirm Parts Ordered'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Generation Forms overlaid over the modal */}
            {activeForm === 'calculator' && (
                <RepairCalculator
                    job={editedJob}
                    onClose={() => setActiveForm(null)}
                    onCreateQuotation={(items) => {
                        setCalculatorItems(items);
                        setActiveForm('quotation');
                    }}
                    onCreateInvoice={(items) => {
                        setCalculatorItems(items);
                        setActiveForm('sales-invoice');
                    }}
                    hideParts={
                        isNewQuotationOption ||
                        (savedQuotations.length === 2 && savedQuotation?.id === [...savedQuotations].sort((a,b) => new Date(a.created_at) - new Date(b.created_at))[1]?.id)
                    }
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
                                body: JSON.stringify({ 
                                    ...data, 
                                    job_id: editedJob.id,
                                    technician_id: data.technician_id || editedJob.technician_id || null,
                                    technician_name: data.technician_name || editedJob.technician_name || editedJob.technician?.name || ''
                                })
                            });
                            const saveJson = await saveRes.json();
                            if (saveJson.success) savedData = saveJson.data;
                        } catch (e) { console.error('Failed to save quotation to DB', e); }

                        // 2. Save quotation in local state
                        setSavedQuotation(savedData);
                        setSavedQuotations(prev => {
                            const idx = prev.findIndex(q => q.id === savedData.id);
                            if (idx > -1) {
                                const updated = [...prev];
                                updated[idx] = savedData;
                                return updated;
                            } else {
                                return [savedData, ...prev];
                            }
                        });
                        setIsNewQuotationOption(false);
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
                        setShowWhatsappPopup({ type: 'quotation', doc: savedData });
                    }}
                    defaultAccount={job.customer_id ? { id: job.customer_id } : null}
                    prefillItems={calculatorItems}
                    existingQuotation={isNewQuotationOption ? null : savedQuotation}
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
                                body: JSON.stringify({ 
                                    ...data, 
                                    job_id: editedJob.id,
                                    technician_id: data.technician_id || editedJob.technician_id || null,
                                    technician_name: data.technician_name || editedJob.technician_name || editedJob.technician?.name || ''
                                })
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
                <DocumentWhatsAppPopup
                    document={showWhatsappPopup.doc}
                    type={showWhatsappPopup.type}
                    job={{ ...editedJob, customer_phone: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '' }}
                    onClose={() => setShowWhatsappPopup(null)}
                />
            )}
            
            {showCollectPayment && (
                <CollectPaymentFlow
                    onClose={() => setShowCollectPayment(false)}
                    context="admin"
                    currentUserName={'Admin'}
                    currentUserId={'admin'}
                    prefilledCustomer={{
                        id: editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                        name: editedJob.customerName || editedJob.customer?.name || editedJob.customer_name || 'Customer',
                        phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || editedJob.customer_phone || '',
                        mobile: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || editedJob.customer_phone || '',
                    }}
                    prefilledJob={{
                        id: editedJob.id,
                        job_number: editedJob.job_number,
                        account_id: editedJob.customerId || editedJob.account_id || editedJob.customer_id,
                        account_name: editedJob.customerName || editedJob.customer_name,
                        customer_name: editedJob.customerName || editedJob.customer_name,
                        customer_phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || editedJob.customer_phone || '',
                        category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || editedJob.category || 'Repair',
                        technician_id: editedJob.technician_id,
                    }}
                    prefilledAmount={savedInvoice?.total_amount ? String(savedInvoice.total_amount) : ''}
                    onSuccess={() => {
                        setShowCollectPayment(false);
                        setShowFeedbackCloseFlow(true);
                    }}
                />
            )}

            {/* Feedback & Close Call Questionnaire Flow */}
            {showFeedbackCloseFlow && (
                <FeedbackAndCloseCallFlow
                    onClose={() => setShowFeedbackCloseFlow(false)}
                    context="admin"
                    currentUserName={'Admin'}
                    currentUserId={'admin'}
                    job={editedJob}
                    onSuccess={async () => {
                        setShowFeedbackCloseFlow(false);
                        try {
                            const res = await fetch(`/api/technician/jobs/${editedJob.id}`);
                            const data = await res.json();
                            if (data.success && data.job) {
                                setEditedJob(data.job);
                                if (onUpdate) onUpdate(data.job);
                            } else {
                                if (onUpdate) onUpdate({ ...editedJob, status: 'closed' });
                            }
                        } catch (e) {
                            if (onUpdate) onUpdate({ ...editedJob, status: 'closed' });
                        }
                    }}
                />
            )}
        </div>
    );
}

export default JobDetailModal;
