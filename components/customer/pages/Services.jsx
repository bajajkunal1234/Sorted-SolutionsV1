'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    Clock, Wrench, CheckCircle, XCircle, MapPin, Calendar,
    Plus, ChevronRight, X, FileText, Phone, AlertCircle,
    Send, RefreshCw, Hammer, Package, Shield, Star, ChevronDown,
    Eye, TrendingUp, Zap, Wind, Thermometer, Tv, Droplets,
    Coffee, Loader2, MessageCircle, CreditCard, ArrowRight,
    CheckCircle2, Info, Navigation, PhoneCall, Share2, Printer,
    RotateCcw
} from 'lucide-react'
import BookServiceModal from '../modals/BookServiceModal'
import RescheduleModal from '../modals/RescheduleModal'
import LiveMap from '@/components/common/LiveMap'
import { supabase } from '@/lib/supabase'

// ── Appliance icon map ──────────────────────────────────────────────────────
function ApplianceIcon({ type = '', size = 20 }) {
    const t = (type || '').toLowerCase()
    if (t.includes('air') || t.includes('ac') || t.includes('conditioner')) return <Wind size={size} />
    if (t.includes('fridge') || t.includes('refrigerator')) return <Thermometer size={size} />
    if (t.includes('wash') || t.includes('washing')) return <Droplets size={size} />
    if (t.includes('tv') || t.includes('television')) return <Tv size={size} />
    if (t.includes('micro') || t.includes('oven')) return <Zap size={size} />
    if (t.includes('water') || t.includes('ro') || t.includes('purif')) return <Droplets size={size} />
    if (t.includes('geyser') || t.includes('heater') || t.includes('water heater')) return <Thermometer size={size} />
    if (t.includes('coffee') || t.includes('espresso')) return <Coffee size={size} />
    return <Wrench size={size} />
}

// ── Status configuration ────────────────────────────────────────────────────

const STATUS_CONFIG = {
    new_job_request: {
        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',
        glow: 'rgba(245,158,11,0.15)',
        icon: Clock, label: 'Received', step: 0,
        desc: 'Your request has been received and is being reviewed by our team.',
        next: 'Our team will review and confirm your appointment slot shortly.'
    },
    booking_request: {
        color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)',
        glow: 'rgba(245,158,11,0.15)',
        icon: Clock, label: 'Received', step: 0,
        desc: 'Your request has been received and is being reviewed.',
        next: 'Our team will review and confirm your appointment slot shortly.'
    },
    scheduled: {
        color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)',
        glow: 'rgba(56,189,248,0.12)',
        icon: Calendar, label: 'Scheduled', step: 1,
        desc: 'Your appointment is confirmed. A technician will visit you soon.',
        next: 'Our technician will arrive at your scheduled slot. Keep your appliance accessible.'
    },
    assigned: {
        color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)',
        glow: 'rgba(56,189,248,0.12)',
        icon: Calendar, label: 'Scheduled', step: 1,
        desc: 'A technician has been assigned and will contact you soon.',
        next: 'Our technician will arrive at your scheduled slot.'
    },
    cx_reschedule: {
        color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)',
        glow: 'rgba(6,182,212,0.12)',
        icon: Calendar, label: 'Rescheduled', step: 1,
        desc: 'You have rescheduled this appointment.',
        next: 'We will confirm your new slot shortly.'
    },
    diagnosing_quoting: {
        color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)',
        glow: 'rgba(139,92,246,0.15)',
        icon: Hammer, label: 'Diagnosing', step: 2,
        desc: 'Our technician has arrived and is diagnosing the issue.',
        next: 'You will receive a repair estimate shortly after diagnosis.'
    },
    quotation_sent: {
        color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)',
        glow: 'rgba(167,139,250,0.2)',
        icon: FileText, label: 'Estimate Ready', step: 3,
        desc: "We've sent you a cost estimate. Please review and approve to begin repairs.",
        next: 'Approve the estimate to proceed. Call us to discuss if you have questions.'
    },
    parts_ordered: {
        color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)',
        glow: 'rgba(249,115,22,0.12)',
        icon: Package, label: 'Parts Ordered', step: 3,
        desc: 'A part has been ordered for your repair.',
        next: "We'll schedule a follow-up visit once the part arrives — usually within 2–5 days."
    },
    work_in_progress: {
        color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',
        glow: 'rgba(16,185,129,0.15)',
        icon: Hammer, label: 'In Progress', step: 4,
        desc: 'Repair work is actively in progress at your location.',
        next: 'Your technician is working on the repair. Payment will be collected after completion.'
    },
    closed: {
        color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',
        glow: 'rgba(16,185,129,0.1)',
        icon: CheckCircle, label: 'Completed', step: 5,
        desc: 'Your service is complete. Thank you for choosing Sorted!',
        next: 'Rate your experience and pay your invoice online if you haven\'t already.'
    },
    completed: {
        color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)',
        glow: 'rgba(16,185,129,0.1)',
        icon: CheckCircle, label: 'Completed', step: 5,
        desc: 'Your service is complete. Thank you for choosing Sorted!',
        next: 'Rate your experience and pay your invoice online if you haven\'t already.'
    },
    cancelled: {
        color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)',
        glow: 'rgba(239,68,68,0.1)',
        icon: XCircle, label: 'Cancelled', step: -1,
        desc: 'This service request has been cancelled.',
        next: 'You can book a new service request anytime.'
    },
}

const JOURNEY_STEPS = [
    { label: 'Received', icon: Clock },
    { label: 'Scheduled', icon: Calendar },
    { label: 'Diagnosing', icon: Hammer },
    { label: 'Estimate', icon: FileText },
    { label: 'Repairing', icon: Wrench },
    { label: 'Done', icon: CheckCircle },
]

