'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    TrendingUp, TrendingDown, Users, Calendar, BarChart2,
    Globe, Loader2, RefreshCw, AlertCircle,
    ShoppingCart, ArrowUp, ArrowDown, Minus,
    Activity, Eye, MousePointer, Clock, X, ChevronRight
} from 'lucide-react'

// ─── Status colour map ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
    pending: '#f59e0b', confirmed: '#3b82f6', 'in-progress': '#8b5cf6',
    completed: '#10b981', cancelled: '#ef4444', new: '#06b6d4',
}
const CHANNEL_COLORS = ['#4285f4', '#34a853', '#fbbc04', '#ea4335', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b']
const RANGES = [{ id: 'today', label: 'Today' }, { id: '7d', label: '7 Days' }, { id: '30d', label: '30 Days' }, { id: '90d', label: '90 Days' }]

// ─── Pure-SVG Sparkline ────────────────────────────────────────────────────────
function Sparkline({ data = [], color = '#6366f1', height = 40, width = 120 }) {
    if (data.length < 2) return null
    const vals = data.map(d => d.count ?? d.sessions ?? d.pageViews ?? 0)
    const max = Math.max(...vals, 1)
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - (v / max) * height * 0.82 - 2}`).join(' ')
    return (
        <svg width={width} height={height} style={{ overflow: 'visible' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─── Mini Bar ─────────────────────────────────────────────────────────────────
function BarMini({ items = [], color = '#6366f1', width = 200, height = 80 }) {
    if (!items.length) return null
    const max = Math.max(...items.map(i => i.count), 1)
    const bw = width / items.length - 3
    return (
        <svg width={width} height={height}>
            {items.map((item, i) => {
                const bh = (item.count / max) * (height - 16)
                return (
                    <g key={i}>
                        <rect x={i * (bw + 3)} y={height - bh - 16} width={bw} height={bh} rx={3} fill={`${color}cc`} />
                        <text x={i * (bw + 3) + bw / 2} y={height - 2} textAnchor="middle" fontSize="8" fill="var(--text-tertiary)" style={{ fontFamily: 'system-ui' }}>
                            {item.name?.split('-')[0]?.slice(0, 6)}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

// ─── Donut ────────────────────────────────────────────────────────────────────
function Donut({ slices = [], size = 120 }) {
    if (!slices.length) return null
    const total = slices.reduce((s, i) => s + i.value, 0) || 1
    const r = 42; const cx = size / 2; const cy = size / 2; let angle = -Math.PI / 2
    return (
        <svg width={size} height={size}>
            {slices.map((slice, i) => {
                const pct = slice.value / total; const start = angle; angle += pct * 2 * Math.PI
                if (pct < 0.005) return null
                const x1 = cx + r * Math.cos(start); const y1 = cy + r * Math.sin(start)
                const x2 = cx + r * Math.cos(angle); const y2 = cy + r * Math.sin(angle)
                return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${pct > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={slice.color} opacity="0.9" />
            })}
            <circle cx={cx} cy={cy} r={r - 16} fill="var(--bg-primary)" />
        </svg>
    )
}

// ─── Drill-down Drawer ────────────────────────────────────────────────────────
function Drawer({ open, title, subtitle, onClose, children }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        if (open) window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null
    return (
        <>
            {/* Backdrop */}
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1000, backdropFilter: 'blur(2px)' }} />
            {/* Panel */}
            <div style={{
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(600px, 95vw)',
                backgroundColor: 'var(--bg-primary)', borderLeft: '1px solid var(--border-primary)',
                zIndex: 1001, display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,0.25)',
                animation: 'slideIn 0.2s ease'
            }}>
                {/* Header */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-primary)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', padding: '6px', display: 'flex' }}>
                        <X size={16} />
                    </button>
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                    {children}
                </div>
            </div>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
        </>
    )
}

// ─── Drill-down table (customers) ─────────────────────────────────────────────
function CustomerTable({ rows }) {
    if (!rows.length) return <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>No records found.</div>
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    {['Name', 'Phone', 'Email', 'Joined'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.name}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '12px' }}>{r.phone}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-tertiary)', fontSize: '12px' }}>{r.email}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-tertiary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.joined}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// ─── Drill-down table (bookings/jobs) ─────────────────────────────────────────
function BookingTable({ rows }) {
    if (!rows.length) return <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>No records found.</div>
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    {['Job #', 'Customer', 'Service', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-tertiary)' }}>{r.jobNo}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.customer}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{r.service || '—'}</td>
                        <td style={{ padding: '10px 8px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '99px', backgroundColor: `${STATUS_COLORS[r.status] || '#94a3b8'}20`, color: STATUS_COLORS[r.status] || '#94a3b8', fontSize: '11px', fontWeight: 700, textTransform: 'capitalize' }}>
                                {r.status}
                            </span>
                        </td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-tertiary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.created}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

// ─── Clickable Metric Card ────────────────────────────────────────────────────
function MetricCard({ icon: Icon, color, label, value, change, subtitle, sparkData, na, onClick }) {
    const up = change > 0; const flat = change === 0
    const clickable = !na && onClick
    return (
        <div
            onClick={clickable ? onClick : undefined}
            style={{
                padding: '16px', backgroundColor: 'var(--bg-elevated)',
                border: `1px solid ${clickable ? color + '30' : 'var(--border-primary)'}`,
                borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '8px',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'all 0.15s',
                position: 'relative',
            }}
            onMouseEnter={e => { if (clickable) { e.currentTarget.style.borderColor = color; e.currentTarget.style.backgroundColor = `${color}08` } }}
            onMouseLeave={e => { if (clickable) { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.backgroundColor = 'var(--bg-elevated)' } }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} style={{ color }} />
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {change !== undefined && !na && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '99px', backgroundColor: flat ? 'var(--bg-primary)' : up ? '#10b98115' : '#ef444415', color: flat ? 'var(--text-tertiary)' : up ? '#10b981' : '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                            {flat ? <Minus size={10} /> : up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                            {Math.abs(change)}%
                        </div>
                    )}
                    {clickable && <ChevronRight size={14} style={{ color }} />}
                </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: na ? 'var(--text-tertiary)' : 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {na ? '—' : (typeof value === 'number' ? value.toLocaleString() : value) ?? '—'}
            </div>
            {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{subtitle}</div>}
            {sparkData?.length > 1 && !na && <Sparkline data={sparkData} color={color} height={36} width={140} />}
        </div>
    )
}

// ─── GA4 Connect Banner ────────────────────────────────────────────────────────
function GA4Banner() {
    return (
        <div style={{ padding: '14px 18px', backgroundColor: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Connect GA4 for traffic data</span>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Add your GA4 Property ID and Service Account JSON in <strong>Google APIs &amp; Integrations</strong> → GA4 section.
                </p>
            </div>
        </div>
    )
}

function SectionTitle({ children }) {
    return <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '2px', marginTop: '4px' }}>{children}</div>
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WebsiteAnalytics() {
    const [range, setRange] = useState('30d')
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [lastFetched, setLastFetched] = useState(null)

    // Drawer state
    const [drawer, setDrawer] = useState(null) // { type, filter, title, subtitle }
    const [drawerRows, setDrawerRows] = useState([])
    const [drawerLoading, setDrawerLoading] = useState(false)

    const load = async (r = range) => {
        setLoading(true); setError('')
        try {
            const res = await fetch(`/api/analytics?range=${r}`)
            const json = await res.json()
            if (!json.success) throw new Error(json.error || 'Failed to load')
            setData(json); setLastFetched(new Date())
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    useEffect(() => { load(range) }, [range])

    const openDrawer = useCallback(async (type, filter, title, subtitle) => {
        setDrawer({ type, filter, title, subtitle }); setDrawerRows([]); setDrawerLoading(true)
        try {
            const params = new URLSearchParams({ type, range })
            if (filter) params.append('filter', filter)
            const res = await fetch(`/api/analytics/detail?${params}`)
            const json = await res.json()
            setDrawerRows(json.rows || [])
        } catch { setDrawerRows([]) }
        finally { setDrawerLoading(false) }
    }, [range])

    const closeDrawer = useCallback(() => setDrawer(null), [])

    const sb = data?.supabase
    const ga4 = data?.ga4
    const ga4Connected = data?.ga4Connected

    const statusSlices = Object.entries(sb?.bookings?.byStatus || {}).map(([k, v]) => ({ label: k, value: v, color: STATUS_COLORS[k] || '#94a3b8' }))
    const channelSlices = (ga4?.trafficSources || []).map((s, i) => ({ label: s.channel, value: s.sessions, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))

    // Is this drawer for customers or bookings?
    const isCustomerDrawer = drawer?.type?.startsWith('customers')

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '26px' }}>📊</div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Website Analytics</h2>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {lastFetched ? `Last updated ${lastFetched.toLocaleTimeString()}` : 'Loading...'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '4px', padding: '4px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                        {RANGES.map(r => (
                            <button key={r.id} onClick={() => setRange(r.id)}
                                style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, backgroundColor: range === r.id ? 'var(--color-primary)' : 'transparent', color: range === r.id ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => load(range)} disabled={loading}
                        style={{ padding: '7px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
            {!ga4Connected && <GA4Banner />}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: 'var(--text-tertiary)' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading analytics data...
                </div>
            ) : (
                <>
                    {/* ── Traffic ──────────────────────────────────────── */}
                    <SectionTitle>🌐 Web Traffic {!ga4Connected && '— Connect GA4 to unlock'}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        <MetricCard icon={Activity} color="#4285f4" label="Sessions" value={ga4?.traffic?.sessions} na={!ga4Connected} subtitle="Total visits" sparkData={ga4?.dailyTrend} />
                        <MetricCard icon={Users} color="#fbbc04" label="Unique Visitors" value={ga4?.traffic?.users} na={!ga4Connected} subtitle={`${ga4?.traffic?.newUsers?.toLocaleString() ?? '—'} new`} />
                        <MetricCard icon={Eye} color="#34a853" label="Page Views" value={ga4?.traffic?.pageViews} na={!ga4Connected} sparkData={ga4?.dailyTrend?.map(d => ({ count: d.pageViews }))} />
                        <MetricCard icon={MousePointer} color="#ea4335" label="Bounce Rate" value={ga4 ? `${(ga4.traffic.bounceRate * 100).toFixed(1)}%` : undefined} na={!ga4Connected} subtitle="Lower is better" />
                        <MetricCard icon={Clock} color="#9c27b0" label="Avg. Session" value={ga4 ? `${Math.floor((ga4.traffic.avgSessionDuration || 0) / 60)}m ${Math.floor((ga4.traffic.avgSessionDuration || 0) % 60)}s` : undefined} na={!ga4Connected} />
                    </div>

                    {/* ── Bookings ──────────────────────────────────────── */}
                    <SectionTitle>📋 Bookings Funnel</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        <MetricCard icon={Calendar} color="#6366f1" label="Bookings This Period" value={sb?.bookings?.period} change={sb?.bookings?.change} subtitle="vs previous period" sparkData={sb?.bookings?.trend}
                            onClick={() => openDrawer('bookings_period', null, 'Bookings This Period', `${sb?.bookings?.period || 0} bookings in last ${range}`)} />
                        <MetricCard icon={ShoppingCart} color="#10b981" label="Total Bookings" value={sb?.bookings?.total} subtitle="All time"
                            onClick={() => openDrawer('bookings_total', null, 'All Bookings', `${sb?.bookings?.total || 0} bookings total`)} />
                        <MetricCard icon={TrendingUp} color="#10b981" label="Completed" value={sb?.bookings?.byStatus?.completed} subtitle="Jobs done"
                            onClick={() => openDrawer('bookings_status', 'completed', 'Completed Bookings', `${sb?.bookings?.byStatus?.completed || 0} completed jobs`)} />
                        <MetricCard icon={TrendingDown} color="#ef4444" label="Cancelled" value={sb?.bookings?.byStatus?.cancelled || 0} subtitle="Jobs cancelled"
                            onClick={() => openDrawer('bookings_status', 'cancelled', 'Cancelled Bookings', `${sb?.bookings?.byStatus?.cancelled || 0} cancelled jobs`)} />
                        {sb?.bookings?.byStatus?.pending > 0 && (
                            <MetricCard icon={Calendar} color="#f59e0b" label="Pending" value={sb?.bookings?.byStatus?.pending} subtitle="Awaiting confirmation"
                                onClick={() => openDrawer('bookings_status', 'pending', 'Pending Bookings', `${sb?.bookings?.byStatus?.pending || 0} pending jobs`)} />
                        )}
                        {sb?.bookings?.byStatus?.confirmed > 0 && (
                            <MetricCard icon={Calendar} color="#3b82f6" label="Confirmed" value={sb?.bookings?.byStatus?.confirmed} subtitle="Confirmed jobs"
                                onClick={() => openDrawer('bookings_status', 'confirmed', 'Confirmed Bookings', `${sb?.bookings?.byStatus?.confirmed || 0} confirmed jobs`)} />
                        )}
                    </div>

                    {/* Booking status donut + trend */}
                    {statusSlices.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Status Breakdown</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <Donut slices={statusSlices} size={100} />
                                    <div style={{ display: 'grid', gap: '6px' }}>
                                        {statusSlices.map((s, i) => (
                                            <div key={i}
                                                onClick={() => openDrawer('bookings_status', s.label, `${s.label.charAt(0).toUpperCase() + s.label.slice(1)} Bookings`, `${s.value} ${s.label} jobs`)}
                                                style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.backgroundColor = `${s.color}15`}
                                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: s.color, flexShrink: 0 }} />
                                                <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', flex: 1 }}>{s.label}</span>
                                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', paddingLeft: '8px' }}>{s.value}</span>
                                                <ChevronRight size={11} style={{ color: s.color }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Booking Trend</div>
                                {sb?.bookings?.trend?.length > 1
                                    ? <Sparkline data={sb.bookings.trend} color="#6366f1" height={80} width={400} />
                                    : <div style={{ color: 'var(--text-tertiary)', fontSize: '12px', padding: '20px 0' }}>Not enough data for this range</div>}
                            </div>
                        </div>
                    )}

                    {/* ── Customers ─────────────────────────────────────── */}
                    <SectionTitle>👤 Customers</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        <MetricCard icon={Users} color="#06b6d4" label="Total Customers" value={sb?.customers?.total} subtitle="All time"
                            onClick={() => openDrawer('customers_all', null, 'All Customers', `${sb?.customers?.total || 0} customers total`)} />
                        <MetricCard icon={Users} color="#8b5cf6" label="New Customers" value={sb?.customers?.newPeriod} change={sb?.customers?.change} subtitle="This period"
                            onClick={() => openDrawer('customers_new', null, 'New Customers', `${sb?.customers?.newPeriod || 0} new customers in last ${range}`)} />
                    </div>

                    {/* ── Top Services ─────────────────────────────────── */}
                    {sb?.topServices?.length > 0 && (
                        <>
                            <SectionTitle>⭐ Top Services (Booked)</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                                    <BarMini items={sb.topServices} color="#6366f1" width={Math.min(560, sb.topServices.length * 60)} height={90} />
                                    <div style={{ flex: 1, display: 'grid', gap: '8px', minWidth: '200px' }}>
                                        {sb.topServices.map((s, i) => {
                                            const max = sb.topServices[0].count
                                            return (
                                                <div key={i}
                                                    onClick={() => openDrawer('top_service', s.name, `${s.name.replace(/-/g, ' ')} Bookings`, `${s.count} bookings for ${s.name.replace(/-/g, ' ')}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '3px 4px', borderRadius: '4px', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#6366f115'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0, textTransform: 'capitalize' }}>{s.name?.replace(/-/g, ' ')}</span>
                                                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', backgroundColor: '#6366f1', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '28px', textAlign: 'right' }}>{s.count}</span>
                                                    <ChevronRight size={12} style={{ color: '#6366f1' }} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Top Subcategories ─────────────────────────────────── */}
                    {sb?.topSubcategories?.length > 0 && (
                        <>
                            <SectionTitle>⭐ Top Sub-Categories (Booked)</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                                    <BarMini items={sb.topSubcategories} color="#8b5cf6" width={Math.min(560, sb.topSubcategories.length * 60)} height={90} />
                                    <div style={{ flex: 1, display: 'grid', gap: '8px', minWidth: '200px' }}>
                                        {sb.topSubcategories.map((s, i) => {
                                            const max = sb.topSubcategories[0].count
                                            return (
                                                <div key={i}
                                                    onClick={() => openDrawer('top_subcategory', s.name, `${s.name.replace(/-/g, ' ')} Bookings`, `${s.count} bookings for ${s.name.replace(/-/g, ' ')}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '3px 4px', borderRadius: '4px', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#8b5cf615'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0, textTransform: 'capitalize' }}>{s.name?.replace(/-/g, ' ')}</span>
                                                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', backgroundColor: '#8b5cf6', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '28px', textAlign: 'right' }}>{s.count}</span>
                                                    <ChevronRight size={12} style={{ color: '#8b5cf6' }} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Top Issues ─────────────────────────────────── */}
                    {sb?.topIssues?.length > 0 && (
                        <>
                            <SectionTitle>🚨 Top Issues (Booked)</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                                    <BarMini items={sb.topIssues} color="#ef4444" width={Math.min(560, sb.topIssues.length * 60)} height={90} />
                                    <div style={{ flex: 1, display: 'grid', gap: '8px', minWidth: '200px' }}>
                                        {sb.topIssues.map((s, i) => {
                                            const max = sb.topIssues[0].count
                                            return (
                                                <div key={i}
                                                    onClick={() => openDrawer('top_issue', s.name, `${s.name.replace(/-/g, ' ')} Bookings`, `${s.count} bookings for ${s.name.replace(/-/g, ' ')}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '3px 4px', borderRadius: '4px', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#ef444415'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0, textTransform: 'capitalize' }}>{s.name?.replace(/-/g, ' ')}</span>
                                                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', backgroundColor: '#ef4444', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '28px', textAlign: 'right' }}>{s.count}</span>
                                                    <ChevronRight size={12} style={{ color: '#ef4444' }} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Top Pincodes ─────────────────────────────────── */}
                    {sb?.topPincodes?.length > 0 && (
                        <>
                            <SectionTitle>📍 Top Pincodes (Booked)</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                                    <BarMini items={sb.topPincodes} color="#10b981" width={Math.min(560, sb.topPincodes.length * 60)} height={90} />
                                    <div style={{ flex: 1, display: 'grid', gap: '8px', minWidth: '200px' }}>
                                        {sb.topPincodes.map((s, i) => {
                                            const max = sb.topPincodes[0].count
                                            return (
                                                <div key={i}
                                                    onClick={() => openDrawer('top_pincode', s.name, `Pincode ${s.name} Bookings`, `${s.count} bookings for ${s.name}`)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '3px 4px', borderRadius: '4px', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#10b98115'}
                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', flexShrink: 0, fontFamily: 'monospace' }}>{s.name}</span>
                                                    <div style={{ flex: 1, height: '6px', backgroundColor: 'var(--border-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(s.count / max) * 100}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', width: '28px', textAlign: 'right' }}>{s.count}</span>
                                                    <ChevronRight size={12} style={{ color: '#10b981' }} />
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Traffic Sources ───────────────────────────────── */}
                    {ga4Connected && channelSlices.length > 0 && (
                        <>
                            <SectionTitle>📣 Traffic Sources</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <Donut slices={channelSlices} size={140} />
                                <div style={{ display: 'grid', gap: '8px', flex: 1 }}>
                                    {channelSlices.map((s, i) => {
                                        const total = channelSlices.reduce((a, c) => a + c.value, 0)
                                        return (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '3px', backgroundColor: s.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{((s.value / total) * 100).toFixed(1)}%</span>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', width: '50px', textAlign: 'right' }}>{s.value.toLocaleString()}</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── Top Pages ─────────────────────────────────────── */}
                    {ga4Connected && ga4?.topPages?.length > 0 && (
                        <>
                            <SectionTitle>📄 Top Pages</SectionTitle>
                            <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            {['Page Path', 'Sessions', 'Bounce Rate'].map(h => (
                                                <th key={h} style={{ textAlign: h === 'Page Path' ? 'left' : 'right', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ga4.topPages.map((p, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                <td style={{ padding: '8px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.path}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{p.sessions.toLocaleString()}</td>
                                                <td style={{ padding: '8px', textAlign: 'right', color: p.bounceRate > 0.7 ? '#ef4444' : p.bounceRate > 0.4 ? '#f59e0b' : '#10b981' }}>
                                                    {(p.bounceRate * 100).toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── Drill-down Drawer ─────────────────────────────────────── */}
            <Drawer open={!!drawer} title={drawer?.title} subtitle={drawer?.subtitle} onClose={closeDrawer}>
                {drawerLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '30px 0', color: 'var(--text-tertiary)' }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading records...
                    </div>
                ) : isCustomerDrawer
                    ? <CustomerTable rows={drawerRows} />
                    : <BookingTable rows={drawerRows} />
                }
            </Drawer>

            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
