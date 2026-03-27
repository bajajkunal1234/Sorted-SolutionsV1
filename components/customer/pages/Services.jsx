'use client'

import React, { useState, useEffect } from 'react'
import {
    Clock, Wrench, CheckCircle, XCircle, MapPin, Calendar,
    Plus, ChevronRight, X, FileText, Phone, AlertCircle,
    Send, RefreshCw, Hammer, Package, Shield, Star, ChevronDown,
    Eye, TrendingUp
} from 'lucide-react'
import BookServiceModal from '../modals/BookServiceModal'
import LiveMap from '@/components/common/LiveMap'
import { supabase } from '@/lib/supabase'

// ── Status configuration ────────────────────────────────────────────────────

const STATUS_CONFIG = {
    booking_request: {
        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)',
        icon: Clock, label: 'Booking Requested', step: 0,
        desc: 'Your request has been received and is being reviewed.'
    },
    assigned: {
        color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.25)',
        icon: Wrench, label: 'Technician Assigned', step: 1,
        desc: 'A technician has been assigned and will contact you soon.'
    },
    'in-progress': {
        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)',
        icon: Hammer, label: 'In Progress', step: 2,
        desc: 'Your service is actively being worked on.'
    },
    'spare-part-needed': {
        color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.25)',
        icon: Package, label: 'Spare Part Needed', step: 2,
        desc: 'A part has been ordered. Work will resume on arrival.'
    },
    'quotation-sent': {
        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)',
        icon: FileText, label: 'Quotation Sent', step: 2,
        desc: 'We\'ve sent you a cost estimate. Please review and approve below.'
    },
    completed: {
        color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)',
        icon: CheckCircle, label: 'Completed', step: 4,
        desc: 'Your service is complete. Thank you for choosing Sorted!'
    },
    cancelled: {
        color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)',
        icon: XCircle, label: 'Cancelled', step: -1,
        desc: 'This service request has been cancelled.'
    },
}

const JOURNEY_STEPS = [
    { label: 'Received', icon: Clock },
    { label: 'Assigned', icon: Wrench },
    { label: 'In Progress', icon: Hammer },
    { label: 'Estimate', icon: FileText },
    { label: 'Done', icon: CheckCircle },
]

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.booking_request
    const Icon = cfg.icon
    return (
        <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            color: cfg.color, fontSize: 11, fontWeight: 700,
        }}>
            <Icon size={11} strokeWidth={3} /> {cfg.label}
        </div>
    )
}

