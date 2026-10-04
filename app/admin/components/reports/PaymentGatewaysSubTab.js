'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    CreditCard, Smartphone, CheckCircle2, Clock, Filter,
    RefreshCw, Loader2, ArrowRight, DollarSign, Store,
    Briefcase, FileText, Check, AlertCircle, ChevronDown,
    Search, Download, ExternalLink, Calendar, PlusCircle
} from 'lucide-react';

const fmt = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB');
};

export default function PaymentGatewaysSubTab({ isMobile = false }) {
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState([]);
    const [gatewayAccounts, setGatewayAccounts] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [summary, setSummary] = useState({ totalUnsettled: 0, posTotal: 0, techTotal: 0, count: 0 });

    // Filters
    const [selectedGatewayId, setSelectedGatewayId] = useState('');
    const [statusFilter, setStatusFilter] = useState('unsettled'); // 'unsettled' | 'settled' | 'all'
    const [channelFilter, setChannelFilter] = useState('all'); // 'all' | 'pos' | 'technician'
    const [searchTerm, setSearchTerm] = useState('');
    const [datePreset, setDatePreset] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Modals
    const [commissionModal, setCommissionModal] = useState({ open: false, items: [], gross: 0 });
    const [settleModal, setSettleModal] = useState({ open: false, items: [], gross: 0 });

    // Form inputs for modals
    const [commRate, setCommRate] = useState('2.0'); // default 2%
    const [commFlatFee, setCommFlatFee] = useState('');
    const [commGstRate, setCommGstRate] = useState('18');
    const [commNotes, setCommNotes] = useState('');
    const [processingAction, setProcessingAction] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    // Settlement modal inputs
    const [settleRef, setSettleRef] = useState('');
    const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
    const [settleFeePercent, setSettleFeePercent] = useState('2.0');
    const [createCommWithSettle, setCreateCommWithSettle] = useState(true);

    // ── Fetch Gateway Data ──────────────────────────────────────────────────────
    const fetchData = async () => {
        try {
            setLoading(true);
            setActionMessage(null);
            const params = new URLSearchParams();
            if (selectedGatewayId) params.append('gateway_account_id', selectedGatewayId);
            if (statusFilter) params.append('status', statusFilter);
            if (channelFilter) params.append('channel', channelFilter);
            if (fromDate) params.append('from', fromDate);
            if (toDate) params.append('to', toDate);

            const res = await fetch(`/api/admin/gateway-settlements?${params.toString()}`);
            const json = await res.json();
            if (json.success) {
                setReceipts(json.receipts || []);
                setGatewayAccounts(json.gatewayAccounts || []);
                setSettlements(json.settlements || []);
                setSummary(json.summary || { totalUnsettled: 0, posTotal: 0, techTotal: 0, count: 0 });
                setSelectedIds(new Set());
            } else {
                console.error('Failed to load gateway data:', json.error);
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedGatewayId, statusFilter, channelFilter, fromDate, toDate]);

    // Handle date presets
    const handlePresetChange = (preset) => {
        setDatePreset(preset);
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (preset === 'today') {
            setFromDate(todayStr);
            setToDate(todayStr);
        } else if (preset === '7days') {
            const past = new Date();
            past.setDate(past.getDate() - 7);
            setFromDate(past.toISOString().split('T')[0]);
            setToDate(todayStr);
        } else if (preset === 'month') {
            const first = new Date(yyyy, today.getMonth(), 1);
            setFromDate(first.toISOString().split('T')[0]);
            setToDate(todayStr);
        } else if (preset === 'all') {
            setFromDate('');
            setToDate('');
        }
    };

    // Client-side search
    const filteredReceipts = useMemo(() => {
        if (!searchTerm.trim()) return receipts;
        const q = searchTerm.toLowerCase();
        return receipts.filter(r =>
            (r.receipt_number || '').toLowerCase().includes(q) ||
            (r.account_name || '').toLowerCase().includes(q) ||
            (r.narration || '').toLowerCase().includes(q) ||
            (r.reference_number || '').toLowerCase().includes(q) ||
            (r.jobNumber || '').toLowerCase().includes(q) ||
            (r.technicianName || '').toLowerCase().includes(q)
        );
    }, [receipts, searchTerm]);

    // Selection helpers
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredReceipts.map(r => r.id)));
        }
    };

    const toggleSelectRow = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const selectedItems = useMemo(() => {
        return receipts.filter(r => selectedIds.has(r.id));
    }, [receipts, selectedIds]);

    const selectedGross = useMemo(() => {
        return selectedItems.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    }, [selectedItems]);

    // ── Open Commission Modal ──────────────────────────────────────────────────
    const openCommissionModalFor = (items) => {
        const gross = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        setCommissionModal({ open: true, items, gross });
        setCommNotes(`Gateway commission fee for ${items.length} collection vouchers`);
    };

    // Auto-calculate commission preview
    const commissionCalc = useMemo(() => {
        const gross = commissionModal.gross || 0;
        let baseFee = 0;
        if (commFlatFee && parseFloat(commFlatFee) > 0) {
            baseFee = parseFloat(commFlatFee);
        } else {
            const pct = parseFloat(commRate) || 0;
            baseFee = +(gross * (pct / 100)).toFixed(2);
        }
        const gstPct = parseFloat(commGstRate) || 0;
        const tax = +(baseFee * (gstPct / 100)).toFixed(2);
        const total = +(baseFee + tax).toFixed(2);
        return { baseFee, tax, total };
    }, [commissionModal.gross, commRate, commFlatFee, commGstRate]);

    // Submit Commission Purchase Voucher
    const handleCreateCommissionVoucher = async () => {
        try {
            setProcessingAction(true);
            const items = commissionModal.items;
            const targetGatewayId = selectedGatewayId || items[0]?.payment_account_id || gatewayAccounts[0]?.id;

            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_commission_voucher',
                    gateway_account_id: targetGatewayId,
                    gross_amount: commissionModal.gross,
                    fee_amount: commissionCalc.baseFee,
                    tax_amount: commissionCalc.tax,
                    voucher_ids: items.map(r => r.id),
                    notes: commNotes
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setCommissionModal({ open: false, items: [], gross: 0 });
                fetchData();
            } else {
                alert('Failed to create purchase voucher: ' + json.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setProcessingAction(false);
        }
    };

    // ── Open Settlement Modal ──────────────────────────────────────────────────
    const openSettleModalFor = (items) => {
        const gross = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        setSettleModal({ open: true, items, gross });
        setSettleRef(`SETTLE-${new Date().getFullYear().toString().slice(-2)}-${Math.floor(1000 + Math.random() * 9000)}`);
    };

    // Settle modal calculations
    const settleCalc = useMemo(() => {
        const gross = settleModal.gross || 0;
        const pct = parseFloat(settleFeePercent) || 0;
        const baseFee = createCommWithSettle ? +(gross * (pct / 100)).toFixed(2) : 0;
        const tax = createCommWithSettle ? +(baseFee * 0.18).toFixed(2) : 0;
        const totalComm = +(baseFee + tax).toFixed(2);
        const net = +(gross - totalComm).toFixed(2);
        return { baseFee, tax, totalComm, net };
    }, [settleModal.gross, settleFeePercent, createCommWithSettle]);

    // Submit Settlement
    const handleExecuteSettlement = async () => {
        try {
            setProcessingAction(true);
            const items = settleModal.items;
            const targetGatewayId = selectedGatewayId || items[0]?.payment_account_id || gatewayAccounts[0]?.id;

            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'settle_batch',
                    gateway_account_id: targetGatewayId,
                    receipt_ids: items.map(r => r.id),
                    gross_amount: settleModal.gross,
                    fee_amount: settleCalc.baseFee,
                    tax_amount: settleCalc.tax,
                    net_amount: settleCalc.net,
                    settlement_ref: settleRef,
                    settlement_date: settleDate,
                    create_commission_voucher: createCommWithSettle,
                    notes: `Settled ${items.length} transactions via Payment Gateways subtab`
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setSettleModal({ open: false, items: [], gross: 0 });
                fetchData();
            } else {
                alert('Settlement failed: ' + json.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setProcessingAction(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Notification alert banner */}
            {actionMessage && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: actionMessage.type === 'success' ? '#10b98115' : '#ef444415',
                    border: `1px solid ${actionMessage.type === 'success' ? '#10b98140' : '#ef444440'}`,
                    color: actionMessage.type === 'success' ? '#10b981' : '#ef4444',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <span>✓ {actionMessage.text}</span>
                    <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}>✕</button>
                </div>
            )}

            {/* ── Summary KPI Cards ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
                gap: '8px'
            }}>
                {/* Card 1: Holding / Unsettled */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderLeft: '4px solid #f59e0b'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} color="#f59e0b" /> Holding in Gateways
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
                        ₹{fmt(summary.totalUnsettled)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        {summary.count} unsettled collections
                    </div>
                </div>

                {/* Card 2: Store POS */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderLeft: '4px solid #3b82f6'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Store size={12} color="#3b82f6" /> Store POS Walk-ins
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>
                        ₹{fmt(summary.posTotal)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Counter QR payments
                    </div>
                </div>

                {/* Card 3: Field Technicians */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderLeft: '4px solid #10b981'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Briefcase size={12} color="#10b981" /> Field Technicians
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
                        ₹{fmt(summary.techTotal)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Collected on service jobs
                    </div>
                </div>

                {/* Card 4: Est. Commission */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderLeft: '4px solid #8b5cf6'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={12} color="#8b5cf6" /> Est. Commission (~2%)
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>
                        ₹{fmt(summary.totalUnsettled * 0.02)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        Eligible for Purchase Voucher
                    </div>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                backgroundColor: 'var(--bg-elevated)',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
            }}>
                {/* Gateway Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Gateway:</span>
                    <select
                        value={selectedGatewayId}
                        onChange={e => setSelectedGatewayId(e.target.value)}
                        style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="">All Gateways</option>
                        {gatewayAccounts.map(g => (
                            <option key={g.id} value={g.id}>{g.name} ({g.sku || 'B'})</option>
                        ))}
                    </select>
                </div>

                {/* Channel Filter (All vs POS vs Tech) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Channel:</span>
                    <select
                        value={channelFilter}
                        onChange={e => setChannelFilter(e.target.value)}
                        style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Channels</option>
                        <option value="pos">🏪 Store POS Only</option>
                        <option value="technician">💼 Field Technicians Only</option>
                    </select>
                </div>

                {/* Settlement Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Status:</span>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{
                            padding: '5px 8px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="unsettled">🟡 Unsettled (Holding)</option>
                        <option value="settled">🟢 Settled to Bank</option>
                        <option value="all">All Statuses</option>
                    </select>
                </div>

                {/* Date presets */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {['all', 'month', '7days', 'today'].map(p => (
                        <button
                            key={p}
                            onClick={() => handlePresetChange(p)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: datePreset === p ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                color: datePreset === p ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {p === '7days' ? 'Last 7d' : p === 'month' ? 'This Month' : p}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 180px', minWidth: '150px' }}>
                    <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search receipt, cx, job..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '5px 8px 5px 26px',
                            fontSize: '12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)'
                        }}
                    />
                </div>

                {/* Refresh */}
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Refresh transactions"
                >
                    <RefreshCw size={13} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {/* ── Selection Action Strip ── */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.35)'
                }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✓ <strong>{selectedIds.size}</strong> selected</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>·</span>
                        <span>Gross: <strong style={{ color: '#10b981' }}>₹{fmt(selectedGross)}</strong></span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Auto-create commission purchase voucher */}
                        <button
                            onClick={() => openCommissionModalFor(selectedItems)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <PlusCircle size={13} /> Auto-Create Commission Voucher
                        </button>

                        {/* Settle to HDFC Bank */}
                        <button
                            onClick={() => openSettleModalFor(selectedItems)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowRight size={13} /> Settle to HDFC Bank
                        </button>

                        <button
                            onClick={() => setSelectedIds(new Set())}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* ── Table View ── */}
            <div style={{
                overflowX: 'auto',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                            <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Gateway</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Voucher No</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Customer / Party</th>
                            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)' }}>Channel</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                    <Loader2 size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                                    Loading gateway transactions...
                                </td>
                            </tr>
                        ) : filteredReceipts.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                    <CreditCard size={32} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                                    <p style={{ margin: 0, fontWeight: 500 }}>No gateway transactions found</p>
                                    <p style={{ margin: '4px 0 0', fontSize: '11px' }}>
                                        {statusFilter === 'unsettled' ? 'All gateway collections are settled into bank!' : 'Try adjusting the filters.'}
                                    </p>
                                </td>
                            </tr>
                        ) : (
                            filteredReceipts.map((r, idx) => {
                                const isChecked = selectedIds.has(r.id);
                                const isSettled = !!r.is_settled;
                                return (
                                    <tr
                                        key={r.id}
                                        style={{
                                            borderBottom: '1px solid var(--border-primary)',
                                            backgroundColor: isChecked ? 'rgba(99, 102, 241, 0.05)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)')
                                        }}
                                    >
                                        <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleSelectRow(r.id)}
                                            />
                                        </td>
                                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {fmtDate(r.date)}
                                        </td>
                                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                backgroundColor: r.narration?.toLowerCase().includes('razorpay') ? '#3b82f615' : '#10b98115',
                                                color: r.narration?.toLowerCase().includes('razorpay') ? '#3b82f6' : '#10b981'
                                            }}>
                                                {r.narration?.toLowerCase().includes('razorpay') ? 'Razorpay' : 'Google Pay QR'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                            {r.receipt_number || r.reference || '—'}
                                        </td>
                                        <td style={{ padding: '7px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.account_name || 'Customer'}</span>
                                            {r.narration && (
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {r.narration}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                                            {r.channelType === 'pos' ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                                    backgroundColor: '#3b82f615', color: '#3b82f6'
                                                }}>
                                                    🏪 Store POS
                                                </span>
                                            ) : r.channelType === 'technician' ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                                    backgroundColor: '#6366f115', color: '#6366f1'
                                                }}>
                                                    💼 {r.jobNumber ? `#${r.jobNumber}` : 'Job'} ({r.technicianName || 'Tech'})
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Direct</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '7px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#10b981', whiteSpace: 'nowrap' }}>
                                            ₹{fmt(r.amount)}
                                        </td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            {isSettled ? (
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                                    backgroundColor: '#10b98115', color: '#10b981'
                                                }}>
                                                    ✓ Settled ({r.settlement_ref || 'Bank'})
                                                </span>
                                            ) : (
                                                <span style={{
                                                    padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600,
                                                    backgroundColor: '#f59e0b15', color: '#f59e0b'
                                                }}>
                                                    ⏳ Holding in Gateway
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '7px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <div style={{ display: 'inline-flex', gap: '4px' }}>
                                                <button
                                                    onClick={() => openCommissionModalFor([r])}
                                                    style={{
                                                        padding: '3px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                        color: '#8b5cf6',
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Auto-create commission purchase voucher"
                                                >
                                                    🏷️ Commission
                                                </button>
                                                {!isSettled && (
                                                    <button
                                                        onClick={() => openSettleModalFor([r])}
                                                        style={{
                                                            padding: '3px 6px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 600,
                                                            border: '1px solid rgba(16, 185, 129, 0.4)',
                                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                                            color: '#10b981',
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Settle to bank"
                                                    >
                                                        🏦 Settle
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Modal 1: Auto-Create Commission Purchase Voucher ── */}
            {commissionModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1400, padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '10px',
                        width: '100%',
                        maxWidth: '520px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-xl)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#8b5cf6' }}>
                                    🏷️ Auto-Create Commission Purchase Voucher
                                </h4>
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Generates an official accounting Purchase Invoice for Gateway MDR fees
                                </p>
                            </div>
                            <button
                                onClick={() => setCommissionModal({ open: false, items: [], gross: 0 })}
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }}
                            >✕</button>
                        </div>

                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Collections Selected</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{commissionModal.items.length} Voucher(s)</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Gross Amount</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981' }}>₹{fmt(commissionModal.gross)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Commission % (MDR)
                                    </label>
                                    <input
                                        type="number" step="0.01"
                                        value={commRate} onChange={e => { setCommRate(e.target.value); setCommFlatFee(''); }}
                                        placeholder="e.g. 2.0"
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Or Flat Base Fee (₹)
                                    </label>
                                    <input
                                        type="number" step="0.01"
                                        value={commFlatFee} onChange={e => { setCommFlatFee(e.target.value); setCommRate(''); }}
                                        placeholder="Custom flat fee"
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)',
                                display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Base Processing Fee:</span>
                                    <strong>₹{fmt(commissionCalc.baseFee)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                    <span>GST (18% - CGST 9% + SGST 9%):</span>
                                    <span>₹{fmt(commissionCalc.tax)}</span>
                                </div>
                                <div style={{ height: '1px', backgroundColor: 'rgba(139, 92, 246, 0.2)', margin: '4px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#8b5cf6', fontSize: '13px' }}>
                                    <span>Total Purchase Voucher Amount:</span>
                                    <span>₹{fmt(commissionCalc.total)}</span>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                    Narration / Description
                                </label>
                                <input
                                    type="text"
                                    value={commNotes} onChange={e => setCommNotes(e.target.value)}
                                    style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>

                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex', justifyContent: 'flex-end', gap: '8px'
                        }}>
                            <button
                                onClick={() => setCommissionModal({ open: false, items: [], gross: 0 })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateCommissionVoucher}
                                disabled={processingAction || commissionCalc.total <= 0}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                    border: 'none', backgroundColor: '#8b5cf6', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                {processingAction ? <Loader2 size={13} className="spin" /> : '✓'}
                                Create Purchase Voucher (₹{fmt(commissionCalc.total)})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal 2: Settle to HDFC Bank (With Optional Commission) ── */}
            {settleModal.open && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1400, padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '10px',
                        width: '100%',
                        maxWidth: '520px',
                        border: '1px solid var(--border-primary)',
                        boxShadow: 'var(--shadow-xl)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                                    🏦 Settle Collections into HDFC Bank
                                </h4>
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Records payout transfer from Gateway $\to$ HDFC Current A/c
                                </p>
                            </div>
                            <button
                                onClick={() => setSettleModal({ open: false, items: [], gross: 0 })}
                                style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }}
                            >✕</button>
                        </div>

                        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Settling</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{settleModal.items.length} Voucher(s)</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Gross Swipes</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6' }}>₹{fmt(settleModal.gross)}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Settlement Date
                                    </label>
                                    <input
                                        type="date"
                                        value={settleDate} onChange={e => setSettleDate(e.target.value)}
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        UTR / Settlement Ref
                                    </label>
                                    <input
                                        type="text"
                                        value={settleRef} onChange={e => setSettleRef(e.target.value)}
                                        placeholder="e.g. UTR123456"
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Gateway Commission Options */}
                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                display: 'flex', flexDirection: 'column', gap: '8px'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={createCommWithSettle}
                                        onChange={e => setCreateCommWithSettle(e.target.checked)}
                                    />
                                    Auto-Deduct Gateway Commission & Create Purchase Voucher
                                </label>

                                {createCommWithSettle && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MDR Rate %:</span>
                                        <input
                                            type="number" step="0.01"
                                            value={settleFeePercent} onChange={e => setSettleFeePercent(e.target.value)}
                                            style={{ width: '80px', padding: '4px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            = Fee ₹{fmt(settleCalc.baseFee)} + GST ₹{fmt(settleCalc.tax)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Net Deposit into HDFC */}
                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Net Payout to HDFC Current A/c</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                        Gross (₹{fmt(settleModal.gross)}) - Comm (₹{fmt(settleCalc.totalComm)})
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                                    ₹{fmt(settleCalc.net)}
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '10px 16px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex', justifyContent: 'flex-end', gap: '8px'
                        }}>
                            <button
                                onClick={() => setSettleModal({ open: false, items: [], gross: 0 })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleExecuteSettlement}
                                disabled={processingAction || settleCalc.net <= 0}
                                style={{
                                    padding: '6px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                    border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '5px'
                                }}
                            >
                                {processingAction ? <Loader2 size={13} className="spin" /> : '✓'}
                                Confirm Settlement (₹{fmt(settleCalc.net)})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
