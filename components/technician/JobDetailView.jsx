'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Phone, MapPin, Clock, FileText, CheckSquare, Wrench, Menu, Activity, Send, FilePlus, ChevronDown, CheckCircle, AlertCircle, Package, Shield, Loader2, Navigation, Camera, Upload } from 'lucide-react';
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
import { apiCall, uploadOrQueueFile, storeOfflineFile } from '@/lib/offlineSync';

const PinDropMap = dynamic(() => import('@/components/common/PinDropMap'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '220px', width: '100%', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 13 }}>
            🗺️ Loading map...
        </div>
    )
});



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

const renderActivityDescription = (activity, onViewDocument) => {
    const desc = activity.description || activity.message || '';
    const type = activity.type || '';
    
    if (desc.includes('Quotation QUO-') || type.includes('quotation')) {
        const quoMatch = desc.match(/QUO-\d{4}-\d+/);
        const amountMatch = desc.match(/Total Amount:\s*₹?\s*(\d+)/) || desc.match(/Total:\s*₹?\s*(\d+)/) || desc.match(/Total Amount:\s*₹?\s*([\d,.]+)/);
        if (quoMatch) {
            const quoNum = quoMatch[0];
            const amount = amountMatch ? `₹${amountMatch[1]}` : '';
            return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>📄 Quotation</span>
                    <button
                        onClick={() => onViewDocument && onViewDocument('quotation', quoNum)}
                        style={{
                            color: '#38bdf8',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            font: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 700
                        }}
                    >
                        {quoNum}
                    </button>
                    <span>created {amount && `for ${amount}`}</span>
                </div>
            );
        }
    }

    if (desc.includes('Invoice INV-') || desc.includes('Sales Invoice INV-') || type.includes('invoice') || type.includes('sales-invoice')) {
        const invMatch = desc.match(/INV-\d{4}-\d+/);
        const amountMatch = desc.match(/Amount:\s*₹?\s*(\d+)/) || desc.match(/Total:\s*₹?\s*(\d+)/) || desc.match(/Total Amount:\s*₹?\s*([\d,.]+)/);
        if (invMatch) {
            const invNum = invMatch[0];
            const amount = amountMatch ? `₹${amountMatch[1]}` : '';
            return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span>🧾 Sales Invoice</span>
                    <button
                        onClick={() => onViewDocument && onViewDocument('invoice', invNum)}
                        style={{
                            color: '#10b981',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            font: 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontWeight: 700
                        }}
                    >
                        {invNum}
                    </button>
                    <span>created {amount && `for ${amount}`}</span>
                </div>
            );
        }
    }

    if (desc.includes(' → ') || desc.includes(' -> ')) {
        const arrow = desc.includes(' → ') ? ' → ' : ' -> ';
        const parts = desc.split(arrow);
        let fromStatus = parts[0].split(':').pop().trim().split(' ').pop();
        let toStatus = parts[1].split(' by ').shift().trim().split(' ').shift();
        
        const formatStatusLabel = (status) => {
            return status.replace(/_/g, ' ').replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        };

        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Status changed:</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatStatusLabel(fromStatus)}</span>
                <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>➔</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8' }}>{formatStatusLabel(toStatus)}</span>
            </div>
        );
    }

    if (type.includes('note')) {
        return <span style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"{desc}"</span>;
    }

    return <span>{desc}</span>;
};

