'use client'

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, QrCode, AlertCircle, ThumbsUp, Check, Loader2, User, Wrench, HelpCircle, Info } from 'lucide-react';
import { apiCall } from '@/lib/offlineSync';

export default function FeedbackAndCloseCallFlow({
    onClose,
    context = 'admin', // 'admin' or 'technician'
    currentUserName = 'Admin',
    currentUserId,
    job,
    onSuccess,
    // Optional: pre-select the repair outcome (e.g. 'Closed on service charge')
    initialRepairOutcome = '',
    // Optional: skip the feedback QR step (step 2) — used for 'cx needs time' path
    skipFeedbackStep = false,
    // Optional: instead of auto-closing the job in handleSubmitNotes, call this and let parent chain
    // the collect-payment flow. Receives { formattedNotes, repairOutcome }.
    onNotesSubmitted = null,
    // Optional: exclude the "Repair Done" option from the outcome list
    excludeRepairDone = false,
    // Optional: initialize the flow at a specific step (e.g., 2 to skip step 1)
    initialStep = 1,
}) {
    const [step, setStep] = useState(initialStep); // 1: Questionnaire, 2: Feedback QR & Toggle
    const [isLoading, setIsLoading] = useState(false);

    // Form inputs state
    const [pocOption, setPocOption] = useState(''); // 'customer' or 'someone_else'
    const [pocName, setPocName] = useState(''); // Name/Relation if someone_else
    const [repairDone, setRepairDone] = useState(initialRepairOutcome); // pre-seeded if provided
    const [customReason, setCustomReason] = useState(''); // Required if repairDone === 'Custom'
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

    // Conditional elements (only if Repair Done)
    const [warrantyExplained, setWarrantyExplained] = useState(''); // 'Yes' or 'No'
    const [warrantyReason, setWarrantyReason] = useState(''); // Required if warrantyExplained === 'No'
    const [customerTested, setCustomerTested] = useState(''); // 'Yes' or 'No'
    const [testedReason, setTestedReason] = useState(''); // Required if customerTested === 'No'

    // Step 2 State
    const [feedbackQr, setFeedbackQr] = useState(null);
    const [gaveFeedback, setGaveFeedback] = useState(null); // 'Yes' or 'No'

    // Load active feedback QR from db
    useEffect(() => {
        const loadFeedbackQr = async () => {
            try {
                const res = await apiCall('/api/admin/qrcodes');
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    // Find active feedback QR
                    const activeFeedback = json.data.find(q => q.type === 'feedback' && q.is_active);
                    if (activeFeedback) {
                        setFeedbackQr(activeFeedback);
                    }
                }
            } catch (err) {
                console.error("Failed to load feedback QR:", err);
            }
        };
        loadFeedbackQr();
    }, []);

    // Load sales invoices for the job
    useEffect(() => {
        if (job?.id) {
            const loadInvoices = async () => {
                try {
                    const res = await apiCall(`/api/technician/jobs/${job.id}/invoice`);
                    const json = await res.json();
                    if (json.success && Array.isArray(json.data)) {
                        setInvoices(json.data);
                        if (json.data.length > 0) {
                            setSelectedInvoiceId(json.data[0].id);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load invoices:", err);
                }
            };
            loadInvoices();
        }
    }, [job?.id]);

    // Form Validation helper for Step 1
    const isStep1Valid = () => {
        if (!pocOption) return false;
        if (pocOption === 'someone_else' && !pocName.trim()) return false;
        if (!repairDone) return false;
        if (repairDone === 'Custom' && !customReason.trim()) return false;
        if (repairDone === 'Closed on service charge' && !selectedInvoiceId) return false;

        if (repairDone === 'Repair Done') {
            if (!warrantyExplained) return false;
            if (warrantyExplained === 'No' && !warrantyReason.trim()) return false;
            if (!customerTested) return false;
            if (customerTested === 'No' && !testedReason.trim()) return false;
        }

        return true;
    };

    // Submits the notes & advances status to 'closed'
    const handleSubmitNotes = async () => {
        if (!isStep1Valid()) return;

        setIsLoading(true);
        try {
            // 1. Build beautiful formatted notes
            const pocString = pocOption === 'customer' 
                ? `${job.customerName || 'Customer'}` 
                : `Someone Else - ${pocName.trim()}`;

            const noteParts = [
                `=== MANDATORY CLOSE CALL NOTES ===`,
                `Point of Contact: ${pocString}`,
                `Repair Outcome: ${repairDone}`,
            ];

            if (repairDone === 'Custom') {
                noteParts.push(`Custom Reason: ${customReason.trim()}`);
            }

            if (repairDone === 'Closed on service charge') {
                const selectedInv = invoices.find(inv => inv.id === selectedInvoiceId);
                noteParts.push(`Selected Service Charge Invoice: ${selectedInv ? selectedInv.invoice_number : selectedInvoiceId}`);
            }

            if (repairDone === 'Repair Done') {
                noteParts.push(`Usage & Warranty Explained: ${warrantyExplained === 'Yes' ? 'Yes ✓' : `No ❌ (Reason: ${warrantyReason.trim()})`}`);
                noteParts.push(`Customer Tested: ${customerTested === 'Yes' ? 'Yes ✓' : `No ❌ (Reason: ${testedReason.trim()})`}`);
            }

            const formattedNotes = noteParts.join('\n');

            // 2. Log interaction note
            const interactionPayload = {
                type: 'job-closed',
                category: 'job',
                jobId: job.id,
                performedBy: currentUserId || 'admin',
                performedByName: currentUserName,
                description: `Mandatory Notes Closed: POC: ${pocString} | Repair: ${repairDone}`,
                metadata: {
                    notes: formattedNotes,
                    poc: pocString,
                    repair_outcome: repairDone,
                    custom_reason: repairDone === 'Custom' ? customReason.trim() : null,
                    warranty_explained: repairDone === 'Repair Done' ? warrantyExplained : null,
                    warranty_reason: warrantyExplained === 'No' ? warrantyReason.trim() : null,
                    customer_tested: repairDone === 'Repair Done' ? customerTested : null,
                    tested_reason: customerTested === 'No' ? testedReason.trim() : null,
                    service_charge_invoice_id: repairDone === 'Closed on service charge' ? selectedInvoiceId : undefined,
                    service_charge_invoice_number: repairDone === 'Closed on service charge' ? (invoices.find(inv => inv.id === selectedInvoiceId)?.invoice_number) : undefined,
                },
                status: 'completed',
                source: `${context} app`
            };

            // 1. Instantly advance to Step 2 locally in 0ms!
            setStep(2);

            // 2. Perform the interactions logging and job close PUT call in the background asynchronously
            (async () => {
                try {
                    await apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(interactionPayload)
                    });

                    if (onNotesSubmitted) {
                        onNotesSubmitted({ formattedNotes, repairOutcome: repairDone });
                    } else {
                        const jobUpdatePayload = {
                            action: 'close_job',
                            updated_by_name: currentUserName,
                            source: context === 'admin' ? 'Admin App' : 'Technician App',
                            _changeLog: [`Status changed to closed. Notes captured.`],
                            notes: job.notes 
                                ? `${job.notes}\n\n${formattedNotes}` 
                                : formattedNotes
                        };

                        await apiCall(`/api/technician/jobs/${job.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(jobUpdatePayload)
                        });
                    }
                } catch (backgroundErr) {
                    console.warn('[Offline] Background close call save failed:', backgroundErr);
                }
            })();
        } catch (err) {
            alert('Failed to save details: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
const handleCompleteClosure = async () => {
        if (gaveFeedback === null) return;

        // 1. Instantly trigger success callback and close the questionnaire flow!
        if (onSuccess) onSuccess();
        onClose();

        // 2. Log interaction about feedback collection in the background asynchronously
        (async () => {
            try {
                const feedbackPayload = {
                    type: 'feedback-received',
                    category: 'feedback',
                    jobId: job.id,
                    performedBy: currentUserId || 'admin',
                    performedByName: currentUserName,
                    description: `Customer gave feedback: ${gaveFeedback.toUpperCase()}`,
                    metadata: {
                        feedback_given: gaveFeedback,
                    },
                    status: 'completed',
                    source: `${context} app`
                };

                await apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(feedbackPayload)
                });
            } catch (err) {
                console.warn("[Offline] Failed logging feedback interaction in background:", err);
            }
        })();
    };

    return (
        <div 
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(12px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: 'var(--spacing-md)',
                animation: 'fadeIn 0.2s ease-out'
            }}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .pill-btn {
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid var(--border-primary);
                    background-color: var(--bg-secondary);
                    color: var(--text-secondary);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    text-align: center;
                    flex: 1;
                }
                .pill-btn:hover {
                    border-color: var(--color-primary);
                    color: var(--text-primary);
                    background-color: rgba(99, 102, 241, 0.05);
                }
                .pill-btn.active {
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    border-color: #6366f1;
                    color: white;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                }
                .form-section {
                    background-color: var(--bg-secondary);
                    border: 1px solid var(--border-primary);
                    border-radius: 16px;
                    padding: var(--spacing-lg);
                    margin-bottom: var(--spacing-md);
                    transition: all 0.2s;
                }
                .form-section:hover {
                    border-color: rgba(99, 102, 241, 0.3);
                }
            `}</style>

            <div style={{
                width: '100%',
                maxWidth: '520px',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: '24px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '92vh',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(180deg, var(--bg-elevated), var(--bg-primary))',
                }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={20} color="#6366f1" />
                            {step === 1 ? 'Close Call Details' : 'Customer Feedback'}
                        </h2>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            {step === 1 ? 'Please answer all mandatory questions below.' : 'Share the feedback QR code with the customer.'}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: 'var(--spacing-xl)', overflowY: 'auto', flex: 1 }}>
                    {step === 1 ? (
                        // STEP 1: QUESTIONNAIRE
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            
                            {/* Point of Contact */}
                            <div className="form-section">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                    <User size={16} color="#6366f1" />
                                    Point of Contact <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '12px', marginBottom: pocOption === 'someone_else' ? '12px' : '0' }}>
                                    <button 
                                        className={`pill-btn ${pocOption === 'customer' ? 'active' : ''}`}
                                        onClick={() => { setPocOption('customer'); setPocName(''); }}
                                    >
                                        {job.customerName || 'Customer'}
                                    </button>
                                    <button 
                                        className={`pill-btn ${pocOption === 'someone_else' ? 'active' : ''}`}
                                        onClick={() => setPocOption('someone_else')}
                                    >
                                        Someone Else
                                    </button>
                                </div>
                                {pocOption === 'someone_else' && (
                                    <input 
                                        type="text"
                                        className="form-input"
                                        placeholder="Enter name or relation (e.g. Wife, Son)"
                                        value={pocName}
                                        onChange={e => setPocName(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}
                                    />
                                )}
                            </div>

                            {/* Repair Outcome */}
                            <div className="form-section">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                                    <Wrench size={16} color="#6366f1" />
                                    Repair Outcome <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: repairDone === 'Custom' ? '12px' : '0' }}>
                                    {['Repair Done', 'Closed on service charge', 'Quoted and Closed', 'Custom'].filter(opt => !excludeRepairDone || opt !== 'Repair Done').map(opt => (
                                        <button 
                                            key={opt}
                                            className={`pill-btn ${repairDone === opt ? 'active' : ''}`}
                                            onClick={() => {
                                                setRepairDone(opt);
                                                if (opt !== 'Custom') setCustomReason('');
                                                if (opt !== 'Repair Done') {
                                                    setWarrantyExplained('');
                                                    setWarrantyReason('');
                                                    setCustomerTested('');
                                                    setTestedReason('');
                                                }
                                            }}
                                            style={{ fontSize: '13px' }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                                {repairDone === 'Custom' && (
                                    <textarea 
                                        className="form-input"
                                        rows="2"
                                        placeholder="Enter details of why call is closed (e.g. customer did not pay service charge)"
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', resize: 'vertical' }}
                                    />
                                )}
                                {repairDone === 'Closed on service charge' && (
                                    <div style={{ marginTop: '12px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                            Select Service Charge Invoice <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        {invoices.length > 0 ? (
                                            <select
                                                className="form-input"
                                                value={selectedInvoiceId}
                                                onChange={e => setSelectedInvoiceId(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                                            >
                                                {invoices.map(inv => (
                                                    <option key={inv.id} value={inv.id}>
                                                        {inv.invoice_number} · ₹{inv.total_amount?.toLocaleString('en-IN')} ({inv.date})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div style={{ padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '12px', color: '#f87171', fontWeight: 600 }}>
                                                ⚠️ No invoices found for this job. Please create a service charge invoice first.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Conditional Section: ONLY if Repair Done */}
                            {repairDone === 'Repair Done' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                                    {/* Usage & Warranty Explained */}
                                    <div className="form-section">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                            <HelpCircle size={16} color="#6366f1" />
                                            Usage and Warranty explained? <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 12px 24px' }}>
                                            Verbally explain the service and product warranties to customer.
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: warrantyExplained === 'No' ? '12px' : '0' }}>
                                            <button 
                                                className={`pill-btn ${warrantyExplained === 'Yes' ? 'active' : ''}`}
                                                onClick={() => { setWarrantyExplained('Yes'); setWarrantyReason(''); }}
                                            >
                                                Yes
                                            </button>
                                            <button 
                                                className={`pill-btn ${warrantyExplained === 'No' ? 'active' : ''}`}
                                                onClick={() => setWarrantyExplained('No')}
                                            >
                                                No
                                            </button>
                                        </div>
                                        {warrantyExplained === 'No' && (
                                            <input 
                                                type="text"
                                                className="form-input"
                                                placeholder="Provide reason why not explained"
                                                value={warrantyReason}
                                                onChange={e => setWarrantyReason(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}
                                            />
                                        )}
                                    </div>

                                    {/* Customer Tested */}
                                    <div className="form-section">
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                            <HelpCircle size={16} color="#6366f1" />
                                            Did customer check & test repair? <span style={{ color: 'var(--error)' }}>*</span>
                                        </label>
                                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '0 0 12px 24px' }}>
                                            Ensure customer actively tests the appliance repair.
                                        </p>
                                        <div style={{ display: 'flex', gap: '12px', marginBottom: customerTested === 'No' ? '12px' : '0' }}>
                                            <button 
                                                className={`pill-btn ${customerTested === 'Yes' ? 'active' : ''}`}
                                                onClick={() => { setCustomerTested('Yes'); setTestedReason(''); }}
                                            >
                                                Yes
                                            </button>
                                            <button 
                                                className={`pill-btn ${customerTested === 'No' ? 'active' : ''}`}
                                                onClick={() => setCustomerTested('No')}
                                            >
                                                No
                                            </button>
                                        </div>
                                        {customerTested === 'No' && (
                                            <input 
                                                type="text"
                                                className="form-input"
                                                placeholder="Provide reason why not tested"
                                                value={testedReason}
                                                onChange={e => setTestedReason(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        // STEP 2: FEEDBACK QR & CUSTOMER FEEDBACK TOGGLE
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-lg)', textAlign: 'center' }}>
                            <div style={{ width: '100%', maxWidth: '300px', padding: '16px', backgroundColor: 'white', borderRadius: '24px', border: '1px solid var(--border-primary)', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', margin: '0 auto' }}>
                                {feedbackQr?.image_url ? (
                                    <img 
                                        src={feedbackQr.image_url} 
                                        alt="Feedback QR Code" 
                                        style={{ width: '220px', height: '220px', objectFit: 'contain', margin: '0 auto', display: 'block' }} 
                                    />
                                ) : (
                                    <div style={{ width: '220px', height: '220px', backgroundColor: '#f8fafc', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                        <QrCode size={56} color="#94a3b8" />
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>SCAN FOR FEEDBACK</span>
                                    </div>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-primary)' }}>
                                    {feedbackQr?.name || 'Share Feedback Link'}
                                </h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                    Ask the customer to scan the QR code above using their mobile device to rate their experience.
                                </p>
                            </div>

                            <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--border-primary)' }} />

                            <div style={{ width: '100%', textAlign: 'left' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', justifyContent: 'center' }}>
                                    Did the customer give feedback? <span style={{ color: 'var(--error)' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '12px', maxWidth: '300px', margin: '0 auto' }}>
                                    <button 
                                        className={`pill-btn ${gaveFeedback === 'Yes' ? 'active' : ''}`}
                                        onClick={() => setGaveFeedback('Yes')}
                                    >
                                        Yes
                                    </button>
                                    <button 
                                        className={`pill-btn ${gaveFeedback === 'No' ? 'active' : ''}`}
                                        onClick={() => setGaveFeedback('No')}
                                    >
                                        No
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: 'var(--spacing-lg) var(--spacing-xl)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    backgroundColor: 'var(--bg-elevated)'
                }}>
                    <button 
                        className="btn btn-secondary" 
                        onClick={onClose}
                        disabled={isLoading}
                        style={{ padding: '12px 20px', borderRadius: '12px', fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                    {step === 1 ? (
                        <button 
                            className="btn btn-primary"
                            disabled={!isStep1Valid() || isLoading}
                            onClick={handleSubmitNotes}
                            style={{ 
                                padding: '12px 24px', 
                                borderRadius: '12px', 
                                fontWeight: 700, 
                                background: isStep1Valid() ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'var(--bg-disabled)',
                                border: 'none',
                                color: isStep1Valid() ? 'white' : 'var(--text-disabled)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: isStep1Valid() ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {isLoading ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                            Save Notes & Continue
                        </button>
                    ) : (
                        <button 
                            className="btn btn-primary"
                            disabled={(!skipFeedbackStep && gaveFeedback === null) || isLoading}
                            onClick={skipFeedbackStep ? async () => { if (onSuccess) onSuccess(); onClose(); } : handleCompleteClosure}
                            style={{ 
                                padding: '12px 24px', 
                                borderRadius: '12px', 
                                fontWeight: 700, 
                                background: (skipFeedbackStep || gaveFeedback !== null) ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--bg-disabled)',
                                border: 'none',
                                color: (skipFeedbackStep || gaveFeedback !== null) ? 'white' : 'var(--text-disabled)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: (skipFeedbackStep || gaveFeedback !== null) ? 'pointer' : 'not-allowed'
                            }}
                        >
                            {isLoading ? <Loader2 size={16} className="spin" /> : <ThumbsUp size={16} />}
                            {skipFeedbackStep ? 'Done — Close Notes' : 'Complete & Close Job'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
