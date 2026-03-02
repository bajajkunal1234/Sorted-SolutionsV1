'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Wrench, CheckCircle, XCircle, MapPin, Calendar, Phone, Plus, Tag, ChevronRight, X } from 'lucide-react'
import BookServiceModal from '../modals/BookServiceModal'

export default function ServicesPage() {
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [filterStatus, setFilterStatus] = useState('all') // 'all', 'active', 'past'
    const [selectedJob, setSelectedJob] = useState(null)
    const [showServiceModal, setShowServiceModal] = useState(false)

    useEffect(() => {
        fetchJobs()
    }, [filterStatus])

    const fetchJobs = async () => {
        try {
            const customerId = localStorage.getItem('customerId') || 'default-customer-id'
            setLoading(true)

            // Just fetch all and filter client side for better UX/speed
            const response = await fetch(`/api/customer/jobs?customerId=${customerId}&status=all`)
            if (!response.ok) throw new Error('Failed to fetch jobs')

            const data = await response.json()
            const allJobs = data.jobs || []

            if (filterStatus === 'all') {
                setJobs(allJobs)
            } else if (filterStatus === 'active') {
                setJobs(allJobs.filter(j => ['pending', 'confirmed', 'in_progress'].includes(j.status)))
            } else if (filterStatus === 'past') {
                setJobs(allJobs.filter(j => ['completed', 'cancelled'].includes(j.status)))
            }

            setError(null)
        } catch (err) {
            console.error('Error fetching jobs:', err)
            setError('Failed to load service requests')
        } finally {
            setLoading(false)
        }
    }

    const getStatusTheme = (status) => {
        const t = {
            'pending': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock, label: 'Pending' },
            'confirmed': { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', icon: Calendar, label: 'Confirmed' },
            'in_progress': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: Wrench, label: 'In Progress' },
            'completed': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle, label: 'Completed' },
            'cancelled': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', icon: XCircle, label: 'Cancelled' }
        }[status] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: Clock, label: status }

        return t
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'Not scheduled'
        return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    const handleCancelJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to cancel this service request?')) return

        try {
            const customerId = localStorage.getItem('customerId')
            const response = await fetch(`/api/customer/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'cancel', customerId })
            })
            if (!response.ok) throw new Error('Failed to cancel job')

            fetchJobs() // refresh
            setSelectedJob(null)
        } catch (err) {
            alert(err.message)
        }
    }

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px', position: 'relative', minHeight: '100%' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                        Services
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', fontWeight: 500 }}>
                        Track repairs and maintenance
                    </p>
                </div>
                <button
                    onClick={() => setShowServiceModal(true)}
                    style={{
                        width: 44, height: 44, borderRadius: 16,
                        background: 'linear-gradient(135deg, #38bdf8, #3b82f6)',
                        border: 'none', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 20px rgba(56,189,248,0.3)', cursor: 'pointer', transition: 'transform 0.2s'
                    }}
                >
                    <Plus size={22} strokeWidth={2.5} />
                </button>
            </header>

            {/* Segmented Control */}
            <div style={{
                display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', padding: '4px',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {['all', 'active', 'past'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilterStatus(tab)}
                        style={{
                            flex: 1, padding: '8px 0', borderRadius: '10px',
                            background: filterStatus === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: filterStatus === tab ? '#f8fafc' : '#94a3b8',
                            border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.2s', textTransform: 'capitalize',
                            boxShadow: filterStatus === tab ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 0', flexDirection: 'column', gap: 16 }}>
                    <div style={{ width: 30, height: 30, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
            ) : error ? (
                <div style={{ padding: '20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, color: '#f87171', textAlign: 'center' }}>
                    {error}
                </div>
            ) : jobs.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 20px', textAlign: 'center', marginTop: 20 }}>
                    <Wrench size={40} color="#64748b" style={{ marginBottom: 16, opacity: 0.5 }} />
                    <h3 style={{ fontSize: 18, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>No Services Here</h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 24px 0' }}>You don't have any {filterStatus !== 'all' ? filterStatus : ''} service requests.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {jobs.map((job) => {
                        const theme = getStatusTheme(job.status)
                        const Icon = theme.icon

                        return (
                            <div
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                style={{
                                    background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '20px', padding: '16px',
                                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>{job.product?.brand} {job.product?.type}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>ID: {job.id.slice(0, 8)}</div>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '4px 10px', background: theme.bg, color: theme.color,
                                        borderRadius: '20px', fontSize: 11, fontWeight: 700
                                    }}>
                                        <Icon size={12} strokeWidth={3} /> {theme.label}
                                    </div>
                                </div>

                                <p style={{ fontSize: 14, color: '#cbd5e1', margin: '0 0 16px 0', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {job.issue}
                                </p>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                        <Calendar size={14} color="#64748b" />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {job.confirmedVisitTime ? formatDate(job.confirmedVisitTime) : 'Pending Schedule'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                                        <Wrench size={14} color="#64748b" />
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {job.assignedTechnician || 'Unassigned'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Bottom Sheet Modal for Job Details */}
            {selectedJob && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setSelectedJob(null)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }}
                    />

                    {/* Sheet */}
                    <div style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '28px 28px 0 0',
                        padding: '24px', zIndex: 101,
                        boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
                        maxHeight: '85vh', overflowY: 'auto'
                    }}>
                        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>Job Details</h2>
                                <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontFamily: 'monospace' }}>#{selectedJob.id}</p>
                            </div>
                            <button onClick={() => setSelectedJob(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} />
                            </button>
                        </div>

                        {/* Status Ribbon */}
                        {(() => {
                            const theme = getStatusTheme(selectedJob.status)
                            const Icon = theme.icon
                            return (
                                <div style={{ background: theme.bg, color: theme.color, padding: '12px 16px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, fontSize: 14, fontWeight: 700 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: theme.color, color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={16} />
                                    </div>
                                    Status: {theme.label}
                                </div>
                            )
                        })()}

                        {/* Info Groups */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Device</div>
                                <div style={{ fontSize: 15, color: '#f8fafc', fontWeight: 600 }}>{selectedJob.product?.brand} {selectedJob.product?.type}</div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Reported Issue</div>
                                <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>{selectedJob.issue}</div>
                            </div>

                            {selectedJob.notes && (
                                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>Notes</div>
                                    <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.5 }}>{selectedJob.notes}</div>
                                </div>
                            )}

                            {/* Address & Tech */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> Service Address</div>
                                    <div style={{ fontSize: 14, color: '#cbd5e1' }}>{selectedJob.locality}, {selectedJob.city}</div>
                                </div>
                                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)' }} />
                                <div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}><Wrench size={12} /> Technician</div>
                                    <div style={{ fontSize: 14, color: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {selectedJob.assignedTechnician || 'Assigning...'}
                                        {selectedJob.technicianMobile && (
                                            <a href={`tel:${selectedJob.technicianMobile}`} style={{ background: '#38bdf8', color: '#0f172a', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>Call</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {!['completed', 'cancelled'].includes(selectedJob.status) && (
                            <button
                                onClick={() => handleCancelJob(selectedJob.id)}
                                style={{
                                    marginTop: 24, width: '100%', padding: '14px',
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                                    borderRadius: 16, color: '#ef4444', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Cancel Service Request
                            </button>
                        )}
                    </div>
                </>
            )}

            <BookServiceModal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} onBook={() => { fetchJobs(); setShowServiceModal(false) }} />
        </div>
    )
}