const VisitsLogTab = ({ visits = [], onTabChange, onViewDocument }) => {

    if (visits.length === 0) {
        return (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Camera size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>No Visits Recorded</h3>
                <p style={{ fontSize: 13, maxWidth: 300, margin: '0 auto', lineHeight: 1.5 }}>When you start a job and complete check-in, your visit details will appear here.</p>
            </div>
        );
    }

    const formatTimeOnly = (t) => {
        if (!t) return '';
        return new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDateOnly = (t) => {
        if (!t) return '';
        return new Date(t).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 4px' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Camera size={18} color="#10b981" /> Job Visits History ({visits.length})
            </h3>
            
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
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
                                    Technician: <strong style={{ color: 'var(--text-primary)' }}>{visit.technician}</strong>
                                </span>
                            </div>
                            
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                📅 {formatDateOnly(visit.arrivalTime)}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', backgroundColor: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>START JOB CLICK</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    ⏱️ {formatTimeOnly(visit.startJobTime)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>ARRIVED TIME</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    ⏱️ {formatTimeOnly(visit.arrivalTime)}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>OUT STATUS</div>
                                <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: 700, 
                                    color: visit.outStatus.includes('Parts Ordered') ? '#f59e0b' : visit.outStatus.includes('Completed') ? '#10b981' : '#38bdf8' 
                                }}>
                                    🏁 {visit.outStatus}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: visit.activities.length > 0 ? '1px dashed var(--border-primary)' : 'none', paddingBottom: visit.activities.length > 0 ? '12px' : '0' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                📸 Before Note & Images
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

                        {visit.activities.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                                    ⚡ Click Records & Activities during this Visit
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '2px solid var(--border-primary)' }}>
                                    {visit.activities.map((activity, aIdx) => {
                                        const label = activity.type?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                                        return (
                                            <div key={activity.id || aIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                        {formatTimeOnly(activity.timestamp || activity.created_at)}
                                                    </span>
                                                    <span style={{ 
                                                        padding: '1px 6px', 
                                                        borderRadius: '4px', 
                                                        fontSize: '10px', 
                                                        fontWeight: 700, 
                                                        backgroundColor: 'rgba(255,255,255,0.06)', 
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-primary)'
                                                    }}>
                                                        {label || activity.type}
                                                    </span>
                                                    <span style={{ color: 'var(--text-tertiary)' }}>
                                                        by {activity.performed_by_name || activity.user_name || 'System'}
                                                    </span>
                                                </div>
                                                <div style={{ color: 'var(--text-secondary)', paddingLeft: '8px' }}>
                                                    {renderActivityDescription(activity, onViewDocument)}
                                                    {activity.metadata?.attachments && activity.metadata.attachments.length > 0 && (
                                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                                                            {activity.metadata.attachments.map((url, idx) => (
                                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                                                                    <img 
                                                                        src={url} 
                                                                        alt={`Activity Attachment ${idx + 1}`} 
                                                                        style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', border: '1px solid var(--border-primary)' }} 
                                                                    />
                                                                </a>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function JobDetailView({ job, onClose, onJobUpdate, isOnline = true, shouldHideAddress = false }) {
    const [activeTab, setActiveTab] = useState('actions');
    const [editedJob, setEditedJob] = useState(job);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeForm, setActiveForm] = useState(null);
    const [calculatorItems, setCalculatorItems] = useState(null);
    const [savedQuotation, setSavedQuotation] = useState(null);
    const [savedQuotations, setSavedQuotations] = useState([]);
    const [isNewQuotationOption, setIsNewQuotationOption] = useState(false);
    const [savedInvoice, setSavedInvoice] = useState(null);
    const [hasUploadedPhotosLocal, setHasUploadedPhotosLocal] = useState(false);
    const [hasPaymentLocal, setHasPaymentLocal] = useState(false);
    const [collectedAmountLocal, setCollectedAmountLocal] = useState(0);

    useEffect(() => {
        if (editedJob?.interactions) {
            const hasPhotos = editedJob.interactions.some(i => i.type === 'after-photos-uploaded');
            const hasPay = editedJob.interactions.some(i => i.type === 'payment-received');
            const payAmt = editedJob.interactions
                .filter(i => i.type === 'payment-received')
                .reduce((sum, i) => sum + (parseFloat(i.metadata?.amount) || 0), 0);
            
            if (hasPhotos) setHasUploadedPhotosLocal(true);
            if (hasPay) {
                setHasPaymentLocal(true);
                setCollectedAmountLocal(payAmt);
            }
        }
    }, [editedJob?.interactions]);

    const [showWhatsappPopup, setShowWhatsappPopup] = useState(null); // { type: 'quotation' | 'invoice', doc: object }
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [markingArrival, setMarkingArrival] = useState(false);
    // Parts Ordered gate — shows inline note modal before setting parts_ordered
    const [showPartsNoteModal, setShowPartsNoteModal] = useState(false);
    const [partsNoteText, setPartsNoteText] = useState('');
    const [partsNoteLoading, setPartsNoteLoading] = useState(false);
    const [partsPhotos, setPartsPhotos] = useState([]);
    const [partsMinPrice, setPartsMinPrice] = useState('');
    const [partsMaxPrice, setPartsMaxPrice] = useState('');
    const [partsMinDays, setPartsMinDays] = useState('');
    const [partsMaxDays, setPartsMaxDays] = useState('');
    const [partsActionType, setPartsActionType] = useState('Order Part'); // 'Order Part' | 'Collect Part'
    const [partsOption, setPartsOption] = useState(null); // null | 'select'
    const [isCloseWithServiceCharge, setIsCloseWithServiceCharge] = useState(false);
    const [isPartsFlowQuotationPending, setIsPartsFlowQuotationPending] = useState(false);
    const [showAdvanceConfirmModal, setShowAdvanceConfirmModal] = useState(false);
    const [showAdvanceCollectPayment, setShowAdvanceCollectPayment] = useState(false);
    const partsPhotosInputRef = useRef(null);
    const [calledCustomer, setCalledCustomer] = useState(false);

    const getCoordsWithTimeout = (timeoutMs = 5000) => {
        // Enforce a minimum robust timeout of 2000ms for job actions
        const finalTimeout = Math.max(timeoutMs, 2000);
        return new Promise((resolve) => {
            if (typeof window === 'undefined' || !navigator.geolocation) {
                resolve(null);
                return;
            }
            let resolved = false;
            const timer = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.warn('[GPS] Geolocation timed out after ' + finalTimeout + 'ms');
                    resolve(null);
                }
            }, finalTimeout);
            
            try {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timer);
                            
                            const latitude = pos.coords.latitude;
                            const longitude = pos.coords.longitude;

                            // Asynchronously ping location API to record this precise coordinate in the DB historical logs
                            if (techId) {
                                let sessionToken = null;
                                try {
                                    const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                                    if (session) {
                                        sessionToken = JSON.parse(session).session_token;
                                    }
                                } catch (e) {}

                                fetch('/api/technician/location', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        technician_id: techId,
                                        latitude,
                                        longitude,
                                        is_on_job: true,
                                        tracking_source: 'web',
                                        is_online: true,
                                        location_precision: 'precise',
                                        session_token: sessionToken
                                    })
                                }).catch(() => {});
                            }

                            resolve({ latitude, longitude });
                        }
                    },
                    (err) => {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timer);
                            console.warn('[GPS] Geolocation error:', err.message);
                            resolve(null);
                        }
                    },
                    { enableHighAccuracy: true, timeout: finalTimeout, maximumAge: 10000 }
                );
            } catch (syncErr) {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timer);
                    console.warn('[GPS] Geolocation synchronous error:', syncErr);
                    resolve(null);
                }
            }
        });
    };

    // Location Verification Modal — shown after Mark as Arrived
    const [showLocationVerifyModal, setShowLocationVerifyModal] = useState(false);
    const [locationVerifyStep, setLocationVerifyStep] = useState('ask'); // 'ask' | 'update' | 'before_photos'
    
    const handleViewDocument = (type, docNum) => {
        if (type === 'quotation') {
            const doc = savedQuotations.find(q => q.quotation_number === docNum || q.number === docNum);
            if (doc) {
                setShowWhatsappPopup({ type: 'quotation', doc });
            } else {
                setShowWhatsappPopup({ type: 'quotation', doc: { quotation_number: docNum } });
            }
        } else if (type === 'invoice') {
            if (savedInvoice && (savedInvoice.invoice_number === docNum || savedInvoice.number === docNum)) {
                setShowWhatsappPopup({ type: 'invoice', doc: savedInvoice });
            } else {
                setShowWhatsappPopup({ type: 'invoice', doc: { invoice_number: docNum } });
            }
        }
    };
    const [beforePhotos, setBeforePhotos] = useState([]);
    const [beforePhotosDescription, setBeforePhotosDescription] = useState('');
    const [beforePhotosLoading, setBeforePhotosLoading] = useState(false);
    const beforePhotosInputRef = useRef(null);
    const [showAfterPhotosModal, setShowAfterPhotosModal] = useState(false);
    const [afterPhotos, setAfterPhotos] = useState([]);
    const [afterPhotosDescription, setAfterPhotosDescription] = useState('');
    const [afterPhotosLoading, setAfterPhotosLoading] = useState(false);
    const afterPhotosInputRef = useRef(null);
    const [verifyLat, setVerifyLat] = useState(null);
    const [verifyLng, setVerifyLng] = useState(null);
    const [verifyLoading, setVerifyLoading] = useState(false);
    const [verifyGpsLoading, setVerifyGpsLoading] = useState(false);
    const [verifyGpsSuccess, setVerifyGpsSuccess] = useState(false);
    const pendingArrivedDataRef = useRef(null); // stores { arrivedAt, jobData } until modal is resolved
    const arrivalCoordsRef = useRef(null); // stores { lat, lng } of technician's arrival

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

    const latVal = parseFloat(editedJob?.property?.latitude || editedJob?.latitude || job?.property?.latitude || job?.latitude);
    const lngVal = parseFloat(editedJob?.property?.longitude || editedJob?.longitude || job?.property?.longitude || job?.longitude);
    const hasCoords = !isNaN(latVal) && !isNaN(lngVal);
    const isVerified = hasCoords && (
        editedJob?.property?.location_verified_by || 
        editedJob?.property?.location_verified_at || 
        job?.property?.location_verified_by || 
        job?.property?.location_verified_at
    );
    const buttonLabel = hasCoords ? (isVerified ? '📍 Technician Verified' : '📍 Saved Pin') : '📍 Open in Maps';
    const buttonColor = isVerified ? '#10b981' : '#3b82f6';

    // No-Service Close Call modal state
    const [showNoServiceModal, setShowNoServiceModal] = useState(false);
    const [noServicePOC, setNoServicePOC] = useState('');
    const [noServiceReason, setNoServiceReason] = useState('');
    const [noServiceLoading, setNoServiceLoading] = useState(false);
    const [noChargeChecked, setNoChargeChecked] = useState(false);

    // Back Button Handler Stack Registrations
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showWhatsappPopup) return;
        const handler = () => setShowWhatsappPopup(null);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showWhatsappPopup]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showPartsNoteModal) return;
        const handler = () => setShowPartsNoteModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showPartsNoteModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showAdvanceConfirmModal) return;
        const handler = () => setShowAdvanceConfirmModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showAdvanceConfirmModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showAdvanceCollectPayment) return;
        const handler = () => setShowAdvanceCollectPayment(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showAdvanceCollectPayment]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showLocationVerifyModal) return;
        const handler = () => setShowLocationVerifyModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showLocationVerifyModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showAfterPhotosModal) return;
        const handler = () => setShowAfterPhotosModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showAfterPhotosModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showCollectPayment) return;
        const handler = () => setShowCollectPayment(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showCollectPayment]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showFeedbackCloseFlow) return;
        const handler = () => setShowFeedbackCloseFlow(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showFeedbackCloseFlow]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showQuotationFeedbackFlow) return;
        const handler = () => setShowQuotationFeedbackFlow(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showQuotationFeedbackFlow]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showQuotationCollectPayment) return;
        const handler = () => setShowQuotationCollectPayment(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showQuotationCollectPayment]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showQuotationFinalFeedback) return;
        const handler = () => setShowQuotationFinalFeedback(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showQuotationFinalFeedback]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showServiceChargeCloseCallFlow) return;
        const handler = () => setShowServiceChargeCloseCallFlow(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showServiceChargeCloseCallFlow]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showServiceChargeCollectPayment) return;
        const handler = () => setShowServiceChargeCollectPayment(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showServiceChargeCollectPayment]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showServiceChargeFeedbackQR) return;
        const handler = () => setShowServiceChargeFeedbackQR(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showServiceChargeFeedbackQR]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!showNoServiceModal) return;
        const handler = () => setShowNoServiceModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showNoServiceModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!activeForm) return;
        const handler = () => {
            setActiveForm(null);
            setQuotationDecisionMode(null);
            setIsCloseWithServiceCharge(false);
        };
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [activeForm]);

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
                    apiCall(`/api/technician/jobs/${job.id}?t=${t}`),
                    apiCall(`/api/admin/interactions?job_id=${job.id}&t=${t}`),
                    apiCall(`/api/technician/jobs/${job.id}/interactions?t=${t}`),
                ]);
                const jobData = await jobRes.json();
                const intData = await intRes.json().catch(() => ({ data: [] }));
                const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));

                // Try to load quotation and invoice from technician-accessible routes
                try {
                    const [quotaRes, invRes] = await Promise.all([
                        apiCall(`/api/technician/jobs/${job.id}/quotation`),
                        apiCall(`/api/technician/jobs/${job.id}/invoice`)
                    ]);
                    if (quotaRes.ok) {
                        const quotaData = await quotaRes.json();
                        if (quotaData.success && quotaData.data?.length > 0) {
                            setSavedQuotations(quotaData.data);
                            setSavedQuotation(quotaData.data[0]);
                        } else {
                            setSavedQuotations([]);
                            setSavedQuotation(null);
                        }
                    }
                    if (invRes.ok) {
                        const invData = await invRes.json();
                        // Support both formats depending on how /invoice route is built
                        if (invData.success && invData.data?.length > 0) setSavedInvoice(invData.data[0]);
                        else if (invData.success && invData.invoice) setSavedInvoice(invData.invoice);
                    }
                } catch (e) { /* silent fail */ }

                if (jobData.success) {
                    const allInt = deduplicateInteractions([
                        ...(intData.data || []),
                        ...(jobIntData.data || []).map(ji => ({
                            ...ji,
                            performed_by_name: ji.user_name || ji.performed_by_name || 'Technician',
                            description: ji.message || ji.description || '',
                            timestamp: ji.created_at || ji.timestamp,
                        }))
                    ]);

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

    const advancePaymentInt = (editedJob.interactions || []).find(i => 
        i.type === 'payment-received' && 
        (
            String(i.description).toLowerCase().includes('advance') || 
            String(i.description).toLowerCase().includes('part 1') || 
            (!savedInvoice && i.metadata?.amount)
        )
    );

    const lastEditInt = (editedJob.interactions || []).find(i => i.type === 'quotation-created' || i.type === 'quotation-edited');
    const lastApproveInt = (editedJob.interactions || []).find(i => i.type === 'approve_quotation');
    const needsConfirmation = !lastApproveInt || (lastEditInt && new Date(lastEditInt.timestamp) > new Date(lastApproveInt.timestamp));

    const sortedInteractions = [...(editedJob.interactions || [])].sort((a, b) => new Date(a.timestamp || a.created_at || 0) - new Date(b.timestamp || b.created_at || 0));
    const startJobEvents = sortedInteractions.filter(i => 
        i.type === 'on-way' || 
        i.type === 'job-started' || 
        (i.type === 'status-changed' && (i.description || '').toLowerCase().includes('on_way')) ||
        (i.type === 'status-changed' && (i.description || '').toLowerCase().includes('on-way'))
    );
    const computedVisits = startJobEvents.map((startEvent, idx) => {
        const startJobTime = startEvent.timestamp || startEvent.created_at;
        const nextStartEvent = startJobEvents[idx + 1] || null;
        const nextStartJobTime = nextStartEvent ? (nextStartEvent.timestamp || nextStartEvent.created_at) : null;
        const visitStart = new Date(startJobTime).getTime();
        const visitEnd = nextStartJobTime ? new Date(nextStartJobTime).getTime() : Infinity;
        const arrival = sortedInteractions.find(i => {
            if (i.type !== 'before-photos-uploaded') return false;
            const time = new Date(i.timestamp || i.created_at || 0).getTime();
            return time >= visitStart && time < visitEnd;
        });
        const visitInteractions = sortedInteractions.filter(i => {
            const time = new Date(i.timestamp || i.created_at || 0).getTime();
            return time >= visitStart && time < visitEnd;
        });
        const statusChanges = visitInteractions.filter(i => 
            i.type === 'status-changed' || 
            i.type?.startsWith('job-status-') ||
            (i.type === 'status-changed' && i.description?.toLowerCase().includes('status changed'))
        );
        let outStatus = 'In Progress';
        let resolvedTime = null;
        if (statusChanges.length > 0) {
            const latestChange = statusChanges[statusChanges.length - 1];
            const desc = (latestChange.description || latestChange.message || '').toLowerCase();
            resolvedTime = latestChange.timestamp || latestChange.created_at;
            if (desc.includes('parts_ordered') || desc.includes('parts ordered')) {
                outStatus = 'Parts Ordered';
            } else if (desc.includes('completed') || desc.includes('closed') || desc.includes('payment_collected') || desc.includes('payment collected')) {
                outStatus = 'Completed / Closed';
            } else {
                const parts = latestChange.description?.split(' → ') || latestChange.message?.split(' → ');
                if (parts && parts.length > 1) {
                    const toS = parts[1].split(' by ').shift().trim().replace(/_/g, ' ');
                    outStatus = toS.charAt(0).toUpperCase() + toS.slice(1);
                } else {
                    outStatus = latestChange.description || latestChange.message || 'Status Updated';
                }
            }
        } else if (idx < startJobEvents.length - 1) {
            outStatus = 'Parts Ordered / Re-assigned';
            resolvedTime = nextStartJobTime;
        }
        const advPayment = visitInteractions.find(i => 
            i.type === 'payment-received' && 
            (String(i.description).toLowerCase().includes('advance') || String(i.description).toLowerCase().includes('part 1') || i.description?.toLowerCase().includes('advance payment'))
        );
        const quoteCreated = visitInteractions.find(i => i.type === 'quotation-created');
        const quoteEdited = visitInteractions.find(i => i.type === 'quotation-edited');
        const quotationDetails = quoteEdited || quoteCreated;
        const beforeNote = arrival?.description ? arrival.description.replace(/^Before Photos uploaded for Visit #\d+\.\nNote:\s*/, '').replace(/^Before Photos uploaded\.\nNote:\s*/, '') : '';
        const beforeImages = arrival?.metadata?.attachments || [];
        const activities = visitInteractions.filter(i => 
            i.id !== arrival?.id && 
            i.id !== startEvent.id
        );
        let durationStr = 'Ongoing';
        if (resolvedTime) {
            const diffMs = new Date(resolvedTime).getTime() - new Date(startJobTime).getTime();
            const diffMins = Math.round(diffMs / 60000);
            durationStr = diffMins > 60 ? `${Math.floor(diffMins / 60)}h ${diffMins % 60}m` : `${diffMins} mins`;
        }
        return {
            visitNumber: idx + 1,
            technician: startEvent.performed_by_name || startEvent.user_name || 'Technician',
            startJobTime,
            arrivalTime: arrival?.timestamp || arrival?.created_at || null,
            endTime: resolvedTime,
            outStatus,
            beforeNote,
            beforeImages,
            activities,
            advPayment,
            quotationDetails,
            durationStr
        };
    }).reverse();
    const latestEndedVisit = computedVisits.find(v => v.endTime !== null);

    const tabs = [
        { id: 'details', label: 'Details', icon: FileText },
        { id: 'visits', label: 'Visits Log', icon: Camera },
        { id: 'interactions', label: 'Interactions', icon: Clock },
        { id: 'actions', label: 'Job Actions', icon: CheckSquare }
    ];

    const handleSaveStatus = async (newStatus) => {
        if (!newStatus || newStatus === editedJob.status) return;
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        setLoading(true);
        setError(null);
        try {
            const response = await apiCall(`/api/technician/jobs/${job.id}`, {
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

    const formatTransactionDetails = (tx, title) => {
        if (!tx) return '';
        const itemLines = (tx.items || []).map(item => 
            `- ${item.description || 'Item'} (Qty: ${item.qty || 1}, Rate: ₹${item.rate || 0}, Total: ₹${item.total || 0})`
        ).join('\n');
        return `${title} Details:\n` +
               `Number: ${tx.quote_number || tx.invoice_number || tx.reference || ''}\n` +
               `Total Amount: ₹${tx.total_amount || 0}\n` +
               `Subtotal: ₹${tx.subtotal || 0}\n` +
               `CGST: ₹${tx.cgst || 0}\n` +
               `SGST: ₹${tx.sgst || 0}\n` +
               `IGST: ₹${tx.igst || 0}\n` +
               `Total Tax: ₹${tx.total_tax || 0}\n` +
               `Items:\n${itemLines || 'No items listed'}`;
    };

    const handleRestartProcess = async () => {
        if (!savedInvoice) return;
        
        if (!window.confirm("Are you sure you want to restart the quotation and invoice process? This will permanently delete the current invoice, set the status to Diagnosing & Quoting, and reopen the Repair Calculator.")) {
            return;
        }

        setLoading(true);
        try {
            // 1. Delete invoice from Supabase
            const response = await apiCall(`/api/admin/transactions?type=sales&id=${savedInvoice.id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete invoice');

            // 2. Format detailed text for interactions log
            const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
            const techId = editedJob.assignedTo || job.technician_id || null;
            
            const itemLines = (savedInvoice.items || []).map(item => 
                `- ${item.description || 'Item'} (Qty: ${item.qty || 1}, Rate: ₹${item.rate || 0}, Total: ₹${item.total || 0})`
            ).join('\n');

            const description = `Invoice ${savedInvoice.invoice_number} deleted by technician ${techName}. Process restarted back to Diagnosing & Quoting.\nInvoice details:\nTotal Amount: ₹${savedInvoice.total_amount || 0}\nSubtotal: ₹${savedInvoice.subtotal || 0}\nCGST: ₹${savedInvoice.cgst || 0}\nSGST: ₹${savedInvoice.sgst || 0}\nIGST: ₹${savedInvoice.igst || 0}\nTotal Tax: ₹${savedInvoice.total_tax || 0}\nItems:\n${itemLines || 'No items listed'}`;

            // Post to technician job interactions API
            await apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'invoice-deleted',
                    category: 'billing',
                    description: description,
                    user_name: techName,
                    performedBy: techId,
                    customer_id: editedJob.customerId || null,
                    metadata: {
                        deleted_invoice_number: savedInvoice.invoice_number,
                        deleted_invoice_id: savedInvoice.id,
                        deleted_invoice_total: savedInvoice.total_amount,
                        deleted_invoice_subtotal: savedInvoice.subtotal,
                        deleted_invoice_tax: savedInvoice.total_tax,
                        deleted_invoice_items: savedInvoice.items
                    }
                })
            }).catch(e => console.error("Job interaction logging failed", e));

            // Also log to global client-side log
            logInteraction({
                type: 'invoice-deleted',
                category: 'billing',
                jobId: String(job.id),
                customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
                customerName: editedJob.customerName || editedJob.customer_name,
                description: `Invoice ${savedInvoice.invoice_number} deleted. Process restarted back to Diagnosing & Quoting.`,
                performedByName: techName,
                performedBy: techId,
                source: 'Technician App',
            });

            // 3. Update job status to diagnosing_quoting in DB
            const updateRes = await apiCall(`/api/technician/jobs/${job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'diagnosing_quoting',
                    updated_by_name: techName,
                    source: 'Technician App',
                    _changeLog: [`Invoice ${savedInvoice.invoice_number} deleted. Status changed: ${editedJob.status} → diagnosing_quoting`]
                })
            });
            const updateJson = await updateRes.json();
            if (!updateRes.ok) throw new Error(updateJson.error || 'Failed to update job status');

            // 4. Update local states
            setSavedInvoice(null);
            
            // Log local interaction in memory so it updates the UI immediately
            const localInteraction = {
                type: 'invoice-deleted',
                performed_by_name: techName,
                description: description,
                timestamp: new Date().toISOString()
            };
            
            const updatedJobData = { 
                ...editedJob, 
                status: 'diagnosing_quoting',
                interactions: [localInteraction, ...(editedJob.interactions || [])]
            };
            setEditedJob(updatedJobData);
            if (onJobUpdate) onJobUpdate(updatedJobData);

            // Reopen repair estimate calculator
            setActiveForm('calculator');
            alert('Invoice deleted and process restarted successfully!');

        } catch (err) {
            alert('Failed to restart process: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestartQuotationOnly = async () => {
        if (!savedQuotation) return;
        
        if (!window.confirm("Are you sure you want to restart the quotation process? This will permanently delete the current quotation, set the status back to Diagnosing & Quoting, and reopen the Repair Calculator.")) {
            return;
        }

        setLoading(true);
        try {
            // 1. Delete quotation from Supabase
            const response = await apiCall(`/api/admin/transactions?type=quotation&id=${savedQuotation.id}&job_id=${job.id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete quotation');

            // 2. Format detailed text for interactions log
            const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
            const techId = editedJob.assignedTo || job.technician_id || null;
            
            const itemLines = (savedQuotation.items || []).map(item => 
                `- ${item.description || 'Item'} (Qty: ${item.qty || 1}, Rate: ₹${item.rate || 0}, Total: ₹${item.total || 0})`
            ).join('\n');

            const description = `Quotation ${savedQuotation.quote_number} deleted by technician ${techName}. Process restarted back to Diagnosing & Quoting.\nQuotation details:\nTotal Amount: ₹${savedQuotation.total_amount || 0}\nSubtotal: ₹${savedQuotation.subtotal || 0}\nCGST: ₹${savedQuotation.cgst || 0}\nSGST: ₹${savedQuotation.sgst || 0}\nIGST: ₹${savedQuotation.igst || 0}\nTotal Tax: ₹${savedQuotation.total_tax || 0}\nItems:\n${itemLines || 'No items listed'}`;

            // Post to technician job interactions API
            await apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'quotation-deleted',
                    category: 'billing',
                    description: description,
                    user_name: techName,
                    performedBy: techId,
                    customer_id: editedJob.customerId || null,
                    metadata: {
                        deleted_quote_number: savedQuotation.quote_number,
                        deleted_quote_id: savedQuotation.id,
                        deleted_quote_total: savedQuotation.total_amount,
                        deleted_quote_subtotal: savedQuotation.subtotal,
                        deleted_quote_tax: savedQuotation.total_tax,
                        deleted_quote_items: savedQuotation.items
                    }
                })
            }).catch(e => console.error("Job interaction logging failed", e));

            // Also log to global client-side log
            logInteraction({
                type: 'quotation-deleted',
                category: 'billing',
                jobId: String(job.id),
                customerId: editedJob.customerId ? String(editedJob.customerId) : undefined,
                customerName: editedJob.customerName || editedJob.customer_name,
                description: `Quotation ${savedQuotation.quote_number} deleted. Process restarted back to Diagnosing & Quoting.`,
                performedByName: techName,
                performedBy: techId,
                source: 'Technician App',
            });

            const remainsOther = savedQuotations.length > 1;

            if (!remainsOther) {
                // 3. Update job status to diagnosing_quoting in DB
                const updateRes = await apiCall(`/api/technician/jobs/${job.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: 'diagnosing_quoting',
                        updated_by_name: techName,
                        source: 'Technician App',
                        _changeLog: [`Quotation ${savedQuotation.quote_number} deleted. Status changed: ${editedJob.status} → diagnosing_quoting`]
                    })
                });
                const updateJson = await updateRes.json();
                if (!updateRes.ok) throw new Error(updateJson.error || 'Failed to update job status');
            }

            // 4. Update local states
            const remainingQuotes = savedQuotations.filter(q => q.id !== savedQuotation.id);
            setSavedQuotations(remainingQuotes);
            if (remainingQuotes.length > 0) {
                setSavedQuotation(remainingQuotes[0]);
            } else {
                setSavedQuotation(null);
            }
            
            // Log local interaction in memory so it updates the UI immediately
            const localInteraction = {
                type: 'quotation-deleted',
                performed_by_name: techName,
                description: description,
                timestamp: new Date().toISOString()
            };
            
            const updatedJobData = { 
                ...editedJob, 
                status: remainsOther ? editedJob.status : 'diagnosing_quoting',
                interactions: [localInteraction, ...(editedJob.interactions || [])]
            };
            setEditedJob(updatedJobData);
            if (onJobUpdate) onJobUpdate(updatedJobData);

            if (!remainsOther) {
                // Reopen repair estimate calculator
                setActiveForm('calculator');
            }
            alert('Quotation deleted successfully!');

        } catch (err) {
            alert('Failed to restart process: ' + err.message);
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

            const isEditing = !isNewQuotationOption && !!savedQuotation?.id;

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

            // Generate mock savedData instantly for zero-latency local state updates
            const mockId = quotationPayload.id || `temp-quo-${Date.now()}`;
            const savedData = { ...quotationPayload, id: mockId };

            // 1. Instantly update local state and close calculator
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

            if (['new_job_request', 'scheduled', 'diagnosing_quoting'].includes(editedJob.status) && !isPartsFlowQuotationPending) {
                setEditedJob(prev => ({ ...prev, status: 'quotation_sent' }));
                if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'quotation_sent' });
            }

            setActiveForm(null);
            setCalculatorItems(null);
            if (isPartsFlowQuotationPending) {
                setIsPartsFlowQuotationPending(false);
                setShowAdvanceConfirmModal(true);
            } else {
                setShowWhatsappPopup({ type: 'quotation', doc: savedData });
            }

            // 2. Perform the database and logging tasks asynchronously in the background
            (async () => {
                try {
                    const saveRes = await apiCall(`/api/admin/transactions?type=quotation`, {
                        method: isEditing ? 'PUT' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(quotationPayload)
                    });
                    const saveJson = await saveRes.json();
                    const isQueued = saveJson.queued || saveRes.status === 202;
                    if (!saveJson.success && !isQueued) {
                        throw new Error(saveJson.error || 'Failed to save quotation');
                    }

                    const serverSavedData = isQueued ? savedData : saveJson.data;

                    // Update state to use real database UUID instead of temporary frontend ID
                    if (!isQueued && serverSavedData && serverSavedData.id) {
                        setSavedQuotation(serverSavedData);
                        setSavedQuotations(prev => {
                            const updated = [...prev];
                            const idx = updated.findIndex(q => q.id === savedData.id || q.quote_number === serverSavedData.quote_number);
                            if (idx > -1) {
                                updated[idx] = serverSavedData;
                            } else {
                                updated.unshift(serverSavedData);
                            }
                            return updated;
                        });
                    }

                    // Log interaction in background
                    const interactionType = isEditing ? 'quotation-edited' : 'quotation-created';
                    const baseInteractionDesc = isEditing 
                        ? `Quotation ${serverSavedData?.quote_number || serverSavedData?.reference || ''} updated for job #${editedJob.job_number || editedJob.id}`
                        : `Quotation ${serverSavedData?.quote_number || serverSavedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}`;
                    
                    const detailedInteractionDesc = `${baseInteractionDesc}\n\n${formatTransactionDetails(serverSavedData, 'Quotation')}`;
                    
                    apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: interactionType,
                            category: 'billing',
                            description: detailedInteractionDesc,
                            user_name: techName,
                            customer_id: editedJob.customerId || null,
                            metadata: {
                                quote_number: serverSavedData.quote_number,
                                quote_id: serverSavedData.id,
                                total_amount: serverSavedData.total_amount,
                                subtotal: serverSavedData.subtotal,
                                tax: serverSavedData.total_tax,
                                items: serverSavedData.items
                            }
                        })
                    }).catch(() => {});

                    if (editedJob.status !== 'quotation_sent' && !isPartsFlowQuotationPending) {
                        await apiCall(`/api/technician/jobs/${editedJob.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_status', status: 'quotation_sent', updated_by_name: techName })
                        }).catch(() => {});
                    }
                } catch (err) {
                    console.warn('[Offline] Background quotation save error:', err);
                }
            })();
        } catch (e) {
            console.error('Failed to auto-create/update quotation', e);
            alert('Failed to save quotation: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const checkStockAvailability = async (itemsToCheck) => {
        if (!itemsToCheck || !Array.isArray(itemsToCheck)) return { success: true };
        const materialItems = itemsToCheck.filter(it => {
            const isService = it.isCharge || it.is_charge || it.type === 'service' || it.item_type === 'service';
            const prodId = it.productId || it.product_id || it.itemId || it.item_id;
            return !isService && prodId;
        });

        if (materialItems.length === 0) return { success: true };

        try {
            const stockRes = await apiCall(`/api/technician/stock?technicianId=${techId}`);
            const stockJson = await stockRes.json();
            if (stockJson.success) {
                const stockMap = {};
                (stockJson.stock || []).forEach(st => {
                    stockMap[st.product_id] = st.quantity;
                });

                const insufficientParts = [];
                materialItems.forEach(it => {
                    const prodId = it.productId || it.product_id || it.itemId || it.item_id;
                    const available = stockMap[prodId] || 0;
                    const required = Number(it.qty) || 1;
                    if (available < required) {
                        insufficientParts.push(`• ${it.description || it.name} (Required: ${required}, In Stock: ${available})`);
                    }
                });

                if (insufficientParts.length > 0) {
                    return {
                        success: false,
                        error: `You have insufficient physical stock for the following spare parts:\n\n${insufficientParts.join('\n')}\n\nPlease check your stock or request a handover of these parts from the Service Center.`
                    };
                }
            }
        } catch (err) {
            console.error('Failed to verify stock availability:', err);
        }
        return { success: true };
    };

    const handleAutoCreateInvoiceFromCalculator = async (items) => {
        setLoading(true);
        try {
            // Verify stock before generating invoice
            const stockCheck = await checkStockAvailability(items);
            if (!stockCheck.success) {
                const proceedAnyway = window.confirm(
                    `Stock Alert:\n\n${stockCheck.error}\n\nDo you want to continue and create the invoice anyway? (This will result in negative stock counts)`
                );
                if (!proceedAnyway) {
                    setLoading(false);
                    return;
                }
            }
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

            const isEditing = !isNewQuotationOption && !!savedQuotation?.id;

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

            // Generate mock savedData and finalInvoice instantly for zero-latency local state updates
            const mockQuoId = quotationPayload.id || `temp-quo-${Date.now()}`;
            const savedData = { ...quotationPayload, id: mockQuoId };

            const invoicePayload = {
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
            };
            const finalInvoice = { ...invoicePayload, id: `temp-inv-${Date.now()}` };

            // 1. Instantly update local states and close calculator
            setSavedQuotation(savedData);
            setSavedInvoice(finalInvoice);
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

            if (editedJob.status !== 'quotation_sent') {
                setEditedJob(prev => ({ ...prev, status: 'quotation_sent' }));
                if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'quotation_sent' });
            }

            setActiveForm(null);
            setCalculatorItems(null);
            setShowServiceChargeCloseCallFlow(true);

            // 2. Perform the database and logging tasks asynchronously in the background
            (async () => {
                try {
                    // Save quotation
                    const saveRes = await apiCall(`/api/admin/transactions?type=quotation`, {
                        method: isEditing ? 'PUT' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(quotationPayload)
                    });
                    const saveJson = await saveRes.json();
                    const isQueued = saveJson.queued || saveRes.status === 202;
                    if (!saveJson.success && !isQueued) {
                        throw new Error(saveJson.error || 'Failed to save quotation');
                    }

                    const serverSavedData = isQueued ? savedData : saveJson.data;

                    // Log quotation interaction in background
                    const qType = isEditing ? 'quotation-edited' : 'quotation-created';
                    const detailedQDesc = `Quotation ${serverSavedData.quote_number} updated to service charge only\n\n${formatTransactionDetails(serverSavedData, 'Quotation')}`;
                    apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: qType,
                            category: 'billing',
                            description: detailedQDesc,
                            user_name: techName,
                            customer_id: editedJob.customerId || null,
                            metadata: {
                                quote_number: serverSavedData.quote_number,
                                quote_id: serverSavedData.id,
                                total_amount: serverSavedData.total_amount,
                                subtotal: serverSavedData.subtotal,
                                tax: serverSavedData.total_tax,
                                items: serverSavedData.items
                            }
                        })
                    }).catch(() => {});

                    // Save invoice
                    const invoiceRes = await apiCall(`/api/admin/transactions?type=sales`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...invoicePayload,
                            account_id: serverSavedData.account_id,
                            account_name: serverSavedData.account_name || editedJob.customer?.name || 'Customer',
                            reference: serverSavedData.quote_number,
                            items: serverSavedData.items,
                            subtotal: serverSavedData.subtotal,
                            cgst: serverSavedData.cgst,
                            sgst: serverSavedData.sgst,
                            igst: serverSavedData.igst,
                            total_tax: serverSavedData.total_tax,
                            total_amount: serverSavedData.total_amount,
                            terms: serverSavedData.terms,
                        })
                    });
                    const invoiceJson = await invoiceRes.json();
                    const isInvQueued = invoiceJson.queued || invoiceRes.status === 202;
                    if (!invoiceJson.success && !isInvQueued) {
                        throw new Error(invoiceJson.error || 'Failed to auto-create invoice');
                    }

                    const serverFinalInvoice = isInvQueued ? finalInvoice : invoiceJson.data;

                    // Log invoice interaction in background
                    const detailedInvDesc = `Final invoice ${serverFinalInvoice.invoice_number} created from quotation ${serverSavedData.quote_number}\n\n${formatTransactionDetails(serverFinalInvoice, 'Invoice')}`;
                    apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'invoice-created',
                            category: 'billing',
                            description: detailedInvDesc,
                            user_name: techName,
                            customer_id: editedJob.customerId || null,
                            metadata: {
                                invoice_number: serverFinalInvoice.invoice_number,
                                invoice_id: serverFinalInvoice.id,
                                total_amount: serverFinalInvoice.total_amount,
                                subtotal: serverFinalInvoice.subtotal,
                                tax: serverFinalInvoice.total_tax,
                                items: serverFinalInvoice.items
                            }
                        })
                    }).catch(() => {});

                    if (editedJob.status !== 'quotation_sent') {
                        await apiCall(`/api/technician/jobs/${editedJob.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'update_status', status: 'quotation_sent', updated_by_name: techName })
                        }).catch(() => {});
                    }
                } catch (err) {
                    console.warn('[Offline] Background invoice save error:', err);
                }
            })();
        } catch (e) {
            console.error('Failed to auto-create invoice from calculator', e);
            alert('Failed to save & invoice: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkArrived = () => {
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        
        // 1. Instantly open the location verification check-in modal!
        const existingLat = editedJob._raw_property?.latitude || editedJob.location?.lat || null;
        const existingLng = editedJob._raw_property?.longitude || editedJob.location?.lng || null;
        setVerifyLat(existingLat);
        setVerifyLng(existingLng);
        setLocationVerifyStep('ask');
        setShowLocationVerifyModal(true);

        // 2. Perform the actual check-in API call and location recording asynchronously in the background
        (async () => {
            try {
                const coords = await getCoordsWithTimeout(1500);
                const lat = coords?.latitude || null;
                const lng = coords?.longitude || null;
                arrivalCoordsRef.current = (lat && lng) ? { lat, lng } : null;

                const res = await apiCall(`/api/technician/jobs/${job.id}`, {
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
                if (res.ok) {
                    pendingArrivedDataRef.current = { arrivedAt: data.job?.arrived_at || new Date().toISOString(), jobData: data.job };
                }
            } catch (err) {
                console.warn('[Offline] Failed to sync arrival in background:', err);
            }
        })();
    };

    const handleCallCustomerClick = async () => {
        setCalledCustomer(true);
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

        const coords = await getCoordsWithTimeout(1500);
        if (coords) {
            sendLog(coords.latitude, coords.longitude);
        } else {
            sendLog();
        }
    };

    const handleMapsNavigateClick = async () => {
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

        const coords = await getCoordsWithTimeout(1500);
        if (coords) {
            sendLog(coords.latitude, coords.longitude);
        } else {
            sendLog();
        }
    };

    // Called when tech confirms pin was correct (Yes path)
    const handleLocationVerifyYes = async () => {
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        
        // Try to get current coordinates (either existing ones or arrival coordinates)
        const currentPropLat = editedJob._raw_property?.latitude || null;
        const currentPropLng = editedJob._raw_property?.longitude || null;

        const finalLat = currentPropLat || arrivalCoordsRef.current?.lat || null;
        const finalLng = currentPropLng || arrivalCoordsRef.current?.lng || null;

        // Optimistically update status and coordinates locally
        if (finalLat && finalLng) {
            const currentProp = editedJob._raw_property || {};
            const updatedProp = {
                ...currentProp,
                latitude: finalLat,
                longitude: finalLng,
                location_verified_by: techName,
                location_verified_at: new Date().toISOString()
            };
            const mockJob = {
                ...editedJob,
                _raw_property: updatedProp,
                property: updatedProp
            };
            onJobUpdate(mockJob);

            (async () => {
                try {
                    const res = await apiCall(`/api/technician/jobs/${job.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'verify_location',
                            latitude: finalLat,
                            longitude: finalLng,
                            location_verified_by: techName
                        })
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.job) {
                            onJobUpdate(data.job);
                        }
                    }
                } catch (err) {
                    console.warn('[Offline] Background verify location yes queued or failed:', err);
                }
            })();
        } else {
            // Log interaction fallback
            apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'location-verified', category: 'property', description: `Customer pin location confirmed accurate by ${techName}`, user_name: techName })
            }).catch(() => {});
        }

        // Transition to before photos step and open camera
        setLocationVerifyStep('before_photos');
        setTimeout(() => {
            beforePhotosInputRef.current?.click();
        }, 150);
    };

    // Called when tech confirms updated pin location (No → update path)
    const handleLocationVerifySave = async () => {
        if (!verifyLat || !verifyLng) { alert('Please set the pin location first.'); return; }
        
        // Optimistically update locally
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        const currentProp = editedJob._raw_property || {};
        const updatedProp = {
            ...currentProp,
            latitude: verifyLat,
            longitude: verifyLng,
            location_verified_by: techName,
            location_verified_at: new Date().toISOString()
        };
        const mockJob = {
            ...editedJob,
            _raw_property: updatedProp,
            property: updatedProp
        };
        onJobUpdate(mockJob);

        // Call API in background
        (async () => {
            try {
                const res = await apiCall(`/api/technician/jobs/${job.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'verify_location',
                        latitude: verifyLat,
                        longitude: verifyLng,
                        location_verified_by: techName
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.job) {
                        onJobUpdate(data.job);
                    }
                }
            } catch (err) {
                console.warn('[Offline] Background verify location save queued or failed:', err);
            }
        })();

        // Transition to before photos step and open camera
        setLocationVerifyStep('before_photos');
        setTimeout(() => {
            beforePhotosInputRef.current?.click();
        }, 150);
    };

    const compressImage = (file) => {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(file);
                return;
            }
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (blob) {
                        resolve(new File([blob], file.name || 'image.jpeg', { type: 'image/jpeg', lastModified: Date.now() }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', 0.80);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file);
            };
            img.src = objectUrl;
        });
    };

    const handleBeforePhotosUpload = (event) => {
        const files = Array.from(event.target.files);
        const newPhotos = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            url: URL.createObjectURL(file),
            file
        }));
        setBeforePhotos(prev => [...prev, ...newPhotos]);
    };

    const removeBeforePhoto = (id) => {
        setBeforePhotos(prev => prev.filter(p => p.id !== id));
    };

    const handleBeforePhotosSubmit = async () => {
        if (beforePhotosLoading) return;
        if (beforePhotos.length === 0) {
            alert('Please take/upload at least 1 before photo of the product.');
            return;
        }
        setBeforePhotosLoading(true);
        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        try {
            // Generate local file mappings and placeholder URLs instantly
            const uploadMappings = beforePhotos.filter(photo => photo.file).map(photo => {
                const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                return {
                    fileId,
                    file: photo.file,
                    placeholderUrl: `/offline-file-placeholder?id=${fileId}`
                };
            });
            const uploadedUrls = uploadMappings.map(m => m.placeholderUrl);

            // Calculate visit number dynamically
            const nextVisitNum = (editedJob.interactions || []).filter(i => i.type === 'before-photos-uploaded').length + 1;

            const descText = beforePhotosDescription.trim() 
                ? `Before Photos uploaded for Visit #${nextVisitNum}.\nNote: ${beforePhotosDescription.trim()}`
                : `Before Photos uploaded for Visit #${nextVisitNum}.`;

            const pending = pendingArrivedDataRef.current;
            const newStatus = editedJob.status === 'scheduled' ? 'diagnosing_quoting' : editedJob.status;
            
            // Close the location verification modal and transition UI instantly!
            setShowLocationVerifyModal(false);
            setBeforePhotos([]);
            setBeforePhotosDescription('');

            setEditedJob(prev => ({
                ...prev,
                arrived_at: pending?.arrivedAt || new Date().toISOString(),
                status: newStatus,
                interactions: [
                    {
                        type: 'before-photos-uploaded',
                        performed_by_name: techName,
                        description: descText,
                        timestamp: new Date().toISOString(),
                        metadata: { attachments: uploadedUrls, visit_number: nextVisitNum }
                    },
                    ...(prev.interactions || [])
                ]
            }));

            // Notify parent component about the updated job data
            if (onJobUpdate) {
                onJobUpdate({
                    ...editedJob,
                    arrived_at: pending?.arrivedAt || new Date().toISOString(),
                    status: newStatus
                });
            }

            // Perform slow image compression, storage, and API calls in the background!
            (async () => {
                try {
                    // 1. Compress and write to IndexedDB asynchronously
                    for (const item of uploadMappings) {
                        try {
                            const compressed = await compressImage(item.file);
                            await storeOfflineFile(item.fileId, compressed);
                        } catch (compErr) {
                            console.error('[Offline] Background check-in compression failed, storing raw:', compErr);
                            try {
                                await storeOfflineFile(item.fileId, item.file);
                            } catch (storeErr) {
                                console.error('[Offline] Background check-in raw store failed:', storeErr);
                            }
                        }
                    }

                    // 2. Call the APIs now that files are safely in IndexedDB
                    const logPromise = apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'before-photos-uploaded',
                            category: 'job',
                            description: descText,
                            user_name: techName,
                            metadata: { attachments: uploadedUrls, visit_number: nextVisitNum }
                        })
                    });

                    const updatePromise = apiCall(`/api/technician/jobs/${job.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            status: newStatus,
                            arrived_at: pending?.arrivedAt || new Date().toISOString(),
                            updated_by_name: techName
                        })
                    });

                    const [logRes, updateRes] = await Promise.all([logPromise, updatePromise]);
                    if (!updateRes.ok) {
                        const updateData = await updateRes.json();
                        console.warn('[Offline] Background check-in update queued or failed:', updateData.error);
                    }
                } catch (e) {
                    console.warn('[Offline] Background check-in updates queued or failed:', e);
                }
            })();
        } catch (err) {
            alert('Failed to submit before photos: ' + err.message);
        } finally {
            setBeforePhotosLoading(false);
        }
    };

    const handleAfterPhotosUpload = (event) => {
        const files = Array.from(event.target.files);
        const newPhotos = files.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            url: URL.createObjectURL(file),
            file
        }));
        setAfterPhotos(prev => [...prev, ...newPhotos]);
    };

    const removeAfterPhoto = (id) => {
        setAfterPhotos(prev => prev.filter(p => p.id !== id));
    };

    const handleAfterPhotosSubmit = async () => {
        if (afterPhotosLoading) return;
        if (afterPhotos.length === 0) {
            alert('Please take/upload at least 1 after photo of the product.');
            return;
        }
        setAfterPhotosLoading(true);

        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        try {
            // Generate local file mappings and placeholder URLs instantly
            const uploadMappings = afterPhotos.filter(photo => photo.file).map(photo => {
                const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                return {
                    fileId,
                    file: photo.file,
                    placeholderUrl: `/offline-file-placeholder?id=${fileId}`
                };
            });
            const uploadedUrls = uploadMappings.map(m => m.placeholderUrl);

            const descText = afterPhotosDescription.trim() 
                ? `After Photos uploaded.\nNote: ${afterPhotosDescription.trim()}`
                : `After Photos uploaded.`;

            // Close modal and transition UI instantly!
            setShowAfterPhotosModal(false);
            setAfterPhotos([]);
            setAfterPhotosDescription('');
            setHasUploadedPhotosLocal(true);
            
            // Automatically open Collect Payment modal!
            setShowCollectPayment(true);

            // Run compression, local storage, and real network requests in background!
            (async () => {
                try {
                    // 1. Compress and write to IndexedDB asynchronously
                    for (const item of uploadMappings) {
                        try {
                            const compressed = await compressImage(item.file);
                            await storeOfflineFile(item.fileId, compressed);
                        } catch (compErr) {
                            console.error('[Offline] Background checkout compression failed, storing raw:', compErr);
                            try {
                                await storeOfflineFile(item.fileId, item.file);
                            } catch (storeErr) {
                                console.error('[Offline] Background checkout raw store failed:', storeErr);
                            }
                        }
                    }

                    // 2. Call the API to log the photos interaction
                    await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'after-photos-uploaded',
                            category: 'job',
                            description: descText,
                            user_name: techName,
                            metadata: { attachments: uploadedUrls }
                        })
                    });

                    // Reload job state from server to immediately fetch the new interaction
                    const reloadRes = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                    const reloadData = await reloadRes.json();
                    if (reloadData.success && reloadData.job) {
                        setEditedJob(reloadData.job);
                        if (onJobUpdate) onJobUpdate(reloadData.job);
                    }
                } catch (bgErr) {
                    console.warn('[Offline] Background photos save failed:', bgErr);
                }
            })();
        } catch (err) {
            alert('Failed to save after photos: ' + (err.message || 'Unknown error'));
        } finally {
            setAfterPhotosLoading(false);
        }
    };

    const handleGenerateInvoice = async () => {
        if (loading) return;
        setLoading(true);

        // Verify physical stock before generating invoice
        if (savedQuotation && savedQuotation.items) {
            const stockCheck = await checkStockAvailability(savedQuotation.items);
            if (!stockCheck.success) {
                const proceedAnyway = window.confirm(
                    `Stock Alert:\n\n${stockCheck.error}\n\nDo you want to continue and create the invoice anyway? (This will result in negative stock counts)`
                );
                if (!proceedAnyway) {
                    setLoading(false);
                    return;
                }
            }
        }

        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
        const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        const mockInvoice = {
            id: `temp-inv-${Date.now()}`,
            invoice_number: invoiceNum,
            total_amount: savedQuotation.total_amount,
            subtotal: savedQuotation.subtotal,
            total_tax: savedQuotation.total_tax,
            items: savedQuotation.items,
            status: 'unpaid'
        };

        setSavedInvoice(mockInvoice);
        setShowWhatsappPopup({ type: 'invoice', doc: mockInvoice });

        try {
            const invoiceRes = await apiCall(`/api/admin/transactions?type=sales`, {
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
                    invoice_number: invoiceNum,
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

            const data = await invoiceRes.json();
            const isQueued = data.queued || invoiceRes.status === 202;
            if (invoiceRes.ok && (data.success || isQueued)) {
                const finalInvoice = isQueued ? mockInvoice : data.data;
                setSavedInvoice(finalInvoice);

                // Update whatsapp doc if open
                setShowWhatsappPopup(prev => {
                    if (prev && prev.type === 'invoice' && prev.doc.invoice_number === invoiceNum) {
                        return { type: 'invoice', doc: finalInvoice };
                    }
                    return prev;
                });

                // Log invoice-created interaction
                const detailedInvDesc = `Final invoice ${finalInvoice.invoice_number} created from quotation ${savedQuotation.quote_number}\n\n` + formatTransactionDetails(finalInvoice, 'Invoice');
                await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'invoice-created',
                        category: 'billing',
                        description: detailedInvDesc,
                        user_name: techName,
                        metadata: {
                            invoice_number: finalInvoice.invoice_number,
                            invoice_id: finalInvoice.id,
                            total_amount: finalInvoice.total_amount,
                            subtotal: finalInvoice.subtotal,
                            tax: finalInvoice.total_tax,
                            items: finalInvoice.items
                        }
                    })
                }).catch(() => {});

                // Reload job to fetch latest interactions
                const reloadRes = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                const reloadData = await reloadRes.json();
                if (reloadData.success && reloadData.job) {
                    setEditedJob(reloadData.job);
                    if (onJobUpdate) onJobUpdate(reloadData.job);
                }
            } else {
                throw new Error(data.error || 'Failed to save invoice');
            }
        } catch (err) {
            alert('Failed to generate final invoice: ' + err.message);
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
            // Generate local file mappings and placeholder URLs instantly
            const uploadMappings = (note.attachments || []).filter(att => att.file).map(att => {
                const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                return {
                    fileId,
                    file: att.file,
                    placeholderUrl: `/offline-file-placeholder?id=${fileId}`
                };
            });

            // Map final list of attachment URLs to include placeholders and existing URLs
            const uploadedUrls = [];
            if (note.attachments && note.attachments.length > 0) {
                note.attachments.forEach(att => {
                    if (att.file) {
                        const match = uploadMappings.find(m => m.file === att.file);
                        if (match) uploadedUrls.push(match.placeholderUrl);
                    } else if (att.url && !att.url.startsWith('blob:')) {
                        uploadedUrls.push(att.url);
                    }
                });
            }

            const payload = {
                job_id: editedJob.id,
                customer_id: editedJob.customerId || editedJob.customer_id || null,
                type: 'note-added',
                category: note.category || 'communication',
                description: note.description,
                performed_by_name: techName,
                source: 'Technician App',
                timestamp: new Date().toISOString(),
                metadata: { attachments: uploadedUrls },
            };

            const tempId = `temp-note-${Date.now()}`;
            const noteData = {
                id: tempId,
                ...payload
            };

            // Optimistically update notes feed instantly
            setEditedJob(prev => ({
                ...prev,
                interactions: [noteData, ...(prev.interactions || [])]
            }));

            setIsAddingNote(false);

            // Perform slow image compression, storage, and API call in background
            (async () => {
                try {
                    // 1. Compress and store new files asynchronously in the background
                    for (const item of uploadMappings) {
                        try {
                            const compressed = await compressImage(item.file);
                            await storeOfflineFile(item.fileId, compressed);
                        } catch (compErr) {
                            console.error('[Offline] Background note photo compression failed, storing raw:', compErr);
                            try {
                                await storeOfflineFile(item.fileId, item.file);
                            } catch (storeErr) {
                                console.error('[Offline] Background note photo raw store failed:', storeErr);
                            }
                        }
                    }

                    // 2. Call the API now that files are in IndexedDB
                    const res = await apiCall('/api/admin/interactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    
                    const data = await res.json();
                    if (data.success || data.queued) {
                        if (data.success && data.data) {
                            // Swap temp note with final server note (containing correct ID)
                            setEditedJob(prev => ({
                                ...prev,
                                interactions: (prev.interactions || []).map(i => i.id === tempId ? data.data : i)
                            }));
                        }
                    } else {
                        console.warn('[Offline] Background note saving returned non-success:', data.error);
                    }
                } catch (e) {
                    console.warn('[Offline] Background note saving queued or failed:', e);
                }
            })();

        } catch (err) {
            console.error('Failed to save note:', err);
            alert(`Failed to save note: ${err.message || 'Unknown error'}`);
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
            // Generate local file mappings and placeholders for new attachments
            const uploadMappings = (editedNote.attachments || []).filter(att => att.file).map(att => {
                const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                return {
                    fileId,
                    file: att.file,
                    placeholderUrl: `/offline-file-placeholder?id=${fileId}`
                };
            });

            // Map final list of attachment URLs
            const uploadedUrls = [];
            if (editedNote.attachments && editedNote.attachments.length > 0) {
                editedNote.attachments.forEach(att => {
                    if (att.file) {
                        const match = uploadMappings.find(m => m.file === att.file);
                        if (match) uploadedUrls.push(match.placeholderUrl);
                    } else if (att.url && !att.url.startsWith('blob:')) {
                        uploadedUrls.push(att.url);
                    }
                });
            }

            const tempHistoryId = `temp-edit-hist-${Date.now()}`;
            const mockHistoryLog = {
                id: tempHistoryId,
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

            // Update UI state optimistically
            setEditedJob(prev => {
                const prevInts = prev.interactions || [];
                const updatedInts = prevInts.map(int => 
                    int.id === editedNote.id ? { ...int, description: editedNote.description, metadata: { ...int.metadata, attachments: uploadedUrls } } : int
                );
                return { ...prev, interactions: [mockHistoryLog, ...updatedInts] };
            });

            setIsAddingNote(false);

            // Perform file storage and backend sync in background
            (async () => {
                try {
                    // 1. Store new files in IndexedDB
                    for (const item of uploadMappings) {
                        try {
                            await storeOfflineFile(item.fileId, item.file);
                        } catch (storeErr) {
                            console.error('[Offline] Background note edit file storage failed:', storeErr);
                        }
                    }

                    // 2. Patch the original note
                    const patchRes = await apiCall('/api/admin/interactions', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: editedNote.id,
                            description: editedNote.description,
                            metadata: { ...editedNote.metadata, attachments: uploadedUrls }
                        })
                    });
                    const patchData = await patchRes.json();
                    
                    // 3. Log the history interaction
                    const postRes = await apiCall('/api/admin/interactions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            job_id: editedJob.id,
                            customer_id: editedJob.customerId || editedJob.customer_id || null,
                            type: 'note-edited',
                            category: editInteractionData.category || 'communication',
                            description: editInteractionData.description,
                            performed_by_name: techName,
                            source: 'Technician App',
                            timestamp: new Date().toISOString(),
                            metadata: editInteractionData.metadata,
                        }),
                    });
                    const postData = await postRes.json();

                    if (patchRes.ok && patchData.success) {
                        // Swap final patch details and final history details if successful
                        setEditedJob(prev => {
                            return {
                                ...prev,
                                interactions: (prev.interactions || []).map(i => i.id === tempHistoryId ? ((postRes.ok && postData.success) ? postData.data : mockHistoryLog) : i).map(int => 
                                    int.id === editedNote.id ? patchData.data : int
                                )
                            };
                        });
                    }
                } catch (bgErr) {
                    console.warn('[Offline] Background edit note update failed/queued:', bgErr);
                }
            })();

        } catch (err) {
            console.error('Failed to edit note:', err);
            alert(`Failed to edit note: ${err.message}`);
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
                                    border: 'none', borderRadius: '20px', cursor: 'pointer',
                                    transition: 'all 0.2s ease', flexShrink: 0,
                                    backgroundColor: isActive ? '#3b82f6' : 'var(--bg-secondary)',
                                    color: isActive ? '#fff' : 'var(--text-primary)',
                                    padding: '8px 16px',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                    <Icon size={16} />
                                    {tab.label}
                                </span>
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
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        {editedJob.priority && (
                                            <div style={{
                                                padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                                                backgroundColor: editedJob.priority === 'urgent' ? '#fee2e2' : editedJob.priority === 'high' ? '#ffedd5' : 'var(--bg-elevated)',
                                                color: editedJob.priority === 'urgent' ? '#ef4444' : editedJob.priority === 'high' ? '#f59e0b' : 'var(--text-secondary)'
                                            }}>
                                                {editedJob.priority}
                                            </div>
                                        )}
                                        {editedJob.priority_note && (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                backgroundColor: '#ffffff',
                                                color: '#000000',
                                                border: '1.5px solid #000000',
                                                borderRadius: '12px 12px 12px 1px',
                                                padding: '3px 8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                whiteSpace: 'nowrap',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
                                                width: 'fit-content'
                                            }}>
                                                ☁️ {editedJob.priority_note}
                                            </div>
                                        )}
                                    </div>
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

                    {activeTab === 'visits' && (
                        <VisitsLogTab 
                            visits={computedVisits}
                            onTabChange={setActiveTab}
                            onViewDocument={handleViewDocument}
                        />
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
                                    onUpdate={() => {}} 
                                    isSubmitting={isAddingNote}
                                    currentUserName={techName}
                                    onTabChange={setActiveTab}
                                 />
                            </div>
                        );
                    })()}

                                        {activeTab === 'actions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* 2. Customer Info Section (always second) */}
                            <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Customer Info</h3>
                                <div style={{ display: 'grid', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Phone size={16} color="var(--text-secondary)" />
                                        {isOnline ? (
                                            <a href={`tel:${editedJob.mobile}`} onClick={handleCallCustomerClick} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>{editedJob.mobile}</a>
                                        ) : (
                                            <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '14px' }}>•••••••••• (Go online to view)</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                        <MapPin size={16} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <div style={{ color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
                                            {shouldHideAddress ? (
                                                <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '14px' }}>•••••••••• (Go online/working hours to view)</span>
                                            ) : (
                                                <>
                                                    {editedJob.address && (
                                                        <div style={{ fontWeight: 500 }}>{editedJob.address}</div>
                                                    )}
                                                    {(editedJob.locality || editedJob.city) && (
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                                            {[editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ')}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {!shouldHideAddress && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                                    <a
                                                        href={
                                                            hasCoords
                                                                ? `https://www.google.com/maps?q=${latVal},${lngVal}`
                                                                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([editedJob.address, editedJob.locality, editedJob.city].filter(Boolean).join(', '))}`
                                                        }
                                                        onClick={handleMapsNavigateClick}
                                                        target="_blank" rel="noreferrer"
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#fff', fontSize: '12px', textDecoration: 'none', backgroundColor: buttonColor, padding: '5px 12px', borderRadius: 6, fontWeight: 600 }}
                                                    >
                                                        {buttonLabel}
                                                    </a>
                                                    <span style={{ 
                                                        fontSize: '11px', 
                                                        color: hasCoords ? 'var(--text-secondary)' : '#f59e0b',
                                                        fontWeight: hasCoords ? 500 : 600,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        backgroundColor: hasCoords ? 'rgba(255,255,255,0.04)' : 'rgba(245, 158, 11, 0.08)',
                                                        border: hasCoords ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(245, 158, 11, 0.15)'
                                                    }}>
                                                        {hasCoords 
                                                            ? `Coords: ${latVal.toFixed(5)}, ${lngVal.toFixed(5)}`
                                                            : '⚠️ No pin location details'
                                                        }
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 1. Current Status Row (always at the top) */}
                            <div className="card" style={{ padding: '14px 16px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={18} color="#3b82f6" />
                                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Current Status:</span>
                                </div>
                                <span style={{ 
                                    padding: '4px 10px', 
                                    borderRadius: '20px', 
                                    fontSize: '13px', 
                                    fontWeight: 700, 
                                    backgroundColor: editedJob.status === 'parts_ordered' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)', 
                                    color: editedJob.status === 'parts_ordered' ? '#f59e0b' : '#3b82f6',
                                    textTransform: 'uppercase'
                                }}>
                                    {editedJob.status?.replace(/_/g, ' ').replace(/-/g, ' ')}
                                </span>
                            </div>

                            {/* 3. Advance Payment Collected red card (always third if any) */}
                            {advancePaymentInt && (
                                <div className="card" style={{ 
                                    padding: '14px', 
                                    background: 'rgba(239, 68, 68, 0.08)', 
                                    border: '1.5px solid rgba(239, 68, 68, 0.35)', 
                                    borderRadius: '12px', 
                                    color: '#f87171', 
                                    fontSize: '14px', 
                                    fontWeight: 700, 
                                    textAlign: 'center',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>💳</span>
                                        <span>Advance Payment Collected: ₹{(advancePaymentInt.metadata?.amount || advancePaymentInt.amount || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    {advancePaymentInt.metadata?.method && (
                                        <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 500, color: 'var(--text-secondary)' }}>
                                            Payment Mode: {advancePaymentInt.metadata.method.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {latestEndedVisit && (
                                <div className="card" style={{ 
                                    padding: '14px', 
                                    backgroundColor: 'rgba(56, 189, 248, 0.05)', 
                                    border: '1.5px solid rgba(56, 189, 248, 0.25)', 
                                    borderRadius: '12px', 
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>📋</span>
                                        <span>Visit #{latestEndedVisit.visitNumber} Summary</span>
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', fontSize: '13px' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Status: </span>
                                            <strong style={{ color: latestEndedVisit.outStatus.includes('Parts Ordered') ? '#f59e0b' : '#10b981' }}>{latestEndedVisit.outStatus}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Duration: </span>
                                            <strong style={{ color: 'var(--text-primary)' }}>{latestEndedVisit.durationStr}</strong>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Started: </span>
                                            <strong style={{ color: 'var(--text-primary)' }}>{new Date(latestEndedVisit.startJobTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                                        </div>
                                        {latestEndedVisit.arrivalTime && (
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)' }}>Arrived: </span>
                                                <strong style={{ color: 'var(--text-primary)' }}>{new Date(latestEndedVisit.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</strong>
                                            </div>
                                        )}
                                    </div>
                                    {latestEndedVisit.advPayment && (
                                        <div style={{ fontSize: '12px', padding: '6px 10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', color: '#10b981', fontWeight: 600 }}>
                                            💰 Advance Collected: ₹{(latestEndedVisit.advPayment.metadata?.amount || latestEndedVisit.advPayment.amount || 0).toLocaleString('en-IN')}
                                        </div>
                                    )}
                                    {latestEndedVisit.beforeNote && (
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '6px' }}>
                                            Note: "{latestEndedVisit.beforeNote}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Start Job / Mark as Arrived / On Way Banner Section */}
                            {(() => {
                                const isCurrentlyOnWay = editedJob.on_way_at && (!editedJob.arrived_at || new Date(editedJob.on_way_at) > new Date(editedJob.arrived_at));
                                const nextVisitNum = (editedJob.interactions || []).filter(i => i.type === 'before-photos-uploaded').length + 1;
                                
                                const showHeadOutSection = editedJob.status !== 'closed' && 
                                                           editedJob.status !== 'cancelled' && 
                                                           (editedJob.status === 'scheduled' || editedJob.status === 'parts_ordered');

                                return (
                                    <>
                                        {/* On Way Banner */}
                                        {editedJob.status !== 'closed' && editedJob.status !== 'cancelled' && isCurrentlyOnWay && (
                                            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', fontSize: 13, color: '#38bdf8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: '12px' }}>
                                                 On the way — customer notified. Location sharing active.
                                            </div>
                                        )}

                                        {/* Start Job Button */}
                                        {showHeadOutSection && !isCurrentlyOnWay && (
                                            <div className="card" style={{ padding: 'var(--spacing-md)', border: '2px solid #38bdf8', backgroundColor: 'rgba(56,189,248,0.04)' }}>
                                                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                     Ready to Head Out? (Visit {nextVisitNum})
                                                </h3>
                                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.5 }}>
                                                     Tap below to start GPS sharing with the customer. This locks their cancel/reschedule option so you won't face last-minute changes.
                                                </p>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#38bdf8,#3b82f6)', whiteSpace: 'normal' }}
                                                    onClick={() => {
                                                          const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                                          const nowStr = new Date().toISOString();
                                                          
                                                          // 1. Instantly update the local UI state so the button disappears and "On Way" state is visible!
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

                                                          // 2. Perform the location fetching and API call in the background asynchronously
                                                          (async () => {
                                                              try {
                                                                  const coords = await getCoordsWithTimeout(1500);
                                                                  const res = await apiCall(`/api/technician/jobs/${job.id}`, {
                                                                      method: 'PUT',
                                                                      headers: { 'Content-Type': 'application/json' },
                                                                      body: JSON.stringify({ 
                                                                          action: 'mark_on_way', 
                                                                          updated_by_name: techName,
                                                                          latitude: coords?.latitude || null,
                                                                          longitude: coords?.longitude || null
                                                                      })
                                                                  });
                                                                  const data = await res.json();
                                                                  if (res.ok && onJobUpdate && data.job) {
                                                                      onJobUpdate(data.job);
                                                                  }
                                                              } catch (err) {
                                                                  console.warn('[Offline] Failed to sync on-way status in background:', err);
                                                              }
                                                          })();
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
                                                    Tap when you reach the customer — location verification and check-in photos will be required.
                                                </p>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={handleMarkArrived}
                                                    disabled={markingArrival}
                                                    style={{ width: '100%', padding: '14px', fontSize: '15px', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', whiteSpace: 'normal' }}
                                                >
                                                    {markingArrival ? ' Recording...' : `Mark as Arrived (Visit ${nextVisitNum})`}
                                                </button>
                                            </div>
                                        )}

                                        {/* Pre-Arrived Close Call No Service option */}
                                        {!advancePaymentInt && showHeadOutSection && (calledCustomer || (editedJob.interactions || []).some(i => i.type === 'customer-called')) && (
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    setNoServicePOC('');
                                                    setNoServiceReason('');
                                                    setNoChargeChecked(false);
                                                    setShowNoServiceModal(true);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 14px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                    color: '#f87171',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    borderRadius: 'var(--radius-md)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'normal',
                                                    marginTop: '12px',
                                                    marginBottom: '12px'
                                                }}
                                            >
                                                ❌ Close Call — No Service
                                            </button>
                                        )}
                                    </>
                                );
                            })()}

                            {partsOption === 'select' ? (
                                <div className="card" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '14px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px' }}>
                                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>
                                        Select Parts Action
                                    </h3>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <button
                                            className="btn"
                                            style={{ flex: 1, padding: '14px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                            onClick={() => {
                                                setPartsActionType('Order Part');
                                                setPartsOption(null);
                                                setTimeout(() => partsPhotosInputRef.current?.click(), 100);
                                            }}
                                        >
                                            📦 Order Part
                                        </button>
                                        <button
                                            className="btn"
                                            style={{ flex: 1, padding: '14px', backgroundColor: '#10b981', color: '#fff', border: 'none', fontWeight: 700, fontSize: '14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                            onClick={() => {
                                                setPartsActionType('Collect Part');
                                                setPartsOption(null);
                                                setTimeout(() => partsPhotosInputRef.current?.click(), 100);
                                            }}
                                        >
                                            🛒 Collect Part
                                        </button>
                                    </div>
                                    <button
                                        className="btn"
                                        style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', fontWeight: 600, fontSize: '13px', borderRadius: '8px' }}
                                        onClick={() => setPartsOption(null)}
                                    >
                                        Back
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 4px' }}>
                                    {/* 3. 3-Button Section (if status is diagnosing_quoting or any active status without a quotation) */}
                                    {(editedJob.status === 'diagnosing_quoting' || (!['scheduled', 'closed', 'cancelled'].includes(editedJob.status) && !savedQuotation)) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            {/* 1. Calculate Repair Estimate */}
                                            <button
                                                className="btn"
                                                style={{ padding: '12px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(139,92,246,0.12)', color: '#c084fc', border: '1px solid rgba(139,92,246,0.3)', fontWeight: 600, fontSize: '13px', borderRadius: '8px', whiteSpace: 'normal', lineHeight: '1.2', textAlign: 'center' }}
                                                onClick={() => {
                                                    setIsCloseWithServiceCharge(false);
                                                    setActiveForm('calculator');
                                                }}
                                            >
                                                ⚡ Repair Estimate
                                            </button>
 
                                            {/* 2. Close with Service Charge */}
                                            <button
                                                className="btn"
                                                style={{ padding: '12px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600, fontSize: '13px', borderRadius: '8px', whiteSpace: 'normal', lineHeight: '1.2', textAlign: 'center' }}
                                                onClick={() => {
                                                    setIsCloseWithServiceCharge(true);
                                                    setActiveForm('calculator');
                                                }}
                                            >
                                                🛠️ Close with Service
                                            </button>
 
                                            {/* 3. Close Call Without Service */}
                                            {!advancePaymentInt && (
                                                <button
                                                    className="btn"
                                                    style={{ gridColumn: 'span 2', padding: '12px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', fontWeight: 600, fontSize: '13px', borderRadius: '8px', whiteSpace: 'normal', lineHeight: '1.2', textAlign: 'center' }}
                                                    onClick={() => { setNoServicePOC(''); setNoServiceReason(''); setNoChargeChecked(false); setShowNoServiceModal(true); }}
                                                >
                                                    ❌ Close Without Service
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Order/Collect Parts Button (shown after quotation is created, status is quotation_sent or work_in_progress) */}
                                    {['quotation_sent', 'work_in_progress'].includes(editedJob.status) && (
                                        <div style={{ padding: '0 4px' }}>
                                            <button
                                                className="btn"
                                                style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', fontWeight: 600, fontSize: '13px', borderRadius: '8px' }}
                                                onClick={() => setPartsOption('select')}
                                            >
                                                📦 Order/Collect Parts for Repair
                                            </button>
                                        </div>
                                    )}

                                    {/* Collect Advance Payment Button (shown when status is parts_ordered and quotation exists) */}
                                    {editedJob.status === 'parts_ordered' && savedQuotation && (
                                        <div style={{ padding: '0 4px' }}>
                                            {!advancePaymentInt && (
                                                <button
                                                    className="btn"
                                                    style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)', fontWeight: 700, fontSize: '13px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(139,92,246,0.15)' }}
                                                    onClick={() => setShowAdvanceCollectPayment(true)}
                                                >
                                                    💳 Collect Advance Payment
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <input 
                                ref={partsPhotosInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files);
                                    const newPhotos = files.map(file => ({
                                        id: Date.now() + Math.random(),
                                        name: file.name,
                                        url: URL.createObjectURL(file),
                                        file
                                    }));
                                    setPartsPhotos(prev => [...prev, ...newPhotos]);
                                    setShowPartsNoteModal(true);
                                }}
                                style={{ display: 'none' }}
                            />

                            {/* 5. Quotation Approval & Billing (only displays if a quotation or invoice is created) */}
                            {(savedQuotation || savedInvoice) && (
                                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FilePlus size={18} color="#10b981" /> Quotation Approval & Billing
                                    </h3>
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                    {savedInvoice ? (
                                        <>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'rgba(16,185,129,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#10b981' }}>Invoice {savedInvoice.invoice_number || ''}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total: ₹{(savedInvoice.total_amount || 0).toLocaleString('en-IN')}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button
                                                        className="btn"
                                                        style={{ flex: 1, padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600, fontSize: '13px', borderRadius: 'var(--radius-md)', whiteSpace: 'normal' }}
                                                        onClick={() => setShowWhatsappPopup({ type: 'invoice', doc: savedInvoice })}
                                                    >
                                                        View / Send
                                                    </button>
                                                    {editedJob.status === 'closed' ? (
                                                        <div
                                                            style={{ flex: 1, padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                                        >
                                                            <CheckCircle size={14} /> Closed & Paid
                                                        </div>
                                                    ) : (hasPaymentLocal || editedJob.interactions?.some(i => i.type === 'payment-received')) ? (
                                                        <button
                                                            className="btn"
                                                            style={{ flex: 1, padding: '8px 12px', backgroundColor: 'rgba(99,102,241,0.9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'normal' }}
                                                            onClick={() => setShowFeedbackCloseFlow(true)}
                                                        >
                                                            <CheckCircle size={14} /> Close Call
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="btn"
                                                            style={{ flex: 1, padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '13px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'normal' }}
                                                            onClick={() => setShowCollectPayment(true)}
                                                        >
                                                            <CheckCircle size={14} /> Collect Payment
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {editedJob.status !== 'closed' && (
                                                <button
                                                    className="btn"
                                                    disabled={loading}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                        color: '#f87171',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'normal',
                                                        marginTop: '12px'
                                                    }}
                                                    onClick={handleRestartProcess}
                                                >
                                                    🔄 Restart Quotation & Invoice
                                                </button>
                                            )}
                                        </>
                                    ) : (
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
                                                                            padding: '10px 12px',
                                                                            fontSize: '13px',
                                                                            fontWeight: 700,
                                                                            borderRadius: '8px',
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
                                                        {savedQuotations.length < 2 && !['parts_ordered', 'work_in_progress', 'completed', 'closed'].includes(editedJob.status) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsNewQuotationOption(true);
                                                                    setCalculatorItems([]);
                                                                    setActiveForm('calculator');
                                                                }}
                                                                style={{
                                                                    padding: '10px 12px',
                                                                    fontSize: '13px',
                                                                    fontWeight: 700,
                                                                    borderRadius: '8px',
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
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Quotation {savedQuotation.quote_number || ''}</div>
                                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total: ₹{(savedQuotation.total_amount || 0).toLocaleString('en-IN')}</div>
                                                </div>
                                                {/* Edit goes away if approved, except when payment amount does not match approved quotation */}
                                                {(() => {
                                                    const hasPayment = editedJob.interactions?.some(i => i.type === 'payment-received');
                                                    const collectedAmount = editedJob.interactions
                                                        ?.filter(i => i.type === 'payment-received')
                                                        .reduce((sum, i) => sum + (parseFloat(i.metadata?.amount) || 0), 0) || 0;
                                                    const quotationAmount = savedQuotation?.total_amount || 0;
                                                    const isPaymentMatchingQuote = Math.abs(collectedAmount - quotationAmount) < 0.01;

                                                    const showEditButton = !['work_in_progress', 'completed', 'closed'].includes(editedJob.status) || 
                                                                          (editedJob.status === 'work_in_progress' && hasPayment && !isPaymentMatchingQuote);

                                                    if (!showEditButton) return null;

                                                    return (
                                                        <button
                                                            className="btn"
                                                            style={{ width: '100%', padding: '8px 12px', backgroundColor: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640', fontWeight: 600, fontSize: '13px', borderRadius: 'var(--radius-md)', whiteSpace: 'normal' }}
                                                            onClick={() => {
                                                                setIsNewQuotationOption(false);
                                                                setActiveForm('calculator');
                                                            }}
                                                        >
                                                            Edit / Send
                                                        </button>
                                                    );
                                                })()}
                                            </div>

                                            {/* Approval & Proceed Flow */}
                                            {(() => {
                                                const sortedQuotes = [...savedQuotations].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                                                const isServiceChargeSelected = savedQuotations.length === 2 && savedQuotation?.id === sortedQuotes[1]?.id;

                                                if (isServiceChargeSelected) {
                                                    if (editedJob.status === 'closed') return null;
                                                    return (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <button
                                                                className="btn"
                                                                disabled={loading}
                                                                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius-md)', cursor: 'pointer', whiteSpace: 'normal', boxShadow: '0 4px 12px rgba(245,158,11,0.2)' }}
                                                                onClick={async () => {
                                                                    setLoading(true);
                                                                    try {
                                                                        const serviceQuote = sortedQuotes[1];
                                                                        if (!serviceQuote) throw new Error('Service charge quotation option not found');
                                                                        
                                                                        const stockCheck = await checkStockAvailability(serviceQuote.items);
                                                                        if (!stockCheck.success) {
                                                                            const proceedAnyway = window.confirm(
                                                                                `Stock Alert:\n\n${stockCheck.error}\n\nDo you want to continue and create the invoice anyway? (This will result in negative stock counts)`
                                                                            );
                                                                            if (!proceedAnyway) {
                                                                                setLoading(false);
                                                                                return;
                                                                            }
                                                                        }

                                                                        const invoiceNum = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                                                                        const invoicePayload = {
                                                                            account_id: serviceQuote.account_id,
                                                                            account_name: serviceQuote.account_name || editedJob.customer?.name || 'Customer',
                                                                            accountGSTIN: serviceQuote.accountGSTIN || '',
                                                                            accountState: serviceQuote.accountState || 'Maharashtra',
                                                                            billing_address: serviceQuote.billing_address || [editedJob.address, editedJob.locality, editedJob.city, editedJob.pincode].filter(Boolean).join(', ') || '',
                                                                            job_id: editedJob.id,
                                                                            date: new Date().toISOString().split('T')[0],
                                                                            due_date: new Date().toISOString().split('T')[0],
                                                                            invoice_number: invoiceNum,
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
                                                                            technician_id: serviceQuote.technician_id || techId,
                                                                            technician_name: serviceQuote.technician_name || techName || editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician'
                                                                        };

                                                                        const mockInvoice = { ...invoicePayload, id: `temp-inv-${Date.now()}` };
                                                                        
                                                                        // Optimistically update invoice and open payment collection instantly
                                                                        setSavedInvoice(mockInvoice);
                                                                        setShowServiceChargeCollectPayment(true);

                                                                        // Fire API request in background
                                                                        (async () => {
                                                                            try {
                                                                                const res = await apiCall(`/api/admin/transactions?type=sales`, {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify(invoicePayload)
                                                                                });
                                                                                const data = await res.json();
                                                                                const isQueued = data.queued || res.status === 202;
                                                                                if (res.ok && (data.success || isQueued)) {
                                                                                    const finalInvoice = isQueued ? mockInvoice : data.data;
                                                                                    setSavedInvoice(finalInvoice);
                                                                                    
                                                                                    const detailedInvDesc = `Final invoice ${finalInvoice.invoice_number} created from service charge quotation ${serviceQuote.quote_number}\n\n` + formatTransactionDetails(finalInvoice, 'Invoice');
                                                                                    await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({
                                                                                            type: 'invoice-created',
                                                                                            category: 'billing',
                                                                                            description: detailedInvDesc,
                                                                                            user_name: techName,
                                                                                            customer_id: editedJob.customerId || null,
                                                                                            metadata: {
                                                                                                invoice_number: finalInvoice.invoice_number,
                                                                                                invoice_id: finalInvoice.id,
                                                                                                total_amount: finalInvoice.total_amount,
                                                                                                subtotal: finalInvoice.subtotal,
                                                                                                tax: finalInvoice.total_tax,
                                                                                                items: finalInvoice.items
                                                                                            }
                                                                                        })
                                                                                    }).catch(() => {});
                                                                                    
                                                                                    await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                                        body: JSON.stringify({ type: 'approve_quotation', category: 'billing', description: `Customer proceeded with Service Charge Option 2.`, user_name: techName })
                                                                                    }).catch(() => {});
                                                                                }
                                                                                
                                                                            } catch (bgErr) {
                                                                                console.warn('[Offline] Background service charge invoice failed/queued:', bgErr);
                                                                            }
                                                                        })();
                                                                        
                                                                    } catch (e) {
                                                                        alert('Failed to proceed with service charge: ' + e.message);
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }}
                                                            >
                                                                <span style={{ fontSize: 20 }}>⚙️</span>
                                                                <div style={{ textAlign: 'left' }}>
                                                                    <div style={{ fontWeight: 700 }}>{loading ? 'Processing...' : 'Proceed with Service Charge'}</div>
                                                                    <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Auto-create service charge invoice & collect payment</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    );
                                                } else {
                                                    // Option 1 (Quotation) selected
                                                    if (['parts_ordered', 'work_in_progress', 'completed', 'closed'].includes(editedJob.status)) {
                                                        return (
                                                            <>
                                                                {((editedJob.status !== 'parts_ordered') || (editedJob.status === 'parts_ordered' && !needsConfirmation)) && (
                                                                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 13, color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: editedJob.status === 'parts_ordered' ? 0 : '10px' }}>
                                                                        <CheckCircle size={16} /> 
                                                                        {editedJob.interactions?.some(i => i.type === 'approve_quotation' && i.performed_by_name?.toLowerCase()?.includes('customer')) 
                                                                            ? 'Cx Approved from App' 
                                                                            : 'Cx Said to Proceed'}
                                                                    </div>
                                                                )}
                                                                {editedJob.status === 'parts_ordered' && needsConfirmation ? (
                                                                    <button
                                                                        className="btn"
                                                                        style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', whiteSpace: 'normal', marginTop: '10px' }}
                                                                        disabled={loading}
                                                                        onClick={async () => {
                                                                            setLoading(true);
                                                                            try {
                                                                                const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                                                                await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ 
                                                                                        type: 'approve_quotation', 
                                                                                        category: 'billing', 
                                                                                        description: `Quotation ${savedQuotation.quote_number} approved by customer (confirmed by ${techName})`, 
                                                                                        user_name: techName 
                                                                                    })
                                                                                }).catch(() => {});
                                                                                
                                                                                const [intRes, jobIntRes] = await Promise.all([
                                                                                    apiCall(`/api/admin/interactions?job_id=${editedJob.id}`),
                                                                                    apiCall(`/api/technician/jobs/${editedJob.id}/interactions`)
                                                                                ]);
                                                                                const intData = await intRes.json().catch(() => ({ data: [] }));
                                                                                const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));
                                                                                const allInt = deduplicateInteractions([
                                                                                    ...(intData.data || []),
                                                                                    ...(jobIntData.data || []).map(ji => ({
                                                                                        ...ji,
                                                                                        performed_by_name: ji.user_name || ji.performed_by_name || 'Technician',
                                                                                        description: ji.message || ji.description || '',
                                                                                        timestamp: ji.created_at || ji.timestamp,
                                                                                    }))
                                                                                ]);
                                                                                setEditedJob(prev => ({ ...prev, interactions: allInt }));
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            } finally {
                                                                                setLoading(false);
                                                                            }
                                                                        }}
                                                                    >
                                                                        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Confirm Updated Quotation'}
                                                                    </button>
                                                                ) : editedJob.status === 'parts_ordered' ? (
                                                                    <button
                                                                        className="btn"
                                                                        style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(59,130,246,0.2)', whiteSpace: 'normal', marginTop: '10px' }}
                                                                        disabled={loading}
                                                                        onClick={async () => {
                                                                            await handleSaveStatus('work_in_progress');
                                                                        }}
                                                                    >
                                                                        {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Start Repair / Install Parts'}
                                                                    </button>
                                                                ) : (() => {
                                                                      const hasAfterPhotos = hasUploadedPhotosLocal || editedJob.interactions?.some(i => i.type === 'after-photos-uploaded');
                                                                      const hasPayment = hasPaymentLocal || editedJob.interactions?.some(i => i.type === 'payment-received');
                                                                      const collectedAmount = collectedAmountLocal || (editedJob.interactions
                                                                          ?.filter(i => i.type === 'payment-received')
                                                                          .reduce((sum, i) => sum + (parseFloat(i.metadata?.amount) || 0), 0) || 0);
                                                                      const quotationAmount = savedQuotation?.total_amount || 0;
                                                                      const isPaymentMatchingQuote = Math.abs(collectedAmount - quotationAmount) < 0.01;
 
                                                                      if (!hasAfterPhotos) {
                                                                          return (
                                                                              <button
                                                                                  className="btn"
                                                                                  style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', whiteSpace: 'normal', cursor: 'pointer' }}
                                                                                  disabled={loading}
                                                                                  onClick={() => {
                                                                                      setShowAfterPhotosModal(true);
                                                                                  }}
                                                                              >
                                                                                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Work Done: Collect Payment'}
                                                                              </button>
                                                                          );
                                                                      }
 
                                                                      if (!hasPayment) {
                                                                          return (
                                                                              <button
                                                                                  className="btn"
                                                                                  style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', whiteSpace: 'normal', cursor: 'pointer' }}
                                                                                  disabled={loading}
                                                                                  onClick={() => {
                                                                                      setShowCollectPayment(true);
                                                                                  }}
                                                                              >
                                                                                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Work Done: Collect Payment'}
                                                                              </button>
                                                                          );
                                                                      }
 
                                                                      if (isPaymentMatchingQuote) {
                                                                          return (
                                                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                                                                  <div style={{ padding: '10px', borderRadius: '8px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '13px', color: '#10b981', fontWeight: 600, textAlign: 'center' }}>
                                                                                      ✓ Payment of ₹{collectedAmount.toLocaleString('en-IN')} received.
                                                                                  </div>
                                                                                  <button
                                                                                      className="btn"
                                                                                      style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(139,92,246,0.2)', whiteSpace: 'normal', cursor: 'pointer' }}
                                                                                      disabled={loading}
                                                                                      onClick={handleGenerateInvoice}
                                                                                  >
                                                                                      {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Generate Invoice'}
                                                                                  </button>
                                                                              </div>
                                                                          );
                                                                      }
 
                                                                      return (
                                                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                                                                              <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', color: '#f87171', fontWeight: 600, lineHeight: 1.4 }}>
                                                                                  ⚠️ Collected payment (₹{collectedAmount.toLocaleString('en-IN')}) does not match quotation amount (₹{quotationAmount.toLocaleString('en-IN')}). Please edit the quotation to match the collected payment amount.
                                                                              </div>
                                                                              <button
                                                                                  className="btn"
                                                                                  style={{ width: '100%', padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', fontWeight: 700, fontSize: '15px', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(245,158,11,0.2)', whiteSpace: 'normal', cursor: 'pointer' }}
                                                                                  disabled={loading}
                                                                                  onClick={() => {
                                                                                      setIsNewQuotationOption(false);
                                                                                      setActiveForm('calculator');
                                                                                  }}
                                                                              >
                                                                                  {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : '✏️ Edit Quotation to Match'}
                                                                              </button>
                                                                          </div>
                                                                      );
                                                                  })()}
                                                            </>
                                                        );
                                                    } else {
                                                        const cxAppApproved = editedJob.interactions?.some(i =>
                                                            i.type === 'approve_quotation' &&
                                                            i.performed_by_name?.toLowerCase()?.includes('customer')
                                                        );
                                                        return (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                <button
                                                                    className="btn"
                                                                    disabled={cxAppApproved || loading}
                                                                    style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, borderRadius: 'var(--radius-md)', cursor: (cxAppApproved || loading) ? 'default' : 'pointer', whiteSpace: 'normal', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                                                                    onClick={async () => {
                                                                        if (cxAppApproved || loading) return;
                                                                        const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                                                        await handleSaveStatus('work_in_progress');
                                                                        apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ type: 'approve_quotation', category: 'billing', description: `Quotation ${savedQuotation.quote_number} approved by customer (confirmed by ${techName})`, user_name: techName })
                                                                        }).catch(() => {});
                                                                        setEditedJob(prev => ({ ...prev, interactions: [{ type: 'approve_quotation', performed_by_name: techName, timestamp: new Date().toISOString() }, ...(prev.interactions || [])] }));
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: 20 }}>✅</span>
                                                                    <div style={{ textAlign: 'left' }}>
                                                                        <div style={{ fontWeight: 700 }}>{loading ? 'Processing approval...' : 'Proceed with Quotation'}</div>
                                                                        {cxAppApproved && <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>Approved via Customer App</div>}
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        );
                                                    }
                                                }
                                            })()}
                                            {/* Restart Quotation Process Button (only if not closed) */}
                                            {editedJob.status !== 'closed' && (
                                                <button
                                                    className="btn"
                                                    disabled={loading}
                                                    style={{
                                                        width: '100%',
                                                        padding: '10px 14px',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                                        color: '#f87171',
                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                        fontWeight: 700,
                                                        fontSize: '13px',
                                                        borderRadius: 'var(--radius-md)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        cursor: loading ? 'not-allowed' : 'pointer',
                                                        whiteSpace: 'normal',
                                                        marginTop: '12px'
                                                    }}
                                                    onClick={handleRestartQuotationOnly}
                                                >
                                                    🔄 Restart Quotation Process
                                                </button>
                                            )}
                                        </>
                                    )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── No-Service Close Call Modal ── */}
            {showNoServiceModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
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
                                        
                                        const interactionPromise = apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ type: 'close-call-no-service', category: 'job', description, user_name: techName })
                                        });
                                        
                                        const closeJobPromise = apiCall(`/api/technician/jobs/${job.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ action: 'close_job', notes: description, updated_by_name: techName })
                                        });

                                        // Optimistically update status to 'closed'
                                        setShowNoServiceModal(false);
                                        setEditedJob(prev => ({ ...prev, status: 'closed' }));
                                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });

                                        // Execute network requests in the background
                                        (async () => {
                                            try {
                                                const [resInter, resClose] = await Promise.all([interactionPromise, closeJobPromise]);
                                                const data = await resClose.json();
                                                if (resClose.ok && data.job) {
                                                    onJobUpdate(data.job);
                                                }
                                            } catch (e) {
                                                console.warn('[Offline] Close call background sync queued or failed:', e);
                                            }
                                        })();

                                    } catch (err) {
                                        alert('Could not close job: ' + (err.message || 'Unknown error'));
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

            {showLocationVerifyModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '28px 20px calc(28px + env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
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
                                            {shouldHideAddress ? '•••••••••• (Go online/working hours to view)' : [editedJob.address, editedJob.locality, editedJob.city].filter(Boolean).join(', ')}
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
                                        hideSearch={true}
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

                        {locationVerifyStep === 'before_photos' && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Camera size={20} color="#38bdf8" />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0 }}>📸 Product Check-in</h3>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Capture product condition before starting work</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: 16 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                        Product / Defect Photos for Visit #{(() => {
                                            const count = (editedJob.interactions || []).filter(i => i.type === 'before-photos-uploaded').length;
                                            return count + 1;
                                        })()} * (Minimum 1 photo required)
                                    </label>
                                    
                                    <div 
                                        onClick={() => beforePhotosInputRef.current?.click()}
                                        style={{ border: '2px dashed rgba(56,189,248,0.3)', borderRadius: 14, padding: 20, textAlign: 'center', background: 'rgba(56,189,248,0.03)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                                    >
                                        <Upload size={32} color="#38bdf8" style={{ margin: '0 auto 8px' }} />
                                        <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>Open Camera / Upload Photo</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Capture the product condition</div>
                                    </div>
                                    
                                    <input 
                                        ref={beforePhotosInputRef}
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        multiple
                                        onChange={handleBeforePhotosUpload}
                                        style={{ display: 'none' }}
                                    />

                                    {/* Uploaded Photos Preview */}
                                    {beforePhotos.length > 0 && (
                                        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                                            {beforePhotos.map(photo => (
                                                <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: 80 }}>
                                                    <img src={photo.url} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeBeforePhoto(photo.id)}
                                                        style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                        Issue Description (Optional)
                                    </label>
                                    <textarea
                                        value={beforePhotosDescription}
                                        onChange={(e) => setBeforePhotosDescription(e.target.value)}
                                        placeholder="Describe the issue as reported by the customer..."
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#f8fafc', resize: 'vertical', minHeight: 70, outline: 'none' }}
                                    />
                                </div>

                                <button
                                    disabled={beforePhotos.length === 0 || beforePhotosLoading}
                                    onClick={handleBeforePhotosSubmit}
                                    style={{ width: '100%', padding: '14px', borderRadius: 14, background: beforePhotos.length > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(16,185,129,0.2)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: beforePhotos.length > 0 && !beforePhotosLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                >
                                    {beforePhotosLoading ? (
                                        <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                                    ) : (
                                        <><CheckCircle size={16} /> Complete Check-in & Start Diagnosis</>
                                    )}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── After Photos Modal ── */}
            {showAfterPhotosModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 600, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '28px 20px calc(28px + env(safe-area-inset-bottom))', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Camera size={20} color="#10b981" />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: 0 }}>📸 Job Completion</h3>
                                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>Capture product condition after completing work</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAfterPhotosModal(false);
                                    setAfterPhotos([]);
                                    setAfterPhotosDescription('');
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                After Repair Photos * (Minimum 1 photo required)
                            </label>
                            
                            <div 
                                onClick={() => afterPhotosInputRef.current?.click()}
                                style={{ border: '2px dashed rgba(16,185,129,0.3)', borderRadius: 14, padding: 20, textAlign: 'center', background: 'rgba(16,185,129,0.03)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                            >
                                <Upload size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                                <div style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>Open Camera / Upload Photo</div>
                                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Capture the repaired/completed product</div>
                            </div>
                            
                            <input 
                                ref={afterPhotosInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                multiple
                                onChange={handleAfterPhotosUpload}
                                style={{ display: 'none' }}
                            />

                            {/* Uploaded Photos Preview */}
                            {afterPhotos.length > 0 && (
                                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8 }}>
                                    {afterPhotos.map(photo => (
                                        <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: 80 }}>
                                            <img src={photo.url} alt="product" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <button
                                                type="button"
                                                onClick={() => removeAfterPhoto(photo.id)}
                                                style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                Description / Repair Notes (Optional)
                            </label>
                            <textarea
                                value={afterPhotosDescription}
                                onChange={(e) => setAfterPhotosDescription(e.target.value)}
                                placeholder="Describe the work done or any additional details for the customer..."
                                style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 13, color: '#f8fafc', resize: 'vertical', minHeight: 70, outline: 'none' }}
                            />
                        </div>

                        <button
                            disabled={afterPhotos.length === 0 || afterPhotosLoading}
                            onClick={handleAfterPhotosSubmit}
                            style={{ width: '100%', padding: '14px', borderRadius: 14, background: afterPhotos.length > 0 ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(16,185,129,0.2)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: afterPhotos.length > 0 && !afterPhotosLoading ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            {afterPhotosLoading ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Submitting...</>
                            ) : (
                                <><CheckCircle size={16} /> Submit & Create Final Invoice</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Parts Ordered Gate Modal ── */}
            {showPartsNoteModal && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div style={{ width: '100%', maxWidth: 480, background: 'linear-gradient(180deg,#1a2332,#0f172a)', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px 24px 0 0', padding: '28px 24px calc(28px + env(safe-area-inset-bottom))' }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 20px' }} />
                        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {partsActionType} — Repair Note Required
                        </h3>
                        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 18, lineHeight: 1.5 }}>
                            Capture product/part photos and describe the part(s) needed or collected.
                        </p>

                        {/* Parts Photos List */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                Captured Part Photos * ({partsPhotos.length} attached)
                            </label>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                                {partsPhotos.map(photo => (
                                    <div key={photo.id} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', width: 70, height: 70 }}>
                                        <img src={photo.url} alt="part" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button
                                            type="button"
                                            onClick={() => setPartsPhotos(prev => prev.filter(p => p.id !== photo.id))}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => partsPhotosInputRef.current?.click()}
                                    style={{ width: 70, height: 70, borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', color: '#cbd5e1' }}
                                >
                                    <Camera size={18} />
                                    <span style={{ fontSize: 9, fontWeight: 600 }}>Add More</span>
                                </button>
                            </div>
                        </div>

                        {/* Price Range Inputs */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                Price Range Given to Customer (₹) *
                            </label>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <input
                                    type="number"
                                    placeholder="Min Price (e.g. 2000)"
                                    value={partsMinPrice}
                                    onChange={e => setPartsMinPrice(e.target.value)}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 10, fontSize: 13,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#f8fafc', boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ color: '#94a3b8', fontSize: 13 }}>to</span>
                                <input
                                    type="number"
                                    placeholder="Max Price (e.g. 2800)"
                                    value={partsMaxPrice}
                                    onChange={e => setPartsMaxPrice(e.target.value)}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 10, fontSize: 13,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#f8fafc', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                {[
                                    { min: 500, max: 1500, label: '500-1.5k' },
                                    { min: 1000, max: 2000, label: '1k-2k' },
                                    { min: 2000, max: 3000, label: '2k-3k' },
                                    { min: 3000, max: 5000, label: '3k-5k' },
                                    { min: 5000, max: 8000, label: '5k-8k' }
                                ].map((p, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setPartsMinPrice(p.min.toString());
                                            setPartsMaxPrice(p.max.toString());
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            background: (partsMinPrice === p.min.toString() && partsMaxPrice === p.max.toString()) ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                                            color: (partsMinPrice === p.min.toString() && partsMaxPrice === p.max.toString()) ? '#60a5fa' : '#cbd5e1',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time Range Inputs */}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                                Time Range to Source/Repair (Days) *
                            </label>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <input
                                    type="number"
                                    placeholder="Min Days (e.g. 2)"
                                    value={partsMinDays}
                                    onChange={e => setPartsMinDays(e.target.value)}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 10, fontSize: 13,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#f8fafc', boxSizing: 'border-box'
                                    }}
                                />
                                <span style={{ color: '#94a3b8', fontSize: 13 }}>to</span>
                                <input
                                    type="number"
                                    placeholder="Max Days (e.g. 4)"
                                    value={partsMaxDays}
                                    onChange={e => setPartsMaxDays(e.target.value)}
                                    style={{
                                        flex: 1, padding: 12, borderRadius: 10, fontSize: 13,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#f8fafc', boxSizing: 'border-box'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                {[
                                    { min: 1, max: 2, label: '1-2 Days' },
                                    { min: 2, max: 4, label: '2-4 Days' },
                                    { min: 3, max: 5, label: '3-5 Days' },
                                    { min: 5, max: 7, label: '5-7 Days' },
                                    { min: 7, max: 10, label: '7-10 Days' }
                                ].map((t, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setPartsMinDays(t.min.toString());
                                            setPartsMaxDays(t.max.toString());
                                        }}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            borderRadius: '6px',
                                            border: '1px solid rgba(255,255,255,0.15)',
                                            background: (partsMinDays === t.min.toString() && partsMaxDays === t.max.toString()) ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.03)',
                                            color: (partsMinDays === t.min.toString() && partsMaxDays === t.max.toString()) ? '#fbbf24' : '#cbd5e1',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={partsNoteText}
                            onChange={e => setPartsNoteText(e.target.value)}
                            placeholder={`e.g. ${partsActionType === 'Order Part' ? 'Ordered Samsung WM drain pump — ETA 3 days. Will call to reschedule once received.' : 'Collected Microwave magnetron and check electrical connections.'}`}
                            style={{
                                width: '100%', minHeight: 100, padding: 14, borderRadius: 12, fontSize: 14, lineHeight: 1.5,
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                                color: '#f8fafc', resize: 'vertical', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button
                                onClick={() => { 
                                    setShowPartsNoteModal(false); 
                                    setPartsNoteText(''); 
                                    setPartsPhotos([]); 
                                    setPartsMinPrice('');
                                    setPartsMaxPrice('');
                                    setPartsMinDays('');
                                    setPartsMaxDays('');
                                }}
                                style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
                            >
                                Cancel
                            </button>
                            <button
                                disabled={
                                    !partsNoteText.trim() || 
                                    partsPhotos.length === 0 || 
                                    partsMinPrice === '' || 
                                    partsMaxPrice === '' || 
                                    parseFloat(partsMaxPrice) < parseFloat(partsMinPrice) || 
                                    parseFloat(partsMinPrice) <= 0 || 
                                    partsMinDays === '' || 
                                    partsMaxDays === '' || 
                                    parseInt(partsMaxDays) < parseInt(partsMinDays) || 
                                    parseInt(partsMinDays) <= 0 || 
                                    partsNoteLoading
                                }
                                onClick={async () => {
                                    if (
                                        !partsNoteText.trim() || 
                                        partsPhotos.length === 0 || 
                                        partsMinPrice === '' || 
                                        partsMaxPrice === '' || 
                                        parseFloat(partsMaxPrice) < parseFloat(partsMinPrice) || 
                                        parseFloat(partsMinPrice) <= 0 || 
                                        partsMinDays === '' || 
                                        partsMaxDays === '' || 
                                        parseInt(partsMaxDays) < parseInt(partsMinDays) || 
                                        parseInt(partsMinDays) <= 0
                                    ) return;
                                    setPartsNoteLoading(true);
                                    const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                    
                                    const saveRepairNote = async (lat = null, lng = null) => {
                                        try {
                                            // Generate local file mappings and placeholder URLs instantly
                                            const uploadMappings = partsPhotos.filter(photo => photo.file).map(photo => {
                                                const fileId = `offline-file-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
                                                return {
                                                    fileId,
                                                    file: photo.file,
                                                    placeholderUrl: `/offline-file-placeholder?id=${fileId}`
                                                };
                                            });
                                            const uploadedUrls = uploadMappings.map(m => m.placeholderUrl);

                                            const detailedNote = `[${partsActionType.toUpperCase()}] ${partsNoteText.trim()} | Est. Price Range: ₹${partsMinPrice} to ₹${partsMaxPrice} | Est. Time Range: ${partsMinDays} to ${partsMaxDays} days`;
                                            
                                            // Optimistically transition the UI immediately!
                                            setEditedJob(prev => ({ 
                                                ...prev, 
                                                status: 'parts_ordered',
                                                repair_note_added_at: new Date().toISOString()
                                            }));

                                            if (onJobUpdate) {
                                                onJobUpdate({
                                                    ...editedJob,
                                                    status: 'parts_ordered',
                                                    repair_note_added_at: new Date().toISOString()
                                                });
                                            }

                                            setShowPartsNoteModal(false);
                                            setPartsNoteText('');
                                            setPartsPhotos([]);
                                            setPartsMinPrice('');
                                            setPartsMaxPrice('');
                                            setPartsMinDays('');
                                            setPartsMaxDays('');

                                            // Enforce quotation/advance payment flow rules
                                            if (!savedQuotation) {
                                                setIsPartsFlowQuotationPending(true);
                                                setActiveForm('calculator');
                                            } else if (!advancePaymentInt) {
                                                setShowAdvanceConfirmModal(true);
                                            } else {
                                                // Reload job to show updated status after saving
                                                (async () => {
                                                    await new Promise(r => setTimeout(r, 1000));
                                                    const res = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                                                    const data = await res.json();
                                                    if (data.success && data.job) {
                                                        const [intRes, jobIntRes] = await Promise.all([
                                                            apiCall(`/api/admin/interactions?job_id=${editedJob.id}`),
                                                            apiCall(`/api/technician/jobs/${editedJob.id}/interactions`)
                                                        ]);
                                                        const intData = await intRes.json().catch(() => ({ data: [] }));
                                                        const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));
                                                        const allInt = deduplicateInteractions([
                                                            ...(intData.data || []),
                                                            ...(jobIntData.data || []).map(ji => ({
                                                                ...ji,
                                                                performed_by_name: ji.user_name || ji.performed_by_name || 'Technician',
                                                                description: ji.message || ji.description || '',
                                                                timestamp: ji.created_at || ji.timestamp,
                                                            }))
                                                        ]);
                                                        const freshJob = { ...data.job, interactions: allInt };
                                                        setEditedJob(freshJob);
                                                    }
                                                })();
                                            }

                                            // Perform background compression, storage, and API calls!
                                            (async () => {
                                                try {
                                                    // 1. Compress and store files in IndexedDB asynchronously
                                                    for (const item of uploadMappings) {
                                                        try {
                                                            const compressed = await compressImage(item.file);
                                                            await storeOfflineFile(item.fileId, compressed);
                                                        } catch (compErr) {
                                                            console.error('[Offline] Background parts photo compression failed, storing raw:', compErr);
                                                            try {
                                                                await storeOfflineFile(item.fileId, item.file);
                                                            } catch (storeErr) {
                                                                console.error('[Offline] Background parts photo raw store failed:', storeErr);
                                                            }
                                                        }
                                                    }

                                                    // 2. Add repair note (sets repair_note_added_at on job)
                                                    const noteRes = await apiCall(`/api/technician/jobs/${job.id}`, {
                                                        method: 'PUT',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ 
                                                            action: 'add_repair_note', 
                                                            repair_note: detailedNote, 
                                                            note_text: detailedNote,
                                                            updated_by_name: techName,
                                                            latitude: lat,
                                                            longitude: lng
                                                        })
                                                    });
                                                    const noteData = await noteRes.json();
                                                    if (!noteRes.ok) throw new Error(noteData.error || 'Failed to add repair note');

                                                    // 3. Log interaction with attachments
                                                    await apiCall(`/api/technician/jobs/${job.id}/interactions`, {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            type: 'repair-note-added',
                                                            category: 'job',
                                                            description: `Technician added note and captured part photos (${partsActionType}): ${partsNoteText.trim()} (Est. Price: ₹${partsMinPrice}-${partsMaxPrice}, Est. Time: ${partsMinDays}-${partsMaxDays} days)`,
                                                            user_name: techName,
                                                            metadata: {
                                                                attachments: uploadedUrls,
                                                                parts_action: partsActionType,
                                                                note_text: partsNoteText.trim(),
                                                                min_price: partsMinPrice,
                                                                max_price: partsMaxPrice,
                                                                min_days: partsMinDays,
                                                                max_days: partsMaxDays
                                                            }
                                                        })
                                                    }).catch(() => {});

                                                    // 4. Set status to parts_ordered
                                                    await handleSaveStatus('parts_ordered');

                                                } catch (bgErr) {
                                                    console.warn('[Offline] Background saveRepairNote failed/queued:', bgErr);
                                                }
                                            })();

                                        } catch (err) {
                                            alert('Could not save parts ordered details: ' + err.message);
                                        } finally {
                                            setPartsNoteLoading(false);
                                        }
                                    };

                                    const coords = await getCoordsWithTimeout(1500);
                                    if (coords) {
                                        await saveRepairNote(coords.latitude, coords.longitude);
                                    } else {
                                        await saveRepairNote();
                                    }
                                }}
                                style={{
                                    flex: 2, padding: '14px', borderRadius: 12,
                                    background: (
                                        partsNoteText.trim() && 
                                        partsPhotos.length > 0 && 
                                        partsMinPrice !== '' && 
                                        partsMaxPrice !== '' && 
                                        parseFloat(partsMaxPrice) >= parseFloat(partsMinPrice) && 
                                        parseFloat(partsMinPrice) > 0 && 
                                        partsMinDays !== '' && 
                                        partsMaxDays !== '' && 
                                        parseInt(partsMaxDays) >= parseInt(partsMinDays) && 
                                        parseInt(partsMinDays) > 0
                                    ) ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(249,115,22,0.3)',
                                    border: 'none', color: '#fff', fontWeight: 700, cursor: (
                                        partsNoteText.trim() && 
                                        partsPhotos.length > 0 && 
                                        partsMinPrice !== '' && 
                                        partsMaxPrice !== '' && 
                                        parseFloat(partsMaxPrice) >= parseFloat(partsMinPrice) && 
                                        parseFloat(partsMinPrice) > 0 && 
                                        partsMinDays !== '' && 
                                        partsMaxDays !== '' && 
                                        parseInt(partsMaxDays) >= parseInt(partsMinDays) && 
                                        parseInt(partsMinDays) > 0
                                    ) ? 'pointer' : 'not-allowed', fontSize: 14
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
                            setIsCloseWithServiceCharge(false);
                        }}
                        onCreateQuotation={isCloseWithServiceCharge ? null : (items) => handleAutoCreateQuotation(items)}
                        onCreateInvoice={(isCloseWithServiceCharge || quotationDecisionMode) ? (items) => handleAutoCreateInvoiceFromCalculator(items) : null}
                        prefillItems={isCloseWithServiceCharge ? [] : (isNewQuotationOption ? calculatorItems : (savedQuotation?.items || calculatorItems))}
                        loading={loading}
                        hideParts={
                            isCloseWithServiceCharge ||
                            isNewQuotationOption ||
                            quotationDecisionMode === 'denied' ||
                            (savedQuotations.length === 2 && savedQuotation?.id === [...savedQuotations].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[1]?.id)
                        }
                    />
                )}
                {/* Manual Sales Invoice Form is now hidden from the UI but could still be opened programmatically */}
                {activeForm === 'sales-invoice' && (
                    <SalesInvoiceForm 
                        onClose={() => setActiveForm(null)}
                        onSave={async (data) => {
                            setLoading(true);
                            let savedData = data;
                            try {
                                const saveRes = await apiCall(`/api/admin/transactions?type=sales`, {
                                    method: data.id ? 'PUT' : 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ...data, job_id: editedJob.id })
                                });
                                const saveJson = await saveRes.json();
                                if (saveJson.success) savedData = saveJson.data;
                            } catch (e) { 
                                console.error('Failed to save sales invoice', e); 
                            } finally {
                                setLoading(false);
                            }
                            setSavedInvoice(savedData);
                            const detailedInvDesc = `Sales invoice ${savedData?.invoice_number || savedData?.reference || ''} created for job #${editedJob.job_number || editedJob.id}\n\n` + formatTransactionDetails(savedData, 'Invoice');
                            apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'invoice-created',
                                    category: 'billing',
                                    description: detailedInvDesc,
                                    user_name: techName,
                                    customer_id: editedJob.customerId || null,
                                    metadata: {
                                        invoice_number: savedData?.invoice_number,
                                        invoice_id: savedData?.id,
                                        total_amount: savedData?.total_amount,
                                        subtotal: savedData?.subtotal,
                                        tax: savedData?.total_tax,
                                        items: savedData?.items
                                    }
                                })
                            }).catch(() => {});
                            setActiveForm(null);
                        }}
                        defaultAccount={{ id: editedJob.customerId, name: editedJob.customerName, gstin: editedJob.customer?.gstin, state: editedJob.customer?.address?.state || 'Maharashtra' }}
                        prefillItems={isNewQuotationOption ? calculatorItems : (savedQuotation?.items || calculatorItems)}
                        saving={loading}
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

        {/* Advance Confirm Modal */}
        {showAdvanceConfirmModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1400, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '12px', padding: '20px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)', textAlign: 'center' }}>
                        Advance Payment Confirmation
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
                        Was any advance payment collected from the customer for ordering these parts?
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                            className="btn"
                            style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                            onClick={() => {
                                setShowAdvanceConfirmModal(false);
                                setShowAdvanceCollectPayment(true);
                            }}
                        >
                            Yes, Collect Now
                        </button>
                        <button
                            className="btn"
                            style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                            disabled={loading}
                            onClick={async () => {
                                setShowAdvanceConfirmModal(false);
                                setLoading(true);
                                try {
                                    const techName = editedJob.assigned_technician?.name || editedJob.technician_name || 'Technician';
                                    await apiCall(`/api/technician/jobs/${editedJob.id}/interactions`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            type: 'advance-skipped',
                                            category: 'job',
                                            description: `Technician skipped collecting advance payment for ordering parts.`,
                                            user_name: techName
                                        })
                                    });
                                    // Refresh data
                                    const res = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                                    const data = await res.json();
                                    if (data.success && data.job) {
                                        // Reload interactions
                                        const [intRes, jobIntRes] = await Promise.all([
                                            apiCall(`/api/admin/interactions?job_id=${editedJob.id}`),
                                            apiCall(`/api/technician/jobs/${editedJob.id}/interactions`)
                                        ]);
                                        const intData = await intRes.json().catch(() => ({ data: [] }));
                                        const jobIntData = await jobIntRes.json().catch(() => ({ data: [] }));
                                        const allInt = deduplicateInteractions([
                                            ...(intData.data || []),
                                            ...(jobIntData.data || []).map(ji => ({
                                                ...ji,
                                                performed_by_name: ji.user_name || ji.performed_by_name || 'Technician',
                                                description: ji.message || ji.description || '',
                                                timestamp: ji.created_at || ji.timestamp,
                                            }))
                                        ]);
                                        const freshJob = { ...data.job, interactions: allInt };
                                        setEditedJob(freshJob);
                                        if (onJobUpdate) onJobUpdate(freshJob);
                                    }
                                } catch (e) {
                                    console.error(e);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            No, Skip
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Collect Advance Payment Flow */}
        {showAdvanceCollectPayment && (
            <CollectPaymentFlow
                onClose={() => setShowAdvanceCollectPayment(false)}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                prefilledCustomer={{
                    id: editedJob.customer_id || editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || 'Customer',
                    phone: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    mobile: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                }}
                prefilledJob={{
                    id: editedJob.id,
                    job_number: editedJob.job_number,
                    account_id: editedJob.customer_id || editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    account_name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || '',
                    customer_name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || '',
                    customer_phone: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || 'Repair',
                    technician_id: techId,
                }}
                prefilledAmount={savedQuotation?.total_amount ? String(Math.round(savedQuotation.total_amount / 2)) : ''}
                onSuccess={async () => {
                    setShowAdvanceCollectPayment(false);
                    try {
                        const res = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                        const data = await res.json();
                        if (data.success && data.job) {
                            setEditedJob(data.job);
                            if (onJobUpdate) onJobUpdate(data.job);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    alert('Advance payment collected successfully!');
                }}
            />
        )}

        {/* Collect Payment Modal — shown after invoice is created */}
        {showCollectPayment && (
            <CollectPaymentFlow
                onClose={() => setShowCollectPayment(false)}
                context="technician"
                currentUserName={techName}
                currentUserId={techId}
                prefilledCustomer={{
                    id: editedJob.customer_id || editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || 'Customer',
                    phone: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    mobile: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                }}
                prefilledJob={{
                    id: editedJob.id,
                    job_number: editedJob.job_number,
                    account_id: editedJob.customer_id || editedJob.customerId || editedJob.account_id || editedJob.customer?.id,
                    account_name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || '',
                    customer_name: editedJob.customer_name || editedJob.customerName || editedJob.customer?.name || '',
                    customer_phone: editedJob.customer_phone || editedJob.mobile || editedJob.customer?.mobile || editedJob.customer?.phone || '',
                    category: editedJob.description || editedJob.product?.type || editedJob.issueCategory || 'Repair',
                    technician_id: techId,
                }}
                prefilledAmount={(() => {
                    const baseAmt = savedInvoice?.total_amount || savedQuotation?.total_amount || 0;
                    if (!baseAmt) return '';
                    const advanceAmt = advancePaymentInt?.metadata?.amount || advancePaymentInt?.amount || 0;
                    const pending = Math.max(0, baseAmt - parseFloat(advanceAmt));
                    return String(pending);
                })()}
                isAmountReadOnly={true}
                onEditQuotation={() => {
                    setShowCollectPayment(false);
                    setIsNewQuotationOption(false);
                    setActiveForm('calculator');
                }}
                onSuccess={async () => {
                    setShowCollectPayment(false);
                    const baseAmt = savedInvoice?.total_amount || savedQuotation?.total_amount || 0;
                    const advanceAmt = advancePaymentInt?.metadata?.amount || advancePaymentInt?.amount || 0;
                    const pending = Math.max(0, baseAmt - parseFloat(advanceAmt));

                    setHasPaymentLocal(true);
                    setCollectedAmountLocal(pending);

                    let updatedJob = editedJob;
                    try {
                        const res = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                        const data = await res.json();
                        if (data.success && data.job) {
                            updatedJob = data.job;
                            setEditedJob(updatedJob);
                            if (onJobUpdate) onJobUpdate(updatedJob);
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    
                    if (savedInvoice) {
                        setShowFeedbackCloseFlow(true);
                    } else {
                        alert('Payment recorded successfully! You can now generate the final invoice.');
                    }
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
                    // 1. Instantly (optimistically) mark status as closed locally
                    const closedJob = { ...editedJob, status: 'closed' };
                    setEditedJob(closedJob);
                    if (onJobUpdate) onJobUpdate(closedJob);

                    try {
                        const res = await apiCall(`/api/technician/jobs/${editedJob.id}`);
                        const data = await res.json();
                        
                        // Check if the offline sync queue still has pending operations for this job
                        const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
                        const hasPending = queue.some(item => 
                            (item.url || '').includes(`/api/technician/jobs/${editedJob.id}`) ||
                            ((item.url || '').includes(`/api/admin/transactions`) && item.body && (item.body || '').includes(editedJob.id))
                        );

                        if (data.success && data.job) {
                            if (hasPending || data.job.status !== 'closed') {
                                // Defer to closed status locally because sync is still pending or database is not yet updated
                                const mergedJob = { ...data.job, status: 'closed' };
                                setEditedJob(mergedJob);
                                if (onJobUpdate) onJobUpdate(mergedJob);
                            } else {
                                setEditedJob(data.job);
                                if (onJobUpdate) onJobUpdate(data.job);
                            }
                        }
                    } catch (e) {
                        console.warn('[Offline] Failed to refetch closed job, keeping local closed state:', e);
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
                        apiCall(`/api/technician/jobs/${editedJob.id}`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'close_job', updated_by_name: techName, notes: 'Closed — quotation denied, visit charge collected.' })
                        }).catch(e => console.warn('[Offline] Close job on deny background sync queued or failed:', e));

                        setEditedJob(prev => ({ ...prev, status: 'closed' }));
                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'closed' });
                        setShowQuotationFinalFeedback(true);
                    } else {
                        // Thinking path: keep job in quotation_sent, notify admin
                        apiCall(`/api/admin/jobs`, {
                            method: 'PUT', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: editedJob.id, status: 'quotation_sent', quotation_followup_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() })
                        }).catch(e => console.warn('[Offline] Update job thinking background sync queued or failed:', e));

                        // Fire admin notification
                        apiCall('/api/admin/notifications', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'quotation_followup',
                                message: `Follow up with customer on Job #${editedJob.job_number || editedJob.id} — they needed time to decide on the quotation. Visit charge collected. Follow up in 2 days.`,
                                job_id: editedJob.id,
                                priority: 'medium',
                            })
                        }).catch(() => {});

                        setEditedJob(prev => ({ ...prev, status: 'quotation_sent' }));
                        if (onJobUpdate) onJobUpdate({ ...editedJob, status: 'quotation_sent' });
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
                prefilledAmount={(() => {
                    if (!savedInvoice?.total_amount) return '';
                    const advanceAmt = advancePaymentInt?.metadata?.amount || advancePaymentInt?.amount || 0;
                    const pending = Math.max(0, savedInvoice.total_amount - parseFloat(advanceAmt));
                    return String(pending);
                })()}
                onSuccess={async () => {
                    setShowServiceChargeCollectPayment(false);
                    apiCall(`/api/technician/jobs/${editedJob.id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'close_job', updated_by_name: techName, notes: 'Closed — service charge invoice paid.' })
                    }).catch(e => console.warn('[Offline] Close job service charge background sync queued or failed:', e));
                    
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