function JourneyBar({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.booking_request
    const currentStep = cfg.step ?? 0
    if (status === 'cancelled') return null

    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {/* connector line */}
                <div style={{
                    position: 'absolute', top: 16, left: '10%', right: '10%', height: 2,
                    background: 'rgba(255,255,255,0.06)', borderRadius: 1
                }} />
                <div style={{
                    position: 'absolute', top: 16, left: '10%',
                    width: `${Math.min((currentStep / (JOURNEY_STEPS.length - 1)) * 80, 80)}%`, height: 2,
                    background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)`,
                    borderRadius: 1, transition: 'width 0.6s ease'
                }} />

                {JOURNEY_STEPS.map((step, idx) => {
                    const StepIcon = step.icon
                    const done = idx <= currentStep
                    const active = idx === currentStep
                    return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1, flex: '0 0 auto' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: done ? cfg.color : 'rgba(255,255,255,0.06)',
                                border: `2px solid ${done ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: active ? `0 0 12px ${cfg.color}60` : 'none',
                                transition: 'all 0.3s ease'
                            }}>
                                <StepIcon size={14} color={done ? '#0f172a' : '#475569'} strokeWidth={2.5} />
                            </div>
                            <span style={{
                                fontSize: 9, fontWeight: active ? 800 : 500,
                                color: done ? cfg.color : '#475569',
                                whiteSpace: 'nowrap', letterSpacing: '0.2px'
                            }}>
                                {step.label}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function JobCard({ job, onClick }) {
    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.booking_request
    const Icon = cfg.icon
    const hasQuotation = job.status === 'quotation-sent'

    return (
        <div
            onClick={onClick}
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.02))',
                border: `1px solid ${hasQuotation ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 20, padding: '16px 18px',
                cursor: 'pointer', transition: 'all 0.2s ease',
                position: 'relative', overflow: 'hidden',
                boxShadow: hasQuotation ? '0 4px 20px rgba(139,92,246,0.1)' : 'none'
            }}
        >
            {/* Quotation attention glow */}
            {hasQuotation && (
                <div style={{
                    position: 'absolute', top: 0, right: 0,
                    width: 80, height: 80,
                    background: 'radial-gradient(circle at top right, rgba(139,92,246,0.15), transparent 70%)',
                    pointerEvents: 'none'
                }} />
            )}

            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {job.product?.brand ? `${job.product.brand} ` : ''}{job.product?.type || 'Service Request'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>
                        {job.jobNumber || `#${job.id?.slice(0, 8)}`}
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 10 }}>
                    <StatusBadge status={job.status} />
                    <ChevronRight size={14} color="#475569" />
                </div>
            </div>

            {/* Issue */}
            {job.issue && (
                <p style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.issue}
                </p>
            )}

            {/* Journey bar */}
            <JourneyBar status={job.status} />

            {/* Footer row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                    <Calendar size={12} />
                    <span>{job.dueDate ? new Date(job.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : job.confirmedVisitTime ? new Date(job.confirmedVisitTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Scheduling...'}</span>
                </div>
                {job.assignedTechnician && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' }}>
                        <Wrench size={12} />
                        <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.assignedTechnician}</span>
                    </div>
                )}
            </div>

            {/* Quotation CTA banner */}
            {hasQuotation && (
                <div style={{
                    marginTop: 12, padding: '8px 12px', borderRadius: 10,
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, color: '#a78bfa', fontWeight: 600
                }}>
                    <FileText size={13} />
                    View repair estimate →
                </div>
            )}
        </div>
    )
}

