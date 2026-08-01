'use client'

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, Search, Hash, Banknote, QrCode, CreditCard, CheckCircle, ArrowRight, Upload, Paperclip, ShieldCheck, Loader2, Link as LinkIcon, Send, Copy } from 'lucide-react';
import AutocompleteSearch from '../admin/AutocompleteSearch';
import imageCompression from 'browser-image-compression';
import { apiCall, uploadOrQueueFile } from '@/lib/offlineSync';

export default function CollectPaymentFlow({
    onClose,
    context = 'admin',
    currentUserName = 'Admin',
    currentUserId,
    prefilledCustomer = null,
    prefilledJob = null,
    prefilledAmount = '',
    onSuccess
}) {
    const [step, setStep] = useState(1);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    
    // Step 1 State
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState(prefilledAmount);
    const [selectedCustomer, setSelectedCustomer] = useState(prefilledCustomer);
    const [selectedJob, setSelectedJob] = useState(prefilledJob);
    const [narration, setNarration] = useState('');
    
    // Split Payment State
    const [isSplit, setIsSplit] = useState(false);
    const [splitAmount1, setSplitAmount1] = useState('');
    const [splitAmount2, setSplitAmount2] = useState('');
    const [currentPaymentIndex, setCurrentPaymentIndex] = useState(1);

    const currentAmount = isSplit
        ? (currentPaymentIndex === 1 ? parseFloat(splitAmount1) || 0 : parseFloat(splitAmount2) || 0)
        : parseFloat(amount) || 0;
    
    // Step 2 State
    const [paymentMethod, setPaymentMethod] = useState(null); // 'cash', 'qr', 'card'
    const [cardAction, setCardAction] = useState(null); // 'show_qr', 'push', 'copy'
    
    // Step 3 State
    const [companyQr, setCompanyQr] = useState(null);
    const [razorpayLink, setRazorpayLink] = useState(null);
    const [razorpayLinkId, setRazorpayLinkId] = useState(null);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
    const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data State
    const [customers, setCustomers] = useState([]);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [jobs, setJobs] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (prefilledAmount) setAmount(prefilledAmount);
    }, [prefilledAmount]);

    useEffect(() => {
        if (prefilledCustomer) setSelectedCustomer(prefilledCustomer);
    }, [prefilledCustomer]);

    useEffect(() => {
        if (prefilledJob) setSelectedJob(prefilledJob);
    }, [prefilledJob]);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingData(true);
            try {
                const needsCustomers = !prefilledCustomer;
                const needsJobs = !prefilledJob;

                const promises = [
                    apiCall('/api/admin/qrcodes').then(r => r.json()).catch(() => ({ success: false }))
                ];

                if (needsCustomers) {
                    promises.push(apiCall('/api/admin/accounts?type=customer').then(r => r.json()).catch(() => ({ success: false })));
                }
                if (needsJobs) {
                    const jobsUrl = context === 'technician' 
                        ? `/api/technician/jobs` 
                        : `/api/admin/jobs`;
                    promises.push(apiCall(jobsUrl).then(r => r.json()).catch(() => ({ success: false })));
                }

                const results = await Promise.all(promises);
                const qrcRes = results[0];
                
                if (qrcRes.success && qrcRes.data) {
                    const activeQRs = qrcRes.data.filter(q => q.is_active);
                    const primary = activeQRs.find(q => q.is_primary) || activeQRs[0];
                    setCompanyQr(primary);
                }

                let resultIdx = 1;
                if (needsCustomers) {
                    const accRes = results[resultIdx++];
                    if (accRes && accRes.success) setCustomers(accRes.data || []);
                } else {
                    setCustomers(prefilledCustomer ? [prefilledCustomer] : []);
                }

                if (needsJobs) {
                    const jRes = results[resultIdx++];
                    if (jRes && jRes.success) {
                        setJobs(jRes.data || []);
                    }
                } else {
                    setJobs(prefilledJob ? [prefilledJob] : []);
                }
                
            } catch (err) {
                console.error("Failed to fetch initial payment data:", err);
            } finally {
                setIsLoadingData(false);
            }
        };
        loadInitialData();
    }, [prefilledCustomer, prefilledJob, context]);

    const relevantJobs = context === 'technician'
        ? jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled' && String(j.technician_id) === String(currentUserId))
        : (selectedCustomer 
            ? jobs.filter(j => String(j.customer_id) === String(selectedCustomer.id) || String(j.account_id) === String(selectedCustomer.id)) 
            : jobs);

    const handleContinueStep1 = () => {
        if (context === 'technician' && !selectedJob) return alert('Please select an active job ticket.');
        if (!selectedCustomer) return alert('Customer association is missing! Please select a job/customer.');
        if (!amount || Number(amount) <= 0) return alert('Please enter a valid amount.');
        if (isSplit) {
            const a1 = parseFloat(splitAmount1) || 0;
            const a2 = parseFloat(splitAmount2) || 0;
            const tot = parseFloat(amount) || 0;
            if (a1 <= 0 || a2 <= 0) {
                return alert('Both split amounts must be greater than zero.');
            }
            if (Math.abs(a1 + a2 - tot) > 0.01) {
                return alert('The sum of split amounts must equal the total amount.');
            }
        }
        setCurrentPaymentIndex(1);
        setStep(2);
    };

    const handleGenerateRazorpayLink = async (actionType) => {
        setCardAction(actionType);
        if (razorpayLink) {
            setStep(3);
            return;
        }

        setIsGeneratingLink(true);
        try {
            const res = await fetch('/api/payment/create-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: currentAmount,
                    customer_name: selectedCustomer.name,
                    customer_phone: selectedCustomer.mobile || selectedCustomer.phone || '',
                    job_id: selectedJob?.id || '',
                    account_id: selectedCustomer.id || '',
                    collected_by: context,
                    technician_name: currentUserName,
                    technician_id: currentUserId,
                    description: narration,
                    disable_upi: true // Forces user to pay via Card/Netbanking only
                })
            });
            const data = await res.json();
            if (data.success) {
                setRazorpayLink(data.short_url);
                setRazorpayLinkId(data.link_id);
                setTimeRemaining(300); // reset 5 minutes
                setStep(3);
            } else {
                alert('Failed to generate payment link: ' + data.error);
                setCardAction(null);
            }
        } catch (err) {
            alert('Error generating link.');
            setCardAction(null);
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleScreenshotChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            try {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1200, useWebWorker: true };
                const compressedFile = await imageCompression(file, options);
                compressedFile.name = file.name || `payment_ss.jpg`;
                setScreenshotFile(compressedFile);
            } catch (error) {
                setScreenshotFile(file);
            }
        } else {
            alert("Please upload a valid image screenshot.");
        }
    };

    // Helper to upload image silently
    const uploadImage = async (file) => {
        return await uploadOrQueueFile(file, `payment_${Date.now()}.jpg`);
    };

    const handleFinalConfirm = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // 1. Instantly trigger the local screen transition so the user gets 0ms wait time!
        if (isSplit && currentPaymentIndex === 1) {
            setPaymentMethod(null);
            setCardAction(null);
            setRazorpayLink(null);
            setRazorpayLinkId(null);
            setScreenshotFile(null);
            setCurrentPaymentIndex(2);
            setStep(2);
            setIsSubmitting(false);
        } else {
            setStep(4); // Success screen
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 3000);
        }

        // 2. Perform the actual location tracking, image upload, and database operations in the background
        (async () => {
            try {
                let lat = null;
                let lng = null;

                // Geolocation fetch in background (does not block user!)
                if (navigator.geolocation && context !== 'admin') {
                    try {
                        const pos = await new Promise((resResolve, resReject) => {
                            navigator.geolocation.getCurrentPosition(resResolve, resReject, { timeout: 3000, enableHighAccuracy: true });
                        });
                        lat = pos.coords.latitude;
                        lng = pos.coords.longitude;
                    } catch (geoErr) {
                        console.warn('[Offline] Background geolocation failed:', geoErr);
                    }
                }

                let screenshotUrl = null;
                if (screenshotFile) {
                    screenshotUrl = await uploadImage(screenshotFile);
                }

                // Prepare pending receipt payload
                const receiptPayload = {
                    receipt_number: `REC-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(10000 + Math.random() * 90000)}`,
                    date,
                    account_id: selectedCustomer.id,
                    account_name: selectedCustomer.name,
                    amount: currentAmount,
                    payment_mode: paymentMethod === 'cash' ? 'Cash' : (paymentMethod === 'qr' ? 'UPI' : 'Payment Link'),
                    reference_number: selectedJob?.job_number || selectedJob?.id || '',
                    narration: `${narration ? narration + ' | ' : ''}Collected by ${currentUserName} (${context}). ${isSplit ? `[Part ${currentPaymentIndex}/2]` : ''} ${cardAction ? 'Razorpay Link' : ''} ${razorpayLinkId ? `[LinkID:${razorpayLinkId}]` : ''} ${screenshotUrl ? `[Screenshot:${screenshotUrl}]` : ''}`.trim(),
                    status: 'pending_verification',
                    source: context === 'admin' ? 'Admin Panel' : 'Technician App',
                    created_by: currentUserName || 'Technician',
                    job_id: selectedJob?.id || null,
                };

                // Post the transaction (Status = pending_verification)
                const txRes = await apiCall('/api/admin/transactions?type=receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptPayload)
                });
                const txData = await txRes.json();
                
                const isQueued = txData.queued || txRes.status === 202;
                if (!txData.success && !isQueued) throw new Error(txData.error || "Failed to save verification tracking.");

                // Post the interaction to the Job if there is a job selected
                if (selectedJob?.id) {
                    const interactionPayload = {
                        type: 'payment-received',
                        category: 'payment',
                        jobId: selectedJob.id,
                        performedBy: currentUserId,
                        performedByName: currentUserName,
                        description: `Payment of ₹${currentAmount} collected via ${paymentMethod.toUpperCase()} ${isSplit ? `(Part ${currentPaymentIndex}/2)` : ''} marking for Admin Verification.`,
                        metadata: {
                            amount: currentAmount,
                            method: paymentMethod,
                            attachments: screenshotUrl ? [screenshotUrl] : [],
                            receipt_id: isQueued ? `temp-rec-${Date.now()}` : txData.data?.id,
                            latitude: lat,
                            longitude: lng
                        },
                        status: 'completed',
                        source: `${context} app`
                    };
                    
                    await apiCall(`/api/technician/jobs/${selectedJob.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(interactionPayload)
                    }).catch(e => console.error("Interaction logged failed (non-critical)", e));
                }
            } catch (err) {
                console.warn('[Offline] Background payment confirmation failed:', err);
            }
        })();
    };

    // Timer and Polling Effect for Razorpay Link
    useEffect(() => {
        let interval;
        let pollInterval;

        if (step === 3 && paymentMethod === 'card' && razorpayLinkId && !isPaymentConfirmed) {
            // 1. Countdown timer
            interval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // 2. Poll API every 5 seconds
            pollInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/payment/check-link-status?id=${razorpayLinkId}`);
                    const data = await res.json();
                    if (data.success && data.status === 'paid') {
                        setIsPaymentConfirmed(true);
                        clearInterval(pollInterval);
                        clearInterval(interval);
                        
                        if (isSplit && currentPaymentIndex === 1) {
                            setPaymentMethod(null);
                            setCardAction(null);
                            setRazorpayLink(null);
                            setRazorpayLinkId(null);
                            setScreenshotFile(null);
                            setIsPaymentConfirmed(false);
                            setCurrentPaymentIndex(2);
                            setStep(2);
                        } else {
                            // Jump to success step automatically
                            setStep(4);
                            setTimeout(() => {
                                if (onSuccess) onSuccess();
                                onClose();
                            }, 3000);
                        }
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [step, paymentMethod, razorpayLinkId, isPaymentConfirmed, isSplit, currentPaymentIndex]);

    const content = (
        <div 
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 'var(--spacing-md)'
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '500px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-xl)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '90vh'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md) var(--spacing-lg)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--bg-elevated)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                            Collect Payment
                        </h2>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Step {Math.min(step, 3)} of 3
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon" style={{ padding: '6px', cursor: 'pointer', background: 'none', border: 'none' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content Body */}
                <div style={{ padding: 'var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    {isLoadingData && step === 1 ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                            <Loader2 size={32} className="spin" style={{ margin: '0 auto var(--spacing-sm)' }} />
                            Loading data...
                        </div>
                    ) : step === 1 ? (
                        // STEP 1: PAYMENT DETAILS
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <User size={14} color="var(--color-primary)" />
                                    Collected By <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={currentUserName}
                                    readOnly
                                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'not-allowed' }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <Calendar size={14} color="var(--color-primary)" />
                                    Payment Date <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>

                            {/* Conditional Rendering Block - Technician vs Admin Flow */}
                            {context === 'technician' ? (
                                <>
                                    {/* TECHNICIAN: Job is Primary & Mandatory */}
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <Hash size={14} color="var(--color-primary)" />
                                            Select Active Job <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <select
                                            className="form-input"
                                            onChange={(e) => {
                                                const j = jobs.find(job => job.id === e.target.value);
                                                if (j) {
                                                    setSelectedJob(j);
                                                    setSelectedCustomer({ 
                                                        id: j.account_id || j.customer_id, 
                                                        name: j.account_name || j.customer_name || j.customer?.name || 'Customer', 
                                                        phone: j.customer_phone || j.customer?.phone || j.customer?.mobile 
                                                    });
                                                } else {
                                                    setSelectedJob(null);
                                                    setSelectedCustomer(null);
                                                }
                                            }}
                                            value={selectedJob?.id || ""}
                                        >
                                            <option value="">-- Select an active job --</option>
                                            {relevantJobs.map(j => (
                                                <option key={j.id} value={j.id}>#{j.job_number || j.id} - {j.category || 'Repair'} {j.subcategory ? `(${j.subcategory})` : ''} - {j.account_name || j.customer_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <User size={14} color="var(--color-primary)" />
                                            Received From <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: selectedCustomer ? 'inherit' : 'var(--text-tertiary)'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                    {selectedCustomer ? selectedCustomer.name : 'Select a job first'}
                                                </span>
                                                {selectedCustomer && (
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {selectedCustomer.phone || selectedCustomer.mobile || 'No phone provided'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* ADMIN: Customer is Primary, Job is Secondary */}
                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <User size={14} color="var(--color-primary)" />
                                            Received From <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        {selectedCustomer ? (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--color-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--color-primary)10'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{selectedCustomer.name}</span>
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{selectedCustomer.phone || selectedCustomer.mobile || 'No Phone'}</span>
                                                </div>
                                                <button onClick={() => { setSelectedCustomer(null); setSelectedJob(null); }} className="btn-icon" style={{ padding: '4px' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <AutocompleteSearch
                                                placeholder="Search customer by name or phone..."
                                                value={customerSearchTerm}
                                                onChange={setCustomerSearchTerm}
                                                suggestions={customers}
                                                searchKey="name"
                                                onSelect={(c) => {
                                                    setSelectedCustomer(c);
                                                    setCustomerSearchTerm('');
                                                }}
                                                renderSuggestion={(item) => (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                                                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{item.phone || item.mobile}</span>
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                            <Hash size={14} color="var(--color-primary)" />
                                            Link to Job (Optional)
                                        </label>
                                        {selectedJob ? (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                backgroundColor: 'var(--bg-secondary)'
                                            }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                                                        #{selectedJob.job_number || selectedJob.id}
                                                    </span>
                                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        {selectedJob.category || ''} {selectedJob.subcategory ? `- ${selectedJob.subcategory}` : ''}
                                                    </span>
                                                </div>
                                                <button onClick={() => setSelectedJob(null)} className="btn-icon" style={{ padding: '4px' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <select
                                                className="form-input"
                                                onChange={(e) => {
                                                    const j = jobs.find(job => job.id === e.target.value);
                                                    if (j) setSelectedJob(j);
                                                }}
                                                value=""
                                                disabled={!selectedCustomer}
                                            >
                                                <option value="">{selectedCustomer ? "-- Select an active job --" : "Select a customer first"}</option>
                                                {relevantJobs.map(j => (
                                                    <option key={j.id} value={j.id}>#{j.job_number || j.id} - {j.category || 'Repair'} {j.subcategory ? `(${j.subcategory})` : ''}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center', margin: 0 }}>
                                        <Banknote size={14} color="var(--color-primary)" />
                                        Amount (₹) <span style={{ color: 'var(--error)' }}>*</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', cursor: 'pointer', userSelect: 'none', color: 'var(--text-secondary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={isSplit}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                setIsSplit(checked);
                                                if (checked) {
                                                    const tot = parseFloat(amount) || 0;
                                                    const half = Math.round(tot / 2);
                                                    setSplitAmount1(String(half));
                                                    setSplitAmount2(String(tot - half));
                                                }
                                            }}
                                            style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        Split into 2 receipts
                                    </label>
                                </div>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setAmount(val);
                                        setRazorpayLink(null);
                                        if (isSplit) {
                                            const tot = parseFloat(val) || 0;
                                            const half = Math.round(tot / 2);
                                            setSplitAmount1(String(half));
                                            setSplitAmount2(String(tot - half));
                                        }
                                    }}
                                    min="1"
                                    step="1"
                                    disabled={isSplit}
                                    style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, backgroundColor: isSplit ? 'var(--bg-secondary)' : 'inherit', cursor: isSplit ? 'not-allowed' : 'text' }}
                                />
                            </div>

                            {isSplit && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', animation: 'fadeIn 0.2s ease' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)', marginBottom: '6px', display: 'block' }}>Receipt 1 Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={splitAmount1}
                                            onChange={e => {
                                                const a1 = e.target.value;
                                                setSplitAmount1(a1);
                                                const tot = parseFloat(amount) || 0;
                                                const val1 = parseFloat(a1) || 0;
                                                setSplitAmount2(String(Math.max(0, tot - val1)));
                                            }}
                                            min="1"
                                            step="1"
                                            style={{ fontWeight: 600 }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: 'var(--font-size-xs)', marginBottom: '6px', display: 'block' }}>Receipt 2 Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={splitAmount2}
                                            onChange={e => {
                                                const a2 = e.target.value;
                                                setSplitAmount2(a2);
                                                const tot = parseFloat(amount) || 0;
                                                const val2 = parseFloat(a2) || 0;
                                                setSplitAmount1(String(Math.max(0, tot - val2)));
                                            }}
                                            min="1"
                                            step="1"
                                            style={{ fontWeight: 600 }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <Paperclip size={14} color="var(--color-primary)" />
                                    Narration / Description
                                </label>
                                <textarea
                                    className="form-input"
                                    rows="2"
                                    placeholder="E.g., Advance payment for motor, final bill..."
                                    value={narration}
                                    onChange={e => setNarration(e.target.value)}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    ) : step === 2 ? (
                        // STEP 2: PAYMENT MODES
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                marginBottom: 'var(--spacing-sm)'
                            }}>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {isSplit ? `Paying Amount (Receipt ${currentPaymentIndex}/2)` : 'Paying Amount'}
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>₹{currentAmount.toFixed(2)}</div>
                            </div>

                            {!paymentMethod || paymentMethod === 'cash' || paymentMethod === 'qr' ? (
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <button
                                        onClick={() => { setPaymentMethod('cash'); setStep(3); }}
                                        className="btn"
                                        style={{
                                            padding: 'var(--spacing-lg) var(--spacing-md)',
                                            justifyContent: 'flex-start',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-primary)',
                                            boxShadow: 'var(--shadow-sm)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <Banknote size={24} color="#10b981" style={{ marginRight: '16px' }} />
                                        <div style={{ textAlign: 'left', flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>Cash</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Collect physical cash from customer</div>
                                        </div>
                                        <ArrowRight size={16} color="var(--text-tertiary)" />
                                    </button>

                                    <button
                                        onClick={() => { setPaymentMethod('qr'); setStep(3); }}
                                        className="btn"
                                        style={{
                                            padding: 'var(--spacing-lg) var(--spacing-md)',
                                            justifyContent: 'flex-start',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-primary)',
                                            boxShadow: 'var(--shadow-sm)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <QrCode size={24} color="#3b82f6" style={{ marginRight: '16px' }} />
                                        <div style={{ textAlign: 'left', flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>Company QR (UPI)</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Customer scans your device to pay</div>
                                        </div>
                                        <ArrowRight size={16} color="var(--text-tertiary)" />
                                    </button>

                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className="btn"
                                        style={{
                                            padding: 'var(--spacing-lg) var(--spacing-md)',
                                            justifyContent: 'flex-start',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-primary)',
                                            boxShadow: 'var(--shadow-sm)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        <CreditCard size={24} color="#f59e0b" style={{ marginRight: '16px' }} />
                                        <div style={{ textAlign: 'left', flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)' }}>Netbanking / Cards</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Send a Razorpay link to customer</div>
                                        </div>
                                        <ArrowRight size={16} color="var(--text-tertiary)" />
                                    </button>
                                </div>
                            ) : null}

                            {/* Razorpay Sub-Options */}
                            {paymentMethod === 'card' && (
                                <div style={{
                                    marginTop: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-md)' }}>
                                        <button onClick={() => setPaymentMethod(null)} className="btn-icon"><ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                                        <span style={{ fontWeight: 600 }}>Choose Link Action</span>
                                    </div>

                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        <button
                                            onClick={() => handleGenerateRazorpayLink('show_qr')}
                                            disabled={isGeneratingLink}
                                            className="btn btn-secondary"
                                            style={{ justifyContent: 'flex-start', padding: '12px' }}
                                        >
                                            <QrCode size={18} style={{ marginRight: '12px' }} />
                                            Show QR Code to Scan
                                        </button>
                                        
                                        <button
                                            onClick={() => handleGenerateRazorpayLink('push')}
                                            disabled={isGeneratingLink}
                                            className="btn btn-secondary"
                                            style={{ justifyContent: 'flex-start', padding: '12px' }}
                                        >
                                            <Send size={18} style={{ marginRight: '12px' }} />
                                            Send Push to Customer App
                                        </button>

                                        <button
                                            onClick={() => handleGenerateRazorpayLink('copy')}
                                            disabled={isGeneratingLink}
                                            className="btn btn-secondary"
                                            style={{ justifyContent: 'flex-start', padding: '12px' }}
                                        >
                                            <Copy size={18} style={{ marginRight: '12px' }} />
                                            Copy Link to Clipboard
                                        </button>
                                    </div>
                                    
                                    {isGeneratingLink && (
                                        <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Loader2 size={16} className="spin" /> Generating Razorpay Link...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : step === 3 ? (
                        // STEP 3: CONFIRMATION
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            
                            {paymentMethod === 'cash' && (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                                    <Banknote size={64} color="#10b981" style={{ margin: '0 auto var(--spacing-md)' }} />
                                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>Collect ₹{currentAmount.toFixed(2)} Cash</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
                                        Verify the cash physical amount received from the customer.
                                    </p>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '16px', fontSize: 'var(--font-size-lg)' }}
                                        onClick={handleFinalConfirm}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 size={24} className="spin" /> : "Confirm Cash Received"}
                                    </button>
                                </div>
                            )}

                            {paymentMethod === 'qr' && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                        {companyQr?.image_url ? (
                                            <img src={companyQr.image_url} alt="Company QR" style={{ width: '200px', height: '200px', objectFit: 'contain', margin: '0 auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }} />
                                        ) : (
                                            <div style={{ width: '200px', height: '200px', backgroundColor: '#f3f4f6', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-md)' }}>
                                                <QrCode size={64} color="#9ca3af" />
                                            </div>
                                        )}
                                        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>Scan to Pay ₹{currentAmount.toFixed(2)}</div>
                                    </div>
                                    
                                    <div style={{
                                        backgroundColor: 'var(--bg-secondary)',
                                        padding: 'var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px dashed var(--border-primary)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}>
                                        <label style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <div style={{
                                                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--color-primary)20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)'
                                            }}>
                                                <Upload size={24} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Upload Customer Screen Screenshot</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Mandatory for verification</div>
                                            </div>
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                capture="environment" 
                                                style={{ display: 'none' }} 
                                                onChange={handleScreenshotChange}
                                            />
                                        </label>
                                        
                                        {screenshotFile && (
                                            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#10b981', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                                <CheckCircle size={16} /> Screenshot Attached
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        className="btn btn-primary" 
                                        style={{ width: '100%', padding: '16px', fontSize: 'var(--font-size-lg)' }}
                                        onClick={handleFinalConfirm}
                                        disabled={isSubmitting || !screenshotFile}
                                    >
                                        {isSubmitting ? <Loader2 size={24} className="spin" /> : "Verify & Generate Receipt"}
                                    </button>
                                </div>
                            )}

                            {paymentMethod === 'card' && (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                                        {cardAction === 'show_qr' ? (
                                            <div style={{ display: 'inline-block', padding: '16px', backgroundColor: 'white', border: '1px solid var(--border-primary)', borderRadius: '12px' }}>
                                                <img 
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(razorpayLink)}`} 
                                                    alt="Razorpay Payment QR Code" 
                                                    style={{ width: '150px', height: '150px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                                                />
                                            </div>
                                        ) : cardAction === 'push' ? (
                                            <Send size={64} color="var(--color-primary)" style={{ margin: '0 auto' }} />
                                        ) : (
                                            <LinkIcon size={64} color="var(--color-primary)" style={{ margin: '0 auto' }} />
                                        )}
                                    </div>
                                    
                                    <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)' }}>
                                        {cardAction === 'show_qr' ? "Scan to Open Link" : cardAction === 'push' ? "Push Sent!" : "Link Ready"}
                                    </h3>
                                    
                                    <div style={{ 
                                        padding: 'var(--spacing-sm)', 
                                        backgroundColor: 'var(--bg-secondary)', 
                                        borderRadius: 'var(--radius-md)', 
                                        border: '1px solid var(--border-primary)',
                                        wordBreak: 'break-all',
                                        fontSize: 'var(--font-size-sm)',
                                        marginBottom: 'var(--spacing-lg)'
                                    }}>
                                        {razorpayLink}
                                    </div>
                                    
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
                                        The system is securely checking Razorpay for confirmation. Please wait for the customer to complete the transaction.
                                    </p>

                                    {cardAction === 'copy' && (
                                        <button 
                                            className="btn btn-primary" 
                                            style={{ width: '100%', padding: '16px', fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(`Please pay ₹${currentAmount} using this secure link (UPI disabled): ${razorpayLink}`);
                                                alert("Copied to clipboard!");
                                            }}
                                        >
                                            <Copy size={20} style={{ marginRight: '8px' }} /> Copy Text For Customer
                                        </button>
                                    )}

                                    {timeRemaining > 0 ? (
                                        <div style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                            <Loader2 size={24} className="spin" color="var(--color-primary)" />
                                            <div style={{ fontWeight: 600, fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)' }}>
                                                Awaiting Payment... {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                                            </div>
                                            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
                                                Option to close will appear if it takes longer than 5 minutes.
                                            </p>
                                        </div>
                                    ) : (
                                        <button 
                                            className="btn btn-secondary" 
                                            style={{ width: '100%', padding: '16px', fontSize: 'var(--font-size-md)' }}
                                            onClick={() => {
                                                if(onSuccess) onSuccess();
                                                onClose();
                                            }}
                                        >
                                            Customer takes too much time - I'll leave now
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    ) : step === 4 ? (
                        // FINAL SUCCESS SCREEN
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl) var(--spacing-lg)' }}>
                            <div style={{
                                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-md)'
                            }}>
                                <CheckCircle size={48} color="#10b981" />
                            </div>
                            <h3 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: '#10b981', marginBottom: 'var(--spacing-xs)' }}>
                                Processing Completed!
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                The receipt voucher has been created and marked as <strong>Pending Verification</strong>.
                                It will be fully registered once verified by an administrator.
                            </p>
                        </div>
                    ) : null}
                </div>

                {/* Footer Controls */}
                {step <= 3 && (
                    <div style={{
                        padding: 'var(--spacing-md) var(--spacing-lg)',
                        borderTop: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-elevated)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        {step > 1 ? (
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setStep(step - 1)} 
                                disabled={isGeneratingLink || isSubmitting || (isSplit && currentPaymentIndex === 2 && step === 2)}
                            >
                                Back
                            </button>
                        ) : (
                            <button className="btn btn-secondary" onClick={onClose} disabled={isGeneratingLink || isSubmitting}>
                                Cancel
                            </button>
                        )}
                        
                        {step === 1 && (
                            <button className="btn btn-primary" onClick={handleContinueStep1}>
                                Choose Payment Mode <ArrowRight size={16} style={{ marginLeft: '8px' }} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (!mounted) return null;
    return createPortal(content, document.body);
}
