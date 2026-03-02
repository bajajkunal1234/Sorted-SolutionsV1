'use client'

import React, { useState, useEffect } from 'react'
import { Shield, Calendar, CheckCircle, AlertCircle, ChevronRight, Clock } from 'lucide-react'

const PLAN_COLORS = ['#8b5cf6', '#38bdf8', '#10b981', '#f59e0b']

function daysUntil(dateStr) {
    if (!dateStr) return null
    const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
    return diff
}

function ProgressBar({ start, end, color }) {
    const total = new Date(end) - new Date(start)
    const elapsed = new Date() - new Date(start)
    const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100)
    return (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden', marginTop: 8 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
    )
}

export default function AMCPage() {
    const [loading, setLoading] = useState(true)
    const [contracts, setContracts] = useState([])
    const [plans, setPlans] = useState([])
    const [activeTab, setActiveTab] = useState('my') // 'my' | 'explore'
    const [selectedContract, setSelectedContract] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const customerId = localStorage.getItem('customerId')
            const [contractsRes, plansRes] = await Promise.all([
                fetch(`/api/customer/amc?customerId=${customerId}`),
                fetch('/api/customer/amc?plans=true'),
            ])
            const contractsData = await contractsRes.json()
            const plansData = await plansRes.json()
            setContracts(contractsData.contracts || [])
            setPlans(plansData.plans || [])
        } catch (err) {
            console.error('AMC fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading AMC plans...</span>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 16, background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(99,102,241,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Shield size={22} color="#8b5cf6" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>AMC Plans</h1>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 2, fontWeight: 500 }}>Annual Maintenance Contracts</p>
                    </div>
                </div>
            </header>

            {/* Tab Switch */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                {[{ id: 'my', label: `My Contracts${contracts.length ? ` (${contracts.length})` : ''}` }, { id: 'explore', label: 'Explore Plans' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flex: 1, padding: '10px 0', borderRadius: 10,
                        background: activeTab === tab.id ? 'rgba(139,92,246,0.2)' : 'transparent',
                        color: activeTab === tab.id ? '#a78bfa' : '#64748b',
                        border: activeTab === tab.id ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}>{tab.label}</button>
                ))}
            </div>

            {/* My Contracts */}
            {activeTab === 'my' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {contracts.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(139,92,246,0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={36} color="#8b5cf6" strokeWidth={1.5} />
                            </div>
                            <h3 style={{ fontSize: 18, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>No Active AMC</h3>
                            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.5 }}>
                                Protect your appliances with a comprehensive maintenance plan. Get priority service, free inspections, and peace of mind.
                            </p>
                            <button onClick={() => setActiveTab('explore')} style={{
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', border: 'none',
                                color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            }}>Browse Plans →</button>
                        </div>
                    ) : (
                        contracts.map(c => {
                            const daysLeft = daysUntil(c.endDate)
                            const isExpiringSoon = daysLeft !== null && daysLeft <= 30 && daysLeft > 0
                            const isExpired = daysLeft !== null && daysLeft <= 0
                            const servicesLeft = c.servicesTotal - c.servicesUsed

                            return (
                                <div key={c.id} style={{
                                    background: 'linear-gradient(145deg, rgba(139,92,246,0.08), rgba(255,255,255,0.02))',
                                    border: isExpiringSoon ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(139,92,246,0.2)',
                                    borderRadius: 24, padding: 20,
                                }} onClick={() => setSelectedContract(c)}>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>{c.planName}</h3>
                                            <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{c.productBrand} {c.productModel} • {c.productType}</p>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            background: isExpired ? 'rgba(239,68,68,0.15)' : isExpiringSoon ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                                            color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981',
                                        }}>{isExpired ? 'Expired' : isExpiringSoon ? `${daysLeft}d left` : 'Active'}</span>
                                    </div>

                                    {/* Progress bar */}
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                                            <span>{new Date(c.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            <span>{new Date(c.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <ProgressBar start={c.startDate} end={c.endDate} color="#8b5cf6" />
                                    </div>

                                    {/* Stats row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>NEXT SERVICE</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                                                {c.nextServiceDate
                                                    ? new Date(c.nextServiceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                                                    : 'Not scheduled'}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>SERVICES LEFT</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: servicesLeft > 0 ? '#10b981' : '#f59e0b' }}>
                                                {c.servicesTotal > 0 ? `${servicesLeft} of ${c.servicesTotal}` : 'Unlimited'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Explore Plans */}
            {activeTab === 'explore' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {plans.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20, padding: '32px 20px', textAlign: 'center' }}>
                            <Shield size={36} color="#64748b" style={{ marginBottom: 12, opacity: 0.4 }} />
                            <p style={{ color: '#64748b', fontSize: 14 }}>AMC plans coming soon. Contact us to enquire.</p>
                            <a href="tel:+919999999999" style={{ display: 'inline-block', marginTop: 16, background: '#8b5cf6', color: '#fff', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>📞 Call Us</a>
                        </div>
                    ) : (
                        plans.map((plan, idx) => (
                            <div key={plan.id} style={{
                                background: `linear-gradient(135deg, ${PLAN_COLORS[idx % PLAN_COLORS.length]}12, rgba(255,255,255,0.02))`,
                                border: `1px solid ${PLAN_COLORS[idx % PLAN_COLORS.length]}25`,
                                borderRadius: 24, padding: 20,
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div>
                                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#f8fafc', margin: '0 0 4px 0' }}>{plan.name}</h3>
                                        <p style={{ margin: 0, color: '#94a3b8', fontSize: 13 }}>{plan.category}</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: PLAN_COLORS[idx % PLAN_COLORS.length] }}>
                                            ₹{(plan.price || 0).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>per year</div>
                                    </div>
                                </div>

                                {plan.services && (
                                    <div style={{ marginBottom: 16 }}>
                                        {(Array.isArray(plan.services) ? plan.services : []).slice(0, 4).map((s, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                                <CheckCircle size={14} color={PLAN_COLORS[idx % PLAN_COLORS.length]} />
                                                <span style={{ fontSize: 13, color: '#cbd5e1' }}>
                                                    {typeof s === 'string' ? s : `${s.quantity}x ${s.item}${s.frequency ? ` (${s.frequency})` : ''}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button style={{
                                    width: '100%', padding: '14px', borderRadius: 14, border: `1px solid ${PLAN_COLORS[idx % PLAN_COLORS.length]}40`,
                                    background: `${PLAN_COLORS[idx % PLAN_COLORS.length]}20`, color: PLAN_COLORS[idx % PLAN_COLORS.length],
                                    fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                }}>
                                    Enquire About This Plan →
                                </button>
                            </div>
                        ))
                    )}

                    {/* CTA if no plans */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: '20px', textAlign: 'center' }}>
                        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 12px 0' }}>Need a custom AMC plan? We'll design one for you.</p>
                        <a href="tel:+919999999999" style={{ display: 'inline-block', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', padding: '10px 20px', borderRadius: 10, textDecoration: 'none', fontSize: 13, fontWeight: 700, border: '1px solid rgba(139,92,246,0.3)' }}>
                            📞 Talk to Us
                        </a>
                    </div>
                </div>
            )}
        </div>
    )
}
