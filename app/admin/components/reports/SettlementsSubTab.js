'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    CreditCard, Smartphone, CheckCircle2, Clock, Filter,
    RefreshCw, Loader2, ArrowRight, DollarSign, Store,
    Briefcase, FileText, Check, AlertCircle, ChevronDown, ChevronUp,
    Search, Calendar, PlusCircle, Landmark, AlertTriangle,
    Sparkles, CheckCircle, HelpCircle, Eye, ShieldCheck,
    X, Trash2, Edit2, RotateCcw, Copy
} from 'lucide-react';

const fmt = (n) => (parseFloat(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB');
};

function findBestMatchingSubset(items, target) {
    if (!items || items.length === 0) return [];
    
    // 1. Exact single match
    const exactSingle = items.find(r => Math.abs((parseFloat(r.amount) || 0) - target) < 0.05);
    if (exactSingle) return [exactSingle.id];
    
    // 2. Exact sum of all items in list
    const totalSum = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
    if (Math.abs(totalSum - target) < 1.0) {
        return items.map(r => r.id);
    }
    
    // 3. Combinations search (up to 16 items)
    const sorted = [...items].sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
    if (sorted.length <= 16) {
        const n = sorted.length;
        let bestSubset = [];
        let bestDiff = Infinity;
        for (let mask = 1; mask < (1 << n); mask++) {
            let sum = 0;
            const sub = [];
            for (let i = 0; i < n; i++) {
                if ((mask >> i) & 1) {
                    sum += (parseFloat(sorted[i].amount) || 0);
                    sub.push(sorted[i].id);
                }
            }
            const diff = Math.abs(sum - target);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestSubset = sub;
                if (diff < 0.05) break;
            }
        }
        if (bestSubset.length > 0) return bestSubset;
    }
    
    // 4. Greedy match
    let curr = 0;
    const gSub = [];
    for (const r of sorted) {
        const amt = parseFloat(r.amount) || 0;
        if (curr + amt <= target + 5) {
            curr += amt;
            gSub.push(r.id);
        }
    }
    return gSub.length > 0 ? gSub : [sorted[0].id];
}

