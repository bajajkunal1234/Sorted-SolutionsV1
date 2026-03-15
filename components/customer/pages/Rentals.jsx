'use client'

import React, { useState, useEffect } from 'react'
import { Package, Calendar, AlertCircle, CheckCircle, ChevronRight, Phone } from 'lucide-react'

const PLAN_COLORS = ['#10b981', '#38bdf8', '#f59e0b', '#8b5cf6']

function daysUntil(dateStr) {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24))
}

function TenureBar({ start, end }) {
    const total = new Date(end) - new Date(start)
    const elapsed = new Date() - new Date(start)
    const pct = Math.min(Math.max((elapsed / total) * 100, 0), 100)
    const remaining = Math.max(100 - pct, 0)
    return (
        <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                <span>Started {new Date(start).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span style={{ color: remaining < 15 ? '#ef4444' : '#94a3b8' }}>Ends {new Date(end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 8, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #38bdf8)', borderRadius: 6 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 11, color: remaining < 15 ? '#ef4444' : '#64748b' }}>
                {Math.round(remaining)}% remaining
            </div>
        </div>
    )
}

export default function RentalsPage() {
    const [loading, setLoading] = useState(true)
    const [rentals, setRentals] = useState([])
    const [plans, setPlans] = useState([])
    const [activeTab, setActiveTab] = useState('my') // 'my' | 'browse'

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const customerId = localStorage.getItem('customerId')
            const [rentalsRes, plansRes] = await Promise.all([
                fetch(`/api/customer/rentals?customerId=${customerId}`),
                fetch('/api/customer/rentals?plans=true'),
            ])
            const rentalsData = await rentalsRes.json()
            const plansData = await plansRes.json()
            setRentals(rentalsData.rentals || [])
            setPlans(plansData.plans || [])
        } catch (err) {
            console.error('Rentals fetch error:', err)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading rentals...</span>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    return (
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Header */}
            <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 16, background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={22} color="#10b981" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.5px' }}>Rentals</h1>
                        <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 2, fontWeight: 500 }}>Appliance rental plans</p>
                    </div>
                </div>
            </header>

            {/* Tab Switch */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                {[{ id: 'my', label: `My Rentals${rentals.length ? ` (${rentals.length})` : ''}` }, { id: 'browse', label: 'Browse Plans' }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                        flex: 1, padding: '10px 0', borderRadius: 10,
                        background: activeTab === tab.id ? 'rgba(16,185,129,0.2)' : 'transparent',
                        color: activeTab === tab.id ? '#34d399' : '#64748b',
                        border: activeTab === tab.id ? '1px solid rgba(16,185,129,0.3)' : '1px solid transparent',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    }}>{tab.label}</button>
                ))}
            </div>

            {/* My Rentals */}
            {activeTab === 'my' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {rentals.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 24, padding: '40px 20px', textAlign: 'center' }}>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={36} color="#10b981" strokeWidth={1.5} />
                            </div>
                            <h3 style={{ fontSize: 18, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>No Active Rentals</h3>
                            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px 0', lineHeight: 1.5 }}>
                                Rent premium appliances at affordable monthly rates. No upfront cost, free installation and maintenance included.
                            </p>
                            <button onClick={() => setActiveTab('browse')} style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                                color: '#fff', padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            }}>Browse Rentals →</button>
                        </div>
                    ) : (
                        rentals.map(r => {
                            const daysToRent = daysUntil(r.nextRentDueDate)
                            const isOverdue = daysToRent !== null && daysToRent < 0
                            const isDueSoon = daysToRent !== null && daysToRent >= 0 && daysToRent <= 5

                            return (
                                <div key={r.id} style={{
                                    background: 'linear-gradient(145deg, rgba(16,185,129,0.08), rgba(255,255,255,0.02))',
                                    border: isOverdue ? '1px solid rgba(239,68,68,0.4)' : isDueSoon ? '1px solid rgba(245,158,11,0.4)' : '1px solid rgba(16,185,129,0.2)',
                                    borderRadius: 24, padding: 20,
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div>
                                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', margin: '0 0 4px 0' }}>{r.productName}</h3>
                                            {r.serialNumber && <p style={{ margin: 0, color: '#64748b', fontSize: 12, fontFamily: 'monospace' }}>SN: {r.serialNumber}</p>}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>
                                                ₹{(r.monthlyRent || 0).toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b' }}>/month</div>
                                        </div>
                                    </div>

                                    {/* Overdue / due-soon banner */}
                                    {(isOverdue || isDueSoon) && (
                                        <div style={{
                                            background: isOverdue ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                            border: `1px solid ${isOverdue ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                            borderRadius: 10, padding: '8px 12px', marginBottom: 12,
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            color: isOverdue ? '#f87171' : '#fbbf24', fontSize: 13, fontWeight: 600,
                                        }}>
                                            <AlertCircle size={14} />
                                            {isOverdue
                                                ? `Rent overdue by ${Math.abs(daysToRent)} day${Math.abs(daysToRent) !== 1 ? 's' : ''}`
                                                : `Rent due in ${daysToRent} day${daysToRent !== 1 ? 's' : ''}`}
                                        </div>
                                    )}

                                    {/* Tenure progress */}
                                    {r.startDate && r.endDate && <TenureBar start={r.startDate} end={r.endDate} />}

                                    {/* Info row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>SECURITY DEPOSIT</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>₹{(r.securityDeposit || 0).toLocaleString()}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '12px 14px' }}>
                                            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>NEXT DUE</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: isOverdue ? '#ef4444' : '#f8fafc' }}>
                                                {r.nextRentDueDate
                                                    ? new Date(r.nextRentDueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                                                    : 'N/A'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Support CTA */}
                                    <a href="tel:+919999999999" style={{
                                        marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                                        borderRadius: 12, padding: '12px', textDecoration: 'none', color: '#10b981', fontSize: 13, fontWeight: 600,
                                    }}>
                                        <Phone size={14} /> Contact for Rent Payment / Support
                                    </a>
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {/* Browse Plans */}
            {activeTab === 'browse' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {plans.length === 0 ? (
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20, padding: '40px 20px', textAlign: 'center' }}>
                            <Package size={40} color="#64748b" style={{ marginBottom: 16, opacity: 0.4 }} />
                            <h3 style={{ fontSize: 18, color: '#f8fafc', fontWeight: 700, margin: '0 0 8px 0' }}>Rental Plans Coming Soon</h3>
                            <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 20px 0' }}>We're curating the best rental options. Contact us to express interest.</p>
                            <a href="tel:+919999999999" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                background: '#10b981', color: '#fff', padding: '12px 24px',
                                borderRadius: 12, textDecoration: 'none', fontSize: 14, fontWeight: 700,
                            }}><Phone size={16} /> Call Us</a>
                        </div>
                    ) : (
                        plans.map((plan, idx) => {
                            const color = PLAN_COLORS[idx % PLAN_COLORS.length]
                            const minRent = plan.tenureOptions?.length
                                ? Math.min(...plan.tenureOptions.map(t => t.monthlyRent || 0))
                                : 0
                            const services = (plan.includedServices || []).filter(s => s && s.trim())
                            const APPLIANCE_ICON = {
                                'AC': '❄️', 'Refrigerator': '🧊', 'Washing Machine': '🫧',
                                'Microwave Oven': '📡', 'Water Purifier': '💧', 'Gas Stove': '🔥',
                            }
                            const icon = APPLIANCE_ICON[plan.category] || '📦'

                            return (
                                <div key={plan.id} style={{
                                    background: `linear-gradient(145deg, ${color}12, rgba(255,255,255,0.02))`,
                                    border: `1px solid ${color}30`,
                                    borderRadius: 24, overflow: 'hidden',
                                }}>
                                    {/* Header strip */}
                                    <div style={{ background: `${color}18`, padding: '18px 20px 14px', borderBottom: `1px solid ${color}20` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ fontSize: 32, lineHeight: 1 }}>{icon}</div>
                                                <div>
                                                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', margin: '0 0 2px 0', lineHeight: 1.2 }}>
                                                        {plan.productName || plan.name || plan.category}
                                                    </h3>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color, background: `${color}20`, padding: '2px 8px', borderRadius: 20 }}>
                                                        {plan.category}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div style={{ fontSize: 10, color: '#64748b', marginBottom: 2, fontWeight: 600, letterSpacing: 0.5 }}>STARTING FROM</div>
                                                <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
                                                    {minRent > 0 ? `₹${minRent.toLocaleString()}/mo` : 'Contact Us'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Badges row */}
                                        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                                            {plan.freeVisits > 0 && (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#34d399', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 20, padding: '3px 10px' }}>
                                                    ✓ {plan.freeVisits} free service visit{plan.freeVisits > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {plan.tenureOptions?.length > 1 && (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: '3px 10px' }}>
                                                    {plan.tenureOptions.length} tenure options
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div style={{ padding: '16px 20px 20px' }}>

                                        {/* Tenure tiers */}
                                        {plan.tenureOptions?.length > 0 && (
                                            <div style={{ marginBottom: 14 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Pricing Tiers</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {plan.tenureOptions.map((t, i) => (
                                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '8px 12px' }}>
                                                            <div>
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{t.duration} {t.unit}</span>
                                                                {t.securityDeposit > 0 && (
                                                                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>+ ₹{t.securityDeposit.toLocaleString()} deposit</span>
                                                                )}
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <span style={{ fontSize: 15, fontWeight: 800, color }}>
                                                                    {t.monthlyRent > 0 ? `₹${t.monthlyRent.toLocaleString()}/mo` : 'On request'}
                                                                </span>
                                                                {t.setupFee > 0 && (
                                                                    <div style={{ fontSize: 10, color: '#64748b' }}>₹{t.setupFee.toLocaleString()} setup</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Included services */}
                                        {services.length > 0 && (
                                            <div style={{ marginBottom: 16 }}>
                                                <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>What's Included</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                                    {services.map((s, i) => (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1' }}>
                                                            <span style={{ color: '#34d399', fontSize: 15, flexShrink: 0 }}>✓</span> {s}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Terms snippet */}
                                        {plan.terms && (
                                            <p style={{ fontSize: 11, color: '#475569', margin: '0 0 14px 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                                                📋 {plan.terms.length > 100 ? plan.terms.slice(0, 100) + '…' : plan.terms}
                                            </p>
                                        )}

                                        {/* CTA */}
                                        <a href="tel:+919999999999" style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                            background: `linear-gradient(135deg, ${color}30, ${color}15)`,
                                            border: `1px solid ${color}40`,
                                            borderRadius: 14, padding: '13px', textDecoration: 'none',
                                            color, fontSize: 14, fontWeight: 700,
                                        }}>
                                            <Phone size={15} /> Enquire Now
                                        </a>
                                    </div>
                                </div>
                            )
                        })

                    )}
                </div>
            )}
        </div>
    )
}
