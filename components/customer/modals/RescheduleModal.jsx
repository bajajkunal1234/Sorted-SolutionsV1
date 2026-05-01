'use client'

import { useState, useEffect } from 'react'
import { X, Calendar } from 'lucide-react'

const S = {
    overlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200,
    },
    sheet: {
        width: '100%', maxWidth: 480, background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '28px 28px 0 0', padding: 'max(8px, env(safe-area-inset-top)) 24px 32px',
        border: '1px solid rgba(255,255,255,0.08)', maxHeight: '85dvh', overflowY: 'auto',
    },
    handle: { width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 20px' },
    label: { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 },
    input: {
        width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: '13px 14px', color: '#f8fafc', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    },
    submitBtn: {
        width: '100%', padding: '16px', background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
        border: 'none', borderRadius: 16, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        marginTop: 8,
    },
    cancelBtn: {
        width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16, color: '#64748b', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8,
    },
}

export default function RescheduleModal({ isOpen, onClose, onReschedule, job }) {
    const [form, setForm] = useState({
        preferredDate: '',
        preferredTime: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [availableSlots, setAvailableSlots] = useState([])
    const [fetchingSlots, setFetchingSlots] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            setForm({ preferredDate: '', preferredTime: '' })
            setError('')
            return
        }
        // Pre-fill with existing date/time if available
        if (job) {
            setForm({
                preferredDate: job.dueDate || job.scheduled_date || '',
                preferredTime: job.confirmedVisitTime || job.scheduled_time || '',
            })
        }
    }, [isOpen, job])

    useEffect(() => {
        if (!form.preferredDate) return
        const fetchSlots = async () => {
            setFetchingSlots(true)
            try {
                const res = await fetch(`/api/booking/available-slots?days=1&startDate=${form.preferredDate}`)
                const data = await res.json()
                if (data.success && data.data[form.preferredDate]) {
                    setAvailableSlots(data.data[form.preferredDate])
                } else {
                    setAvailableSlots([])
                }
            } catch (err) {
                console.error(err)
            } finally {
                setFetchingSlots(false)
            }
        }
        fetchSlots()
    }, [form.preferredDate])

    const handleSubmit = async () => {
        setError('')
        if (!form.preferredDate) return setError('Please select a preferred date')
        if (!form.preferredTime) return setError('Please select a preferred time slot')

        setLoading(true)
        try {
            const customerId = localStorage.getItem('customerId')
            if (!customerId) throw new Error('Not authenticated')

            const payload = {
                action: 'reschedule',
                customerId: customerId,
                scheduled_date: form.preferredDate,
                scheduled_time: form.preferredTime,
            }

            const res = await fetch(`/api/customer/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Failed to reschedule service')

            onReschedule?.()
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div style={S.overlay} onClick={onClose}>
            <div style={S.sheet} onClick={e => e.stopPropagation()}>
                <div style={S.handle} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Calendar size={20} color="#38bdf8" />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc' }}>Reschedule Service</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Choose a new date and time</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Preferred Date */}
                    <div>
                        <label style={S.label}>New Date *</label>
                        <input style={S.input} type="date" value={form.preferredDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
                    </div>

                    {/* Preferred Time Slot */}
                    <div>
                        <label style={S.label}>New Time *</label>
                        {!form.preferredDate ? (
                            <div style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', padding: '10px 0' }}>Select a date first</div>
                        ) : fetchingSlots ? (
                            <div style={{ fontSize: 13, color: '#64748b', padding: '10px 0' }}>Loading slots...</div>
                        ) : availableSlots.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {availableSlots.map(slot => {
                                    const slotLabel = slot.label || `${slot.startTime}–${slot.endTime}`
                                    const isSelected = form.preferredTime === slotLabel
                                    return (
                                        <button key={slot.id} type="button"
                                            onClick={() => setForm(f => ({ ...f, preferredTime: slotLabel }))}
                                            style={{
                                                padding: '13px 16px', borderRadius: 12, textAlign: 'left',
                                                background: isSelected ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)',
                                                border: isSelected ? '1px solid rgba(56,189,248,0.5)' : '1px solid rgba(255,255,255,0.08)',
                                                color: isSelected ? '#38bdf8' : '#94a3b8',
                                                fontSize: 14, fontWeight: isSelected ? 700 : 500, cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            }}>
                                            <span>{slotLabel}</span>
                                            {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div style={{ fontSize: 13, color: '#f87171', padding: '10px 0' }}>No slots available for this date</div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 14px', color: '#f87171', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    {/* Buttons */}
                    <button onClick={handleSubmit} disabled={loading} style={{ ...S.submitBtn, opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Rescheduling...' : 'Confirm Reschedule'}
                    </button>
                    <button onClick={onClose} style={S.cancelBtn}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