export default function SettlementsSubTab({ isMobile = false }) {
    const [loading, setLoading] = useState(true);
    const [settlements, setSettlements] = useState([]);
    const [gatewayAccounts, setGatewayAccounts] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [allUnsettledReceipts, setAllUnsettledReceipts] = useState([]);
    const [actionMessage, setActionMessage] = useState(null);
    const [processingAction, setProcessingAction] = useState(false);

    // Filters
    const [selectedGatewayId, setSelectedGatewayId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [datePreset, setDatePreset] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Expanded accordion rows
    const [expandedIds, setExpandedIds] = useState(new Set());

    // Helper to format Date in local timezone as YYYY-MM-DD
    const getTodayStr = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    // Modals
    const [manualModal, setManualModal] = useState({
        open: false,
        gatewayAccountId: '',
        destinationAccountId: '',
        settlementRef: '',
        settlementDate: getTodayStr(),
        bankAmount: '',
        selectedReceiptIds: new Set(),
        searchCandidates: '',
        autoBalanceMissing: false,
        createCommission: false,
        commissionFee: '',
        notes: ''
    });

    const [editModal, setEditModal] = useState({
        open: false,
        settlement: null,
        settlementRef: '',
        settlementDate: '',
        feeAmount: '',
        selectedReceiptIds: new Set(),
        searchCandidate: '',
        notes: ''
    });

    const [deleteModal, setDeleteModal] = useState({
        open: false,
        settlement: null
    });

    // ── Fetch Settlements & Accounts ───────────────────────────────────────────
    const fetchSettlementsData = async () => {
        try {
            setLoading(true);
            setActionMessage(null);

            const params = new URLSearchParams();
            if (selectedGatewayId) params.append('gateway_account_id', selectedGatewayId);
            params.append('status', 'unsettled');

            const settleRes = await fetch(`/api/admin/gateway-settlements?${params.toString()}`);
            if (!settleRes.ok) {
                const text = await settleRes.text();
                throw new Error(`Failed to load settlements (${settleRes.status}): ${text.slice(0, 100)}`);
            }

            const settleData = await settleRes.json();

            if (settleData.success) {
                const gws = settleData.gatewayAccounts || [];
                const banks = settleData.bankAccounts && settleData.bankAccounts.length > 0
                    ? settleData.bankAccounts
                    : [{ id: 'fb2512f4-c3c3-44ae-9dcf-0b750b5294a6', name: 'HDFC Current A/c' }];
                setSettlements(settleData.settlements || []);
                setGatewayAccounts(gws);
                setBankAccounts(banks);
                setAllUnsettledReceipts((settleData.receipts || []).filter(r => !r.is_settled));
            } else {
                throw new Error(settleData.error || 'Failed to load settlements');
            }
        } catch (err) {
            console.error('Error fetching settlements:', err);
            setActionMessage({ type: 'error', text: err.message || 'Failed to load settlements' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettlementsData();
    }, [selectedGatewayId]);

    // Toggle expand row
    const toggleExpand = (id) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // ── Filter Settlements ─────────────────────────────────────────────────────
    const filteredSettlements = useMemo(() => {
        let list = [...settlements];

        if (selectedGatewayId) {
            list = list.filter(s => s.gateway_account_id === selectedGatewayId);
        }

        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(s => {
                const ref = (s.settlement_ref || '').toLowerCase();
                const notes = (s.notes || '').toLowerCase();
                const gw = (s.gatewayAccount?.name || '').toLowerCase();
                const dest = (s.destinationAccount?.name || '').toLowerCase();
                const hasReceiptMatch = (s.receipts || []).some(r =>
                    (r.receipt_number || '').toLowerCase().includes(q) ||
                    (r.account_name || '').toLowerCase().includes(q) ||
                    (r.technicianName || '').toLowerCase().includes(q)
                );
                return ref.includes(q) || notes.includes(q) || gw.includes(q) || dest.includes(q) || hasReceiptMatch;
            });
        }

        if (datePreset === 'this_month') {
            const now = new Date();
            const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            list = list.filter(s => (s.settlement_date || '').startsWith(ym));
        } else if (datePreset === 'last_30_days') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            const dY = d.getFullYear();
            const dM = String(d.getMonth() + 1).padStart(2, '0');
            const dD = String(d.getDate()).padStart(2, '0');
            const minStr = `${dY}-${dM}-${dD}`;
            list = list.filter(s => s.settlement_date >= minStr);
        } else if (datePreset === 'custom') {
            if (fromDate) list = list.filter(s => s.settlement_date >= fromDate);
            if (toDate) list = list.filter(s => s.settlement_date <= toDate);
        }

        return list;
    }, [settlements, selectedGatewayId, searchTerm, datePreset, fromDate, toDate]);

    // KPI Summary
    const kpiSummary = useMemo(() => {
        const totalNet = filteredSettlements.reduce((s, r) => s + (parseFloat(r.net_amount) || 0), 0);
        const totalGross = filteredSettlements.reduce((s, r) => s + (parseFloat(r.gross_amount) || 0), 0);
        const totalFees = filteredSettlements.reduce((s, r) => s + (parseFloat(r.fee_amount) || 0), 0);
        const totalReceipts = filteredSettlements.reduce((s, r) => s + (r.receiptCount || 0), 0);
        return { totalNet, totalGross, totalFees, count: filteredSettlements.length, totalReceipts };
    }, [filteredSettlements]);

    // ── Open Manual Reconciliation Modal ──────────────────────────────────────
    const handleOpenManualModal = () => {
        const defaultGw = selectedGatewayId || gatewayAccounts[0]?.id || '';
        const defaultBank = bankAccounts.find(b => (b.name || '').toLowerCase().includes('hdfc'))?.id || bankAccounts[0]?.id || '';
        setManualModal({
            open: true,
            gatewayAccountId: defaultGw,
            destinationAccountId: defaultBank,
            settlementRef: '',
            settlementDate: getTodayStr(),
            bankAmount: '',
            selectedReceiptIds: new Set(),
            searchCandidates: '',
            autoBalanceMissing: false,
            createCommission: false,
            commissionFee: '',
            notes: ''
        });
    };

    // Auto-sync manual modal gateway and bank account selection once accounts are loaded
    useEffect(() => {
        if (manualModal.open) {
            setManualModal(prev => {
                let updated = false;
                const next = { ...prev };
                if (!next.gatewayAccountId && gatewayAccounts.length > 0) {
                    next.gatewayAccountId = (selectedGatewayId && gatewayAccounts.some(g => g.id === selectedGatewayId))
                        ? selectedGatewayId
                        : gatewayAccounts[0].id;
                    updated = true;
                }
                if (!next.destinationAccountId && bankAccounts.length > 0) {
                    const hdfc = bankAccounts.find(b => (b.name || '').toLowerCase().includes('hdfc'))?.id || bankAccounts[0].id;
                    next.destinationAccountId = hdfc;
                    updated = true;
                }
                return updated ? next : prev;
            });
        }
    }, [manualModal.open, gatewayAccounts, bankAccounts, selectedGatewayId]);

    // Candidate receipts for Manual Modal
    const manualCandidateReceipts = useMemo(() => {
        if (!manualModal.open || !manualModal.gatewayAccountId) return [];
        return allUnsettledReceipts.filter(r => r.payment_account_id === manualModal.gatewayAccountId);
    }, [manualModal.open, manualModal.gatewayAccountId, allUnsettledReceipts]);

    // Submit Manual Reconciliation
    const handleConfirmManualModal = async () => {
        const { gatewayAccountId, destinationAccountId, settlementRef, settlementDate, bankAmount, selectedReceiptIds, autoBalanceMissing, createCommission, commissionFee, notes } = manualModal;
        const bankNum = parseFloat(bankAmount) || 0;
        const receiptIds = Array.from(selectedReceiptIds);

        if (bankNum <= 0 && receiptIds.length === 0) {
            alert('Please enter a bank deposit amount or select customer collections.');
            return;
        }

        try {
            setProcessingAction(true);
            const selectedRecs = manualCandidateReceipts.filter(r => selectedReceiptIds.has(r.id));
            const selectedTotal = selectedRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
            const variance = +(bankNum - selectedTotal).toFixed(2);
            const feeNum = parseFloat(commissionFee) || 0;

            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reconcile_bank_payout',
                    gateway_account_id: gatewayAccountId,
                    destination_account_id: destinationAccountId,
                    receipt_ids: receiptIds,
                    bank_amount: bankNum > 0 ? bankNum : selectedTotal,
                    gross_amount: selectedTotal,
                    settlement_ref: settlementRef || `MANUAL-${Date.now().toString().slice(-6)}`,
                    settlement_date: settlementDate,
                    create_missing_voucher: autoBalanceMissing,
                    missing_amount: variance > 0 ? variance : 0,
                    create_commission_voucher: createCommission && feeNum > 0,
                    fee_amount: feeNum,
                    tax_amount: 0,
                    notes: notes || `Manual reconciliation entry ${settlementRef || ''}`
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setManualModal(prev => ({ ...prev, open: false }));
                await fetchSettlementsData();
            } else {
                alert(json.error || 'Failed to create manual reconciliation');
            }
        } catch (err) {
            console.error('Manual settlement error:', err);
            alert(err.message || 'Error creating settlement');
        } finally {
            setProcessingAction(false);
        }
    };

    // ── Open Edit Settlement Modal ─────────────────────────────────────────────
    const handleOpenEditModal = (settlement) => {
        setEditModal({
            open: true,
            settlement,
            settlementRef: settlement.settlement_ref || '',
            settlementDate: settlement.settlement_date || '',
            feeAmount: settlement.fee_amount?.toString() || '0',
            selectedReceiptIds: new Set(settlement.receipt_ids || []),
            searchCandidate: '',
            notes: settlement.notes || ''
        });
    };

    // Candidate pool for Edit Modal: currently linked receipts + currently unsettled receipts for that gateway
    const editCandidateReceipts = useMemo(() => {
        if (!editModal.open || !editModal.settlement) return [];
        const linked = editModal.settlement.receipts || [];
        const gwId = editModal.settlement.gateway_account_id;
        const otherUnsettled = allUnsettledReceipts.filter(r => r.payment_account_id === gwId && !(editModal.settlement.receipt_ids || []).includes(r.id));
        return [...linked, ...otherUnsettled];
    }, [editModal.open, editModal.settlement, allUnsettledReceipts]);

    // Submit Edit Settlement
    const handleConfirmEditModal = async () => {
        const { settlement, settlementRef, settlementDate, feeAmount, selectedReceiptIds, notes } = editModal;
        if (!settlement) return;

        try {
            setProcessingAction(true);
            const feeNum = parseFloat(feeAmount) || 0;
            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: settlement.id,
                    settlement_ref: settlementRef,
                    settlement_date: settlementDate,
                    fee_amount: feeNum,
                    tax_amount: 0,
                    receipt_ids: Array.from(selectedReceiptIds),
                    notes: notes
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setEditModal(prev => ({ ...prev, open: false, settlement: null }));
                await fetchSettlementsData();
            } else {
                alert(json.error || 'Failed to update settlement');
            }
        } catch (err) {
            console.error('Update settlement error:', err);
            alert(err.message || 'Error updating settlement');
        } finally {
            setProcessingAction(false);
        }
    };

    // ── Submit Delete / Un-settle Settlement ──────────────────────────────────
    const handleConfirmDelete = async () => {
        const { settlement } = deleteModal;
        if (!settlement) return;

        try {
            setProcessingAction(true);
            const res = await fetch(`/api/admin/gateway-settlements?id=${settlement.id}`, {
                method: 'DELETE'
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setDeleteModal({ open: false, settlement: null });
                await fetchSettlementsData();
            } else {
                alert(json.error || 'Failed to delete settlement');
            }
        } catch (err) {
            console.error('Delete settlement error:', err);
            alert(err.message || 'Error deleting settlement');
        } finally {
            setProcessingAction(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Action Feedback Banner */}
            {actionMessage && (
                <div style={{
                    padding: '10px 14px', borderRadius: '6px', fontSize: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: actionMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
                    border: `1px solid ${actionMessage.type === 'success' ? '#86efac' : '#fca5a5'}`
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {actionMessage.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
                </div>
            )}

            {/* KPI Summary Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '10px'
            }}>
                <div style={{
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Landmark size={13} style={{ color: '#10b981' }} /> Total Net Credited
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>
                        ₹{fmt(kpiSummary.totalNet)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        Deposited into Bank Accounts
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} style={{ color: '#3b82f6' }} /> Collections Cleared
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{fmt(kpiSummary.totalGross)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        {kpiSummary.totalReceipts} customer receipts settled
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <DollarSign size={13} style={{ color: '#f59e0b' }} /> Gateway MDR Fees
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b' }}>
                        ₹{fmt(kpiSummary.totalFees)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        Deducted & booked to Purchase
                    </div>
                </div>

                <div style={{
                    backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                    borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FileText size={13} style={{ color: '#8b5cf6' }} /> Total Reconciliations
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {kpiSummary.count}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                        Audit settlement logs
                    </div>
                </div>
            </div>

            {/* Filter and Actions Bar */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--bg-elevated)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    {/* Gateway Account Selector */}
                    <select
                        value={selectedGatewayId}
                        onChange={e => setSelectedGatewayId(e.target.value)}
                        style={{
                            padding: '5px 8px', fontSize: '11.5px', fontWeight: 600,
                            borderRadius: '6px', border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'
                        }}
                    >
                        <option value="">All Payment Gateways</option>
                        {gatewayAccounts.map(g => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                    </select>

                    {/* Date Presets */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                            { key: 'all', label: 'All Time' },
                            { key: 'this_month', label: 'This Month' },
                            { key: 'last_30_days', label: 'Last 30 Days' },
                            { key: 'custom', label: 'Custom' }
                        ].map(dp => (
                            <button
                                key={dp.key}
                                type="button"
                                onClick={() => setDatePreset(dp.key)}
                                style={{
                                    padding: '4px 8px', fontSize: '11px', borderRadius: '4px', border: 'none',
                                    backgroundColor: datePreset === dp.key ? 'var(--color-primary)' : 'transparent',
                                    color: datePreset === dp.key ? 'white' : 'var(--text-secondary)',
                                    fontWeight: datePreset === dp.key ? 700 : 500, cursor: 'pointer'
                                }}
                            >
                                {dp.label}
                            </button>
                        ))}
                    </div>

                    {datePreset === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={e => setFromDate(e.target.value)}
                                style={{ padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>to</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={e => setToDate(e.target.value)}
                                style={{ padding: '3px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    )}

                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by ref, notes, customer..."
                            style={{
                                padding: '4px 8px 4px 26px', fontSize: '11.5px',
                                borderRadius: '6px', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                width: isMobile ? '160px' : '220px'
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={handleOpenManualModal}
                        style={{
                            padding: '6px 12px', fontSize: '11.5px', fontWeight: 700,
                            borderRadius: '6px', border: 'none',
                            backgroundColor: 'var(--color-primary)', color: 'white',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <PlusCircle size={14} /> New Manual Settlement
                    </button>
                    <button
                        onClick={fetchSettlementsData}
                        disabled={loading}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <RefreshCw size={12} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Settlements Table */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '8px 10px', width: '30px' }}></th>
                                <th style={{ padding: '8px 10px' }}>Date</th>
                                <th style={{ padding: '8px 10px' }}>Reference / UTR</th>
                                <th style={{ padding: '8px 10px' }}>Gateway Account</th>
                                <th style={{ padding: '8px 10px' }}>Bank Account</th>
                                <th style={{ padding: '8px 10px' }}>Collections Settled</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>MDR Fee</th>
                                <th style={{ padding: '8px 10px', textAlign: 'right' }}>Net Bank Deposit</th>
                                <th style={{ padding: '8px 10px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        <Loader2 size={20} className="spin" style={{ margin: '0 auto 8px' }} />
                                        Loading settlements history...
                                    </td>
                                </tr>
                            ) : filteredSettlements.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        <CheckCircle2 size={32} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>No Settlements Found</div>
                                        <div style={{ fontSize: '11px', maxWidth: '360px', margin: '0 auto 12px' }}>
                                            Reconcile bank payouts in the Payment Gateways tab or click "+ New Manual Settlement" to link customer collections to your bank deposit.
                                        </div>
                                        <button
                                            onClick={handleOpenManualModal}
                                            style={{
                                                padding: '5px 12px', fontSize: '11px', fontWeight: 600,
                                                borderRadius: '6px', border: '1px solid var(--color-primary)',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--color-primary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            + Create First Settlement
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                filteredSettlements.map(s => {
                                    const isExpanded = expandedIds.has(s.id);
                                    const recCount = s.receiptCount || (s.receipts || []).length || 0;
                                    const fee = parseFloat(s.fee_amount) || 0;

                                    return (
                                        <>
                                            <tr
                                                key={s.id}
                                                style={{
                                                    borderBottom: isExpanded ? 'none' : '1px solid var(--border-secondary)',
                                                    backgroundColor: isExpanded ? 'var(--bg-secondary)' : 'transparent',
                                                    transition: 'background-color 0.15s'
                                                }}
                                            >
                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => toggleExpand(s.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px' }}
                                                        title={isExpanded ? 'Collapse' : 'Expand transactions'}
                                                    >
                                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                    {fmtDate(s.settlement_date)}
                                                </td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <span style={{
                                                        fontFamily: 'monospace', fontWeight: 600, fontSize: '11px',
                                                        padding: '2px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)',
                                                        border: '1px solid var(--border-secondary)'
                                                    }}>
                                                        {s.settlement_ref || '—'}
                                                    </span>
                                                    {s.notes && (
                                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {s.notes}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Smartphone size={12} style={{ color: '#0ea5e9' }} />
                                                        {s.gatewayAccount?.name || 'Payment Gateway'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Landmark size={12} style={{ color: '#10b981' }} />
                                                        {s.destinationAccount?.name || 'HDFC Bank'}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '8px 10px' }}>
                                                    <span
                                                        onClick={() => toggleExpand(s.id)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                            padding: '2px 8px', borderRadius: '12px',
                                                            backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb',
                                                            fontWeight: 600, fontSize: '10.5px'
                                                        }}
                                                    >
                                                        {recCount} receipts · ₹{fmt(s.gross_amount)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                                    {fee > 0 ? (
                                                        <div>
                                                            <span style={{ fontWeight: 700, color: '#f59e0b' }}>₹{fmt(fee)}</span>
                                                            {s.purchaseInvoice && (
                                                                <div style={{ fontSize: '9.5px', color: 'var(--text-tertiary)' }}>
                                                                    {s.purchaseInvoice.invoice_number}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-tertiary)' }}>₹0.00</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '12px' }}>
                                                    +₹{fmt(s.net_amount)}
                                                </td>
                                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <button
                                                            onClick={() => toggleExpand(s.id)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '3px 6px', fontSize: '10.5px' }}
                                                            title="Inspect linked customer collections"
                                                        >
                                                            <Eye size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenEditModal(s)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '3px 6px', fontSize: '10.5px' }}
                                                            title="Edit settlement details & linked transactions"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => setDeleteModal({ open: true, settlement: s })}
                                                            style={{
                                                                padding: '3px 6px', fontSize: '10.5px', borderRadius: '4px',
                                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Un-settle / Rollback settlement"
                                                        >
                                                            <RotateCcw size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Linked Transactions Drawer */}
                                            {isExpanded && (
                                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                                    <td colSpan={9} style={{ padding: '12px 16px' }}>
                                                        <div style={{
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '10px'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                                                <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                                                                    Customer Collections Linked to Settlement {s.settlement_ref || 'Batch'} ({recCount} vouchers)
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                                    <span>Gross Cleared: <strong>₹{fmt(s.gross_amount)}</strong></span>
                                                                    <span>·</span>
                                                                    <span>MDR Fee: <strong style={{ color: fee > 0 ? '#f59e0b' : 'inherit' }}>₹{fmt(fee)}</strong></span>
                                                                    <span>·</span>
                                                                    <span>Net Bank Deposit: <strong style={{ color: '#10b981' }}>₹{fmt(s.net_amount)}</strong></span>
                                                                </div>
                                                            </div>

                                                            {/* Table of linked receipts */}
                                                            {(!s.receipts || s.receipts.length === 0) ? (
                                                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                                    No individual customer receipts recorded for this settlement.
                                                                </div>
                                                            ) : (
                                                                <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-secondary)', borderRadius: '6px' }}>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                                                                        <thead>
                                                                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-secondary)', color: 'var(--text-tertiary)' }}>
                                                                                <th style={{ padding: '5px 8px' }}>Receipt #</th>
                                                                                <th style={{ padding: '5px 8px' }}>Date</th>
                                                                                <th style={{ padding: '5px 8px' }}>Customer / Narration</th>
                                                                                <th style={{ padding: '5px 8px' }}>Channel</th>
                                                                                <th style={{ padding: '5px 8px', textAlign: 'right' }}>Amount</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {s.receipts.map(r => (
                                                                                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                                                                                    <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                                                        {r.receipt_number || 'RC-—'}
                                                                                    </td>
                                                                                    <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>
                                                                                        {fmtDate(r.date)}
                                                                                    </td>
                                                                                    <td style={{ padding: '5px 8px', color: 'var(--text-primary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                                        {r.narration || r.account_name || 'Customer Collection'}
                                                                                    </td>
                                                                                    <td style={{ padding: '5px 8px' }}>
                                                                                        <span style={{
                                                                                            padding: '1px 6px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 600,
                                                                                            backgroundColor: r.channelType === 'pos' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                                                                                            color: r.channelType === 'pos' ? '#2563eb' : '#9333ea'
                                                                                        }}>
                                                                                            {r.channelType === 'pos' ? 'Store POS' : (r.technicianName || 'Technician')}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                                        ₹{fmt(r.amount)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}

                                                            {/* Accounting Journal Breakdown */}
                                                            <div style={{
                                                                fontSize: '10.5px', color: 'var(--text-secondary)',
                                                                padding: '8px 10px', backgroundColor: 'var(--bg-secondary)',
                                                                borderRadius: '6px', border: '1px solid var(--border-secondary)'
                                                            }}>
                                                                <strong style={{ color: 'var(--text-primary)' }}>Double-Entry Ledger Audit:</strong>
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                                                                    <span>🟢 <strong>Debit Bank:</strong> {s.destinationAccount?.name || 'HDFC Bank'} (+₹{fmt(s.net_amount)})</span>
                                                                    {fee > 0 && (
                                                                        <span>🟠 <strong>Debit Expense:</strong> Payment Gateway MDR Charges (+₹{fmt(fee)})</span>
                                                                    )}
                                                                    <span>🔴 <strong>Credit Clearing:</strong> {s.gatewayAccount?.name || 'Gateway Clearing'} (-₹{fmt(s.gross_amount)})</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{
                    padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)'
                }}>
                    <div>Showing <strong>{filteredSettlements.length}</strong> settlement reconciliation records</div>
                    <div>Total Settled Net: <strong>₹{fmt(kpiSummary.totalNet)}</strong></div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ⚡ MODAL: CREATE MANUAL RECONCILIATION / SETTLEMENT                      */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {manualModal.open && (() => {
                const candidates = manualCandidateReceipts;
                const selectedIds = manualModal.selectedReceiptIds || new Set();
                const selectedRecs = candidates.filter(r => selectedIds.has(r.id));
                const selectedCount = selectedRecs.length;
                const selectedTotal = selectedRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

                const bankNum = parseFloat(manualModal.bankAmount) || 0;
                const targetAmount = bankNum > 0 ? bankNum : selectedTotal;
                const variance = +(bankNum - selectedTotal).toFixed(2);
                const absDiff = Math.abs(variance);
                const diffPct = selectedTotal > 0 ? (absDiff / selectedTotal) * 100 : 0;
                const isExact = Math.abs(variance) < 0.05;
                const isReasonableFee = variance < 0 && diffPct <= 5.0;
                const isExcessive = variance < 0 && diffPct > 5.0;

                const q = (manualModal.searchCandidates || '').toLowerCase();
                const visibleCandidates = candidates.filter(r => {
                    if (!q) return true;
                    return (
                        (r.receipt_number || '').toLowerCase().includes(q) ||
                        (r.narration || '').toLowerCase().includes(q) ||
                        (r.account_name || '').toLowerCase().includes(q) ||
                        (r.technicianName || '').toLowerCase().includes(q) ||
                        (r.amount?.toString() || '').includes(q)
                    );
                });

                const toggleCandidate = (id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);

                    const newRecs = candidates.filter(r => next.has(r.id));
                    const newTot = newRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                    const newVar = bankNum > 0 ? +(bankNum - newTot).toFixed(2) : 0;
                    const newDiff = Math.abs(newVar);
                    const newPct = newTot > 0 ? (newDiff / newTot) * 100 : 0;
                    const newIsFee = newVar < 0 && newPct <= 5.0;

                    setManualModal(prev => ({
                        ...prev,
                        selectedReceiptIds: next,
                        autoBalanceMissing: newVar > 0,
                        createCommission: newIsFee,
                        commissionFee: newIsFee ? newDiff.toFixed(2) : prev.commissionFee
                    }));
                };

                const updateSelection = (next) => {
                    const newRecs = candidates.filter(r => next.has(r.id));
                    const newTot = newRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                    const newVar = bankNum > 0 ? +(bankNum - newTot).toFixed(2) : 0;
                    const newDiff = Math.abs(newVar);
                    const newPct = newTot > 0 ? (newDiff / newTot) * 100 : 0;
                    const newIsFee = newVar < 0 && newPct <= 5.0;

                    setManualModal(prev => ({
                        ...prev,
                        selectedReceiptIds: next,
                        autoBalanceMissing: newVar > 0,
                        createCommission: newIsFee,
                        commissionFee: newIsFee ? newDiff.toFixed(2) : prev.commissionFee
                    }));
                };

                return (
                    <div style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1400, padding: '16px'
                    }}>
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '10px',
                            width: '100%',
                            maxWidth: '680px',
                            maxHeight: '92vh',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '12px 16px', borderBottom: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <PlusCircle size={16} style={{ color: 'var(--color-primary)' }} />
                                        Create Manual Settlement Reconciliation
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Record bank settlement, select linked customer collections, and generate double-entry vouchers
                                    </p>
                                </div>
                                <button
                                    onClick={() => setManualModal(prev => ({ ...prev, open: false }))}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', padding: '2px' }}
                                >✕</button>
                            </div>

                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                                {/* Account & Settlement Meta Inputs */}
                                <div style={{
                                    display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px',
                                    backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Gateway Clearing Account
                                        </label>
                                        <select
                                            value={manualModal.gatewayAccountId}
                                            onChange={e => setManualModal(prev => ({ ...prev, gatewayAccountId: e.target.value, selectedReceiptIds: new Set() }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            {!manualModal.gatewayAccountId && <option value="">-- Select Gateway Clearing Account --</option>}
                                            {gatewayAccounts.map(g => (
                                                <option key={g.id} value={g.id}>{g.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Destination Bank Account
                                        </label>
                                        <select
                                            value={manualModal.destinationAccountId}
                                            onChange={e => setManualModal(prev => ({ ...prev, destinationAccountId: e.target.value }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        >
                                            {!manualModal.destinationAccountId && <option value="">-- Select Bank Account --</option>}
                                            {bankAccounts.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Settlement Reference / UTR Number
                                        </label>
                                        <input
                                            type="text"
                                            value={manualModal.settlementRef}
                                            onChange={e => setManualModal(prev => ({ ...prev, settlementRef: e.target.value }))}
                                            placeholder="e.g. 000062776856 or NEFT-..."
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Settlement Date
                                        </label>
                                        <input
                                            type="date"
                                            value={manualModal.settlementDate}
                                            onChange={e => setManualModal(prev => ({ ...prev, settlementDate: e.target.value }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div style={{ gridColumn: isMobile ? '1' : '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Net Bank Statement Deposit Received (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={manualModal.bankAmount}
                                            onChange={e => setManualModal(prev => ({ ...prev, bankAmount: e.target.value }))}
                                            placeholder={selectedTotal > 0 ? `Selected total: ₹${selectedTotal}` : 'Enter amount credited to bank'}
                                            style={{ width: '100%', padding: '6px 8px', fontSize: '13px', fontWeight: 700, borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: '#10b981' }}
                                        />
                                    </div>
                                </div>

                                {/* Candidate Receipts Checklist */}
                                <div style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            Select Collections in this Settlement ({selectedCount} selected · ₹{fmt(selectedTotal)})
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {bankNum > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const best = findBestMatchingSubset(visibleCandidates.length > 0 ? visibleCandidates : candidates, bankNum);
                                                        updateSelection(new Set(best));
                                                    }}
                                                    style={{
                                                        padding: '3px 8px', fontSize: '10.5px', fontWeight: 600,
                                                        borderRadius: '4px', border: '1px solid #10b981',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                                                    }}
                                                >
                                                    🎯 Auto-Match Total
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => updateSelection(new Set(visibleCandidates.map(r => r.id)))}
                                                style={{ padding: '3px 6px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateSelection(new Set())}
                                                style={{ padding: '3px 6px', fontSize: '10.5px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {candidates.length > 5 && (
                                        <div style={{ position: 'relative' }}>
                                            <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="text"
                                                value={manualModal.searchCandidates || ''}
                                                onChange={e => setManualModal(prev => ({ ...prev, searchCandidates: e.target.value }))}
                                                placeholder="Filter collections by receipt #, customer, tech..."
                                                style={{
                                                    width: '100%', padding: '4px 8px 4px 26px', fontSize: '11px',
                                                    borderRadius: '4px', border: '1px solid var(--border-primary)',
                                                    backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Scrollable list */}
                                    <div style={{
                                        maxHeight: '160px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-secondary)',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-primary)'
                                    }}>
                                        {visibleCandidates.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                No unsettled receipts found for this gateway account.
                                            </div>
                                        ) : (
                                            visibleCandidates.map(r => {
                                                const isChecked = selectedIds.has(r.id);
                                                return (
                                                    <div
                                                        key={r.id}
                                                        onClick={() => toggleCandidate(r.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '5px 10px',
                                                            borderBottom: '1px solid var(--border-secondary)',
                                                            backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                                            cursor: 'pointer', fontSize: '11px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleCandidate(r.id)}
                                                                onClick={e => e.stopPropagation()}
                                                            />
                                                            <div>
                                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.receipt_number || 'RC-—'}</span>
                                                                <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>{fmtDate(r.date)}</span>
                                                                <span style={{
                                                                    marginLeft: '6px', fontSize: '9.5px', padding: '1px 5px', borderRadius: '3px',
                                                                    backgroundColor: r.channelType === 'pos' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                                                                    color: r.channelType === 'pos' ? '#2563eb' : '#9333ea', fontWeight: 600
                                                                }}>
                                                                    {r.channelType === 'pos' ? 'Store POS' : (r.technicianName || 'Technician')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                                            ₹{fmt(r.amount)}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* Variance and Commission Configuration */}
                                {bankNum > 0 && selectedCount > 0 && (
                                    <>
                                        {isExact ? (
                                            <div style={{
                                                padding: '8px 12px', borderRadius: '6px',
                                                backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                                display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11.5px', fontWeight: 600
                                            }}>
                                                <CheckCircle size={14} /> Selected customer collections match bank deposit exactly (₹{fmt(bankNum)})!
                                            </div>
                                        ) : variance < 0 ? (
                                            <div style={{
                                                padding: '8px 12px', borderRadius: '6px',
                                                backgroundColor: isExcessive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                                border: `1px solid ${isExcessive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                                display: 'flex', flexDirection: 'column', gap: '6px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExcessive ? '#ef4444' : '#d97706', fontWeight: 700, fontSize: '12px' }}>
                                                    <AlertTriangle size={14} />
                                                    {isExcessive
                                                        ? `Collections Exceed Bank Credit: -₹${fmt(absDiff)} (${diffPct.toFixed(0)}% extra)`
                                                        : `Gateway MDR Fee Difference: -₹${fmt(absDiff)} (~${diffPct.toFixed(2)}%)`}
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={manualModal.createCommission}
                                                        onChange={e => setManualModal(prev => ({ ...prev, createCommission: e.target.checked, commissionFee: e.target.checked ? absDiff.toString() : '' }))}
                                                    />
                                                    <span>Auto-create Purchase Voucher for Gateway Commission (₹{fmt(absDiff)})</span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '8px 12px', borderRadius: '6px',
                                                backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                                display: 'flex', flexDirection: 'column', gap: '6px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '12px' }}>
                                                    <AlertTriangle size={14} /> Bank received ₹{fmt(absDiff)} more than selected receipts
                                                </div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11.5px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={manualModal.autoBalanceMissing}
                                                        onChange={e => setManualModal(prev => ({ ...prev, autoBalanceMissing: e.target.checked }))}
                                                    />
                                                    <span>Auto-create balancing receipt voucher for ₹{fmt(absDiff)}</span>
                                                </label>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                        Narration / Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={manualModal.notes}
                                        onChange={e => setManualModal(prev => ({ ...prev, notes: e.target.value }))}
                                        placeholder="Optional reconciliation notes..."
                                        style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 16px', borderTop: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <button
                                    onClick={() => setManualModal(prev => ({ ...prev, open: false }))}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmManualModal}
                                    disabled={processingAction || (selectedCount === 0 && !manualModal.autoBalanceMissing)}
                                    style={{
                                        padding: '6px 16px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700,
                                        border: 'none', backgroundColor: '#10b981', color: 'white',
                                        cursor: (selectedCount === 0 && !manualModal.autoBalanceMissing) ? 'not-allowed' : 'pointer',
                                        opacity: (selectedCount === 0 && !manualModal.autoBalanceMissing) ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {processingAction ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                                    Confirm Settlement ({selectedCount} items · ₹{fmt(bankNum > 0 ? bankNum : selectedTotal)})
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ⚡ MODAL: EDIT EXISTING SETTLEMENT                                       */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {editModal.open && editModal.settlement && (() => {
                const s = editModal.settlement;
                const pool = editCandidateReceipts;
                const selectedIds = editModal.selectedReceiptIds || new Set();
                const selectedRecs = pool.filter(r => selectedIds.has(r.id));
                const selectedCount = selectedRecs.length;
                const selectedTotal = selectedRecs.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
                const feeNum = parseFloat(editModal.feeAmount) || 0;
                const computedNet = +(selectedTotal - feeNum).toFixed(2);

                const q = (editModal.searchCandidate || '').toLowerCase();
                const visiblePool = pool.filter(r => {
                    if (!q) return true;
                    return (
                        (r.receipt_number || '').toLowerCase().includes(q) ||
                        (r.narration || '').toLowerCase().includes(q) ||
                        (r.account_name || '').toLowerCase().includes(q) ||
                        (r.technicianName || '').toLowerCase().includes(q) ||
                        (r.amount?.toString() || '').includes(q)
                    );
                });

                const toggleEditCandidate = (id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    setEditModal(prev => ({ ...prev, selectedReceiptIds: next }));
                };

                return (
                    <div style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1400, padding: '16px'
                    }}>
                        <div style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: '10px',
                            width: '100%',
                            maxWidth: '640px',
                            maxHeight: '92vh',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '12px 16px', borderBottom: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Edit2 size={15} style={{ color: 'var(--color-primary)' }} />
                                        Edit Settlement {s.settlement_ref || ''}
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Modify settlement details, add/remove linked collections, or adjust gateway MDR fee
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditModal(prev => ({ ...prev, open: false, settlement: null }))}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', padding: '2px' }}
                                >✕</button>
                            </div>

                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                                    backgroundColor: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-primary)'
                                }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Settlement Reference / UTR
                                        </label>
                                        <input
                                            type="text"
                                            value={editModal.settlementRef}
                                            onChange={e => setEditModal(prev => ({ ...prev, settlementRef: e.target.value }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Settlement Date
                                        </label>
                                        <input
                                            type="date"
                                            value={editModal.settlementDate}
                                            onChange={e => setEditModal(prev => ({ ...prev, settlementDate: e.target.value }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Gateway MDR Fee (₹)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editModal.feeAmount}
                                            onChange={e => setEditModal(prev => ({ ...prev, feeAmount: e.target.value }))}
                                            style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                            Net Bank Amount (Calculated)
                                        </label>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#10b981', paddingTop: '4px' }}>
                                            ₹{fmt(computedNet)}
                                        </div>
                                    </div>
                                </div>

                                {/* Checklist of receipts */}
                                <div style={{
                                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                    borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            Linked Collections ({selectedCount} linked · ₹{fmt(selectedTotal)})
                                        </span>
                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                            Uncheck to remove and return to holding
                                        </span>
                                    </div>

                                    {pool.length > 5 && (
                                        <div style={{ position: 'relative' }}>
                                            <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="text"
                                                value={editModal.searchCandidate || ''}
                                                onChange={e => setEditModal(prev => ({ ...prev, searchCandidate: e.target.value }))}
                                                placeholder="Filter collections..."
                                                style={{ width: '100%', padding: '4px 8px 4px 26px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    )}

                                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-secondary)', borderRadius: '4px', backgroundColor: 'var(--bg-primary)' }}>
                                        {visiblePool.map(r => {
                                            const isChecked = selectedIds.has(r.id);
                                            return (
                                                <div
                                                    key={r.id}
                                                    onClick={() => toggleEditCandidate(r.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '5px 10px', borderBottom: '1px solid var(--border-secondary)',
                                                        backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                                        cursor: 'pointer', fontSize: '11px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleEditCandidate(r.id)}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                        <div>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.receipt_number || 'RC-—'}</span>
                                                            <span style={{ color: 'var(--text-tertiary)', marginLeft: '6px' }}>{fmtDate(r.date)}</span>
                                                            <span style={{
                                                                marginLeft: '6px', fontSize: '9.5px', padding: '1px 5px', borderRadius: '3px',
                                                                backgroundColor: r.channelType === 'pos' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(168, 85, 247, 0.12)',
                                                                color: r.channelType === 'pos' ? '#2563eb' : '#9333ea', fontWeight: 600
                                                            }}>
                                                                {r.channelType === 'pos' ? 'Store POS' : (r.technicianName || 'Technician')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        ₹{fmt(r.amount)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                                        Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={editModal.notes}
                                        onChange={e => setEditModal(prev => ({ ...prev, notes: e.target.value }))}
                                        style={{ width: '100%', padding: '5px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 16px', borderTop: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <button
                                    onClick={() => setEditModal(prev => ({ ...prev, open: false, settlement: null }))}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmEditModal}
                                    disabled={processingAction}
                                    className="btn btn-primary"
                                    style={{ padding: '6px 16px', fontSize: '11.5px', fontWeight: 700 }}
                                >
                                    {processingAction && <Loader2 size={12} className="spin" />}
                                    Save Changes (₹{fmt(computedNet)})
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ⚡ MODAL: DELETE / UN-SETTLE CONFIRMATION                                */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {deleteModal.open && deleteModal.settlement && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1500, padding: '16px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: '10px',
                        width: '100%',
                        maxWidth: '480px',
                        border: '1px solid rgba(239, 68, 68, 0.4)',
                        boxShadow: 'var(--shadow-xl)',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                            <AlertTriangle size={20} />
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>
                                Un-settle & Delete Settlement?
                            </h4>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            Are you sure you want to rollback settlement <strong>{deleteModal.settlement.settlement_ref || 'Batch'}</strong> (₹{fmt(deleteModal.settlement.net_amount)})?
                        </p>
                        <div style={{
                            padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px',
                            border: '1px solid var(--border-primary)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5
                        }}>
                            <strong>Rollback Impact:</strong>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                                <li>All <strong>{deleteModal.settlement.receiptCount || (deleteModal.settlement.receipts || []).length || 0} customer collections</strong> will be returned to unsettled holding.</li>
                                {deleteModal.settlement.purchase_invoice_id && (
                                    <li>The associated MDR commission purchase voucher will be deleted.</li>
                                )}
                                <li>The settlement record will be removed from the audit ledger.</li>
                            </ul>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                            <button
                                onClick={() => setDeleteModal({ open: false, settlement: null })}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '11px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={processingAction}
                                style={{
                                    padding: '6px 16px', fontSize: '11.5px', fontWeight: 700,
                                    borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: 'white',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {processingAction && <Loader2 size={12} className="spin" />}
                                Yes, Rollback Settlement
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