// ── Compact Journey Pills ────────────────────────────────────────────────────
function JourneyPills({ status }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new_job_request
    const currentStep = cfg.step ?? 0
    if (status === 'cancelled') return null
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto', paddingBottom: 2 }}>
            {JOURNEY_STEPS.map((step, idx) => {
                const done = idx <= currentStep
                const active = idx === currentStep
                const StepIcon = step.icon
                return (
                    <React.Fragment key={idx}>
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                            opacity: done ? 1 : 0.3, transition: 'opacity 0.3s',
                            flexShrink: 0
                        }}>
                            <div style={{
                                width: active ? 30 : 22, height: active ? 30 : 22,
                                borderRadius: '50%',
                                background: done ? cfg.color : 'rgba(255,255,255,0.06)',
                                border: `2px solid ${done ? cfg.color : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: active ? `0 0 10px ${cfg.color}70` : 'none',
                                transition: 'all 0.3s ease',
                            }}>
                                <StepIcon size={active ? 13 : 10} color={done ? '#0f172a' : '#475569'} strokeWidth={2.5} />
                            </div>
                            <span style={{
                                fontSize: 8, fontWeight: active ? 800 : 500,
                                color: done ? cfg.color : '#334155',
                                whiteSpace: 'nowrap', letterSpacing: '0.2px'
                            }}>
                                {step.label}
                            </span>
                        </div>
                        {idx < JOURNEY_STEPS.length - 1 && (
                            <div style={{
                                flex: 1, height: 2, minWidth: 8,
                                background: idx < currentStep ? cfg.color : 'rgba(255,255,255,0.06)',
                                borderRadius: 1, transition: 'background 0.4s',
                                marginBottom: 13
                            }} />
                        )}
                    </React.Fragment>
                )
            })}
        </div>
    )
}

// ── Premium Job Card ─────────────────────────────────────────────────────────
function JobCard({ job, onClick }) {
    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.new_job_request
    const hasQuotation = job.status === 'quotation_sent'
    const isActive = ['work_in_progress', 'diagnosing_quoting'].includes(job.status)
    const isLive = job.status === 'work_in_progress'
    const applianceType = job.product?.type || job.category || job.appliance || 'Service'
    const applianceBrand = job.product?.brand || job.brand || ''

    const dateLabel = (() => {
        const d = job.dueDate || job.confirmedVisitTime || job.scheduled_date
        if (!d) return null
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    })()

    return (
        <div
            onClick={onClick}
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                border: `1px solid ${hasQuotation ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 20, padding: '0',
                cursor: 'pointer', transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                position: 'relative', overflow: 'hidden',
                boxShadow: hasQuotation
                    ? `0 4px 24px ${cfg.glow}, 0 0 0 1px rgba(167,139,250,0.1)`
                    : isLive ? `0 4px 20px ${cfg.glow}` : 'none',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 32px ${cfg.glow}`
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = hasQuotation
                    ? `0 4px 24px ${cfg.glow}` : isLive ? `0 4px 20px ${cfg.glow}` : 'none'
            }}
        >
            {/* Left accent strip */}
            <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                background: `linear-gradient(180deg, ${cfg.color}, ${cfg.color}88)`,
                borderRadius: '20px 0 0 20px'
            }} />

            {/* Live pulse glow background */}
            {isLive && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: `radial-gradient(ellipse at top left, ${cfg.glow} 0%, transparent 60%)`,
                    pointerEvents: 'none'
                }} />
            )}
            {/* Quotation glow */}
            {hasQuotation && (
                <div style={{
                    position: 'absolute', top: 0, right: 0, width: 100, height: 100,
                    background: `radial-gradient(circle at top right, rgba(167,139,250,0.15), transparent 70%)`,
                    pointerEvents: 'none'
                }} />
            )}

            <div style={{ padding: '16px 16px 16px 20px' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        {/* Appliance Icon bubble */}
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: `linear-gradient(135deg, ${cfg.color}22, ${cfg.color}11)`,
                            border: `1px solid ${cfg.color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <ApplianceIcon type={applianceType} size={18} style={{ color: cfg.color }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                    {applianceBrand ? `${applianceBrand} ` : ''}{applianceType}
                                </span>
                                {job.serviceCoverage === 'amc' && <span style={{ fontSize: 9, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', padding: '2px 7px', borderRadius: 10 }}>AMC</span>}
                                {job.serviceCoverage === 'warranty' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', padding: '2px 7px', borderRadius: 10 }}>WARRANTY</span>}
                            </div>
                            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginTop: 1 }}>
                                {job.jobNumber || `#${job.id?.slice(0, 8)}`}
                            </div>
                        </div>
                    </div>

                    {/* Status badge + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '4px 9px', borderRadius: 20,
                            background: cfg.bg, border: `1px solid ${cfg.border}`,
                            color: cfg.color, fontSize: 10, fontWeight: 700,
                        }}>
                            {isLive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block', animation: 'pulse 1.8s ease-in-out infinite' }} />}
                            {cfg.label}
                        </div>
                        <ChevronRight size={14} color="#334155" />
                    </div>
                </div>

                {/* Issue */}
                {job.issue && (
                    <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px 0', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                        {job.issue}
                    </p>
                )}

                {/* Journey pills */}
                <JourneyPills status={job.status} />

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {dateLabel && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                                <Calendar size={11} />
                                <span>{dateLabel}</span>
                            </div>
                        )}
                        {job.assignedTechnician && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#475569' }}>
                                <Wrench size={11} />
                                <span style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.assignedTechnician}</span>
                            </div>
                        )}
                    </div>
                    {hasQuotation && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#a78bfa', fontWeight: 700 }}>
                            <FileText size={11} />
                            View estimate →
                        </div>
                    )}
                </div>

                {/* Quotation urgent CTA */}
                {hasQuotation && (
                    <div style={{
                        marginTop: 10, padding: '9px 12px', borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.08))',
                        border: '1px solid rgba(139,92,246,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 600 }}>📋 Repair estimate awaiting approval</span>
                        <ArrowRight size={14} color="#a78bfa" />
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Star Rating Component ────────────────────────────────────────────────────

function StarRating({ job, onRated }) {
    const [hovered, setHovered] = useState(0)
    const [selected, setSelected] = useState(job.customer_rating || 0)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(!!job.customer_rating)

    const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
    const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981']

    const handleSubmit = async () => {
        if (!selected) return
        setSubmitting(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const res = await fetch(`/api/customer/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rate', customerId, rating: selected, rating_note: note.trim() || undefined })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to submit rating')
            setSubmitted(true)
            if (onRated) onRated(selected)
        } catch (err) {
            alert('Could not submit rating: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const displayRating = hovered || selected

    if (submitted) {
        return (
            <div style={{
                background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
                borderRadius: 16, padding: '16px', marginBottom: 12, textAlign: 'center'
            }}>
                <div style={{ fontSize: 13, color: '#a7f3d0', fontWeight: 700, marginBottom: 8 }}>⭐ Thank you for your feedback!</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={22} fill={s <= (job.customer_rating || selected) ? '#f59e0b' : 'none'} color={s <= (job.customer_rating || selected) ? '#f59e0b' : '#334155'} />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div style={{
            background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 16, padding: '16px', marginBottom: 12
        }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Star size={12} fill="#f59e0b" color="#f59e0b" /> Rate this Service
            </div>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        onClick={() => setSelected(star)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                            transform: star <= displayRating ? 'scale(1.2)' : 'scale(1)',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        <Star size={30} fill={star <= displayRating ? colors[displayRating] : 'none'} color={star <= displayRating ? colors[displayRating] : '#334155'} strokeWidth={1.5} />
                    </button>
                ))}
            </div>
            {displayRating > 0 && (
                <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: colors[displayRating], marginBottom: 10 }}>
                    {labels[displayRating]}
                </div>
            )}
            {selected > 0 && (
                <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add a comment (optional)..."
                    rows={2}
                    style={{
                        width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10, color: '#f8fafc', fontSize: 13, padding: '10px 12px',
                        resize: 'none', outline: 'none', marginBottom: 10, boxSizing: 'border-box'
                    }}
                />
            )}
            <button
                onClick={handleSubmit}
                disabled={!selected || submitting}
                style={{
                    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                    background: selected ? `linear-gradient(135deg, ${colors[selected]}, ${colors[selected]}cc)` : 'rgba(255,255,255,0.05)',
                    color: selected ? '#fff' : '#475569', fontSize: 13, fontWeight: 700,
                    cursor: selected ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                    boxShadow: selected ? `0 4px 12px ${colors[selected]}40` : 'none'
                }}
            >
                {submitting ? 'Submitting...' : selected ? `Submit ${selected}-Star Rating` : 'Tap a star to rate'}
            </button>
        </div>
    )
}

// ── Section header helper ───────────────────────────────────────────────────
function SectionLabel({ children }) {
    return (
        <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            {children}
        </div>
    )
}

// ── Info tile helper ────────────────────────────────────────────────────────
function InfoTile({ label, value, icon: Icon, accent }) {
    if (!value) return null
    return (
        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
            {Icon && <div style={{ fontSize: 9, fontWeight: 700, color: accent || '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon size={10} />{label}
            </div>}
            {!Icon && <div style={{ fontSize: 9, fontWeight: 700, color: accent || '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>{label}</div>}
            <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 500, lineHeight: 1.4 }}>{value}</div>
        </div>
    )
}

// ── Quotation Detail Section ─────────────────────────────────────────────────
function QuotationSection({ jobId, status, onClose }) {
    const [quotation, setQuotation] = useState(null)
    const [loading, setLoading] = useState(true)
    const [approving, setApproving] = useState(false)

    useEffect(() => {
        fetch(`/api/customer/jobs/${jobId}/quotation`)
            .then(r => r.json())
            .then(d => { if (d.success) setQuotation(d.quotation) })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [jobId])

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '14px 0', color: '#475569', fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6, verticalAlign: 'middle' }} />
            Loading estimate...
        </div>
    )
    if (!quotation) return null

    const items = (() => {
        if (!quotation.items) return []
        if (typeof quotation.items === 'string') { try { return JSON.parse(quotation.items) } catch { return [] } }
        return Array.isArray(quotation.items) ? quotation.items : []
    })()

    const handleApprove = async () => {
        setApproving(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const res = await fetch(`/api/customer/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'approve_quotation', customerId })
            })
            const data = await res.json()
            if (data.success) onClose?.()
            else alert(data.error || 'Could not approve estimate')
        } catch (e) { alert('Error: ' + e.message) }
        finally { setApproving(false) }
    }

    return (
        <div style={{
            background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.22)',
            borderRadius: 16, overflow: 'hidden', marginBottom: 12
        }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <FileText size={14} color="#a78bfa" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>Repair Estimate</span>
                    </div>
                    {quotation.quote_number && (
                        <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{quotation.quote_number}</span>
                    )}
                </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
                {/* Line items */}
                {items.length > 0 ? (
                    <div style={{ marginBottom: 12 }}>
                        {items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>{item.name || item.description || `Item ${i + 1}`}</div>
                                    {item.qty && item.qty > 1 && <div style={{ fontSize: 10, color: '#475569' }}>Qty: {item.qty}</div>}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
                                    ₹{(parseFloat(item.amount || item.price || item.total || 0)).toLocaleString('en-IN')}
                                </div>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0 0', borderTop: '1px solid rgba(139,92,246,0.2)', marginTop: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>Total</span>
                            <span style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa' }}>₹{parseFloat(quotation.total_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                ) : quotation.total_amount ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '10px 0', borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
                        <span style={{ fontSize: 13, color: '#c4b5fd', fontWeight: 600 }}>Estimated Total</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>₹{parseFloat(quotation.total_amount).toLocaleString('en-IN')}</span>
                    </div>
                ) : null}

                {quotation.notes && (
                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginBottom: 12, lineHeight: 1.5 }}>
                        Note: {quotation.notes}
                    </div>
                )}

                {status === 'quotation_sent' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <a href="tel:+919082225163" style={{
                            flex: 1, padding: '10px', borderRadius: 10,
                            background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                            textAlign: 'center', fontSize: 12, color: '#c4b5fd', fontWeight: 600,
                            cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                        }}>
                            <PhoneCall size={12} /> Discuss
                        </a>
                        <button
                            onClick={handleApprove}
                            disabled={approving}
                            style={{
                                flex: 2, padding: '10px', borderRadius: 10,
                                background: approving ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                border: 'none', textAlign: 'center', fontSize: 12, color: '#fff',
                                fontWeight: 700, cursor: approving ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                            }}
                        >
                            <CheckCircle2 size={13} /> {approving ? 'Approving...' : 'Approve & Proceed'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Invoice Section ──────────────────────────────────────────────────────────
function InvoiceSection({ jobId, jobStatus }) {
    const [invoice, setInvoice] = useState(null)
    const [loading, setLoading] = useState(true)
    const [payLoading, setPayLoading] = useState(false)
    const [paid, setPaid] = useState(false)

    useEffect(() => {
        fetch(`/api/customer/jobs/${jobId}/invoice`)
            .then(r => r.json())
            .then(d => { if (d.success) setInvoice(d.invoice) })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [jobId])

    if (loading || !invoice) return null

    const total = parseFloat(invoice.total_amount || 0)
    const paidAmt = parseFloat(invoice.paid_amount || 0)
    const due = total - paidAmt
    const isFullyPaid = invoice.status === 'paid' || due <= 0
    const statusColor = isFullyPaid ? '#10b981' : due > 0 ? '#f59e0b' : '#38bdf8'

    const handlePayOnline = async () => {
        setPayLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            const orderRes = await fetch('/api/customer/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: due > 0 ? due : total,
                    receipt: jobId, job_id: jobId,
                    account_id: invoice.account_id || customerId,
                    invoice_id: invoice.id, collected_by: 'customer', amount_label: 'full',
                }),
            })
            const orderData = await orderRes.json()
            if (!orderData.success) throw new Error(orderData.error || 'Failed to create order')
            const { initiateRazorpayPayment } = await import('@/lib/razorpayClient')
            await initiateRazorpayPayment({
                amount: due > 0 ? due : total,
                receiptId: jobId, orderId: orderData.order.id, keyId: orderData.keyId,
                onSuccess: () => { setPaid(true) }
            })
        } catch (err) {
            alert('Payment failed: ' + err.message)
        } finally {
            setPayLoading(false)
        }
    }

    return (
        <div style={{
            background: isFullyPaid ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.05)',
            border: `1px solid ${isFullyPaid ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.18)'}`,
            borderRadius: 16, overflow: 'hidden', marginBottom: 12
        }}>
            <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${isFullyPaid ? 'rgba(16,185,129,0.12)' : 'rgba(56,189,248,0.1)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <CreditCard size={14} color={statusColor} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: isFullyPaid ? '#a7f3d0' : '#bae6fd' }}>Invoice</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {invoice.invoice_number && <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{invoice.invoice_number}</span>}
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: isFullyPaid ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)',
                        color: isFullyPaid ? '#10b981' : '#f59e0b',
                        border: `1px solid ${isFullyPaid ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`
                    }}>
                        {isFullyPaid || paid ? 'PAID' : 'DUE'}
                    </span>
                </div>
            </div>
            <div style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: due > 0 && paidAmt > 0 ? 6 : 0 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Total Amount</span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {due > 0 && paidAmt > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>Paid</span>
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>₹{paidAmt.toLocaleString('en-IN')}</span>
                    </div>
                )}
                {due > 0 && !paid && !isFullyPaid && (
                    <>
                        {paidAmt > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>Balance Due</span>
                                <span style={{ fontSize: 14, color: '#f59e0b', fontWeight: 700 }}>₹{due.toLocaleString('en-IN')}</span>
                            </div>
                        )}
                        <button
                            onClick={handlePayOnline}
                            disabled={payLoading}
                            style={{
                                width: '100%', marginTop: 8, padding: '11px', borderRadius: 10, border: 'none',
                                background: payLoading ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #10b981, #059669)',
                                color: '#fff', fontSize: 13, fontWeight: 700, cursor: payLoading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                            }}
                        >
                            <CreditCard size={14} />
                            {payLoading ? 'Processing...' : `Pay ₹${(due > 0 ? due : total).toLocaleString('en-IN')} Online`}
                        </button>
                    </>
                )}
                {(isFullyPaid || paid) && (
                    <div style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: '#a7f3d0', fontWeight: 600 }}>
                        <CheckCircle2 size={16} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                        Payment complete — Thank you!
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Add Details Panel ────────────────────────────────────────────────────────
function AddDetailsPanel({ job }) {
    const [open, setOpen] = useState(false)
    const [note, setNote] = useState('')
    const [images, setImages] = useState([]) // { file, preview, url }
    const [uploading, setUploading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const fileInputRef = React.useRef(null)

    const handleFiles = (files) => {
        const newImages = []
        for (const file of files) {
            if (!file.type.startsWith('image/')) continue
            if (images.length + newImages.length >= 5) break
            const preview = URL.createObjectURL(file)
            newImages.push({ file, preview, url: null })
        }
        setImages(prev => [...prev, ...newImages])
    }

    const removeImage = (idx) => {
        setImages(prev => {
            const copy = [...prev]
            URL.revokeObjectURL(copy[idx].preview)
            copy.splice(idx, 1)
            return copy
        })
    }

    const uploadImage = async (imgObj) => {
        if (imgObj.url) return imgObj.url
        const formData = new FormData()
        const safeFileName = imgObj.file.name
            ? imgObj.file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')
            : 'photo.jpg'
        formData.append('file', imgObj.file, safeFileName || 'photo.jpg')
        formData.append('bucket', 'media')
        formData.append('folder', 'customer-job-photos')
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Image upload failed')
        const data = await res.json()
        if (!data.success || !data.url) throw new Error(data.error || 'Upload failed')
        return data.url
    }


    const handleSubmit = async () => {
        if (!note.trim() && images.length === 0) return
        setSubmitting(true)
        setUploading(images.length > 0)
        try {
            // Upload images first
            const uploadedUrls = []
            for (const img of images) {
                try {
                    const url = await uploadImage(img)
                    uploadedUrls.push(url)
                } catch {
                    // Skip failed uploads, still submit the note
                }
            }
            setUploading(false)

            const customerId = localStorage.getItem('customerId')
            const res = await fetch(`/api/customer/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add_details',
                    customerId,
                    note: note.trim(),
                    image_urls: uploadedUrls,
                })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to submit')
            setSuccess(true)
            setNote('')
            setImages([])
            setTimeout(() => { setSuccess(false); setOpen(false) }, 3000)
        } catch (err) {
            alert('Could not send details: ' + err.message)
        } finally {
            setSubmitting(false)
            setUploading(false)
        }
    }

    return (
        <div style={{ marginBottom: 12 }}>
            {/* Toggle button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', padding: '12px 14px', borderRadius: 14,
                    background: open ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${open ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', transition: 'all 0.18s',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Send size={13} color="#38bdf8" />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: open ? '#38bdf8' : '#94a3b8' }}>Add Details for Technician</div>
                        <div style={{ fontSize: 10, color: '#475569', fontWeight: 500 }}>Photos, notes, extra info — our team gets notified</div>
                    </div>
                </div>
                <ChevronDown size={16} color="#475569" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {/* Expandable content */}
            {open && (
                <div style={{
                    marginTop: 8, padding: '14px', borderRadius: 14,
                    background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)',
                }}>
                    {success ? (
                        <div style={{ textAlign: 'center', padding: '16px 0' }}>
                            <CheckCircle2 size={28} color="#10b981" style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#a7f3d0' }}>Sent! Our team has been notified.</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>The technician will review your details.</div>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 10, lineHeight: 1.5 }}>
                                Describe the issue in more detail or upload photos to help the technician prepare better.
                            </div>

                            {/* Text input */}
                            <textarea
                                value={note}
                                onChange={e => setNote(e.target.value)}
                                placeholder="e.g. The AC makes a loud rattling noise when set to cooling mode. It started 3 days ago..."
                                rows={3}
                                style={{
                                    width: '100%', background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.09)',
                                    borderRadius: 10, color: '#f1f5f9', fontSize: 13, padding: '10px 12px',
                                    resize: 'none', outline: 'none', boxSizing: 'border-box',
                                    fontFamily: "'Inter', system-ui, sans-serif", lineHeight: 1.5,
                                    marginBottom: 10
                                }}
                            />

                            {/* Image picker */}
                            <div style={{ marginBottom: 10 }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    capture="environment"
                                    style={{ display: 'none' }}
                                    onChange={e => handleFiles(e.target.files)}
                                />

                                {/* Image previews */}
                                {images.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                        {images.map((img, idx) => (
                                            <div key={idx} style={{ position: 'relative', width: 64, height: 64, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                <img src={img.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    style={{
                                                        position: 'absolute', top: 2, right: 2,
                                                        width: 18, height: 18, borderRadius: '50%',
                                                        background: 'rgba(0,0,0,0.7)', border: 'none',
                                                        color: '#fff', cursor: 'pointer', fontSize: 10,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                >×</button>
                                            </div>
                                        ))}

                                        {/* Add more button */}
                                        {images.length < 5 && (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{
                                                    width: 64, height: 64, borderRadius: 10,
                                                    border: '1px dashed rgba(56,189,248,0.3)',
                                                    background: 'rgba(56,189,248,0.05)',
                                                    cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', gap: 2,
                                                    color: '#38bdf8', fontSize: 9, fontWeight: 600
                                                }}
                                            >
                                                <Plus size={16} />ADD
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Add photo button (if no images yet) */}
                                {images.length === 0 && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            width: '100%', padding: '10px', borderRadius: 10,
                                            border: '1px dashed rgba(56,189,248,0.25)',
                                            background: 'rgba(56,189,248,0.04)',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                            color: '#64748b', fontSize: 12, fontWeight: 600,
                                            marginBottom: 0
                                        }}
                                    >
                                        <Eye size={14} color="#475569" /> Attach Photos (up to 5)
                                    </button>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || (!note.trim() && images.length === 0)}
                                style={{
                                    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
                                    background: (note.trim() || images.length > 0) && !submitting
                                        ? 'linear-gradient(135deg, #38bdf8, #3b82f6)'
                                        : 'rgba(255,255,255,0.05)',
                                    color: (note.trim() || images.length > 0) ? '#fff' : '#475569',
                                    fontSize: 13, fontWeight: 700,
                                    cursor: submitting || (!note.trim() && images.length === 0) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: (note.trim() || images.length > 0) ? '0 4px 14px rgba(56,189,248,0.25)' : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                                }}
                            >
                                {uploading ? (
                                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Uploading photos...</>
                                ) : submitting ? (
                                    <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                ) : (
                                    <><Send size={13} /> Send to Technician</>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ── Job Detail Sheet ─────────────────────────────────────────────────────────

function JobDetailSheet({ job, onClose, onCancel, onRescheduleClick }) {
    const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.new_job_request
    const Icon = cfg.icon

    const applianceType = job.product?.type || job.category || job.appliance || 'Service'
    const applianceBrand = job.product?.brand || job.brand || ''

    // Only show map during live tracking (work_in_progress + technician is on the way)
    const showMap = job.status === 'work_in_progress'

    const storedLat = job?.property?.latitude || job?.latitude
    const storedLng = job?.property?.longitude || job?.longitude
    const hasStoredCoords = !!(storedLat && storedLng)

    const [techLocation, setTechLocation] = useState(null)
    const [custLocation, setCustLocation] = useState(
        storedLat && storedLng ? [storedLat, storedLng]
            : job?.location?.lat && job?.location?.lng ? [job.location.lat, job.location.lng]
                : null
    )

    // Geocode fallback only for map (only needed when map is shown = work_in_progress)
    useEffect(() => {
        if (!showMap) return
        if (hasStoredCoords || custLocation) return
        const addressString = job?.address || job?.locality || ''
        if (addressString) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressString + ', Mumbai, India')}&limit=1`)
                .then(r => r.json())
                .then(data => {
                    if (data?.[0]) setCustLocation([parseFloat(data[0].lat), parseFloat(data[0].lon)])
                    else setCustLocation([19.0760, 72.8777])
                })
                .catch(() => setCustLocation([19.0760, 72.8777]))
        } else {
            setCustLocation([19.0760, 72.8777])
        }
    }, [showMap, job?.address, job?.locality, hasStoredCoords, custLocation])

    // Live tracking subscription
    useEffect(() => {
        if (!showMap) return
        const channel = supabase.channel(`tracking:job_${job.id}`)
        channel.on('broadcast', { event: 'location_update' }, (payload) => {
            if (payload.payload) setTechLocation([payload.payload.latitude, payload.payload.longitude])
        }).subscribe()
        return () => supabase.removeChannel(channel)
    }, [showMap, job?.id])

    // Which financial sections to show
    const showQuotation = ['quotation_sent', 'diagnosing_quoting', 'parts_ordered', 'work_in_progress', 'closed', 'completed'].includes(job.status)
    const showInvoice = ['work_in_progress', 'closed', 'completed'].includes(job.status)

    const locked = !!job.on_way_at
    const isClosedOrCancelled = ['closed', 'cancelled', 'completed'].includes(job.status)

    const dateLabel = (() => {
        const d = job.dueDate || job.confirmedVisitTime || job.scheduled_date
        if (!d) return null
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    })()

    const timeLabel = job.scheduled_time || job.confirmedVisitTime
        ? (() => {
            if (job.scheduled_time) return job.scheduled_time
            const d = new Date(job.confirmedVisitTime)
            return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        })()
        : null

    // ── Swipe-to-dismiss ─────────────────────────────────────────────────────
    const sheetRef = useRef(null)
    const swipeStartY = useRef(0)
    const [swipeY, setSwipeY] = useState(0)
    const handleSheetTouchStart = (e) => { swipeStartY.current = e.touches[0].clientY }
    const handleSheetTouchMove = (e) => {
        const delta = e.touches[0].clientY - swipeStartY.current
        if (delta > 0) setSwipeY(Math.min(delta, 220))
    }
    const handleSheetTouchEnd = () => {
        if (swipeY > 80) onClose()
        else setSwipeY(0)
    }

    // ── Celebration confetti for completed jobs ──────────────────────────────
    const [showCelebration, setShowCelebration] = useState(false)
    const celebrationKey = `confetti_seen_${job.id}`
    useEffect(() => {
        const isClosed = job.status === 'closed' || job.status === 'completed'
        const alreadySeen = sessionStorage.getItem(celebrationKey)
        if (isClosed && !alreadySeen) {
            setShowCelebration(true)
            sessionStorage.setItem(celebrationKey, '1')
            import('canvas-confetti').then(m => {
                const confetti = m.default
                confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 }, colors: ['#38bdf8','#3b82f6','#a78bfa','#ffffff','#6ee7b7'] })
                setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors: ['#f59e0b','#fbbf24'] }), 350)
            }).catch(() => {})
            setTimeout(() => setShowCelebration(false), 2800)
        }
    }, [job.id, job.status])

    // ── Technician profile from DB ───────────────────────────────────────────
    const techProfile = useTechProfile(job.technician_id || job.assignedTechnicianId)

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 200 }} />
            <div
                ref={sheetRef}
                onTouchStart={handleSheetTouchStart}
                onTouchMove={handleSheetTouchMove}
                onTouchEnd={handleSheetTouchEnd}
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0,
                    background: 'linear-gradient(180deg, #0d1526 0%, #0a0f1e 100%)',
                    borderTop: `1px solid ${cfg.border}`,
                    borderRadius: '28px 28px 0 0',
                    padding: '0 0 calc(80px + env(safe-area-inset-bottom))',
                    zIndex: 201, maxHeight: '88dvh', overflowY: 'auto',
                    boxShadow: `0 -24px 80px rgba(0,0,0,0.8), 0 -1px 0 ${cfg.color}33`,
                    transform: `translateY(${swipeY}px)`,
                    transition: swipeY === 0 ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)' : 'none',
                }}
            >
                {/* Drag handle */}
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '14px auto 0', cursor: 'grab' }} />

                {/* Celebration overlay */}
                {showCelebration && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 50, borderRadius: '28px 28px 0 0',
                        background: 'linear-gradient(160deg, rgba(16,185,129,0.18), rgba(56,189,248,0.1), rgba(10,15,30,0.95))',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: 10, animation: 'fadeUp 0.4s ease',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <div style={{ fontSize: 62 }}>🎉</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', textAlign: 'center' }}>Service Complete!</div>
                        <div style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 600, textAlign: 'center' }}>Thank you for choosing Sorted Solutions</div>
                    </div>
                )}

                {/* Sticky header */}
                <div style={{
                    position: 'sticky', top: 0,
                    background: 'linear-gradient(180deg, #0d1526 70%, transparent)',
                    padding: '14px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    zIndex: 10
                }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#f8fafc' }}>
                                {applianceBrand ? `${applianceBrand} ` : ''}{applianceType}
                            </h2>
                            {job.serviceCoverage === 'amc' && <span style={{ fontSize: 10, fontWeight: 700, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.3)', padding: '2px 8px', borderRadius: 12 }}>🛡️ AMC</span>}
                            {job.serviceCoverage === 'warranty' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', padding: '2px 8px', borderRadius: 12 }}>WARRANTY</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace' }}>
                            {job.jobNumber || `#${job.id?.slice(0, 8)}`}
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                        color: '#64748b', borderRadius: '50%', width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                    }}>
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '0 18px 28px' }}>

                    {/* ── Status card ── */}
                    <div style={{
                        padding: '14px 16px', borderRadius: 16,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 12,
                            background: cfg.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, boxShadow: `0 4px 14px ${cfg.color}40`
                        }}>
                            <Icon size={18} color="#0f172a" />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 1.5 }}>{cfg.desc}</div>
                        </div>
                    </div>

                    {/* ── Journey ── */}
                    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px 14px', marginBottom: 14 }}>
                        <SectionLabel>Service Journey</SectionLabel>
                        <JourneyPills status={job.status} />
                    </div>

                    {/* ── LIVE MAP — only when technician is on the way ── */}
                    {showMap && custLocation && (
                        <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 14, border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 4px 20px rgba(16,185,129,0.1)' }}>
                            <div style={{ padding: '12px 14px', background: 'rgba(16,185,129,0.07)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Navigation size={14} color="#10b981" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#a7f3d0', flex: 1 }}>Live Technician Tracking</span>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 1.8s ease-in-out infinite' }} />
                                <span style={{ fontSize: 10, color: '#a7f3d0', fontWeight: 600 }}>LIVE</span>
                            </div>
                            <div style={{ height: 240, position: 'relative', zIndex: 0, background: '#1e293b' }}>
                                <LiveMap technicianLocation={techLocation} customerLocation={custLocation} fitBounds={!!(techLocation && custLocation)} />
                            </div>
                            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.04)', fontSize: 11, color: '#6ee7b7', textAlign: 'center' }}>
                                Technician is en route — location updates in real-time
                            </div>
                        </div>
                    )}

                    {/* ── Quotation section ── */}
                    {showQuotation && (
                        <>
                            <SectionLabel>Estimate</SectionLabel>
                            <QuotationSection jobId={job.id} status={job.status} onClose={onClose} />
                        </>
                    )}

                    {/* ── Invoice section ── */}
                    {showInvoice && (
                        <>
                            <SectionLabel>Invoice & Payment</SectionLabel>
                            <InvoiceSection jobId={job.id} jobStatus={job.status} />
                        </>
                    )}

                    {/* ── Star rating for completed ── */}
                    {(job.status === 'closed' || job.status === 'completed') && (
                        <StarRating job={job} onRated={() => {}} />
                    )}

                    {/* ── Parts ordered info ── */}
                    {job.status === 'parts_ordered' && (
                        <div style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 14, padding: '13px 14px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <Package size={16} color="#fb923c" style={{ flexShrink: 0, marginTop: 1 }} />
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', marginBottom: 4 }}>Part On Order</div>
                                <div style={{ fontSize: 12, color: '#fed7aa', lineHeight: 1.5 }}>
                                    Your technician has ordered the required part. We'll schedule a follow-up visit once it arrives — typically 2–5 business days.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── What happens next ── */}
                    {cfg.next && !isClosedOrCancelled && (
                        <div style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <Info size={14} color="#38bdf8" style={{ flexShrink: 0, marginTop: 2 }} />
                            <div style={{ fontSize: 12, color: '#bae6fd', lineHeight: 1.5 }}>
                                <strong style={{ color: '#7dd3fc' }}>What happens next: </strong>{cfg.next}
                            </div>
                        </div>
                    )}

                    {/* ── Job info grid ── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                        <InfoTile label="Appliance" value={`${applianceBrand ? applianceBrand + ' ' : ''}${applianceType}`} />
                        {dateLabel && <InfoTile label="Scheduled Date" value={dateLabel} icon={Calendar} />}
                        {timeLabel && <InfoTile label="Time Slot" value={timeLabel} icon={Clock} />}
                        {job.issue && <InfoTile label="Reported Issue" value={job.issue} style={{ gridColumn: '1 / -1' }} />}
                        {(job.locality || job.city) && <InfoTile label="Location" value={[job.locality, job.city].filter(Boolean).join(', ')} icon={MapPin} />}
                    </div>

                    {/* ── Technician profile card from DB ── */}
                    {(job.technician_id || job.assignedTechnicianId || job.assignedTechnician) && (
                        <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '14px', marginBottom: 14 }}>
                            <div style={{ fontSize: 10, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Technician</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {/* Photo or initials */}
                                {techProfile?.photo_url
                                    ? <img src={techProfile.photo_url} alt={techProfile.name} style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(56,189,248,0.4)', flexShrink: 0 }} />
                                    : <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(59,130,246,0.2))', border: '1px solid rgba(56,189,248,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>
                                        {(techProfile?.name || job.assignedTechnician || '?')[0]?.toUpperCase()}
                                      </div>
                                }
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>
                                        {techProfile?.name || job.assignedTechnician || 'Being assigned...'}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {techProfile?.rating > 0 && (
                                            <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>★ {techProfile.rating}</span>
                                        )}
                                        {techProfile?.years_experience > 0 && (
                                            <span style={{ fontSize: 11, color: '#475569' }}>{techProfile.years_experience} yrs experience</span>
                                        )}
                                    </div>
                                    {techProfile?.bio && (
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{techProfile.bio}</div>
                                    )}
                                    {(techProfile?.specializations || []).length > 0 && (
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                                            {techProfile.specializations.slice(0, 3).map(s => (
                                                <span key={s} style={{ fontSize: 10, background: 'rgba(56,189,248,0.1)', color: '#7dd3fc', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>{s}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {job.technicianMobile && (
                                    <a href={`tel:${job.technicianMobile}`} style={{ padding: '9px 14px', borderRadius: 12, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                        <Phone size={13} /> Call
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Technician locked notice ── */}
                    {locked && !isClosedOrCancelled && (
                        <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#fbbf24', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
                            🛣️ Technician is on the way — cancel & reschedule are disabled.
                        </div>
                    )}

                    {/* ── Quick Re-Book (on closed/cancelled) ── */}
                    {(job.status === 'closed' || job.status === 'completed' || job.status === 'cancelled') && (
                        <button
                            onClick={() => onReBook?.(job)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: 14, marginBottom: 14,
                                background: 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(59,130,246,0.07))',
                                border: '1px solid rgba(56,189,248,0.2)', color: '#38bdf8',
                                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(59,130,246,0.07))'}
                        >
                            <RotateCcw size={14} /> Book Same Service Again
                        </button>
                    )}

                    {/* ── Invoice share actions ── */}
                    {showInvoice && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            <button
                                onClick={() => {
                                    const msg = `Hi, I'd like to share my invoice for Job ${job.jobNumber || job.id?.slice(0,8)} — ${job.appliance_type || 'Appliance'} repair by Sorted Solutions. Please WhatsApp me the invoice.`
                                    window.open(`https://wa.me/919082225163?text=${encodeURIComponent(msg)}`, '_blank')
                                }}
                                style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                <Share2 size={13} /> Share Invoice
                            </button>
                            <button
                                onClick={() => window.print()}
                                style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                            >
                                <Printer size={13} /> Print / Save PDF
                            </button>
                        </div>
                    )}

                    {!isClosedOrCancelled && (
                        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                            <button
                                onClick={() => !locked && onRescheduleClick()}
                                disabled={locked}
                                style={{
                                    flex: 1, padding: '13px',
                                    background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(56,189,248,0.08)',
                                    border: `1px solid ${locked ? 'rgba(255,255,255,0.06)' : 'rgba(56,189,248,0.2)'}`,
                                    borderRadius: 14, color: locked ? '#334155' : '#38bdf8',
                                    fontSize: 13, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Reschedule
                            </button>
                            <button
                                onClick={() => !locked && onCancel(job.id)}
                                disabled={locked}
                                style={{
                                    flex: 1, padding: '13px',
                                    background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.06)',
                                    border: `1px solid ${locked ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.18)'}`,
                                    borderRadius: 14, color: locked ? '#334155' : '#ef4444',
                                    fontSize: 13, fontWeight: 700, cursor: locked ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* ── Add Details panel ── */}
                    {!['cancelled'].includes(job.status) && (
                        <AddDetailsPanel job={job} />
                    )}

                    {/* ── Support footer ── */}
                    <div style={{
                        display: 'flex', gap: 8, padding: '12px 14px',
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: 14
                    }}>
                        <a href="tel:+919082225163" style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            color: '#64748b', textDecoration: 'none',
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'
                        }}>
                            <PhoneCall size={13} /> Call Support
                        </a>
                        <a href="https://wa.me/919082225163" target="_blank" rel="noopener noreferrer" style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            color: '#4ade80', textDecoration: 'none',
                            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)'
                        }}>
                            <MessageCircle size={13} /> WhatsApp
                        </a>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.88); } }
                @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
            `}</style>
        </>
    )
}

// ── Service History Timeline (for 'all' tab) ─────────────────────────────────
function ServiceTimeline({ jobs, onSelect }) {
    const grouped = {}
    for (const job of jobs) {
        const month = new Date(job.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        if (!grouped[month]) grouped[month] = []
        grouped[month].push(job)
    }
    const appEmoji = (type = '') => {
        const t = type.toLowerCase()
        if (t.includes('ac') || t.includes('air')) return '❄️'
        if (t.includes('fridge')) return '🧊'
        if (t.includes('wash')) return '🫧'
        if (t.includes('tv')) return '📺'
        if (t.includes('micro') || t.includes('oven')) return '⚡'
        if (t.includes('water') || t.includes('ro')) return '💧'
        if (t.includes('geyser') || t.includes('heater')) return '🔥'
        return '🔧'
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {Object.entries(grouped).map(([month, mjobs]) => (
                <div key={month}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: 1, textTransform: 'uppercase', padding: '14px 0 8px' }}>{month}</div>
                    <div style={{ position: 'relative', paddingLeft: 24 }}>
                        {/* Vertical rail */}
                        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 1.5, background: 'rgba(255,255,255,0.07)' }} />
                        {mjobs.map((job, i) => {
                            const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.new_job_request
                            const type = job.appliance_type || job.issue_category || 'Service'
                            return (
                                <button
                                    key={job.id}
                                    onClick={() => onSelect(job)}
                                    style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '10px 12px', marginBottom: 8, borderRadius: 14,
                                        background: 'rgba(255,255,255,0.025)', border: `1px solid ${cfg.border}`,
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.025)'}
                                >
                                    {/* Dot on rail */}
                                    <div style={{ position: 'absolute', left: 5, width: 8, height: 8, borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}60` }} />
                                    <div style={{ fontSize: 22 }}>{appEmoji(type)}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 1 }}>{type}</div>
                                        <div style={{ fontSize: 11, color: '#475569' }}>{new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                                    </div>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, padding: '3px 8px', borderRadius: 20, flexShrink: 0 }}>{cfg.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ServicesPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterStatus, setFilterStatus] = useState('active')
    const [selectedJob, setSelectedJob] = useState(null)
    const [showServiceModal, setShowServiceModal] = useState(false)
    const [showRescheduleModal, setShowRescheduleModal] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [timelineView, setTimelineView] = useState(false)
    const [reBookData, setReBookData] = useState(null)

    useEffect(() => { fetchJobs() }, [filterStatus])

    const fetchJobs = async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true)
            else setLoading(true)
            const customerId = localStorage.getItem('customerId') || ''
            const res = await fetch(`/api/customer/jobs?customerId=${customerId}&status=all&t=${Date.now()}`, { cache: 'no-store' })
            if (!res.ok) throw new Error('Failed to fetch jobs')
            const data = await res.json()
            const all = data.jobs || []

            const activeStatuses = ['new_job_request', 'booking_request', 'scheduled', 'assigned', 'diagnosing_quoting', 'quotation_sent', 'parts_ordered', 'work_in_progress', 'cx_reschedule']
            const pastStatuses = ['closed', 'completed', 'cancelled']

            if (filterStatus === 'all') setJobs(all)
            else if (filterStatus === 'active') setJobs(all.filter(j => activeStatuses.includes(j.status)))
            // (estimates and past tabs removed)
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

    // Count quotation jobs from all jobs for badge
    const [allJobs, setAllJobs] = useState([])
    useEffect(() => {
        const customerId = localStorage.getItem('customerId') || ''
        fetch(`/api/customer/jobs?customerId=${customerId}&status=all`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => setAllJobs(d.jobs || []))
            .catch(() => {})
    }, [])
    const quotationCount = allJobs.filter(j => j.status === 'quotation_sent').length

    const tabs = [
        { id: 'active', label: 'Active' },
        { id: 'all', label: 'All' },
    ]

    const emptyLabel = {
        active: 'No Active Services',
        all: 'No Services Yet',
    }

    return (
        <div style={{ padding: '24px 18px 16px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: '100%' }}>
            <style>{`
                @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
            `}</style>

            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: 27, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>
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
                            width: 38, height: 38, borderRadius: 12,
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={15} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
                    </button>
                    <button
                        onClick={() => setShowServiceModal(true)}
                        style={{
                            height: 38, padding: '0 14px', borderRadius: 12,
                            background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
                            border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 5,
                            boxShadow: '0 4px 16px rgba(56,189,248,0.25)', cursor: 'pointer',
                            fontSize: 13, fontWeight: 700,
                        }}
                    >
                        <Plus size={15} strokeWidth={2.5} /> New
                    </button>
                </div>
            </header>

            {/* Filter tabs + timeline toggle */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                    flex: 1, display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)',
                    borderRadius: 14, padding: '4px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setFilterStatus(tab.id); if (tab.id !== 'all') setTimelineView(false) }}
                            style={{
                                flex: 1, padding: '8px 10px', borderRadius: 10,
                                background: filterStatus === tab.id ? 'rgba(56,189,248,0.12)' : 'transparent',
                                color: filterStatus === tab.id ? '#38bdf8' : '#475569',
                                border: filterStatus === tab.id ? '1px solid rgba(56,189,248,0.2)' : '1px solid transparent',
                                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                                whiteSpace: 'nowrap', transition: 'all 0.18s',
                                position: 'relative',
                            }}
                        >
                            {tab.label}
                            {tab.badge > 0 && (
                                <span style={{
                                    marginLeft: 5, background: '#a78bfa', color: '#fff',
                                    borderRadius: 999, fontSize: 9, fontWeight: 800,
                                    padding: '1px 5px', verticalAlign: 'middle'
                                }}>{tab.badge}</span>
                            )}
                        </button>
                    ))}
                </div>
                {/* Timeline toggle — only visible on All tab */}
                {filterStatus === 'all' && (
                    <button
                        onClick={() => setTimelineView(v => !v)}
                        title={timelineView ? 'Card view' : 'Timeline view'}
                        style={{
                            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                            background: timelineView ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${timelineView ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.07)'}`,
                            color: timelineView ? '#38bdf8' : '#475569',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                    >
                        <TrendingUp size={14} />
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[1,2,3].map(i => (
                        <div key={i} style={{ borderRadius: 20, overflow: 'hidden', padding: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                                <Shimmer w={40} h={40} r={12} />
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <Shimmer w="60%" h={16} r={6} />
                                    <Shimmer w="40%" h={12} r={4} />
                                </div>
                                <Shimmer w={60} h={22} r={20} />
                            </div>
                            <Shimmer w="90%" h={12} r={4} />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div style={{ padding: 20, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 16, color: '#f87171', textAlign: 'center', fontSize: 13 }}>
                    <AlertCircle size={20} style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    {error}
                </div>
            ) : jobs.length === 0 ? (
                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)',
                    borderRadius: 24, padding: '48px 24px', textAlign: 'center'
                }}>
                    <Wrench size={40} color="#1e3a5f" style={{ marginBottom: 14 }} />
                    <h3 style={{ fontSize: 17, color: '#f8fafc', fontWeight: 700, margin: '0 0 6px' }}>
                        {emptyLabel[filterStatus] || 'No Services'}
                    </h3>
                    <p style={{ color: '#475569', fontSize: 13, margin: '0 0 22px' }}>
                        {filterStatus === 'active' || filterStatus === 'all' ? 'Book a service request to get started.' : 'Nothing here yet.'}
                    </p>
                    {(filterStatus === 'active' || filterStatus === 'all') && (
                        <button
                            onClick={() => setShowServiceModal(true)}
                            style={{
                                padding: '11px 22px', borderRadius: 14,
                                background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
                                border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(56,189,248,0.25)'
                            }}
                        >
                            Book a Service
                        </button>
                    )}
                </div>
            ) : (
                filterStatus === 'all' && timelineView
                    ? <ServiceTimeline jobs={jobs} onSelect={setSelectedJob} />
                    : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                    onRescheduleClick={() => setShowRescheduleModal(true)}
                    onReBook={(job) => {
                        setReBookData({ applianceType: job.appliance_type, brand: job.brand || job.appliance_brand, issue: job.issue })
                        setSelectedJob(null)
                        setShowServiceModal(true)
                    }}
                />
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
            `}</style>

            <BookServiceModal
                isOpen={showServiceModal}
                onClose={() => { setShowServiceModal(false); setReBookData(null) }}
                onBook={() => { fetchJobs(); setShowServiceModal(false); setReBookData(null) }}
                prefill={reBookData}
            />

            <RescheduleModal
                isOpen={showRescheduleModal}
                onClose={() => setShowRescheduleModal(false)}
                job={selectedJob}
                onReschedule={() => { fetchJobs(); setSelectedJob(null) }}
            />
        </div>
    )
}
