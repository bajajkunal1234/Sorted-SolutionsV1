'use client'

import { useState, useEffect, useCallback } from 'react'
import AutocompleteSearch from '@/components/admin/AutocompleteSearch'
import NewAccountForm from '@/app/admin/components/accounts/NewAccountForm'
import JobDetailModal from '@/app/admin/components/JobDetailModal'
import SalesInvoiceForm from '@/app/admin/components/accounts/SalesInvoiceForm'
import {
    TrendingUp, TrendingDown, Users, Calendar, BarChart2,
    Globe, Loader2, RefreshCw, AlertCircle,
    ShoppingCart, ArrowUp, ArrowDown, Minus,
    Activity, Eye, MousePointer, Clock, X, ChevronRight,
    ArrowLeft, Plus, Trash2, PhoneCall, Check, Link2,
    MessageSquare, DollarSign, CalendarDays, Info, Percent,
    FileText, User, HelpCircle, SlidersHorizontal, Settings,
    ChevronUp, ChevronDown, EyeOff
} from 'lucide-react'

// ─── Status colour map ─────────────────────────────────────────────────────────
const STATUS_COLORS = {
    booking_request: '#f59e0b', 'in-progress': '#8b5cf6',
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
                position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(650px, 95vw)',
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

// ─── Bottom-Sheet Drawer for Mobile Ergonomics ───────────────────────────────
function BottomDrawer({ open, title, subtitle, onClose, children }) {
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
            <div className="bottom-sheet-panel">
                {/* Drag Handle for mobile affordance */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px 0' }}>
                    <div style={{ width: '40px', height: '4px', backgroundColor: 'var(--border-primary)', borderRadius: '2px' }} />
                </div>
                {/* Header */}
                <div style={{ padding: '12px 20px 16px', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{title}</div>
                        {subtitle && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{subtitle}</div>}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--border-primary)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', padding: '6px', display: 'flex' }}>
                        <X size={16} />
                    </button>
                </div>
                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
                    {children}
                </div>
            </div>
            <style>{`
                .bottom-sheet-panel {
                    position: fixed;
                    bottom: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: min(550px, 95vw);
                    max-height: 85vh;
                    background-color: var(--bg-elevated);
                    border: 1px solid var(--border-primary);
                    border-bottom: none;
                    border-radius: 16px 16px 0 0;
                    z-index: 1001;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 -8px 32px rgba(0,0,0,0.25);
                    animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes slideUp {
                    from { transform: translate(-50%, 100%) }
                    to { transform: translate(-50%, 0) }
                }

                @media (max-width: 767px) {
                    .bottom-sheet-panel {
                        left: 0;
                        transform: none;
                        width: 100%;
                        max-height: 90vh;
                        animation: slideUpMobile 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    
                    @keyframes slideUpMobile {
                        from { transform: translateY(100%) }
                        to { transform: translateY(0) }
                    }
                }
            `}</style>
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

// ─── Drill-down table (sessions) ──────────────────────────────────────────────
function SessionTable({ rows, openDrawer }) {
    if (!rows.length) return <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>No records found.</div>
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    {['Visitor', 'Source', 'Views', 'Time'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-primary)', cursor: 'pointer', transition: 'background 0.1s' }} 
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={() => openDrawer('first_party_journey', r.id, 'Visitor Journey', 'Pages visited during session')}>
                        <td style={{ padding: '10px 8px', fontWeight: 600 }}>{r.ip}<br/><span style={{fontSize: '10px', color: 'var(--text-tertiary)'}}>{r.agent}</span></td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{r.source !== '—' ? r.source : r.referrer}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{r.views}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-tertiary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.created}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function JourneyTable({ rows }) {
    if (!rows.length) return <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', padding: '20px 0' }}>No records found.</div>
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
                <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                    {['Time', 'Path', 'Duration'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                        <td style={{ padding: '10px 8px', color: 'var(--text-tertiary)', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.created}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 600, fontFamily: 'monospace' }}>{r.path}</td>
                        <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{r.duration}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

function InlineNotesInput({ initialValue, onSave }) {
    const [value, setValue] = useState(initialValue || '')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setValue(initialValue || '')
    }, [initialValue])

    const handleBlur = async () => {
        if (value === (initialValue || '')) return
        setSaving(true)
        await onSave(value)
        setSaving(false)
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative', minWidth: '160px' }}>
            <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                onBlur={handleBlur}
                placeholder="Reason not converted..."
                style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '12px'
                }}
            />
            {saving && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite', position: 'absolute', right: '8px' }} />}
        </div>
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
    return <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: '2px', marginTop: '16px', marginBottom: '8px' }}>{children}</div>
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WebsiteAnalytics() {
    const [range, setRange] = useState('30d')
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [lastFetched, setLastFetched] = useState(null)

    // Sub-view control
    const [subView, setSubView] = useState('dashboard') // 'dashboard' | 'leads_tracker'
    
    // Customers for manual lead logging
    const [customers, setCustomers] = useState([])
    const [loadingCustomers, setLoadingCustomers] = useState(false)
    const [customerSearchTerm, setCustomerSearchTerm] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState(null)

    // Custom date range states
    const todayYMD = new Date().toISOString().split('T')[0]
    const [customStartDate, setCustomStartDate] = useState(todayYMD)
    const [customEndDate, setCustomEndDate] = useState(todayYMD)

    // Leads Tracker state
    const [leadsData, setLeadsData] = useState(null)
    const [leadsSearch, setLeadsSearch] = useState('')
    const [leadsTab, setLeadsTab] = useState('directory') // 'directory' | 'daily_spend'
    const [isManualLeadDrawerOpen, setIsManualLeadDrawerOpen] = useState(false)
    const [editingLead, setEditingLead] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null) // for journey timeline drawer

    // Columns Configuration (resizable, orderable, toggleable)
    const DEFAULT_COLUMNS = [
        { key: 'date', label: 'Date', visible: true, width: 100 },
        { key: 'details', label: 'Lead Details', visible: true, width: 160 },
        { key: 'source', label: 'Attribution Source', visible: true, width: 140 },
        { key: 'type', label: 'Type', visible: true, width: 80 },
        { key: 'jobs', label: 'Jobs', visible: true, width: 120 },
        { key: 'revenue', label: 'Revenue', visible: true, width: 100 },
        { key: 'notes', label: 'Reason / Notes', visible: true, width: 150 },
        { key: 'actions', label: 'Actions', visible: true, width: 130 }
    ]

    const [columnsConfig, setColumnsConfig] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = window.localStorage.getItem('sorted_leads_columns')
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(p => p.key)) {
                        // Reset if legacy percentage strings exist
                        const hasLegacyFormat = parsed.some(p => typeof p.width === 'string');
                        if (hasLegacyFormat) {
                            window.localStorage.removeItem('sorted_leads_columns');
                            return DEFAULT_COLUMNS;
                        }
                        
                        return DEFAULT_COLUMNS.map(def => {
                            const match = parsed.find(p => p.key === def.key)
                            let width = def.width
                            if (match && match.width) {
                                const parsedWidth = parseFloat(match.width)
                                if (!isNaN(parsedWidth) && typeof match.width === 'number') {
                                    width = match.width
                                }
                            }
                            return match ? { ...def, visible: match.visible, width } : def
                        }).sort((a, b) => {
                            const indexA = parsed.findIndex(p => p.key === a.key)
                            const indexB = parsed.findIndex(p => p.key === b.key)
                            return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB)
                        })
                    }
                } catch (e) {
                    console.error('Failed to parse columns localstorage', e)
                }
            }
        }
        return DEFAULT_COLUMNS
    })

    const saveColumnsConfig = (newConfig) => {
        setColumnsConfig(newConfig)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('sorted_leads_columns', JSON.stringify(newConfig))
        }
    }

    // Sorting & Filtering State
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })
    const [filters, setFilters] = useState({
        status: 'all',        // 'all' | 'interested' | 'converted' | 'junk' | 'lost'
        source: 'all',        // 'all' | 'google_ads' | 'google_organic' | etc.
        type: 'all',          // 'all' | 'call' | 'whatsapp' | 'web_booking' | 'web_enquiry'
        jobStatus: 'all',     // 'all' | 'completed' | 'scheduled' | 'allocated' | etc.
        minRevenue: '',
        maxRevenue: ''
    })

    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
    const [isColumnPanelOpen, setIsColumnPanelOpen] = useState(false)

    const handleHeaderClick = (key) => {
        if (!['date', 'revenue', 'details'].includes(key)) return
        setSortConfig(prev => {
            if (prev.key === key) {
                return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            }
            return { key, direction: 'desc' }
        })
    }

    const moveColumn = (index, direction) => {
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= columnsConfig.length) return
        const updated = [...columnsConfig]
        const temp = updated[index]
        updated[index] = updated[newIndex]
        updated[newIndex] = temp
        saveColumnsConfig(updated)
    }

    const toggleColumnVisibility = (key) => {
        const updated = columnsConfig.map(col => 
            col.key === key ? { ...col, visible: !col.visible } : col
        )
        saveColumnsConfig(updated)
    }

    const startResize = (e, key) => {
        e.preventDefault();
        const startX = e.clientX || (e.touches && e.touches[0].clientX);
        const startWidth = columnsConfig.find(c => c.key === key).width || 120;
        
        const onMouseMove = (moveEvent) => {
            const currentX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
            const deltaX = currentX - startX;
            const newWidth = Math.max(60, startWidth + deltaX);
            
            setColumnsConfig(prev => prev.map(c => 
                c.key === key ? { ...c, width: newWidth } : c
            ));
        };
        
        const onMouseUp = () => {
            setColumnsConfig(curr => {
                saveColumnsConfig(curr);
                return curr;
            });
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('touchmove', onMouseMove);
            document.removeEventListener('touchend', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onMouseMove);
        document.addEventListener('touchend', onMouseUp);
    };
    
    const [dailySpendForm, setDailySpendForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount_spent: '',
        clicks: '',
        impressions: '',
        conversions_recorded: ''
    })
    const [includeGST, setIncludeGST] = useState(true)
    const [dailySpendList, setDailySpendList] = useState([])
    const [dailySpendLoading, setDailySpendLoading] = useState(false)

    const [manualLeadForm, setManualLeadForm] = useState({
        phone: '',
        name: '',
        type: 'call',
        date: new Date().toISOString().slice(0, 16),
        notes: '',
        status: 'interested',
        lead_source: 'auto',
        campaign: ''
    })
    const [manualLeadSubmitting, setManualLeadSubmitting] = useState(false)
    const [manualLeadResult, setManualLeadResult] = useState(null)

    // Drawer state
    const [drawer, setDrawer] = useState(null) // { type, filter, title, subtitle }
    const [drawerRows, setDrawerRows] = useState([])
    const [drawerLoading, setDrawerLoading] = useState(false)

    const [groups, setGroups] = useState([])
    const [showNewAccountForm, setShowNewAccountForm] = useState(false)

    const [selectedJobForModal, setSelectedJobForModal] = useState(null)
    const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState(null)
    const [loadingJobOrInvoice, setLoadingJobOrInvoice] = useState(false)

    const handleOpenJob = async (jobId) => {
        setLoadingJobOrInvoice(true)
        try {
            const res = await fetch(`/api/admin/jobs`)
            const json = await res.json()
            if (json.success && json.data) {
                const foundJob = json.data.find(j => j.id === jobId)
                if (foundJob) {
                    setSelectedJobForModal(foundJob)
                } else {
                    alert('Job not found')
                }
            } else {
                alert('Failed to load job details')
            }
        } catch (err) {
            console.error(err)
            alert('Error loading job details')
        } finally {
            setLoadingJobOrInvoice(false)
        }
    }

    const handleOpenInvoice = async (jobId) => {
        setLoadingJobOrInvoice(true)
        try {
            const res = await fetch(`/api/admin/transactions?type=sales&job_id=${jobId}`)
            const json = await res.json()
            if (json.success && json.data && json.data.length > 0) {
                setSelectedInvoiceForModal(json.data[0])
            } else {
                alert('Invoice not found for this job')
            }
        } catch (err) {
            console.error(err)
            alert('Error loading invoice details')
        } finally {
            setLoadingJobOrInvoice(false)
        }
    }

    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/admin/account-groups')
            const json = await res.json()
            if (json.success || json.data) {
                setGroups(json.data || [])
            }
        } catch (e) {
            console.error('Failed to fetch account groups:', e)
        }
    }

    const fetchCustomers = async () => {
        setLoadingCustomers(true)
        try {
            const res = await fetch('/api/admin/accounts?purpose=dropdown&type=customer')
            const json = await res.json()
            if (json.success || json.data) {
                const list = json.data || json.customers || []
                const customersOnly = list.filter(a =>
                    a.type === 'customer' ||
                    (a.under || '').toLowerCase().includes('customer') ||
                    (a.under || '').toLowerCase().includes('debtor')
                )
                setCustomers(customersOnly)
            }
        } catch (e) {
            console.error('Failed to fetch customers:', e)
        } finally {
            setLoadingCustomers(false)
        }
    }

    useEffect(() => {
        fetchCustomers()
        fetchGroups()
    }, [])

    const load = async (r = range, start = customStartDate, end = customEndDate) => {
        setLoading(true); setError('')
        try {
            const [analyticsRes, leadsRes] = await Promise.all([
                fetch(`/api/analytics?range=${r}&start=${start}&end=${end}&_t=${Date.now()}`, { cache: 'no-store' }),
                fetch(`/api/admin/leads?range=${r}&start=${start}&end=${end}&_t=${Date.now()}`, { cache: 'no-store' })
            ])
            
            const analyticsJson = await analyticsRes.json()
            const leadsJson = await leadsRes.json()
            
            if (!analyticsJson.success) throw new Error(analyticsJson.error || 'Failed to load analytics')
            if (!leadsJson.success) throw new Error(leadsJson.error || 'Failed to load leads')
            
            setData(analyticsJson)
            setLeadsData(leadsJson)
            setLastFetched(new Date())
        } catch (e) { setError(e.message) }
        finally { setLoading(false) }
    }

    const loadDailySpends = async () => {
        setDailySpendLoading(true)
        try {
            const res = await fetch('/api/admin/google-ads/metrics')
            const json = await res.json()
            if (json.success) {
                setDailySpendList(json.data || [])
            }
        } catch (e) {
            console.error('Failed to load daily spends:', e)
        } finally {
            setDailySpendLoading(false)
        }
    }

    useEffect(() => {
        if (range !== 'custom') {
            load(range)
        }
    }, [range])

    useEffect(() => {
        if (leadsTab === 'daily_spend') {
            loadDailySpends()
        }
    }, [leadsTab])

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

    // Daily Spend submit
    const handleSaveSpend = async (e) => {
        e.preventDefault()
        try {
            const finalForm = {
                ...dailySpendForm,
                amount_spent: includeGST
                    ? (parseFloat(dailySpendForm.amount_spent) * 1.18).toFixed(2)
                    : dailySpendForm.amount_spent
            }
            const res = await fetch('/api/admin/google-ads/metrics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalForm)
            })
            const json = await res.json()
            if (json.success) {
                loadDailySpends()
                load(range) // refresh aggregates
                setDailySpendForm(prev => ({
                    ...prev,
                    amount_spent: '',
                    clicks: '',
                    impressions: '',
                    conversions_recorded: ''
                }))
            } else {
                alert(json.error || 'Failed to save spend metrics')
            }
        } catch (err) {
            console.error(err)
            alert('Server error saving spend metrics')
        }
    }

    // Daily Spend delete
    const handleDeleteSpend = async (date) => {
        if (!confirm(`Delete Google Ads metrics for ${date}?`)) return
        try {
            const res = await fetch(`/api/admin/google-ads/metrics?date=${date}`, {
                method: 'DELETE'
            })
            const json = await res.json()
            if (json.success) {
                loadDailySpends()
                load(range) // refresh aggregates
            }
        } catch (err) {
            console.error(err)
        }
    }

    // Manual lead save
    const handleSaveManualLead = async (e) => {
        e.preventDefault()
        setManualLeadSubmitting(true)
        setManualLeadResult(null)
        try {
            const isEdit = !!editingLead;
            const res = await fetch('/api/admin/leads', {
                method: isEdit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isEdit ? {
                    phone: manualLeadForm.phone,
                    name: manualLeadForm.name,
                    conversion_type: manualLeadForm.type === 'whatsapp' ? 'manual_whatsapp' : 'manual_call',
                    first_contact_at: manualLeadForm.date,
                    notes: manualLeadForm.notes,
                    status: manualLeadForm.status,
                    lead_source: manualLeadForm.lead_source,
                    campaign: manualLeadForm.campaign
                } : manualLeadForm)
            })
            const json = await res.json()
            if (json.success) {
                setManualLeadResult({
                    success: true,
                    lead: isEdit ? json.data : json.lead,
                    alreadyExisted: isEdit ? false : json.alreadyExisted,
                    matchedSession: isEdit ? null : json.matchedSession
                })
                load(range) // refresh directory
                setManualLeadForm({
                    phone: '',
                    name: '',
                    type: 'call',
                    date: new Date().toISOString().slice(0, 16),
                    notes: '',
                    status: 'interested',
                    lead_source: 'auto',
                    campaign: ''
                })
                setSelectedCustomer(null)
                setCustomerSearchTerm('')
                setEditingLead(null)
                
                setTimeout(() => {
                    setIsManualLeadDrawerOpen(false)
                    setManualLeadResult(null)
                }, 1000)
            } else {
                setManualLeadResult({
                    success: false,
                    error: json.error || 'Failed to save lead log'
                })
            }
        } catch (err) {
            setManualLeadResult({
                success: false,
                error: err.message || 'Server error saving lead log'
            })
        } finally {
            setManualLeadSubmitting(false)
        }
    }

    const handleStartEditLead = (l) => {
        setEditingLead(l);
        
        // Parse date for input datetime-local format (YYYY-MM-DDTHH:mm)
        const localDateStr = new Date(l.first_contact_at);
        const offset = localDateStr.getTimezoneOffset();
        const adjustedDate = new Date(localDateStr.getTime() - (offset * 60 * 1000));
        const dateVal = adjustedDate.toISOString().slice(0, 16);

        setManualLeadForm({
            phone: l.phone,
            name: l.name || '',
            type: l.conversion_type === 'manual_whatsapp' ? 'whatsapp' : 'call',
            date: dateVal,
            notes: l.notes || '',
            status: l.status || 'interested',
            lead_source: l.lead_source || 'auto',
            campaign: l.campaign || ''
        });

        setCustomerSearchTerm(l.name ? `${l.name} - ${l.phone}` : l.phone);
        setSelectedCustomer({ name: l.name, phone: l.phone });
        setIsManualLeadDrawerOpen(true);
    }

    const handleNewAccountSave = async (accountData) => {
        try {
            const res = await fetch('/api/admin/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accountData)
            })
            const json = await res.json()
            if (json.success && json.data) {
                // Refresh customer list
                await fetchCustomers()
                
                // Select the newly created customer
                const newAcc = json.data
                setSelectedCustomer(newAcc)
                setCustomerSearchTerm(`${newAcc.name} ${newAcc.mobile ? `- ${newAcc.mobile}` : ''}`)
                setManualLeadForm(prev => ({
                    ...prev,
                    phone: newAcc.mobile || '',
                    name: newAcc.name
                }))
            } else {
                throw new Error(json.error || 'Failed to save account')
            }
        } catch (err) {
            alert('Failed to create account: ' + err.message)
        }
        setShowNewAccountForm(false)
    }

    // Lead status update
    const handleUpdateLeadStatus = async (phone, status) => {
        // Optimistic update
        setLeadsData(prev => {
            if (!prev || !prev.leads) return prev;
            return {
                ...prev,
                leads: prev.leads.map(l => l.phone === phone ? { ...l, status } : l)
            };
        });
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, status })
            })
            const json = await res.json()
            if (json.success) {
                load(range)
            } else {
                load(range)
            }
        } catch (err) {
            console.error(err)
            load(range)
        }
    }

    // Lead notes update
    const handleUpdateLeadNotes = async (phone, notes) => {
        // Optimistic update
        setLeadsData(prev => {
            if (!prev || !prev.leads) return prev;
            return {
                ...prev,
                leads: prev.leads.map(l => l.phone === phone ? { ...l, notes } : l)
            };
        });
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, notes })
            })
            const json = await res.json()
            if (json.success) {
                load(range)
            } else {
                load(range)
            }
        } catch (err) {
            console.error(err)
            load(range)
        }
    }

    // Lead source update
    const handleUpdateLeadSource = async (phone, lead_source) => {
        // Optimistic update
        setLeadsData(prev => {
            if (!prev || !prev.leads) return prev;
            return {
                ...prev,
                leads: prev.leads.map(l => l.phone === phone ? { ...l, lead_source } : l)
            };
        });
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, lead_source })
            })
            const json = await res.json()
            if (json.success) {
                load(range)
            } else {
                load(range)
            }
        } catch (err) {
            console.error(err)
            load(range)
        }
    }

    // Lead campaign update
    const handleUpdateLeadCampaign = async (phone, campaign) => {
        // Optimistic update
        setLeadsData(prev => {
            if (!prev || !prev.leads) return prev;
            return {
                ...prev,
                leads: prev.leads.map(l => l.phone === phone ? { ...l, campaign } : l)
            };
        });
        try {
            const res = await fetch('/api/admin/leads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, campaign })
            })
            const json = await res.json()
            if (json.success) {
                load(range)
            } else {
                load(range)
            }
        } catch (err) {
            console.error(err)
            load(range)
        }
    }

    // Export leads directory to CSV
    const exportToCSV = () => {
        const leads = leadsData?.leads || []
        if (leads.length === 0) {
            alert('No leads to export')
            return
        }
        
        const headers = ['Date', 'Name', 'Phone', 'Source', 'Campaign', 'GCLID', 'Type', 'Status', 'Jobs', 'Revenue', 'Reason/Notes']
        
        const csvRows = [
            headers.join(','),
            ...leads.map(l => {
                const row = [
                    new Date(l.first_contact_at).toLocaleString('en-IN'),
                    l.name || l.customer?.name || 'Anonymous Visitor',
                    l.phone,
                    l.lead_source,
                    l.campaign || '',
                    l.gclid || '',
                    l.conversion_type || '',
                    l.status,
                    l.jobsCount || 0,
                    l.totalRevenue || 0,
                    (l.notes || '').replace(/"/g, '""')
                ]
                return row.map(val => `"${String(val).replace(/\r?\n/g, ' ')}"`).join(',')
            })
        ]
        
        const csvString = csvRows.join('\r\n')
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `leads_export_${range}_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const sb = data?.supabase
    const fp = data?.firstParty
    const ga4 = data?.ga4
    const ga4Connected = data?.ga4Connected

    // GA4 Slices
    const channelSlices = (ga4?.trafficSources || []).map((s, i) => ({ label: s.channel, value: s.sessions, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))
    const deviceSlices = (ga4?.deviceCategories || []).map((s, i) => ({ label: s.device, value: s.sessions, color: ['#8b5cf6', '#06b6d4', '#f59e0b'][i % 3] }))
    const userTypeSlices = (ga4?.userTypes || []).map((s, i) => ({ label: s.type, value: s.users, color: ['#10b981', '#6366f1'][i % 2] }))

    // Booking status donut slices
    const statusSlices = Object.entries(sb?.bookings?.byStatus || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ label: k, value: v, color: STATUS_COLORS[k] || '#94a3b8' }))

    // Lead attributes search filtering
    const allLeads = leadsData?.leads || []
    const filteredLeads = allLeads.filter(l => {
        const query = leadsSearch.toLowerCase()
        const matchesSearch = (
            l.phone.includes(query) ||
            l.name?.toLowerCase().includes(query) ||
            l.lead_source.toLowerCase().includes(query) ||
            (l.campaign && l.campaign.toLowerCase().includes(query))
        )
        if (!matchesSearch) return false

        // Status filter
        if (filters.status !== 'all' && l.status !== filters.status) return false

        // Attribution Source filter
        if (filters.source !== 'all' && l.lead_source !== filters.source) return false

        // Conversion Type filter
        if (filters.type !== 'all') {
            const cleanType = filters.type.startsWith('manual_') ? filters.type : `manual_${filters.type}`
            if (l.conversion_type !== filters.type && l.conversion_type !== cleanType) {
                if (filters.type === 'call') {
                    if (l.conversion_type !== 'manual_call' && l.conversion_type !== 'web_call') return false
                } else if (filters.type === 'whatsapp') {
                    if (l.conversion_type !== 'manual_whatsapp' && l.conversion_type !== 'web_whatsapp') return false
                } else {
                    return false
                }
            }
        }

        // Job Status filter
        if (filters.jobStatus !== 'all') {
            const hasJobWithStatus = l.jobs && l.jobs.some(j => j.status === filters.jobStatus)
            if (!hasJobWithStatus) return false
        }

        // Revenue range filter
        if (filters.minRevenue && (l.totalRevenue || 0) < parseFloat(filters.minRevenue)) return false
        if (filters.maxRevenue && (l.totalRevenue || 0) > parseFloat(filters.maxRevenue)) return false

        return true
    })

    const sortedLeads = [...filteredLeads].sort((a, b) => {
        let valA, valB;
        if (sortConfig.key === 'date') {
            valA = new Date(a.first_contact_at).getTime()
            valB = new Date(b.first_contact_at).getTime()
        } else if (sortConfig.key === 'revenue') {
            valA = a.totalRevenue || 0
            valB = b.totalRevenue || 0
        } else if (sortConfig.key === 'details') {
            valA = (a.name || a.customer?.name || '').toLowerCase()
            valB = (b.name || b.customer?.name || '').toLowerCase()
        } else {
            return 0
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
    })

    const leadsSummary = leadsData?.summary

    // Is this drawer for customers or bookings?
    const isCustomerDrawer = drawer?.type?.startsWith('customers')
    const ResponsiveDrawer = isMobile ? BottomDrawer : Drawer

    return (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>

            {/* ─── HEADER ────────────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {subView !== 'dashboard' ? (
                        <button onClick={() => setSubView('dashboard')} style={{ background: 'none', border: '1px solid var(--border-primary)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 'var(--radius-md)', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                            <ArrowLeft size={14} /> Back
                        </button>
                    ) : (
                        <div style={{ fontSize: '26px' }}>📊</div>
                    )}
                    <div>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {subView === 'leads_tracker' ? 'Google Ads Leads & ROI Tracker' : 'Website Analytics'}
                        </h2>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {lastFetched ? `Last updated ${lastFetched.toLocaleTimeString()}` : 'Loading...'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {range === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>From</span>
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={e => setCustomStartDate(e.target.value)}
                                    style={{
                                        padding: '4px 6px',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>To</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={e => setCustomEndDate(e.target.value)}
                                    style={{
                                        padding: '4px 6px',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-primary)',
                                        color: 'var(--text-primary)',
                                        fontSize: '12px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => load('custom', customStartDate, customEndDate)}
                                disabled={loading}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    )}
                    <select
                        value={range}
                        onChange={e => setRange(e.target.value)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="all">All Time</option>
                        <option value="custom">Custom Range</option>
                    </select>
                    <button onClick={() => load(range)} disabled={loading}
                        style={{ padding: '7px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                </div>
            </div>

            {error && <div style={{ padding: '12px', backgroundColor: '#ef444415', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '13px' }}>{error}</div>}

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px', color: 'var(--text-tertiary)' }}>
                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Loading analytics data...
                </div>
            ) : subView === 'leads_tracker' ? (
                
                // ─── LEADS TRACKER SUB-VIEW ───────────────────────────────────────────
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    


                    {/* Leads sub-tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', gap: '16px' }}>
                        {['directory', 'daily_spend'].map(t => (
                            <button
                                key={t}
                                onClick={() => setLeadsTab(t)}
                                style={{
                                    padding: '10px 4px',
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderBottom: leadsTab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                                    color: leadsTab === t ? 'var(--color-primary)' : 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                {t === 'directory' ? 'Leads Directory' : 'Google Ads Spends'}
                            </button>
                        ))}
                    </div>

                    {/* TAB Content: Directory */}
                    {leadsTab === 'directory' && (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: isMobile ? '6px' : '8px', position: 'relative', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
                                <input
                                    type="text"
                                    placeholder="Search by name, phone or campaign..."
                                    value={leadsSearch}
                                    onChange={e => setLeadsSearch(e.target.value)}
                                    style={{
                                        flex: 1, minWidth: isMobile ? '100%' : '200px', padding: isMobile ? '8px 12px' : '10px 14px', border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)',
                                        borderRadius: 'var(--radius-md)', fontSize: isMobile ? '12px' : '13px'
                                    }}
                                />
                                <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
                                    <button
                                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: isMobile ? '32px' : '38px',
                                            padding: isMobile ? '0 10px' : '0 10px',
                                            flex: isMobile ? 1 : 'none',
                                            gap: '6px',
                                            border: isFilterPanelOpen ? '1px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                            backgroundColor: isFilterPanelOpen ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-elevated)',
                                            color: isFilterPanelOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            fontSize: isMobile ? '11px' : '12px',
                                            fontWeight: 600
                                        }}
                                        title="Filter Leads"
                                    >
                                        <SlidersHorizontal size={12} />
                                        {isMobile && <span>Filters</span>}
                                    </button>
                                    
                                    {!isMobile && (
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={() => setIsColumnPanelOpen(!isColumnPanelOpen)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    height: '38px',
                                                    width: '38px',
                                                    border: isColumnPanelOpen ? '1px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                    backgroundColor: isColumnPanelOpen ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-elevated)',
                                                    color: isColumnPanelOpen ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                                title="Manage Columns"
                                            >
                                                <Settings size={14} />
                                            </button>
                                            {isColumnPanelOpen && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '44px',
                                                    right: '0px',
                                                    width: '240px',
                                                    backgroundColor: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-lg)',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    padding: '12px',
                                                    zIndex: 100,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span>Manage Columns</span>
                                                        <button onClick={() => setIsColumnPanelOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}><X size={12} /></button>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                                                        {columnsConfig.map((col, idx) => (
                                                            <div key={col.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={col.visible} 
                                                                        onChange={() => toggleColumnVisibility(col.key)} 
                                                                        disabled={col.key === 'actions'}
                                                                        style={{ cursor: 'pointer' }}
                                                                    />
                                                                    {col.label}
                                                                </label>
                                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                                    <button 
                                                                        onClick={() => moveColumn(idx, -1)} 
                                                                        disabled={idx === 0}
                                                                        style={{ padding: '2px 4px', border: '1px solid var(--border-primary)', borderRadius: '3px', backgroundColor: 'var(--bg-secondary)', cursor: idx === 0 ? 'not-allowed' : 'pointer', color: 'var(--t                                    <button
                                        onClick={exportToCSV}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: isMobile ? '32px' : '38px',
                                            padding: '0 10px',
                                            flex: isMobile ? 1 : 'none',
                                            gap: '6px',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-elevated)',
                                            color: 'var(--text-secondary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: isMobile ? '11px' : '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <FileText size={12} />
                                        {isMobile ? <span>Export</span> : <span>Export CSV</span>}
                                    </button>
                                    
                                    <button
                                        onClick={() => setIsManualLeadDrawerOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: isMobile ? '32px' : '38px',
                                            padding: '0 10px',
                                            flex: isMobile ? 1.2 : 'none',
                                            gap: '6px',
                                            border: 'none',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: isMobile ? '11px' : '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={12} />
                                        <span>Report Lead</span>
                                    </button>ontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <FileText size={14} />
                                        {isMobile ? <span>Export</span> : <span>Export CSV</span>}
                                    </button>
                                    
                                    <button
                                        onClick={() => setIsManualLeadDrawerOpen(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '38px',
                                            padding: '0 12px',
                                            flex: isMobile ? 1.2 : 'none',
                                            gap: '6px',
                                            border: 'none',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>Report Lead</span>
                                    </button>
                                </div>
                            </div>

                            {isFilterPanelOpen && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                    gap: '12px',
                                    padding: '14px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: '12px',
                                    animation: 'fadeIn 0.15s'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                                        <select 
                                            value={filters.status} 
                                            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="interested">Interested</option>
                                            <option value="converted">Converted</option>
                                            <option value="junk">Junk / Spam</option>
                                            <option value="lost">Lost</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Source</label>
                                        <select 
                                            value={filters.source} 
                                            onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="all">All Sources</option>
                                            <option value="google_ads">Google Ads</option>
                                            <option value="google_organic">Google Search (Organic)</option>
                                            <option value="referral">Referral / Word of Mouth</option>
                                            <option value="direct">Direct / Offline</option>
                                            <option value="social">Social Media</option>
                                            <option value="website">Website (Organic)</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Conversion Type</label>
                                        <select 
                                            value={filters.type} 
                                            onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="all">All Channels</option>
                                            <option value="web_booking">Website Bookings</option>
                                            <option value="web_enquiry">Website Enquiries</option>
                                            <option value="call">Phone Calls</option>
                                            <option value="whatsapp">WhatsApp Messages</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Job Status</label>
                                        <select 
                                            value={filters.jobStatus} 
                                            onChange={e => setFilters(f => ({ ...f, jobStatus: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="all">All Job Statuses</option>
                                            <option value="new">New / Request</option>
                                            <option value="allocated">Allocated</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Min Revenue (₹)</label>
                                        <input 
                                            type="number" 
                                            placeholder="Min" 
                                            value={filters.minRevenue}
                                            onChange={e => setFilters(f => ({ ...f, minRevenue: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <label style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Max Revenue (₹)</label>
                                        <input 
                                            type="number" 
                                            placeholder="Max" 
                                            value={filters.maxRevenue}
                                            onChange={e => setFilters(f => ({ ...f, maxRevenue: e.target.value }))}
                                            style={{ padding: '6px 8px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                                        <button 
                                            onClick={() => setFilters({ status: 'all', source: 'all', type: 'all', jobStatus: 'all', minRevenue: '', maxRevenue: '' })}
                                            style={{ padding: '6px 12px', border: '1px solid var(--border-primary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                                        >
                                            Reset Filters
                                        </button>
                                    </div>
                                </div>
                            )}

                            {isMobile ? (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {sortedLeads.map((l) => (
                                        <div key={l.id} style={{
                                            padding: '10px 12px',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'grid',
                                            gap: '6px'
                                        }}>
                                            {/* Header: Date, Time & Source/Conversion Badges */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                    {new Date(l.first_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(l.first_contact_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <span style={{
                                                        fontSize: '9px',
                                                        fontWeight: 700,
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        backgroundColor: l.lead_source === 'google_ads' ? '#ea433515' : 'var(--bg-secondary)',
                                                        color: l.lead_source === 'google_ads' ? '#ea4335' : 'var(--text-secondary)',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {l.lead_source?.replace(/_/g, ' ') || 'direct'}
                                                    </span>
                                                    {l.conversion_type && (
                                                        <span style={{
                                                            fontSize: '9px',
                                                            fontWeight: 600,
                                                            padding: '2px 6px',
                                                            borderRadius: '10px',
                                                            backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                                            color: 'var(--color-primary)',
                                                            textTransform: 'capitalize'
                                                        }}>
                                                            {l.conversion_type?.replace(/_/g, ' ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Lead Info: Name & Phone (Inline) */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '4px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    {l.name || l.customer?.name || 'Anonymous Visitor'}
                                                </div>
                                                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {l.phone}
                                                </div>
                                            </div>

                                            {/* Campaign & UTM Info if Google Ads */}
                                            {l.lead_source === 'google_ads' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Campaign:</span>
                                                    <input
                                                        type="text"
                                                        defaultValue={l.campaign || ''}
                                                        placeholder="None"
                                                        onBlur={e => handleUpdateLeadCampaign(l.phone, e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') e.target.blur();
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            fontSize: '11px',
                                                            padding: '2px 4px',
                                                            backgroundColor: 'transparent',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: '3px',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Jobs & Revenue (Compact Inline Row) */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', borderTop: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)', padding: '5px 0' }}>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Jobs:</span>
                                                    <span style={{ color: 'var(--text-primary)' }}>
                                                        {l.jobsCount > 0 && l.jobs ? (
                                                            <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                                {l.jobs.map((j) => (
                                                                    <span
                                                                        key={j.id}
                                                                        onClick={() => handleOpenJob(j.id)}
                                                                        style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                                                                    >
                                                                        {j.jobNumber || `#${j.id.slice(0, 4)}`}
                                                                    </span>
                                                                ))}
                                                            </span>
                                                        ) : 'None'}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600 }}>Rev:</span>
                                                    <span style={{ fontWeight: 700, color: '#10b981' }}>
                                                        {l.totalRevenue > 0 ? `₹${l.totalRevenue.toLocaleString()}` : '₹0'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Notes / Reason (Smart Inline Hidden) */}
                                            {!(l.jobsCount > 0 || l.status === 'converted') ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, flexShrink: 0 }}>Notes:</span>
                                                    <div style={{ flex: 1 }}>
                                                        <InlineNotesInput
                                                            initialValue={l.notes}
                                                            onSave={(newVal) => handleUpdateLeadNotes(l.phone, newVal)}
                                                        />
                                                    </div>
                                                </div>
                                            ) : l.notes && l.notes !== '—' ? (
                                                <div style={{ fontSize: '11px', display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                                                    <span style={{ color: 'var(--text-tertiary)', fontWeight: 600, flexShrink: 0 }}>Notes:</span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{l.notes}</span>
                                                </div>
                                            ) : null}

                                            {/* Actions (Journey Flow / Edit Float Right) */}
                                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                                                <button
                                                    onClick={() => setSelectedLead(l)}
                                                    style={{
                                                        padding: '4px 8px', border: '1px solid var(--border-primary)',
                                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                                        borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                                    }}
                                                >
                                                    Journey Flow
                                                </button>
                                                {l.conversion_type?.startsWith('manual_') && (
                                                    <button
                                                        onClick={() => handleStartEditLead(l)}
                                                        style={{
                                                            padding: '4px 8px', border: '1px solid var(--border-primary)',
                                                            backgroundColor: 'var(--bg-secondary)', color: 'var(--color-primary)',
                                                            borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {sortedLeads.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>No leads found.</div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-elevated)' }}>
                                    <table id="leads-directory-table" style={{ width: `${columnsConfig.filter(col => col.visible).reduce((sum, c) => sum + (c.width || 120), 0)}px`, minWidth: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', tableLayout: 'fixed' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                {columnsConfig.filter(col => col.visible).map(col => {
                                                    const isActions = col.key === 'actions';
                                                    return (
                                                        <th key={col.key} style={{
                                                            padding: '12px 16px',
                                                            color: 'var(--text-tertiary)',
                                                            fontWeight: 600,
                                                            fontSize: '11px',
                                                            textTransform: 'uppercase',
                                                            position: 'sticky',
                                                            top: 0,
                                                            right: isActions ? 0 : undefined,
                                                            zIndex: isActions ? 15 : 10,
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            boxShadow: isActions 
                                                                ? 'inset 1px 0 0 var(--border-primary), inset 0 -1px 0 var(--border-primary)' 
                                                                : 'inset 0 -1px 0 var(--border-primary)',
                                                            width: `${col.width}px`,
                                                            minWidth: `${col.width}px`,
                                                            cursor: ['date', 'revenue', 'details'].includes(col.key) ? 'pointer' : 'default',
                                                            userSelect: 'none'
                                                        }}
                                                        onClick={() => handleHeaderClick(col.key)}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {col.label}
                                                                {sortConfig.key === col.key && (
                                                                    sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
                                                                )}
                                                            </div>
                                                            <div 
                                                                onMouseDown={(e) => startResize(e, col.key)}
                                                                onTouchStart={(e) => startResize(e, col.key)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    width: '6px',
                                                                    cursor: 'col-resize',
                                                                    zIndex: 20
                                                                }}
                                                            />
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedLeads.map((l) => (
                                                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                    {columnsConfig.filter(col => col.visible).map(col => {
                                                        const isActions = col.key === 'actions';
                                                        const cellStyle = {
                                                            padding: '12px 16px',
                                                            width: `${col.width}px`,
                                                            minWidth: `${col.width}px`,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: ['date', 'details', 'type', 'notes'].includes(col.key) ? 'nowrap' : 'normal',
                                                            position: isActions ? 'sticky' : undefined,
                                                            right: isActions ? 0 : undefined,
                                                            zIndex: isActions ? 9 : undefined,
                                                            backgroundColor: isActions ? 'var(--bg-elevated)' : undefined,
                                                            boxShadow: isActions ? 'inset 1px 0 0 var(--border-primary)' : undefined
                                                        };
                                                        switch (col.key) {
                                                            case 'date':
                                                                return (
                                                                    <td key="date" style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                                                                        {new Date(l.first_contact_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}<br/>
                                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{new Date(l.first_contact_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </td>
                                                                )
                                                            case 'details':
                                                                return (
                                                                    <td key="details" style={cellStyle}>
                                                                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{l.name || l.customer?.name || 'Anonymous Visitor'}</span><br/>
                                                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{l.phone}</span>
                                                                    </td>
                                                                )
                                                            case 'source':
                                                                return (
                                                                    <td key="source" style={cellStyle}>
                                                                        <select
                                                                            value={l.lead_source || 'direct'}
                                                                            onChange={e => handleUpdateLeadSource(l.phone, e.target.value)}
                                                                            style={{
                                                                                padding: '4px 8px', borderRadius: '4px',
                                                                                backgroundColor: l.lead_source === 'google_ads' ? '#ea433515' : 'var(--bg-secondary)',
                                                                                color: l.lead_source === 'google_ads' ? '#ea4335' : 'var(--text-primary)',
                                                                                border: '1px solid var(--border-primary)', fontSize: '11px', fontWeight: 600,
                                                                                cursor: 'pointer', maxWidth: '100%'
                                                                            }}
                                                                        >
                                                                            <option value="google_ads">Google Ads</option>
                                                                            <option value="google_organic">Google Search (Organic)</option>
                                                                            <option value="referral">Referral / Word of Mouth</option>
                                                                            <option value="direct">Direct / Offline</option>
                                                                            <option value="social">Social Media</option>
                                                                            <option value="website">Website (Organic)</option>
                                                                        </select>
                                                                        {l.lead_source === 'google_ads' ? (
                                                                            <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>Camp:</span>
                                                                                <input
                                                                                    type="text"
                                                                                    defaultValue={l.campaign || ''}
                                                                                    placeholder="None"
                                                                                    onBlur={e => handleUpdateLeadCampaign(l.phone, e.target.value)}
                                                                                    onKeyDown={e => {
                                                                                        if (e.key === 'Enter') {
                                                                                            e.target.blur();
                                                                                        }
                                                                                    }}
                                                                                    style={{
                                                                                        width: '80px',
                                                                                        fontSize: '10px',
                                                                                        padding: '2px 4px',
                                                                                        backgroundColor: 'transparent',
                                                                                        border: '1px solid var(--border-primary)',
                                                                                        borderRadius: '3px',
                                                                                        color: 'var(--text-primary)'
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        ) : (
                                                                            l.campaign && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Camp: {l.campaign}</div>
                                                                        )}
                                                                    </td>
                                                                )
                                                            case 'type':
                                                                return (
                                                                    <td key="type" style={{ ...cellStyle, color: 'var(--text-secondary)' }}>
                                                                        {l.conversion_type?.replace(/_/g, ' ') || '—'}
                                                                    </td>
                                                                )
                                                            case 'jobs':
                                                                return (
                                                                    <td key="jobs" style={cellStyle}>
                                                                        {l.jobsCount > 0 && l.jobs ? (
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                                                                {l.jobs.map((j, idx) => (
                                                                                    <span key={j.id}>
                                                                                        <span 
                                                                                            onClick={() => handleOpenJob(j.id)}
                                                                                            style={{ color: '#6366f1', cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap' }}
                                                                                            title={`Open Job ${j.jobNumber || `#${j.id}`}`}
                                                                                        >
                                                                                            {j.jobNumber || `#${j.id}`}{j.status && ` (${j.status.toLowerCase()})`}
                                                                                        </span>
                                                                                        {idx < l.jobs.length - 1 && <span style={{ color: 'var(--text-tertiary)', marginRight: '2px' }}>, </span>}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        ) : '—'}
                                                                    </td>
                                                                )
                                                            case 'revenue':
                                                                return (
                                                                    <td key="revenue" style={{ ...cellStyle, color: '#10b981' }}>
                                                                        {l.totalRevenue > 0 && l.jobs ? (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                {l.jobs.filter(j => j.revenue > 0).length === 1 ? (
                                                                                    <span 
                                                                                        onClick={() => handleOpenInvoice(l.jobs.find(j => j.revenue > 0).id)}
                                                                                        style={{ color: '#10b981', cursor: 'pointer', textDecoration: 'underline' }}
                                                                                    >
                                                                                        ₹{l.totalRevenue.toLocaleString()}
                                                                                    </span>
                                                                                ) : (
                                                                                    <>
                                                                                        <span>₹{l.totalRevenue.toLocaleString()}</span>
                                                                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                                                            <span>(</span>
                                                                                            {l.jobs.filter(j => j.revenue > 0).map((j, idx, arr) => (
                                                                                                <span key={j.id}>
                                                                                                    <span 
                                                                                                        onClick={() => handleOpenInvoice(j.id)}
                                                                                                        style={{ textDecoration: 'underline', cursor: 'pointer', color: '#10b981' }}
                                                                                                        title={`Open Invoice for Job ${j.jobNumber || `#${j.id}`}`}
                                                                                                    >
                                                                                                        ₹{j.revenue.toLocaleString()}
                                                                                                    </span>
                                                                                                    {idx < arr.length - 1 && <span> + </span>}
                                                                                                </span>
                                                                                            ))}
                                                                                            <span>)</span>
                                                                                        </div>
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        ) : l.totalRevenue > 0 ? (
                                                                            <span>₹{l.totalRevenue.toLocaleString()}</span>
                                                                        ) : '—'}
                                                                    </td>
                                                                )
                                                            case 'notes':
                                                                return (
                                                                    <td key="notes" style={cellStyle}>
                                                                        {l.jobsCount > 0 || l.status === 'converted' ? (
                                                                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                                                                                {l.notes || '—'}
                                                                            </span>
                                                                        ) : (
                                                                            <InlineNotesInput
                                                                                initialValue={l.notes}
                                                                                onSave={(newVal) => handleUpdateLeadNotes(l.phone, newVal)}
                                                                            />
                                                                        )}
                                                                    </td>
                                                                )
                                                            case 'actions':
                                                                return (
                                                                    <td key="actions" style={cellStyle}>
                                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                                            <button
                                                                                onClick={() => setSelectedLead(l)}
                                                                                style={{
                                                                                    padding: '6px 10px', border: '1px solid var(--border-primary)',
                                                                                    backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)',
                                                                                    borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                                                                }}
                                                                            >
                                                                                Journey Flow
                                                                            </button>
                                                                            {l.conversion_type?.startsWith('manual_') && (
                                                                                <button
                                                                                    onClick={() => handleStartEditLead(l)}
                                                                                    style={{
                                                                                        padding: '6px 10px', border: '1px solid var(--border-primary)',
                                                                                        backgroundColor: 'var(--bg-primary)', color: 'var(--color-primary)',
                                                                                        borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                                                                                    }}
                                                                                >
                                                                                    Edit
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )
                                                            default:
                                                                return null;
                                                        }
                                                    })}
                                                </tr>
                                            ))}
                                            {sortedLeads.length === 0 && (
                                                <tr>
                                                    <td colSpan={columnsConfig.filter(c => c.visible).length} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No leads found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB Content: Daily Spend Manager */}
                    {leadsTab === 'daily_spend' && (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: '20px', alignItems: 'start' }}>
                            {/* Input Form */}
                            <form onSubmit={handleSaveSpend} style={{ padding: '18px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', display: 'grid', gap: '12px' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Enter Daily Ad Spend</div>
                                
                                <div style={{ display: 'grid', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date</label>
                                    <input type="date" required value={dailySpendForm.date} onChange={e => setDailySpendForm({ ...dailySpendForm, date: e.target.value })}
                                        style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                </div>

                                <div style={{ display: 'grid', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Amount Spent (₹)</label>
                                    <input type="number" step="0.01" required placeholder="0.00" value={dailySpendForm.amount_spent} onChange={e => setDailySpendForm({ ...dailySpendForm, amount_spent: e.target.value })}
                                        style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer', marginTop: '2px' }}>
                                        <input type="checkbox" checked={includeGST} onChange={e => setIncludeGST(e.target.checked)} />
                                        Auto-add 18% GST (Indian tax)
                                    </label>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ display: 'grid', gap: '4px' }}>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Clicks</label>
                                        <input type="number" required placeholder="0" value={dailySpendForm.clicks} onChange={e => setDailySpendForm({ ...dailySpendForm, clicks: e.target.value })}
                                            style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                    </div>
                                    <div style={{ display: 'grid', gap: '4px' }}>
                                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Impressions</label>
                                        <input type="number" required placeholder="0" value={dailySpendForm.impressions} onChange={e => setDailySpendForm({ ...dailySpendForm, impressions: e.target.value })}
                                            style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gap: '4px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Conversions (Google Ads reported)</label>
                                    <input type="number" placeholder="0" value={dailySpendForm.conversions_recorded} onChange={e => setDailySpendForm({ ...dailySpendForm, conversions_recorded: e.target.value })}
                                        style={{ padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                                </div>

                                <button type="submit" style={{ padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '6px' }}>
                                    <Plus size={14} /> Save Metrics
                                </button>
                            </form>

                            {/* Spends Directory List */}
                            <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-elevated)', overflowX: 'auto' }}>
                                <div style={{ padding: '14px', borderBottom: '1px solid var(--border-primary)', fontWeight: 700, fontSize: '13px' }}>Daily Metric Records</div>
                                {dailySpendLoading ? (
                                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}><Loader2 size={16} className="animate-spin" /> Loading spends...</div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                                                {['Date', 'Spent', 'Clicks', 'Impr.', 'CPC', 'Actions'].map(h => (
                                                    <th key={h} style={{ padding: '8px 12px', color: 'var(--text-tertiary)', fontWeight: 600 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dailySpendList.map(s => {
                                                const cpc = s.clicks > 0 ? (s.amount_spent / s.clicks) : 0;
                                                return (
                                                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: '10px 12px', fontWeight: 600 }}>{s.date}</td>
                                                        <td style={{ padding: '10px 12px', fontWeight: 700 }}>₹{parseFloat(s.amount_spent).toLocaleString()}</td>
                                                        <td style={{ padding: '10px 12px' }}>{s.clicks}</td>
                                                        <td style={{ padding: '10px 12px' }}>{s.impressions}</td>
                                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>₹{cpc.toFixed(1)}</td>
                                                        <td style={{ padding: '10px 12px' }}>
                                                            <button onClick={() => handleDeleteSpend(s.date)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {dailySpendList.length === 0 && (
                                                <tr>
                                                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>No spend records registered.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Timeline drawer inside leads directory */}
                    <ResponsiveDrawer open={!!selectedLead} title={`Visitor Journey Timeline`} subtitle={`${selectedLead?.name || 'Anonymous Lead'} (${selectedLead?.phone})`} onClose={() => setSelectedLead(null)}>
                        {selectedLead && (
                            <div style={{ display: 'grid', gap: '20px', padding: '10px 0' }}>
                                
                                {/* Lead Details Summary */}
                                <div style={{ padding: '14px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Lead Channel</span>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px', textTransform: 'capitalize' }}>{selectedLead.lead_source?.replace(/_/g, ' ')}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Status</span>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: selectedLead.status === 'converted' ? '#10b981' : 'var(--text-primary)', marginTop: '2px', textTransform: 'capitalize' }}>{selectedLead.status}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Campaign / UTM</span>
                                        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{selectedLead.campaign || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>GCLID</span>
                                        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', wordBreak: 'break-all' }}>{selectedLead.gclid || 'N/A'}</div>
                                    </div>
                                    {selectedLead.notes && (
                                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border-primary)', paddingTop: '10px', marginTop: '4px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>Admin/System Notes</span>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedLead.notes}</p>
                                        </div>
                                    )}
                                </div>

                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '-8px' }}>Journey Flow</div>

                                {/* Journey Timeline Visual */}
                                <div style={{ display: 'grid', gap: '0px', position: 'relative', paddingLeft: '24px' }}>
                                    
                                    {/* Line connecting items */}
                                    <div style={{ position: 'absolute', left: '7px', top: '12px', bottom: '12px', width: '2px', backgroundColor: 'var(--border-primary)', zIndex: 1 }} />

                                    {selectedLead.journey?.map((step, idx) => {
                                        const isJob = step.type?.startsWith('job');
                                        const isLanding = step.type === 'landing';
                                        const isClick = step.type === 'click';
                                        
                                        let iconColor = '#94a3b8';
                                        let iconBg = 'var(--bg-secondary)';
                                        if (isLanding) { iconColor = '#ea4335'; iconBg = '#ea433515'; }
                                        else if (isClick) { iconColor = '#fbbc04'; iconBg = '#fbbc0415'; }
                                        else if (step.type === 'job_completed') { iconColor = '#10b981'; iconBg = '#10b98115'; }
                                        else if (isJob) { iconColor = '#6366f1'; iconBg = '#6366f115'; }

                                        return (
                                            <div key={idx} style={{ position: 'relative', display: 'grid', gap: '4px', paddingBottom: '20px' }}>
                                                
                                                {/* Node dot icon */}
                                                <div style={{
                                                    position: 'absolute', left: '-23px', top: '2px', width: '16px', height: '16px', borderRadius: '50%',
                                                    backgroundColor: iconBg, border: `2px solid ${iconColor}`, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} />

                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                    {new Date(step.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>

                                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                                                    {step.event}
                                                </div>

                                                {step.details && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        {step.details}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    
                                    {(!selectedLead.journey || selectedLead.journey.length === 0) && (
                                        <div style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No session logs available.</div>
                                    )}
                                </div>

                            </div>
                        )}
                    </ResponsiveDrawer>

                </div>

            ) : (

                // ─── STANDARD ANALYTICS DASHBOARD ─────────────────────────────────────
                <>
                    {/* 🎯 Google Ads ROI Tracker card section */}
                    <SectionTitle>🎯 Google Ads Campaigns</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        <MetricCard
                            icon={TrendingUp}
                            color="#10b981"
                            label="Leads Generated"
                            value={leadsSummary?.adsLeads ?? 0}
                            subtitle="Open ROI & Leads Tracker"
                            onClick={() => setSubView('leads_tracker')}
                        />
                        <MetricCard
                            icon={DollarSign}
                            color="#ea4335"
                            label="Google Ads Spend"
                            value={leadsSummary?.adsSpend !== undefined ? `₹${leadsSummary.adsSpend.toLocaleString()}` : '—'}
                            subtitle={`${leadsSummary?.adsClicks ?? 0} clicks · ${leadsSummary?.adsImpressions ?? 0} impressions`}
                        />
                        <MetricCard
                            icon={Info}
                            color="#8b5cf6"
                            label="Cost Per Lead (CPL)"
                            value={leadsSummary?.cpl !== undefined ? `₹${Math.round(leadsSummary.cpl).toLocaleString()}` : '—'}
                            subtitle="Total ad spend / leads"
                        />
                        <MetricCard
                            icon={ShoppingCart}
                            color="#4285f4"
                            label="Revenue (Ads ROI)"
                            value={leadsSummary?.adsRevenue !== undefined ? `₹${leadsSummary.adsRevenue.toLocaleString()}` : '—'}
                            subtitle={leadsSummary ? `ROAS: ${(leadsSummary.roas ?? 0).toFixed(2)}x` : '—'}
                        />
                    </div>

                    {/* ── First Party Traffic ──────────────────────────────────────── */}
                    <SectionTitle>📡 Web Traffic (First-Party Tracker)</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
                        <MetricCard icon={Activity} color="#4285f4" label="Sessions" value={fp?.sessions} subtitle="Total visits" 
                            onClick={() => openDrawer('first_party_sessions', null, 'Recent Sessions', `Recent visitor sessions in last ${range}`)}/>
                        <MetricCard icon={Users} color="#fbbc04" label="Unique Visitors" value={fp?.uniqueVisitors} subtitle="Distinct devices" />
                        <MetricCard icon={Eye} color="#34a853" label="Page Views" value={fp?.pageViews} />
                        <MetricCard
                            icon={MousePointer} color="#ea4335"
                            label="Google Ads Sessions"
                            value={fp?.adsSessions ?? 0}
                            subtitle={fp?.adsSessions > 0 ? "Visits from paid clicks (gclid)" : "Enable auto-tagging in Google Ads"}
                            na={false}
                        />
                    </div>

                    {/* First Party Top Pages */}
                    {fp?.topPages?.length > 0 && (
                        <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px' }}>Top Pages (First-Party)</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                        <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px' }}>Path</th>
                                        <th style={{ textAlign: 'right', padding: '6px 8px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: '11px' }}>Views</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fp.topPages.map((p, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                            <td style={{ padding: '8px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '12px' }}>{p.path}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{p.views.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── GA4 Traffic ──────────────────────────────────────── */}
                    <SectionTitle>🌐 Web Traffic (GA4) {!ga4Connected && '— Connect GA4 to unlock'}</SectionTitle>
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

                    {/* ── Audience Insights (GA4) ───────────────────────────────── */}
                    {ga4Connected && (channelSlices.length > 0 || deviceSlices.length > 0 || userTypeSlices.length > 0) && (
                        <>
                            <SectionTitle>📣 Audience Insights (via Google Analytics)</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>

                                {/* Traffic Sources */}
                                {channelSlices.length > 0 && (
                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>Traffic Sources</div>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Donut slices={channelSlices} size={110} />
                                            <div style={{ display: 'grid', gap: '8px', flex: 1 }}>
                                                {channelSlices.slice(0, 4).map((s, i) => {
                                                    const total = channelSlices.reduce((a, c) => a + c.value, 0)
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
                                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{((s.value / total) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Device Categories */}
                                {deviceSlices.length > 0 && (
                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>Device Category</div>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Donut slices={deviceSlices} size={110} />
                                            <div style={{ display: 'grid', gap: '8px', flex: 1 }}>
                                                {deviceSlices.map((s, i) => {
                                                    const total = deviceSlices.reduce((a, c) => a + c.value, 0)
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
                                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{((s.value / total) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* User Types */}
                                {userTypeSlices.length > 0 && (
                                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '16px' }}>User Type</div>
                                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <Donut slices={userTypeSlices} size={110} />
                                            <div style={{ display: 'grid', gap: '8px', flex: 1 }}>
                                                {userTypeSlices.map((s, i) => {
                                                    const total = userTypeSlices.reduce((a, c) => a + c.value, 0)
                                                    return (
                                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: s.color, flexShrink: 0 }} />
                                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flex: 1 }}>{s.label}</span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{((s.value / total) * 100).toFixed(0)}%</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        </>
                    )}

                    {/* ── Top Pages (GA4) ── */}
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
            <ResponsiveDrawer open={!!drawer} title={drawer?.title} subtitle={drawer?.subtitle} onClose={closeDrawer}>
                {drawerLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '30px 0', color: 'var(--text-tertiary)' }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading records...
                    </div>
                ) : isCustomerDrawer
                    ? <CustomerTable rows={drawerRows} />
                    : drawer?.type === 'first_party_sessions' ? <SessionTable rows={drawerRows} openDrawer={openDrawer} />
                    : drawer?.type === 'first_party_journey' ? <JourneyTable rows={drawerRows} />
                    : <BookingTable rows={drawerRows} />
                }
            </ResponsiveDrawer>

             {/* ── Manual Lead Log Drawer (Bottom Sheet Style) ──────────────── */}
             <BottomDrawer
                 open={isManualLeadDrawerOpen}
                 title={editingLead ? "Edit Lead Log" : "Log Call / WhatsApp Lead"}
                 subtitle={editingLead ? `Correct lead details for ${manualLeadForm.name || 'Anonymous'}` : "Log callers to automatically match them with their website visits"}
                 onClose={() => {
                     setIsManualLeadDrawerOpen(false)
                     setManualLeadResult(null)
                     setEditingLead(null)
                 }}
             >
                <div style={{ display: 'grid', gap: '16px', padding: '8px 0' }}>
                    <form onSubmit={handleSaveManualLead} style={{ display: 'grid', gap: '14px' }}>
                        <div style={{ display: 'grid', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Customer Account *</label>
                            {editingLead ? (
                                <input
                                    type="text"
                                    value={`${manualLeadForm.name ? manualLeadForm.name + ' ' : ''}(${manualLeadForm.phone})`}
                                    disabled
                                    style={{
                                        padding: '10px 12px',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-tertiary)',
                                        fontSize: '13px'
                                    }}
                                />
                            ) : (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ flex: 1, border: !selectedCustomer ? '1px solid var(--border-primary)' : '1px solid var(--color-primary)', borderRadius: 'var(--radius-md)' }}>
                                        <AutocompleteSearch
                                            placeholder={loadingCustomers ? 'Loading customers...' : 'Search customer by name or phone...'}
                                            value={customerSearchTerm}
                                            onChange={(val) => {
                                                setCustomerSearchTerm(val);
                                                if (!val) {
                                                    setSelectedCustomer(null);
                                                    setManualLeadForm(prev => ({ ...prev, phone: '', name: '' }));
                                                }
                                            }}
                                            suggestions={customers.map(c => ({
                                                ...c,
                                                displayText: `${c.name} ${c.phone || c.mobile ? `- ${c.phone || c.mobile}` : ''}`
                                            }))}
                                            searchKey="displayText"
                                            onSelect={(selected) => {
                                                setCustomerSearchTerm(selected.displayText);
                                                setSelectedCustomer(selected);
                                                setManualLeadForm(prev => ({
                                                    ...prev,
                                                    phone: selected.phone || selected.mobile || '',
                                                    name: selected.name
                                                }));
                                            }}
                                            loading={loadingCustomers}
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewAccountForm(true)}
                                        style={{
                                            height: '36px',
                                            width: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--color-primary)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            flexShrink: 0
                                        }}
                                        title="Create New Customer Account"
                                    >
                                        <Plus size={18} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Channel</label>
                                <select value={manualLeadForm.type} onChange={e => setManualLeadForm({ ...manualLeadForm, type: e.target.value })}
                                    style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                    <option value="call">Call Received</option>
                                    <option value="whatsapp">WhatsApp Message</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Status</label>
                                <select value={manualLeadForm.status} onChange={e => setManualLeadForm({ ...manualLeadForm, status: e.target.value })}
                                    style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                    <option value="interested">Interested</option>
                                    <option value="converted">Converted</option>
                                    <option value="junk">Junk/Spam</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Date &amp; Time received</label>
                            <input type="datetime-local" value={manualLeadForm.date} onChange={e => setManualLeadForm({ ...manualLeadForm, date: e.target.value })}
                                style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Attribution Source</label>
                                <select value={manualLeadForm.lead_source} onChange={e => setManualLeadForm({ ...manualLeadForm, lead_source: e.target.value })}
                                    style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                                    <option value="auto">Auto-detect (Website click)</option>
                                    <option value="google_ads">Google Ads (Paid)</option>
                                    <option value="google_organic">Google Search (Organic)</option>
                                    <option value="referral">Referral / Word of Mouth</option>
                                    <option value="direct">Direct / Walk-in</option>
                                    <option value="social_media">Social Media</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gap: '4px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Campaign Name (Optional)</label>
                                <input type="text" placeholder="e.g. OTG_Repair" value={manualLeadForm.campaign} onChange={e => setManualLeadForm({ ...manualLeadForm, campaign: e.target.value })}
                                    style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13px' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Notes / Enquiry description</label>
                            <textarea placeholder="e.g. Inquired about AC Gas charging rates" rows={3} value={manualLeadForm.notes} onChange={e => setManualLeadForm({ ...manualLeadForm, notes: e.target.value })}
                                style={{ padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: '13px' }} />
                        </div>

                        <button type="submit" disabled={manualLeadSubmitting}
                            style={{ padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'white', fontWeight: 700, cursor: manualLeadSubmitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                            {manualLeadSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingLead ? <Check size={16} /> : <Plus size={16} />}
                            {editingLead ? "Update Lead Log" : "Save Lead Log"}
                        </button>
                    </form>

                    {/* Attrib Result Notification */}
                    {manualLeadResult && (
                        <div style={{
                            padding: '16px',
                            borderRadius: 'var(--radius-lg)',
                            border: manualLeadResult.success ? '1px solid #10b98150' : '1px solid #ef444450',
                            backgroundColor: manualLeadResult.success ? '#10b98110' : '#ef444410',
                            color: manualLeadResult.success ? '#065f46' : '#991b1b',
                            fontSize: '13px',
                            animation: 'fadeIn 0.2s'
                        }}>
                            {manualLeadResult.success ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <Check size={18} style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {manualLeadResult.alreadyExisted ? 'Lead Updated! (Number already exists)' : 'Lead Saved Successfully!'}
                                        </div>
                                        {manualLeadResult.matchedSession ? (
                                            <div style={{ marginTop: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                                <Link2 size={14} style={{ marginTop: '2px' }} />
                                                <span>
                                                    <strong>Auto-matched session:</strong> Landed via Google Ads ({manualLeadResult.matchedSession.utm_campaign || 'Paid campaign'}) from referrer <strong>{manualLeadResult.matchedSession.referrer || 'google.com'}</strong>.
                                                </span>
                                            </div>
                                        ) : (
                                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>No matching active website click found near this time. Lead attributed to Direct/Offline.</p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                    <span>{manualLeadResult.error}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </BottomDrawer>

            {/* New Account Form Modal */}
            {showNewAccountForm && (
                <NewAccountForm
                    groups={groups}
                    preselectedType={(() => {
                        const customersGroupId = groups.find(g =>
                            g.name?.toLowerCase().includes('customer') &&
                            (g.parent_name?.toLowerCase().includes('sundry') || g.nature === 'asset')
                        )?.id || groups.find(g => g.name?.toLowerCase() === 'customers')?.id || '';
                        return customersGroupId;
                    })()}
                    onClose={() => setShowNewAccountForm(false)}
                    onSave={handleNewAccountSave}
                    initialData={(() => {
                        const term = customerSearchTerm.trim();
                        if (!term) return null;
                        const isPhone = /^[0-9+-\s]{5,20}$/.test(term.replace(/\D/g, ''));
                        if (isPhone) {
                            return { mobile: term };
                        } else {
                            return { name: term };
                        }
                    })()}
                />
            )}

            {/* Job Detail Modal */}
            {selectedJobForModal && (
                <JobDetailModal 
                    job={selectedJobForModal} 
                    onClose={() => setSelectedJobForModal(null)} 
                    onUpdate={() => {
                        setSelectedJobForModal(null)
                        load(range)
                    }} 
                />
            )}

            {/* Sales Invoice Form Modal (to view the invoice) */}
            {selectedInvoiceForModal && (
                <SalesInvoiceForm 
                    existingInvoice={selectedInvoiceForModal} 
                    onClose={() => setSelectedInvoiceForModal(null)} 
                    onSave={() => {
                        setSelectedInvoiceForModal(null)
                        load(range)
                    }} 
                />
            )}

            {/* Global details fetch loading overlay */}
            {loadingJobOrInvoice && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    color: 'white',
                    fontSize: '14px'
                }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    <span>Loading details...</span>
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
        </div>
    )
}
