'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Phone, MapPin, Clock, FileText, CheckSquare, Wrench, Menu, Activity, Send, FilePlus, ChevronDown, CheckCircle, AlertCircle, Package, Shield, Loader2, Navigation } from 'lucide-react';
import JobInteractionsTab from '@/app/admin/components/jobs/JobInteractionsTab';
import SalesInvoiceForm from '@/app/admin/components/accounts/SalesInvoiceForm';
import QuotationForm from '@/app/admin/components/accounts/QuotationForm';
import { transactionsAPI, printSettingsAPI } from '@/lib/adminAPI';
import { logInteraction } from '@/lib/interactions';
import RepairCalculator from '@/components/common/RepairCalculator';
import DocumentWhatsAppPopup from '@/components/common/DocumentWhatsAppPopup';
import LiveMap from '@/components/common/LiveMap';
import CollectPaymentFlow from '@/components/shared/CollectPaymentFlow';
import FeedbackAndCloseCallFlow from '@/components/shared/FeedbackAndCloseCallFlow';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const PinDropMap = dynamic(() => import('@/components/common/PinDropMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '220px', width: '100%', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
            🗺️ Loading map...
        </div>
    )
});



export default function JobDetailView({ job, onClose, onJobUpdate }) {
    const [activeTab, setActiveTab] = useState('actions');
    const [editedJob, setEditedJob] = useState(job);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [calculatorItems, setCalculatorItems] = useState(null);
    const [savedQuotation, setSavedQuotation] = useState(null);
    const [savedInvoice, setSavedInvoice] = useState(null);
    const [showWhatsappPopup, setShowWhatsappPopup] = useState(null); // { type: 'quotation' | 'invoice', doc: object }
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [markingArrival, setMarkingArrival] = useState(false);
    // Parts Ordered gate — shows inline note modal before setting parts_ordered
    const [showPartsNoteModal, setShowPartsNoteModal] = useState(false);
    const [partsNoteText, setPartsNoteText] = useState('');
    const [partsNoteLoading, setPartsNoteLoading] = useState(false);

    // Location Verification Modal — shown after Mark as Arrived
    const [showLocationVerifyModal, setShowLocationVerifyModal] = useState(false);
    const [locationVerifyStep, setLocationVerifyStep] = useState('ask'); // 'ask' | 'update'
    const [verifyLat, setVerifyLat] = useState(null);
    const [verifyLng, setVerifyLng] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyGpsLoading, setVerifyGpsLoading] = useState(false);
    const [verifyGpsSuccess, setVerifyGpsSuccess] = useState(false);
    const pendingArrivedDataRef = useRef(null); // stores { arrivedAt, jobData } until modal is resolved

    // Payment collection state
    const [showCollectPayment, setShowCollectPayment] = useState(false);
    const [showFeedbackCloseFlow, setShowFeedbackCloseFlow] = useState(false);

    // Quotation Decision Flow
    // quotationDecisionMode: null | 'denied' | 'thinking'
    // After FeedbackAndCloseCallFlow "Save Notes" → CollectPaymentFlow → (if denied: FeedbackFlow, if thinking: done + no close)
    const [quotationDecisionMode, setQuotationDecisionMode] = useState(null);
    const [showQuotationFeedbackFlow, setShowQuotationFeedbackFlow] = useState(false);
    const [showQuotationCollectPayment, setShowQuotationCollectPayment] = useState(false);
    const [showQuotationFinalFeedback, setShowQuotationFinalFeedback] = useState(false);
    const [showServiceChargeCloseCallFlow, setShowServiceChargeCloseCallFlow] = useState(false);
    const [showServiceChargeCollectPayment, setShowServiceChargeCollectPayment] = useState(false);
    const [showServiceChargeFeedbackQR, setShowServiceChargeFeedbackQR] = useState(false);
    // Read technician identity from localStorage for CollectPaymentFlow (SSR-safe)
    const { techName, techId } = (() => {
        if (typeof window === 'undefined') return { techName: 'Technician', techId: null };
        try { const t = JSON.parse(localStorage.getItem('technicianData') || '{}'); return { techName: t.name || 'Technician', techId: t.id || null }; } catch(e) { return { techName: 'Technician', techId: null }; }
    })();

    const storedLat = job?.property?.latitude || job?.latitude;
    const storedLng = job?.property?.longitude || job?.longitude;

    // No-Service Close Call modal state
    const [showNoServiceModal, setShowNoServiceModal] = useState(false);
    const [noServicePOC, setNoServicePOC] = useState('');
    const [noServiceReason, setNoServiceReason] = useState('');
    const [noServiceLoading, setNoServiceLoading] = useState(false);
    const [noChargeChecked, setNoChargeChecked] = useState(false);

    // Live Location Broadcaster — broadcasts GPS to customer app when job is in-progress
    useEffect(() => {
        let watchId;
        let channel;

        if (editedJob?.status === 'work_in_progress') {
            channel = supabase.channel(`tracking:job_${editedJob.id}`, {
                config: { broadcast: { self: true, ack: false } }
            });
            channel.subscribe();

            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    channel.send({
                        type: 'broadcast',
                        event: 'location_update',
                        payload: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timestamp: new Date().toISOString() }
                    });
                },
                (err) => console.error('GPS Watch Error:', err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
            if (channel) supabase.removeChannel(channel);
        };
    }, [editedJob?.status, editedJob?.id]);

    // Fetch fresh job and interactions on mount
    useEffect(() => {
        const fetchFreshData = async () => {
            if (!job?.id) return;
            try {
                // Fetch fresh job + both interaction sources simultaneously
                // Note: skip admin/transactions here — requires admin auth, not available to technician
                const t = Date.now();
                const [jobRes, intRes, jobIntRes] = await Promise.all([
                    fetch(`/api/technician/jobs/${job.id}?t=${t}`),
                    fetch(`/api/admin/interactions?job_id=${job.id}&t=${t}`),
                    fetch(`/api/technician/jobs/${job.id}/interactions?t=${t}`),
                ]);
                const jobData = await jobRes.json();
                const intData = await intRes.json().catch(() => ({ data: [] }));
                const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));

                // Try to load quotation and invoice from technician-accessible routes
                try {
                    const [quotaRes, invRes] = await Promise.all([
                        fetch(`/api/technician/jobs/${job.id}/quotation`),
                        fetch(`/api/technician/jobs/${job.id}/invoice`)
                    ]);
                    if (quotaRes.ok) {
                        const quotaData = await quotaRes.json();
                        if (quotaData.success && quotaData.data?.length > 0) setSavedQuotation(quotaData.data[0]);
                    }
                    if (invRes.ok) {
                        const invData = await invRes.json();
                        // Support both formats depending on how /invoice route is built
                        if (invData.success && invData.data?.length > 0) setSavedInvoice(invData.data[0]);
                        else if (invData.success && invData.invoice) setSavedInvoice(invData.invoice);
                    }
                } catch (e) { /* silent fail */ }

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

                    const freshJob = { ...jobData.job, interactions: allInt };
                    setEditedJob(freshJob);

                    // Sync Kanban — if the DB status differs from the list's stale value, push
                    // the update up so the card moves to the correct column immediately
                    if (jobData.job.status !== job.status && onJobUpdate) {
                        onJobUpdate(freshJob);
                    }
                }
            } catch (err) {
                console.error('Failed to load fresh job details', err);
            }
        };
        fetchFreshData();
    }, [job?.id]);

    useEffect(() => {
        if (job?._calculatorItems) {
            setCalculatorItems(job._calculatorItems);
            setActiveForm('quotation');
        }
    }, [job?._calculatorItems]);

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

            const merged = { ...editedJob, status: newStatus };
            setEditedJob(merged);
            // Pass the correctly-shaped merged job to parent (raw data.job has DB field names, not transformed ones)
            if (onJobUpdate) onJobUpdate(merged);
            alert('Status updated successfully!');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoCreateQuotation = async (items) => {
        setLoading(true);
        try {
            // 1. Fetch print settings to get default showTax
            let showTax = false;
            try {
                const settings = await printSettingsAPI.get();
                if (settings) {
                    showTax = settings.quotation_show_gst ?? settings.show_gst ?? true;
                }
            } catch (err) {
                console.error('Failed to fetch print settings', err);
            }

            // 2. Format items & calculate totals
            const companyState = 'Maharashtra';
            const accountState = editedJob.customer?.address?.state || 'Maharashtra';
            const isInterState = accountState !== companyState;

            const formattedItems = items.map((it, idx) => {
                const isService = it.type === 'service';
                const rate = Number(it.rate) || 0;
                const qty = Number(it.qty) || 1;
                const taxRate = Number(it.taxRate) || 18;
                const subtotal = qty * rate;
                const total = showTax ? subtotal * (1 + taxRate / 100) : subtotal;

                return {
                    id: isService ? Date.now() + idx : idx + 1,
                    productId: it.productId || null,
                    description: it.description,
                    hsn: '',
                    qty: qty,
                    rate: rate,
                    discount: 0,
                    taxRate: taxRate,
                    terms_conditions: it.terms_conditions || [],
                    unit: it.unit || 'Nos',
                    total: total,
                    isCharge: isService
                };
            });

            const itemsSubtotal = formattedItems.filter(i => !i.isCharge).reduce((sum, item) => sum + (item.qty * item.rate), 0);
            const chargesTotal = formattedItems.filter(i => i.isCharge).reduce((sum, item) => sum + (item.qty * item.rate), 0);
            const combinedTaxable = itemsSubtotal + chargesTotal;

            let cgst = 0, sgst = 0, igst = 0;
            if (showTax) {
                formattedItems.forEach(item => {
                    const taxAmount = (item.qty * item.rate * item.taxRate) / 100;
                    if (isInterState) {
                        igst += taxAmount;
                    } else {
                        cgst += taxAmount / 2;
                        sgst += taxAmount / 2;
                    }
                });
            }

            const totalTax = cgst + sgst + igst;
            const totalAmount = combinedTaxable + totalTax;

            const isEditing = !!savedQuotation?.id;

            const quotationPayload = {
                account_id: editedJob.customerId,
                account_name: editedJob.customerName || 'Customer',
                account_phone: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                account_mobile: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                account_email: editedJob.email || editedJob.customer?.email || '',
                account_gstin: editedJob.customer?.gstin || '',
                account_state: accountState,
                billing_address: [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                quote_number: isEditing ? savedQuotation.quote_number : `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                date: isEditing ? savedQuotation.date : new Date().toISOString().split('T')[0],
                valid_until: isEditing ? savedQuotation.valid_until : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                subject: `Quotation for Job #${editedJob.job_number || editedJob.id}`,
                items: formattedItems,
                notes: isEditing ? (savedQuotation.notes || 'Auto-generated from Repair Calculator') : 'Auto-generated from Repair Calculator',
                showTax,
                status: 'sent',
                items_subtotal: itemsSubtotal,
                subtotal: combinedTaxable,
                discount: 0,
                charges_total: chargesTotal,
                cgst,
                sgst,
                igst,
                total_tax: totalTax,
                total_amount: totalAmount,
                job_id: editedJob.id,
                technician_id: techId,
                technician_name: techName || editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician'
            };

            if (isEditing) {
                quotationPayload.id = savedQuotation.id;
            }

            // 3. Save or update in database
            const saveRes = await fetch(`/api/admin/transactions?type=quotation`, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationPayload)
            });
            const saveJson = await saveRes.json();
            if (!saveJson.success) {
                throw new Error(saveJson.error || 'Failed to save quotation');
            }

            const savedData = saveJson.data;
            setSavedQuotation(savedData);

            // 4. Log interaction
            const interactionType = isEditing ? 'quotation-edited' : 'quotation-created';
            const interactionDesc = isEditing 
                ? `Quotation ${savedData?.quote_number || savedData?.reference || ''} updated for job #${editedJob.job_number || editedJob.id}`
                : `Quotation ${savedData?.quote_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`;

            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: interactionType,
                    category: 'billing',
                    description: interactionDesc,
                    user_name: techName,
                    customer_id: editedJob.customerId || null
                })
            }).catch(() => {});

            // 5. Update job status to 'quotation_sent' if not already
            if (editedJob.status !== 'quotation_sent') {
                await handleSaveStatus('quotation_sent');
            }

            // 6. Close calculator and trigger WhatsApp share popup
            setActiveForm(null);
            setCalculatorItems(null);
            setShowWhatsappPopup({ type: 'quotation', doc: savedData });
        } catch (e) {
            console.error('Failed to auto-create/update quotation', e);
            alert('Failed to save quotation: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoCreateInvoiceFromCalculator = async (items) => {
        setLoading(true);
        try {
            // 1. Fetch print settings to resolve showTax
            let showTax = false;
            try {
                const settings = await printSettingsAPI.get();
                if (settings) {
                    showTax = settings.quotation_show_gst ?? settings.show_gst ?? true;
                }
            } catch (err) {
                console.error('Failed to fetch print settings', err);
            }

            // 2. Format items & calculate totals
            const companyState = 'Maharashtra';
            const accountState = editedJob.customer?.address?.state || 'Maharashtra';
            const isInterState = accountState !== companyState;

            const formattedItems = items.map((it, idx) => {
                const isService = it.type === 'service';
                const rate = Number(it.rate) || 0;
                const qty = Number(it.qty) || 1;
                const taxRate = Number(it.taxRate) || 18;
                const subtotal = qty * rate;
                const total = showTax ? subtotal * (1 + taxRate / 100) : subtotal;

                return {
                    id: isService ? Date.now() + idx : idx + 1,
                    productId: it.productId || null,
                    description: it.description,
                    hsn: '',
                    qty: qty,
                    rate: rate,
                    discount: 0,
                    taxRate: taxRate,
                    terms_conditions: it.terms_conditions || [],
                    unit: it.unit || 'Nos',
                    total: total,
                    isCharge: isService
                };
            });

            const itemsSubtotal = formattedItems.filter(i => !i.isCharge).reduce((sum, item) => sum + (item.qty * item.rate), 0);
            const chargesTotal = formattedItems.filter(i => i.isCharge).reduce((sum, item) => sum + (item.qty * item.rate), 0);
            const combinedTaxable = itemsSubtotal + chargesTotal;

            let cgst = 0, sgst = 0, igst = 0;
            if (showTax) {
                formattedItems.forEach(item => {
                    const taxAmount = (item.qty * item.rate * item.taxRate) / 100;
                    if (isInterState) {
                        igst += taxAmount;
                    } else {
                        cgst += taxAmount / 2;
                        sgst += taxAmount / 2;
                    }
                });
            }

            const totalTax = cgst + sgst + igst;
            const totalAmount = combinedTaxable + totalTax;

            const isEditing = !!savedQuotation?.id;

            // Save the updated quotation in database
            const quotationPayload = {
                account_id: editedJob.customerId,
                account_name: editedJob.customerName || 'Customer',
                account_phone: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                account_mobile: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                account_email: editedJob.email || editedJob.customer?.email || '',
                account_gstin: editedJob.customer?.gstin || '',
                account_state: accountState,
                billing_address: [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                quote_number: isEditing ? savedQuotation.quote_number : `QUO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                date: isEditing ? savedQuotation.date : new Date().toISOString().split('T')[0],
                valid_until: isEditing ? savedQuotation.valid_until : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                subject: `Quotation for Job #${editedJob.job_number || editedJob.id}`,
                items: formattedItems,
                notes: 'Auto-generated service charge quotation',
                showTax,
                status: 'sent',
                items_subtotal: itemsSubtotal,
                subtotal: combinedTaxable,
                discount: 0,
                charges_total: chargesTotal,
                cgst,
                sgst,
                igst,
                total_tax: totalTax,
                total_amount: totalAmount,
                job_id: editedJob.id,
                technician_id: techId,
                technician_name: techName || editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician'
            };

            if (isEditing) {
                quotationPayload.id = savedQuotation.id;
            }

            const saveRes = await fetch(`/api/admin/transactions?type=quotation`, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quotationPayload)
            });
            const saveJson = await saveRes.json();
            if (!saveJson.success) {
                throw new Error(saveJson.error || 'Failed to save quotation');
            }

            const savedData = saveJson.data;
            setSavedQuotation(savedData);

            // Log quotation interaction
            const qType = isEditing ? 'quotation-edited' : 'quotation-created';
            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: qType,
                    category: 'billing',
                    description: `Quotation ${savedData.quote_number} updated to service charge only`,
                    user_name: techName,
                    customer_id: editedJob.customerId || null
                })
            }).catch(() => {});

            // Auto-create final invoice for the service charge
            const invoiceRes = await fetch(`/api/admin/transactions?type=sales`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_id: savedData.account_id,
                    account_name: savedData.account_name || editedJob.customer?.name || 'Customer',
                    accountGSTIN: savedData.accountGSTIN || '',
                    accountState: savedData.account_state || 'Maharashtra',
                    billing_address: savedData.billing_address || [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                    job_id: editedJob.id,
                    date: new Date().toISOString().split('T')[0],
                    due_date: new Date().toISOString().split('T')[0],
                    invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                    reference: savedData.quote_number,
                    status: 'unpaid',
                    items: savedData.items,
                    subtotal: savedData.subtotal,
                    cgst: savedData.cgst,
                    sgst: savedData.sgst,
                    igst: savedData.igst,
                    total_tax: savedData.total_tax,
                    total_amount: savedData.total_amount,
                    notes: 'Auto-generated from service charge quotation',
                    terms: savedData.terms,
                    technician_id: savedData.technician_id || techId,
                    technician_name: savedData.technician_name || techName || editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician'
                })
            });
            const invoiceJson = await invoiceRes.json();
            if (!invoiceJson.success) {
                throw new Error(invoiceJson.error || 'Failed to auto-create invoice');
            }

            const finalInvoice = invoiceJson.data;
            setSavedInvoice(finalInvoice);

            // Log invoice interaction
            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'invoice-created',
                    category: 'billing',
                    description: `Final invoice ${finalInvoice.invoice_number} created from quotation ${savedData.quote_number}`,
                    user_name: techName
                })
            }).catch(() => {});

            // Update job status to quotation_sent if not already
            if (editedJob.status !== 'quotation_sent') {
                await handleSaveStatus('quotation_sent');
            }

            // Close calculator and trigger Close Call Questionnaire Flow
            setActiveForm(null);
            setCalculatorItems(null);
            setShowServiceChargeCloseCallFlow(true);
        } catch (e) {
            console.error('Failed to auto-create invoice from calculator', e);
            alert('Failed to save & invoice: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkArrived = async () => {
        setMarkingArrival(true);
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        
        const performMarkArrived = async (lat = null, lng = null) => {
            try {
                // Calls mark_arrived action → sets arrived_at + auto-advances status to diagnosing_quoting
                const res = await fetch(`/api/technician/jobs/${job.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'mark_arrived', 
                        updated_by_name: techName,
                        latitude: lat,
                        longitude: lng
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to mark arrival');
                pendingArrivedDataRef.current = { arrivedAt: data.job?.arrived_at || new Date().toISOString(), jobData: data.job };
                const existingLat = editedJob._raw_property?.latitude || editedJob.location?.lat || null;
                const existingLng = editedJob._raw_property?.longitude || editedJob.location?.lng || null;
                setVerifyLat(existingLat);
                setVerifyLng(existingLng);
                setLocationVerifyStep('ask');
                setShowLocationVerifyModal(true);
            } catch (err) {
                alert('Could not mark arrival: ' + err.message);
            } finally {
                setMarkingArrival(false);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => performMarkArrived(pos.coords.latitude, pos.coords.longitude),
                () => performMarkArrived(),
                { timeout: 5000, enableHighAccuracy: true }
            );
        } else {
            performMarkArrived();
        }
    };

    const handleCallCustomerClick = () => {
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        const techId = editedJob.assignedTo || job.technician_id || null;
        
        const sendLog = (lat = null, lng = null) => {
            const metadata = lat && lng ? { latitude: lat, longitude: lng } : {};
            logInteraction({
                type: 'customer-called',
                category: 'communication',
                jobId: String(job.id),
                customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
                customerName: editedJob.customerName || editedJob.customer_name,
                description: `Technician called the customer`,
                performedBy: techId,
                performedByName: techName,
                metadata,
                source: 'Technician App',
            });
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => sendLog(pos.coords.latitude, pos.coords.longitude),
                () => sendLog(),
                { timeout: 5000, enableHighAccuracy: true }
            );
        } else {
            sendLog();
        }
    };

    const handleMapsNavigateClick = () => {
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        const techId = editedJob.assignedTo || job.technician_id || null;
        
        const sendLog = (lat = null, lng = null) => {
            const metadata = lat && lng ? { latitude: lat, longitude: lng } : {};
            logInteraction({
                type: 'map-navigation-opened',
                category: 'navigation',
                jobId: String(job.id),
                customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
                customerName: editedJob.customerName || editedJob.customer_name,
                description: `Technician opened maps navigation for job at: ${[editedJob.address, editedJob.locality, editedJob.city].filter(Boolean).join(', ')}`,
                performedBy: techId,
                performedByName: techName,
                metadata,
                source: 'Technician App',
            });
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => sendLog(pos.coords.latitude, pos.coords.longitude),
                () => sendLog(),
                { timeout: 5000, enableHighAccuracy: true }
            );
        } else {
            sendLog();
        }
    };

    // Called when tech confirms pin was correct (Yes path)
    const handleLocationVerifyYes = async () => {
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        setShowLocationVerifyModal(false);
        const pending = pendingArrivedDataRef.current;
        setEditedJob(prev => ({ ...prev, arrived_at: pending?.arrivedAt, status: 'diagnosing_quoting' }));
        if (onJobUpdate && pending?.jobData) onJobUpdate(pending.jobData);
        // Mark the existing pin as verified by this technician
        const propertyId = editedJob._raw_property?.id || null;
        if (propertyId) {
            fetch(`/api/admin/properties?id=${propertyId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    location_verified_by: techName,
                    location_verified_at: new Date().toISOString(),
                })
            }).catch(() => {});
        }
        // Log the confirmation
        fetch(`/api/technician/jobs/${job.id}/interactions`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'location-verified', category: 'property', description: `Customer pin location confirmed accurate by ${techName}`, user_name: techName })
        }).catch(() => {});
    };

    // Called when tech confirms updated pin location (No → update path)
    const handleLocationVerifySave = async () => {
        if (!verifyLat || !verifyLng) { alert('Please set the pin location first.'); return; }
        setVerifyLoading(true);
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        const propertyId = editedJob._raw_property?.id || null;
        try {
            // Update property pin + verified fields
            if (propertyId) {
                await fetch(`/api/admin/properties?id=${propertyId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        latitude: verifyLat,
                        longitude: verifyLng,
                        location_verified_by: techName,
                        location_verified_at: new Date().toISOString(),
                    })
                });
            }
            // Log the pin update
            await fetch(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'location-updated', category: 'property', description: `Customer pin location updated and verified by ${techName} (${verifyLat.toFixed(5)}, ${verifyLng.toFixed(5)})`, user_name: techName })
            }).catch(() => {});
            setShowLocationVerifyModal(false);
            const pending = pendingArrivedDataRef.current;
            setEditedJob(prev => ({ ...prev, arrived_at: pending?.arrivedAt, status: 'diagnosing_quoting' }));
            if (onJobUpdate && pending?.jobData) onJobUpdate(pending.jobData);
        } catch (err) {
            alert('Could not save location: ' + err.message);
        } finally {
            setVerifyLoading(false);
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



    return (
        <>
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
                                <Wrench size={12} style={{ display: 'inline', marginRight: 4 }} />{editedJob.description || editedJob.product?.type || editedJob.issueCategory}
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



                    {activeTab === 'details' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
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
                                                    {inWarranty ? 'In Warranty' : (w || 'Out of Warranty')}
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
                            {(editedJob.dueDate || editedJob.scheduled_date || editedJob.confirmedVisitTime || editedJob.scheduled_time) && (
                                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Clock size={16} color="var(--text-secondary)" /> Scheduling
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                        {(editedJob.dueDate || editedJob.scheduled_date) && (
                                            <div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Scheduled Date</div>
                                                <div style={{ fontWeight: 500 }}>{new Date(editedJob.scheduled_date || editedJob.dueDate).toLocaleDateString()}</div>
                                            </div>
                                        )}
                                        {(editedJob.confirmedVisitTime || editedJob.scheduled_time) && (
                                            <div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Time Slot</div>
                                                <div style={{ fontWeight: 500 }}>{editedJob.scheduled_time || editedJob.confirmedVisitTime}</div>
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

                            {/* Job Status Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} color="#3b82f6" /> Job Status
                                </h3>
                                
                                <select 
                                    className="form-select" 
                                    value={editedJob.status}
                                    onChange={(e) => {
                                        const newStatus = e.target.value;
                                        if (newStatus === 'parts_ordered') {
                                            // Gate: require repair note first
                                            setShowPartsNoteModal(true);
                                        } else {
                                            handleSaveStatus(newStatus);
                                        }
                                    }}
                                    disabled={loading}
                                    style={{ width: '100%', marginBottom: '12px', padding: '12px', fontSize: '15px', fontWeight: 500 }}
                                >
                                    {/* Tech-settable statuses only */}
                                    <option value="scheduled">Scheduled</option>
                                    <option value="diagnosing_quoting">Diagnosing &amp; Quoting</option>
                                    <option value="quotation_sent">Quotation Sent</option>
                                    <option value="parts_ordered">Parts Ordered</option>
                                    <option value="work_in_progress">Work In Progress</option>
                                    <option value="cx_reschedule">Cx Reschedule</option>
                                    {/* Read-only states shown for context but disabled */}
                                    <option value="new_job_request" disabled>New Job Request (admin only)</option>
                                    <option value="cancelled" disabled>Cancelled (admin only)</option>
                                    <option value="closed" disabled>Closed (auto on payment)</option>
                                </select>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Changing status automatically updates the admin timeline and notifies the team.</p>
                            </div>

                            {/* Customer Card */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Customer Info</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={16} color="var(--text-secondary)" />
                                        <a href={`tel:${editedJob.mobile}`} onClick={handleCallCustomerClick} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>{editedJob.mobile}</a>
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
                                                onClick={handleMapsNavigateClick}
                                                target="_blank" rel="noreferrer"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none', backgroundColor: '#3b82f6', padding: '5px 12px', borderRadius: 6, fontWeight: 600 }}
                                            >
                                                {storedLat && storedLng ? 'Navigate (Precise)' : 'Open in Maps →'}
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Start Job — shown when scheduled */}
                            {editedJob.status === 'scheduled' && !editedJob.on_way_at && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: '2px solid #38bdf8', backgroundColor: 'rgba(56,189,248,0.04)' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                         Ready to Head Out?
                                    </h3>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                        Tap below to start GPS sharing with the customer. This locks their cancel/reschedule option so you won't face last-minute changes.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)' }}
                                        onClick={async () => {
                                            if (!navigator.geolocation) return alert('GPS not supported on this device');
                                            navigator.geolocation.getCurrentPosition(async (pos) => {
                                                const lat = pos.coords.latitude;
                                                const lng = pos.coords.longitude;
                                                const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                                await fetch(`/api/technician/jobs/${job.id}`, {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ 
                                                        action: 'mark_on_way', 
                                                        updated_by_name: techName,
                                                        latitude: lat,
                                                        longitude: lng
                                                    })
                                                });
                                                setEditedJob(prev => ({ ...prev, on_way_at: new Date().toISOString() }));
                                            }, () => alert('Please enable GPS permissions.'));
                                        }}
                                        disabled={loading}
                                    >
                                         Start Job & Share Location
                                    </button>
                                </div>
                            )}
                            {editedJob.status === 'scheduled' && editedJob.on_way_at && (
                                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', fontSize: 13, color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                     On the way — customer notified. Location sharing active.
                                </div>
                            )}

                            {/* Mark as Arrived — shown when scheduled and on_way_at is set */}
                            {editedJob.status === 'scheduled' && editedJob.on_way_at && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: editedJob.arrived_at ? '1px solid rgba(16,185,129,0.4)' : '2px solid #8b5cf6' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <MapPin size={18} color={editedJob.arrived_at ? '#10b981' : '#8b5cf6'} />
                                        {editedJob.arrived_at ? 'Arrival Confirmed ✓' : 'At Customer Location?'}
                                    </h3>
                                    {editedJob.arrived_at ? (
                                        <div style={{ padding: '12px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, textAlign: 'center', fontSize: 13, color: '#10b981', fontWeight: 600 }}>
                                            ✓ Arrived at {new Date(editedJob.arrived_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 400 }}>Status auto-changed to Diagnosing & Quoting</div>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                                Tap when you reach the customer — status will auto-advance to <strong>Diagnosing & Quoting</strong> and your arrival is recorded.
                                            </p>
                                            <button
                                                className="btn btn-primary"
                                                onClick={handleMarkArrived}
                                                disabled={markingArrival}
                                                style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}
                                            >
                                                {markingArrival ? ' Recording...' : 'Mark as Arrived'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Close Call — No Service (shown on diagnosing_quoting, scheduled, or quotation_sent) */}
                            {(editedJob.status === 'diagnosing_quoting' || editedJob.status === 'scheduled' || editedJob.status === 'quotation_sent') && (
                                <div className="card" style={{ padding: 'var(--spacing-md)', border: '1px solid rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.03)' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
                                        <X size={16} color="#f87171" /> Close Call — No Service
                                    </h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                        Use this if the customer denied entry, was unavailable, or the visit couldn't proceed. The job will be closed with no service charge.
                                    </p>
                                    <button
                                        className="btn"
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 700, fontSize: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                        onClick={() => { setNoServicePOC(''); setNoServiceReason(''); setNoChargeChecked(false); setShowNoServiceModal(true); }}
                                    >
                                        <X size={15} /> Close Call Without Service
                                    </button>
                                </div>
                            )}

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
                                                        style={{ padding: '8px 16px', backgroundColor: 'rgba(16,185,129,0.9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                        onClick={() => setShowCollectPayment(true)}
                                                    >
                                                        <CheckCircle size={14} /> Collect Payment
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ) : savedQuotation ? (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Quotation {savedQuotation.quote_number || ''}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total: ₹{(savedQuotation.total_amount || 0).toLocaleString('en-IN')}</div>
                                                </div>
                                                {/* Edit goes away if approved */}
                                                {!['work_in_progress', 'completed', 'closed'].includes(editedJob.status) && (
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '8px 16px', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 600, fontSize: '13px', borderRadius: 'var(--radius-md)' }}
                                                        onClick={() => setActiveForm('calculator')}
                                                    >
                                                        Edit / Send
                                                    </button>
                                                )}
                                            </div>

                                            {/* Approval Flow */}
                                            {['work_in_progress', 'completed', 'closed'].includes(editedJob.status) ? (
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
                                                                        technician_id: savedQuotation.technician_id || techId,
                                                                        technician_name: savedQuotation.technician_name || techName || editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician'
                                                                    })
                                                                });
                                                                const data = await res.json();
                                                                if (data.success) {
                                                                    setSavedInvoice(data.data);
                                                                    fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Final invoice created from quotation ${savedQuotation.quote_number}`, user_name: techName })
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
                                            ) : (
                                                // ── 3 Quotation Decision Cards ──
                                                (() => {
                                                    const cxAppApproved = editedJob.interactions?.some(i =>
                                                        i.type === 'approve_quotation' &&
                                                        i.performed_by_name?.toLowerCase()?.includes('customer')
                                                    );
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                What did the customer decide?
                                                            </div>

                                                            {/* Option 1: Quotation Approved */}
                                                            <button
                                                                className="btn"
                                                                disabled={cxAppApproved}
                                                                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', gap: 10, background: cxAppApproved ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(16,185,129,0.08)', color: cxAppApproved ? '#fff' : '#10b981', border: cxAppApproved ? 'none' : '1px solid rgba(16,185,129,0.3)', fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: cxAppApproved ? 'default' : 'pointer', opacity: cxAppApproved ? 1 : 1 }}
                                                                onClick={async () => {
                                                                    if (cxAppApproved) return;
                                                                    const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                                                    await handleSaveStatus('work_in_progress');
                                                                    fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ type: 'approve_quotation', category: 'billing', description: `Quotation ${savedQuotation.quote_number} approved by customer (confirmed by ${techName})`, user_name: techName })
                                                                    }).catch(() => {});
                                                                    setEditedJob(prev => ({ ...prev, interactions: [{ type: 'approve_quotation', performed_by_name: techName, timestamp: new Date().toISOString() }, ...(prev.interactions || [])] }));
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 20 }}>✅</span>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <div>Quotation Approved by Customer</div>
                                                                    {cxAppApproved && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Approved via Customer App</div>}
                                                                </div>
                                                            </button>

                                                            {/* Option 2: Quotation Denied — close on visit charge */}
                                                            <button
                                                                className="btn"
                                                                disabled={cxAppApproved}
                                                                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(239,68,68,0.06)', color: cxAppApproved ? '#64748b' : '#f87171', border: `1px solid ${cxAppApproved ? 'rgba(255,255,255,0.05)' : 'rgba(239,68,68,0.25)'}`, fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: cxAppApproved ? 'not-allowed' : 'pointer', opacity: cxAppApproved ? 0.4 : 1 }}
                                                                onClick={() => {
                                                                    if (cxAppApproved) return;
                                                                    setQuotationDecisionMode('denied');
                                                                    setActiveForm('calculator');
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 20 }}>❌</span>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <div>Quotation Denied</div>
                                                                    <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.75 }}>Close on visit charge → collect payment → feedback</div>
                                                                </div>
                                                            </button>

                                                            {/* Option 3: Cx needs time */}
                                                            <button
                                                                className="btn"
                                                                disabled={cxAppApproved}
                                                                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,158,11,0.06)', color: cxAppApproved ? '#64748b' : '#f59e0b', border: `1px solid ${cxAppApproved ? 'rgba(255,255,255,0.05)' : 'rgba(245,158,11,0.25)'}`, fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: cxAppApproved ? 'not-allowed' : 'pointer', opacity: cxAppApproved ? 0.4 : 1 }}
                                                                onClick={() => {
                                                                    if (cxAppApproved) return;
                                                                    setQuotationDecisionMode('thinking');
                                                                    setActiveForm('calculator');
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 20 }}>🕐</span>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <div>Customer Needs Time to Think</div>
                                                                    <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.75 }}>Visit charge → collect payment → admin follow-up in 2 days</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    );
                                                })()
                                            )}
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
            </div>

            {/* ── No-Service Close Call Modal ── */}
            {showNoServiceModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1e1a2e,#0f0f1a)', borderTop: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px 24px 0 0', padding: '28px 20px calc(28px + env(safe-area-inset-bottom))' }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '0 auto 20px' }} />

                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <X size={20} color="#f87171" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0 }}>Close Call — No Service</h3>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Job will be closed without a service charge</p>
                            </div>
                        </div>

                        {/* Point of Contact */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                Point of Contact *
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                                {['Customer', 'Security Guard', 'Family Member', 'Neighbor', 'No One Available'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setNoServicePOC(opt)}
                                        style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${noServicePOC === opt ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, background: noServicePOC === opt ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)', color: noServicePOC === opt ? '#f87171' : '#94a3b8', transition: 'all 0.15s' }}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                            <input
                                value={noServicePOC}
                                onChange={e => setNoServicePOC(e.target.value)}
                                placeholder="Or type a custom name..."
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Reason */}
                        <div style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                                Reason for Closing *
                            </div>
                            <textarea
                                value={noServiceReason}
                                onChange={e => setNoServiceReason(e.target.value)}
                                placeholder="e.g. Customer denied entry. Said they will call back to reschedule. No service charge applied."
                                rows={3}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                            />
                        </div>

                        {/* Mandatory No Service Charge Checkbox */}
                        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <input
                                type="checkbox"
                                id="noChargeChecked"
                                checked={noChargeChecked}
                                onChange={e => setNoChargeChecked(e.target.checked)}
                                style={{ width: 18, height: 18, borderRadius: 4, accentColor: '#ef4444', cursor: 'pointer', marginTop: 1 }}
                            />
                            <label htmlFor="noChargeChecked" style={{ fontSize: 13, color: '#cbd5e1', cursor: 'pointer', userSelect: 'none', lineHeight: 1.4 }}>
                                I confirm no service charge was taken <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                onClick={() => setShowNoServiceModal(false)}
                                style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!noServicePOC.trim() || !noServiceReason.trim() || !noChargeChecked || noServiceLoading}
                                onClick={async () => {
                                    if (!noServicePOC.trim() || !noServiceReason.trim() || !noChargeChecked) return;
                                    setNoServiceLoading(true);
                                    const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                    try {
                                        const description = `Close Call — No Service. POC: ${noServicePOC.trim()}. Reason: ${noServiceReason.trim()}`;
                                        // 1. Log interaction
                                        await fetch(`/api/technician/jobs/${job.id}/interactions`, {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ type: 'close-call-no-service', category: 'job', description, user_name: techName })
                                        });
                                        // 2. Close the job
                                        const res = await fetch(`/api/technician/jobs/${job.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'close_job', notes: description, updated_by_name: techName })
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || 'Failed to close job');
                                        setShowNoServiceModal(false);
                                        setEditedJob(prev => ({ ...prev, status: 'closed' }));
                                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });
                                    } catch (err) {
                                        alert('Could not close job: ' + err.message);
                                    } finally {
                                        setNoServiceLoading(false);
                                    }
                                }}
                                style={{ flex: 2, padding: '14px', borderRadius: 14, background: noServicePOC.trim() && noServiceReason.trim() && noChargeChecked ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(239,68,68,0.2)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 14, cursor: noServicePOC.trim() && noServiceReason.trim() && noChargeChecked && !noServiceLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            >
                                {noServiceLoading
                                    ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Closing...</>
                                    : <><X size={15} /> Confirm Close Call</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Location Verify Modal — shown after Mark as Arrived ── */}
            {showLocationVerifyModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '28px 20px calc(28px + env(safe-area-inset-bottom))' }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

                        {locationVerifyStep === 'ask' && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <MapPin size={20} color="#38bdf8" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0 }}>Pin Location Check</h3>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>You've arrived ✓ — quick check before we proceed</p>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 16px', margin: '16px 0' }}>
                                    <p style={{ fontSize: 14, color: '#cbd5e1', margin: 0, lineHeight: 1.6 }}>
                                        Was the customer's <strong style={{ color: '#38bdf8' }}>pin location on the map</strong> accurate for this address?
                                    </p>
                                    {editedJob.address && (
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <MapPin size={11} />
                                            {[editedJob.address, editedJob.locality, editedJob.city].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={handleLocationVerifyYes}
                                        style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <CheckCircle size={17} /> Yes, it's correct
                                    </button>
                                    <button
                                        onClick={() => setLocationVerifyStep('update')}
                                        style={{ flex: 1, padding: '14px', borderRadius: 14, background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', color: '#fb923c', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <MapPin size={17} /> No, update pin
                                    </button>
                                </div>
                            </>
                        )}

                        {locationVerifyStep === 'update' && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <button
                                        onClick={() => setLocationVerifyStep('ask')}
                                        style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, padding: '6px 10px', color: '#94a3b8', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                                    >← Back</button>
                                    <div>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', margin: 0 }}>Set Correct Pin Location</h3>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Drag the pin or use your GPS to mark the exact spot</p>
                                    </div>
                                </div>

                                {/* GPS Button */}
                                <button
                                    disabled={verifyGpsLoading}
                                    onClick={() => {
                                        if (!navigator.geolocation) { alert('GPS not available on this device'); return; }
                                        setVerifyGpsLoading(true);
                                        setVerifyGpsSuccess(false);
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => {
                                                setVerifyLat(pos.coords.latitude);
                                                setVerifyLng(pos.coords.longitude);
                                                setVerifyGpsLoading(false);
                                                setVerifyGpsSuccess(true);
                                                setTimeout(() => setVerifyGpsSuccess(false), 3000);
                                            },
                                            () => { setVerifyGpsLoading(false); alert('Could not get GPS. Try dragging the pin manually.'); },
                                            { enableHighAccuracy: true, timeout: 10000 }
                                        );
                                    }}
                                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${verifyGpsSuccess ? 'rgba(16,185,129,0.4)' : 'rgba(56,189,248,0.3)'}`, background: verifyGpsSuccess ? 'rgba(16,185,129,0.12)' : 'rgba(56,189,248,0.1)', color: verifyGpsSuccess ? '#10b981' : '#38bdf8', fontWeight: 700, fontSize: 14, cursor: verifyGpsLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, opacity: verifyGpsLoading ? 0.7 : 1 }}
                                >
                                    {verifyGpsLoading
                                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Getting GPS...</>
                                        : verifyGpsSuccess
                                            ? <><CheckCircle size={16} /> Location Set from GPS!</>
                                            : <><Navigation size={16} /> Use My Current Location as Customer's Pin</>}
                                </button>

                                {/* Drag pin map */}
                                <div style={{ borderRadius: 14, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <PinDropMap
                                        label="📍 Drag to exact customer location"
                                        building={editedJob._raw_property?.building_name || ''}
                                        street={editedJob.address || ''}
                                        localityQuery={editedJob.locality || ''}
                                        pincodeQuery={editedJob._raw_property?.pincode || ''}
                                        initialLat={verifyLat}
                                        initialLng={verifyLng}
                                        onChange={({ lat, lng }) => { setVerifyLat(lat); setVerifyLng(lng); }}
                                        height="200px"
                                    />
                                </div>

                                {verifyLat && verifyLng && (
                                    <div style={{ fontSize: 11, color: '#64748b', textAlign: 'center', marginBottom: 12 }}>
                                        📍 {verifyLat.toFixed(5)}, {verifyLng.toFixed(5)}
                                    </div>
                                )}

                                <button
                                    disabled={verifyLoading || !verifyLat || !verifyLng}
                                    onClick={handleLocationVerifySave}
                                    style={{ width: '100%', padding: '14px', borderRadius: 14, background: verifyLat && verifyLng ? 'linear-gradient(135deg,#38bdf8,#3b82f6)' : 'rgba(56,189,248,0.2)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: verifyLat && verifyLng && !verifyLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {verifyLoading
                                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                                        : <><CheckCircle size={16} /> Save & Confirm Location</>}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Parts Ordered Gate Modal ── */}
            {showPartsNoteModal && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '28px 24px calc(28px + env(safe-area-inset-bottom))' }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
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
                                    const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                    
                                    const saveRepairNote = async (lat = null, lng = null) => {
                                        try {
                                            // 1. Add repair note (sets repair_note_added_at on job)
                                            const noteRes = await fetch(`/api/technician/jobs/${job.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ 
                                                    action: 'add_repair_note', 
                                                    repair_note: partsNoteText.trim(), 
                                                    note_text: partsNoteText.trim(),
                                                    updated_by_name: techName,
                                                    latitude: lat,
                                                    longitude: lng
                                                })
                                            });
                                            const noteData = await noteRes.json();
                                            if (!noteRes.ok) throw new Error(noteData.error || 'Failed to add repair note');
                                            // 2. Now set status to parts_ordered
                                            await handleSaveStatus('parts_ordered');
                                            setEditedJob(prev => ({ ...prev, repair_note_added_at: noteData.job?.repair_note_added_at || new Date().toISOString() }));
                                            setShowPartsNoteModal(false);
                                            setPartsNoteText('');
                                        } catch (err) {
                                            alert('Could not save repair note: ' + err.message);
                                        } finally {
                                            setPartsNoteLoading(false);
                                        }
                                    };

                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition(
                                            (pos) => saveRepairNote(pos.coords.latitude, pos.coords.longitude),
                                            () => saveRepairNote(),
                                            { timeout: 5000, enableHighAccuracy: true }
                                        );
                                    } else {
                                        saveRepairNote();
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

            {/* Document Generation Forms */}
            <div onClick={e => e.stopPropagation()}>
                {activeForm === 'calculator' && (
                    <RepairCalculator
                        job={editedJob}
                        onClose={() => {
                            setActiveForm(null);
                            setQuotationDecisionMode(null);
                        }}
                        onCreateQuotation={(items) => handleAutoCreateQuotation(items)}
                        onCreateInvoice={quotationDecisionMode ? (items) => handleAutoCreateInvoiceFromCalculator(items) : null}
                        prefillItems={savedQuotation?.items || calculatorItems}
                    />
                )}
                {/* Manual Sales Invoice Form is now hidden from the UI but could still be opened programmatically */}
                {activeForm === 'sales-invoice' && (
                    <SalesInvoiceForm 
                        onClose={() => setActiveForm(null)}
                        onSave={async (data) => {
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
                            setSavedInvoice(savedData);
                            fetch(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ type: 'invoice-created', category: 'billing', description: `Sales invoice ${savedData?.invoice_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`, user_name: techName, customer_id: editedJob.customerId || null })
                            }).catch(() => {});
                            setActiveForm(null);
                        }}
                        defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
                        prefillItems={savedQuotation?.items || calculatorItems}
                    />
                )}
                {showWhatsappPopup && (
                    <DocumentWhatsAppPopup
                        document={showWhatsappPopup.doc}
                        type={showWhatsappPopup.type}
                        job={{ id: editedJob.id, job_number: editedJob.job_number, customer_name: editedJob.customerName, customer_phone: editedJob.mobile || editedJob.customer_phone || editedJob.customer?.mobile || editedJob.customer?.phone || '' }}
                        onClose={() => setShowWhatsappPopup(null)}
                    />
                )}
            </div>
        </div>

        {/* Collect Payment Modal — shown after invoice is created */}
        {showCollectPayment && (
            <CollectPaymentFlow
                onClose={() => setShowCollectPayment(false)}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                prefilledCustomer={{
                    id: editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    name: editedJob.customerName || editedJob.customer?.name || 'Customer',
                    phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    mobile: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                }}
                prefilledJob={{
                    id: editedJob.id,
                    job_number: editedJob.job_number,
                    account_id: editedJob.customerId || editedJob.account_id,
                    account_name: editedJob.customerName,
                    customer_name: editedJob.customerName,
                    customer_phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || 'Repair',
                    technician_id: techId,
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
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                job={editedJob}
                onSuccess={async () => {
                    setShowFeedbackCloseFlow(false);
                    try {
                        const res = await fetch(`/api/technician/jobs/${editedJob.id}`);
                        const data = await res.json();
                        if (data.success && data.job) {
                            setEditedJob(data.job);
                            if (onJobUpdate) onJobUpdate(data.job);
                        } else {
                            if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });
                        }
                    } catch (e) {
                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });
                    }
                }}
            />
        )}

        {/* ── Quotation Decision: FeedbackAndCloseCallFlow (Denied or Thinking) ── */}
        {showQuotationFeedbackFlow && (
            <FeedbackAndCloseCallFlow
                onClose={() => { setShowQuotationFeedbackFlow(false); setQuotationDecisionMode(null); }}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                job={editedJob}
                initialRepairOutcome="Closed on service charge"
                skipFeedbackStep={false}
                excludeRepairDone={quotationDecisionMode === 'denied'}
                onNotesSubmitted={({ formattedNotes }) => {
                    // Notes logged — now launch collect-payment for the visit charge
                    setShowQuotationFeedbackFlow(false);
                    setShowQuotationCollectPayment(true);
                }}
            />
        )}

        {/* ── Quotation Decision: CollectPaymentFlow (visit charge) ── */}
        {showQuotationCollectPayment && (
            <CollectPaymentFlow
                onClose={() => setShowQuotationCollectPayment(false)}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                prefilledCustomer={{
                    id: editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    name: editedJob.customerName || editedJob.customer?.name || 'Customer',
                    phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    mobile: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                }}
                prefilledJob={{
                    id: editedJob.id,
                    job_number: editedJob.job_number,
                    account_id: editedJob.customerId || editedJob.account_id,
                    account_name: editedJob.customerName,
                    customer_name: editedJob.customerName,
                    customer_phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || 'Repair',
                    technician_id: techId,
                }}
                prefilledAmount={editedJob.visitingFee || editedJob.visiting_fee || editedJob.visit_charge || ''}
                onSuccess={async () => {
                    setShowQuotationCollectPayment(false);
                    if (quotationDecisionMode === 'denied') {
                        // Denied path: close job + show feedback QR
                        try {
                            await fetch(`/api/technician/jobs/${editedJob.id}`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ action: 'close_job', updated_by_name: techName, notes: 'Closed — quotation denied, visit charge collected.' })
                            });
                        } catch (e) { /* non-fatal */ }
                        setEditedJob(prev => ({ ...prev, status: 'closed' }));
                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });
                        setShowQuotationFinalFeedback(true);
                    } else {
                        // Thinking path: keep job in quotation_sent, notify admin
                        try {
                            await fetch(`/api/admin/jobs`, {
                                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: editedJob.id, status: 'quotation_sent', quotation_followup_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() })
                            });
                            setEditedJob(prev => ({ ...prev, status: 'quotation_sent' }));
                            if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'quotation_sent' });
                            // Fire admin notification
                            fetch('/api/admin/notifications', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'quotation_followup',
                                    message: `Follow up with customer on Job #${editedJob.job_number || editedJob.id} — they needed time to decide on the quotation. Visit charge collected. Follow up in 2 days.`,
                                    job_id: editedJob.id,
                                    priority: 'medium',
                                })
                            }).catch(() => {});
                        } catch (e) { /* non-fatal */ }
                        setQuotationDecisionMode(null);
                    }
                }}
            />
        )}

        {/* ── Quotation Decision: Final Feedback QR (denied path only) ── */}
        {showQuotationFinalFeedback && (
            <FeedbackAndCloseCallFlow
                onClose={() => { setShowQuotationFinalFeedback(false); setQuotationDecisionMode(null); }}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                job={{ ...editedJob, status: 'closed' }}
                initialRepairOutcome="Closed on service charge"
                excludeRepairDone={true}
                initialStep={2}
                onSuccess={() => { setShowQuotationFinalFeedback(false); setQuotationDecisionMode(null); }}
            />
        )}

        {/* ── Service Charge Close Call Details ── */}
        {showServiceChargeCloseCallFlow && (
            <FeedbackAndCloseCallFlow
                onClose={() => { setShowServiceChargeCloseCallFlow(false); setQuotationDecisionMode(null); }}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                job={editedJob}
                initialRepairOutcome="Closed on service charge"
                skipFeedbackStep={false}
                excludeRepairDone={true}
                onNotesSubmitted={({ formattedNotes }) => {
                    setShowServiceChargeCloseCallFlow(false);
                    setShowServiceChargeCollectPayment(true);
                }}
            />
        )}

        {/* ── Service Charge Collect Payment ── */}
        {showServiceChargeCollectPayment && (
            <CollectPaymentFlow
                onClose={() => setShowServiceChargeCollectPayment(false)}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                prefilledCustomer={{
                    id: editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    name: editedJob.customerName || editedJob.customer?.name || 'Customer',
                    phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    mobile: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                }}
                prefilledJob={{
                    id: editedJob.id,
                    job_number: editedJob.job_number,
                    account_id: editedJob.customerId || editedJob.account_id,
                    account_name: editedJob.customerName,
                    customer_name: editedJob.customerName,
                    customer_phone: editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || 'Repair',
                    technician_id: techId,
                }}
                prefilledAmount={savedInvoice?.total_amount ? String(savedInvoice.total_amount) : ''}
                onSuccess={async () => {
                    setShowServiceChargeCollectPayment(false);
                    try {
                        await fetch(`/api/technician/jobs/${editedJob.id}`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'close_job', updated_by_name: techName, notes: 'Closed — service charge invoice paid.' })
                        });
                    } catch (e) { /* non-fatal */ }
                    
                    const merged = { ...editedJob, status: 'closed' };
                    setEditedJob(merged);
                    if (onJobUpdate) onJobUpdate(merged);
                    
                    setShowServiceChargeFeedbackQR(true);
                }}
            />
        )}

        {/* ── Service Charge Feedback QR Flow ── */}
        {showServiceChargeFeedbackQR && (
            <FeedbackAndCloseCallFlow
                onClose={() => { setShowServiceChargeFeedbackQR(false); setQuotationDecisionMode(null); }}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                job={{ ...editedJob, status: 'closed' }}
                initialRepairOutcome="Closed on service charge"
                excludeRepairDone={true}
                initialStep={2}
                onSuccess={() => { setShowServiceChargeFeedbackQR(false); setQuotationDecisionMode(null); }}
            />
        )}
        </>
    );
}