function JobDetailSheet({ job, onClose, onCancel }) {
    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.booking_request
    const Icon = cfg.icon

    // Use stored lat/lng from property first — no geocoding needed
    const storedLat = job?.property?.latitude || job?.latitude;
    const storedLng = job?.property?.longitude || job?.longitude;
    const hasStoredCoords = !!(storedLat && storedLng);

    // Tracking State
    const [techLocation, setTechLocation] = useState(null);
    const [custLocation, setCustLocation] = useState(
        storedLat && storedLng ? [storedLat, storedLng]
        : job?.location?.lat && job?.location?.lng ? [job.location.lat, job.location.lng]
        : null
    );

    // Geocoding Fallback — only if we don't have stored coordinates
    useEffect(() => {
        if (hasStoredCoords) return;
        const addressString = job?.address || job?.locality || (job?.customer?.address && typeof job.customer.address === 'string' ? job.customer.address : '');
        if (!custLocation && addressString) {
            const query = encodeURIComponent(addressString + ', Mumbai, India');
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.length > 0) {
                        setCustLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
                    } else {
                        setCustLocation([19.0760, 72.8777]);
                    }
                })
                .catch(() => setCustLocation([19.0760, 72.8777]));
        } else if (!custLocation) {
            setCustLocation([19.0760, 72.8777]);
        }
    }, [job?.address, job?.locality, custLocation, hasStoredCoords]);

    // Live tracking — subscribe to technician location broadcasts when in-progress
    useEffect(() => {
        let channel;
        if (job?.status === 'in-progress') {
            channel = supabase.channel(`tracking:job_${job.id}`);
            channel.on('broadcast', { event: 'location_update' }, (payload) => {
                if (payload.payload) {
                    setTechLocation([payload.payload.latitude, payload.payload.longitude]);
                }
            }).subscribe();
        }
        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [job?.status, job?.id]);

    return (
        <>
            <div
                onClick={onClose}
                style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 200 }}
            />
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                background: 'linear-gradient(180deg, #1a2332 0%, #0f172a 100%)',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '28px 28px 0 0',
                padding: '0 0 calc(80px + env(safe-area-inset-bottom))',
                zIndex: 201, maxHeight: '92vh', overflowY: 'auto',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.6)'
            }}>
                {/* Drag handle */}
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '16px auto 0' }} />

                {/* Sticky header w/ close */}
                <div style={{
                    position: 'sticky', top: 0,
                    background: 'linear-gradient(180deg, #1a2332 80%, transparent)',
                    padding: '16px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 10
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
                            {job.product?.brand ? `${job.product.brand} ` : ''}{job.product?.type || 'Service Request'}
                        </h2>
                        <div style={{ fontSize: 12, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
                            {job.jobNumber || `#${job.id?.slice(0, 8)}`}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8',
                        borderRadius: '50%', width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        flexShrink: 0
                    }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '0 20px 28px' }}>
                    {/* Status card */}
                    <div style={{
                        padding: '14px 16px', borderRadius: 14,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: `0 4px 12px ${cfg.color}40`
                        }}>
                            <Icon size={18} color="#0f172a" />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 1.4 }}>{cfg.desc}</div>
                        </div>
                    </div>

                    {/* Journey */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
                            Service Journey
                        </div>
                        <JourneyBar status={job.status} />
                    </div>

                    {/* Quotation section */}
                    {job.status === 'quotation-sent' && (
                        <div style={{
                            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                            borderRadius: 14, padding: '16px', marginBottom: 16
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={13} /> Repair Estimate
                            </div>
                            <div style={{ fontSize: 13, color: '#c4b5fd', lineHeight: 1.6, marginBottom: 12 }}>
                                Our technician has prepared a detailed cost estimate for your appliance repair. Please review the items below:
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <div style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)',
                                    textAlign: 'center', fontSize: 12, color: '#c4b5fd', fontWeight: 600, cursor: 'pointer'
                                }}>
                                    📞 Call to Discuss
                                </div>
                                <div style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 10,
                                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                    textAlign: 'center', fontSize: 12, color: '#fff', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(139,92,246,0.3)'
                                }}>
                                    ✓ Approve Estimate
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Payment CTA for Completed Jobs */}
                    {job.status === 'completed' && (
                        <div style={{
                            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: 14, padding: '16px', marginBottom: 16
                        }}>
                            <div style={{ fontSize: 13, color: '#a7f3d0', lineHeight: 1.6, marginBottom: 12 }}>
                                Your service is complete. You can now pay securely online.
                            </div>
                            <button
                                onClick={() => {
                                    import('@/lib/razorpayClient').then((m) => {
                                        m.initiateRazorpayPayment({
                                            amount: 500, // Fixed placeholder for beta
                                            receiptId: job.id,
                                            onSuccess: () => alert('Payment successful! Your technician has been notified.'),
                                        })
                                    })
                                }}
                                style={{
                                    width: '100%', padding: '10px 14px', borderRadius: 10,
                                    background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                                    textAlign: 'center', fontSize: 13, color: '#fff', fontWeight: 700, cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                                }}
                            >
                                Pay Online
                            </button>
                        </div>
                    )}

                    {/* Map — shown for assigned & in-progress. Live tracking (tech pin) only for in-progress */}
                    {['assigned', 'in-progress'].includes(job.status) && custLocation && (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)', border: `1px solid ${job.status === 'in-progress' ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 14, overflow: 'hidden', marginBottom: 16
                        }}>
                            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <MapPin size={16} color={job.status === 'in-progress' ? '#38bdf8' : '#10b981'} />
                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                                        {job.status === 'in-progress' ? 'Live Technician Tracking' : 'Your Service Location'}
                                    </div>
                                </div>
                                {/* Precise coordinates badge */}
                                {hasStoredCoords && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.2)' }}>
                                        📍 Precise
                                    </span>
                                )}
                            </div>
                            <div style={{ height: '260px', width: '100%', position: 'relative', zIndex: 0, background: '#1e293b' }}>
                                <LiveMap
                                    technicianLocation={techLocation}
                                    customerLocation={custLocation}
                                    fitBounds={!!(techLocation && custLocation)}
                                />
                            </div>
                            <div style={{ padding: '12px 16px', background: job.status === 'in-progress' ? 'rgba(56,189,248,0.05)' : 'rgba(16,185,129,0.05)', fontSize: 12, color: job.status === 'in-progress' ? '#bae6fd' : '#a7f3d0', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                {job.status === 'in-progress'
                                    ? (<><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', display: 'inline-block', animation: 'pulse 2s infinite' }} /> Technician is on their way — location updates live</>)
                                    : '📌 Your home pin — technician will navigate here'}
                            </div>
                        </div>
                    )}

                    {/* Info cards grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        {/* Appliance */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                                Appliance
                            </div>
                            <div style={{ fontSize: 15, color: '#f8fafc', fontWeight: 600 }}>
                                {job.product?.brand ? `${job.product.brand} ` : ''}{job.product?.type || '—'}
                            </div>
                        </div>

                        {/* Issue */}
                        {job.issue && (
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                                    Reported Issue
                                </div>
                                <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>{job.issue}</div>
                            </div>
                        )}

                        {/* Technician + Address */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Wrench size={10} /> Technician
                                    </div>
                                    <div style={{ fontSize: 14, color: '#cbd5e1', fontWeight: 600 }}>
                                        {job.assignedTechnician || 'Being assigned...'}
                                    </div>
                                </div>
                                {job.technicianMobile && (
                                    <a
                                        href={`tel:${job.technicianMobile}`}
                                        style={{
                                            padding: '8px 14px', borderRadius: 10,
                                            background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)',
                                            color: '#38bdf8', fontSize: 12, fontWeight: 700, textDecoration: 'none',
                                            display: 'flex', alignItems: 'center', gap: 5
                                        }}
                                    >
                                        <Phone size={13} /> Call
                                    </a>
                                )}
                            </div>
                            {(job.locality || job.city) && (
                                <>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <MapPin size={10} /> Location
                                    </div>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                        {[job.locality, job.city].filter(Boolean).join(', ')}
                                    </div>
                                </>
                            )}
                            {(job.dueDate || job.confirmedVisitTime) && (
                                <>
                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0' }} />
                                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={10} /> Scheduled
                                    </div>
                                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                                        {new Date(job.dueDate || job.confirmedVisitTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Cancel CTA */}
                    {!['completed', 'cancelled'].includes(job.status) && (
                        <button
                            onClick={() => onCancel(job.id)}
                            style={{
                                width: '100%', padding: '14px',
                                background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: 14, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Cancel Service Request
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function ServicesPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterStatus, setFilterStatus] = useState('active')
    const [selectedJob, setSelectedJob] = useState(null)
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => { fetchJobs() }, [filterStatus])

    const fetchJobs = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true)
            else setLoading(true)

            const customerId = localStorage.getItem('customerId') || ''
            const res = await fetch(`/api/customer/jobs?customerId=${customerId}&status=all`)
            if (!res.ok) throw new Error('Failed to fetch jobs')
            const data = await res.json()
            const all = data.jobs || []

            const activeStatuses = ['booking_request', 'assigned', 'in-progress', 'spare-part-needed', 'quotation-sent']
            const pastStatuses = ['completed', 'cancelled']

            if (filterStatus === 'all') setJobs(all)
            else if (filterStatus === 'active') setJobs(all.filter(j => activeStatuses.includes(j.status)))
            else if (filterStatus === 'quotation') setJobs(all.filter(j => j.status === 'quotation-sent'))
            else if (filterStatus === 'past') setJobs(all.filter(j => pastStatuses.includes(j.status)))

            setError(null)
        } catch (err) {
            setError('Failed to load service requests')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    const handleCancel = async (jobId) => {
        if (!window.confirm('Cancel this service request?')) return
        try {
            const customerId = localStorage.getItem('customerId')
            await fetch(`/api/customer/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', customerId })
            })
            setSelectedJob(null)
            fetchJobs()
        } catch (err) {
            alert(err.message)
        }
    }

    const tabs = [
        { id: 'active', label: 'Active' },
        { id: 'quotation', label: '📋 Estimates' },
        { id: 'past', label: 'Past' },
        { id: 'all', label: 'All' },
    ]

    // Count quotation jobs for badge
    const quotationCount = jobs.filter ? /* already filtered */ 0 : 0

    return (
        <div style={{ padding: '24px 18px 16px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                        My Services
                    </h1>
                    <p style={{ color: '#475569', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                        Track your repair & maintenance visits
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                        onClick={() => fetchJobs(true)}
                        style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={16} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                    <button
                        onClick={() => setShowServiceModal(true)}
                        style={{
                            height: 40, padding: '0 14px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
                            border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 6px 18px rgba(56,189,248,0.25)', cursor: 'pointer',
                            fontSize: 13, fontWeight: 700,
                        }}
                    >
                        <Plus size={16} strokeWidth={2.5} /> New
                    </button>
                </div>
            </header>

            {/* Filter tabs */}
            <div style={{
                display: 'flex', gap: 6, background: 'rgba(255,255,255,0.04)',
                borderRadius: 14, padding: '4px',
                border: '1px solid rgba(255,255,255,0.06)',
                overflowX: 'auto', WebkitOverflowScrolling: 'touch'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterStatus(tab.id)}
                        style={{
                            flex: '0 0 auto', padding: '7px 14px', borderRadius: 10,
                            background: filterStatus === tab.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                            color: filterStatus === tab.id ? '#38bdf8' : '#475569',
                            border: filterStatus === tab.id ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                            fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            whiteSpace: 'nowrap', transition: 'all 0.2s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 16 }}>
                    <div style={{ width: 32, height: 32, border: '2px solid rgba(255,255,255,0.08)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 13, color: '#475569' }}>Loading your services...</span>
                </div>
            ) : error ? (
                <div style={{ padding: 20, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, color: '#f87171', textAlign: 'center', fontSize: 13 }}>
                    <AlertCircle size={20} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    {error}
                </div>
            ) : jobs.length === 0 ? (
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)',
                    borderRadius: 24, padding: '48px 24px', textAlign: 'center'
                }}>
                    <Wrench size={40} color="#1e3a5f" style={{ marginBottom: 16 }} />
                    <h3 style={{ fontSize: 17, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px' }}>
                        {filterStatus === 'quotation' ? 'No Pending Estimates' : `No ${filterStatus === 'past' ? 'Completed' : filterStatus === 'active' ? 'Active' : ''} Services`}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 13, margin: '0 0 24px' }}>
                        {filterStatus === 'active' || filterStatus === 'all' ? 'Book a service request to get started.' : 'Nothing here yet.'}
                    </p>
                    {(filterStatus === 'active' || filterStatus === 'all') && (
                        <button
                            onClick={() => setShowServiceModal(true)}
                            style={{
                                padding: '12px 24px', borderRadius: 14,
                                background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
                                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                            }}
                        >
                            Book a Service
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {jobs.map(job => (
                        <JobCard key={job.id} job={job} onClick={() => setSelectedJob(job)} />
                    ))}
                </div>
            )}

            {/* Detail sheet */}
            {selectedJob && (
                <JobDetailSheet
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    onCancel={handleCancel}
                />
            )}

            {/* Spin animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            <BookServiceModal
                isOpen={showServiceModal}
                onClose={() => setShowServiceModal(false)}
                onBook={() => { fetchJobs(); setShowServiceModal(false) }}
            />
        </div>
    )
}
