'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    CreditCard, Smartphone, CheckCircle2, Clock, Filter,
    RefreshCw, Loader2, ArrowRight, DollarSign, Store,
    Briefcase, FileText, Check, AlertCircle, ChevronDown,
    Search, Download, ExternalLink, Calendar, PlusCircle,
    Landmark, AlertTriangle, Sparkles, CheckCircle, ChevronUp,
    HelpCircle, Eye, ShieldCheck, ArrowUpRight, X
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

export default function PaymentGatewaysSubTab({ isMobile = false }) {
    const [loading, setLoading] = useState(true);
    const [receipts, setReceipts] = useState([]);
    const [gatewayAccounts, setGatewayAccounts] = useState([]);
    const [bankPayouts, setBankPayouts] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [summary, setSummary] = useState({ totalUnsettled: 0, posTotal: 0, techTotal: 0, count: 0 });

    // Bank Payouts Matcher controls
    const [payoutFilter, setPayoutFilter] = useState('pending'); // 'pending' | 'all'
    const [isPayoutsCollapsed, setIsPayoutsCollapsed] = useState(false);

    // Filters for Receipts Table
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
    const [reconcileModal, setReconcileModal] = useState({
        open: false,
        payout: null,
        selectedReceiptIds: new Set(),
        searchCandidate: '',
        autoBalanceMissing: true,
        createCommission: false,
        commissionFee: '',
        notes: ''
    });

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

    // ── Fetch Gateway & Bank Payout Data ─────────────────────────────────────────
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
                setBankPayouts(json.bankPayouts || []);
                setSettlements(json.settlements || []);
                setSummary(json.summary || { totalUnsettled: 0, posTotal: 0, techTotal: 0, count: 0 });
                setSelectedIds(new Set());
            } else {
                console.error('Failed to load gateway data:', json.error);
                setActionMessage({ type: 'error', text: json.error || 'Failed to load gateway transactions' });
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setActionMessage({ type: 'error', text: err.message || 'Network error fetching gateway transactions' });
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
            const past = new Date(yyyy, today.getMonth(), today.getDate() - 7);
            const pY = past.getFullYear();
            const pM = String(past.getMonth() + 1).padStart(2, '0');
            const pD = String(past.getDate()).padStart(2, '0');
            setFromDate(`${pY}-${pM}-${pD}`);
            setToDate(todayStr);
        } else if (preset === 'month') {
            setFromDate(`${yyyy}-${mm}-01`);
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
            const targetGwId = selectedGatewayId || gatewayAccounts[0]?.id;
            if (!targetGwId) {
                alert('Please select a payment gateway account');
                return;
            }

            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'create_commission_voucher',
                    gateway_account_id: targetGwId,
                    gross_amount: commissionModal.gross,
                    fee_amount: commissionCalc.baseFee,
                    tax_amount: commissionCalc.tax,
                    voucher_ids: commissionModal.items.map(r => r.id),
                    notes: commNotes
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setCommissionModal({ open: false, items: [], gross: 0 });
                fetchData();
            } else {
                alert(json.error || 'Failed to create commission voucher');
            }
        } catch (err) {
            console.error('Error creating commission voucher:', err);
            alert(err.message || 'Error creating commission voucher');
        } finally {
            setProcessingAction(false);
        }
    };

    // ── Open Settle Modal ──────────────────────────────────────────────────────
    const openSettleModalFor = (items) => {
        const gross = items.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        setSettleModal({ open: true, items, gross });
        setSettleRef(`SETTLE-${new Date().toISOString().split('T')[0]}`);
    };

    const settleCalc = useMemo(() => {
        const gross = settleModal.gross || 0;
        const feePct = createCommWithSettle ? (parseFloat(settleFeePercent) || 0) : 0;
        const baseFee = +(gross * (feePct / 100)).toFixed(2);
        const tax = +(baseFee * 0.18).toFixed(2);
        const totalFee = baseFee + tax;
        const net = +(gross - totalFee).toFixed(2);
        return { baseFee, tax, totalFee, net };
    }, [settleModal.gross, settleFeePercent, createCommWithSettle]);

    const handleSettleBatch = async () => {
        try {
            setProcessingAction(true);
            const targetGwId = selectedGatewayId || gatewayAccounts[0]?.id;
            if (!targetGwId) {
                alert('Please select a payment gateway account');
                return;
            }

            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'settle_batch',
                    gateway_account_id: targetGwId,
                    receipt_ids: settleModal.items.map(r => r.id),
                    gross_amount: settleModal.gross,
                    fee_amount: settleCalc.baseFee,
                    tax_amount: settleCalc.tax,
                    net_amount: settleCalc.net,
                    settlement_ref: settleRef,
                    settlement_date: settleDate,
                    create_commission_voucher: createCommWithSettle && settleCalc.totalFee > 0,
                    notes: `Settled ${settleModal.items.length} collections into HDFC Bank`
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setSettleModal({ open: false, items: [], gross: 0 });
                fetchData();
            } else {
                alert(json.error || 'Failed to settle transactions');
            }
        } catch (err) {
            console.error('Error settling transactions:', err);
            alert(err.message || 'Error settling transactions');
        } finally {
            setProcessingAction(false);
        }
    };

    // ── Open 1-Click Match & Reconcile Modal ────────────────────────────────────
    const openReconcileModalFor = (payout) => {
        const candidates = payout.candidateReceipts || [];
        const bestIds = findBestMatchingSubset(candidates, payout.amount);
        const initialSelectedIds = new Set(bestIds.length > 0 ? bestIds : candidates.map(r => r.id));

        const selectedRecs = candidates.filter(r => initialSelectedIds.has(r.id));
        const selectedTotal = selectedRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const variance = +(payout.amount - selectedTotal).toFixed(2);
        const absDiff = Math.abs(variance);
        const diffPct = selectedTotal > 0 ? (absDiff / selectedTotal) * 100 : 0;
        const isReasonableFee = variance < 0 && diffPct <= 5.0;

        setReconcileModal({
            open: true,
            payout,
            selectedReceiptIds: initialSelectedIds,
            searchCandidate: '',
            autoBalanceMissing: variance > 0,
            createCommission: isReasonableFee,
            commissionFee: isReasonableFee ? absDiff.toFixed(2) : '',
            notes: `Bank payout reconciliation ${payout.ref_no || ''}`
        });
    };

    // Submit 1-Click Match & Reconcile
    const handleReconcilePayout = async () => {
        const { payout, selectedReceiptIds, autoBalanceMissing, createCommission, commissionFee, notes } = reconcileModal;
        if (!payout) return;

        const candidateReceipts = payout.candidateReceipts || [];
        const selectedRecs = candidateReceipts.filter(r => selectedReceiptIds?.has(r.id));
        const selectedTotal = selectedRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
        const variance = +(payout.amount - selectedTotal).toFixed(2);
        const receiptIds = Array.from(selectedReceiptIds || []);

        if (receiptIds.length === 0 && !autoBalanceMissing) {
            alert('Please select at least one customer collection receipt to settle, or check auto-balance.');
            return;
        }

        try {
            setProcessingAction(true);
            const feeNum = parseFloat(commissionFee) || 0;
            const res = await fetch('/api/admin/gateway-settlements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'reconcile_bank_payout',
                    bank_payout_id: payout.id,
                    payout_source: payout.origin,
                    gateway_account_id: payout.gatewayAccountId,
                    receipt_ids: receiptIds,
                    bank_amount: payout.amount,
                    gross_amount: selectedTotal,
                    settlement_ref: payout.ref_no,
                    settlement_date: payout.date,
                    create_missing_voucher: autoBalanceMissing,
                    missing_amount: variance > 0 ? variance : 0,
                    create_commission_voucher: createCommission && feeNum > 0,
                    fee_amount: feeNum,
                    tax_amount: 0,
                    notes: notes || `Reconciled HDFC bank payout ${payout.ref_no || ''}`
                })
            });

            const json = await res.json();
            if (json.success) {
                setActionMessage({ type: 'success', text: json.message });
                setReconcileModal({ open: false, payout: null, selectedReceiptIds: new Set(), searchCandidate: '', autoBalanceMissing: true, createCommission: false, commissionFee: '', notes: '' });
                fetchData();
            } else {
                alert(json.error || 'Failed to reconcile payout');
            }
        } catch (err) {
            console.error('Reconcile error:', err);
            alert(err.message || 'Error reconciling payout');
        } finally {
            setProcessingAction(false);
        }
    };

    // Filter payouts according to tab toggle
    const visiblePayouts = useMemo(() => {
        if (payoutFilter === 'pending') {
            return bankPayouts.filter(p => !p.isReconciled);
        }
        return bankPayouts;
    }, [bankPayouts, payoutFilter]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* ── Action Notification Banner ── */}
            {actionMessage && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                    border: `1px solid ${actionMessage.type === 'success' ? '#10b981' : '#ef4444'}`,
                    color: actionMessage.type === 'success' ? '#10b981' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    fontWeight: 500
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setActionMessage(null)}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}
                    >✕</button>
                </div>
            )}

            {/* ── Top Overview Summary KPIs ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
                gap: '12px'
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

                {/* Card 4: Detected Payouts Pending Reconcile */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderLeft: '4px solid #8b5cf6'
                }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Landmark size={12} color="#8b5cf6" /> HDFC Payouts Detected
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6', marginTop: '4px' }}>
                        {bankPayouts.filter(p => !p.isReconciled).length} Pending
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                        From Statement / Scraper
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* 🏦 DAILY BANK SETTLEMENT RECONCILIATION MATCHER                        */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            <div style={{
                borderRadius: '10px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Matcher Header */}
                <div style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            backgroundColor: 'rgba(59, 130, 246, 0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#3b82f6'
                        }}>
                            <Landmark size={18} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Daily Bank Settlement Matcher
                                </span>
                                <span style={{
                                    fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                                    backgroundColor: bankPayouts.filter(p => !p.isReconciled).length > 0 ? '#fef3c7' : '#dcfce7',
                                    color: bankPayouts.filter(p => !p.isReconciled).length > 0 ? '#92400e' : '#166534',
                                    fontWeight: 600
                                }}>
                                    {bankPayouts.filter(p => !p.isReconciled).length} Payout(s) Awaiting Match
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                Compares actual HDFC settlement deposits (from Bank Statement / Gmail scraper) against Store POS & Technician receipts
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Toggle Pending vs All */}
                        <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                            <button
                                onClick={() => setPayoutFilter('pending')}
                                style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                                    border: 'none', cursor: 'pointer',
                                    backgroundColor: payoutFilter === 'pending' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                    color: payoutFilter === 'pending' ? 'var(--primary)' : 'var(--text-secondary)'
                                }}
                            >
                                Pending ({bankPayouts.filter(p => !p.isReconciled).length})
                            </button>
                            <button
                                onClick={() => setPayoutFilter('all')}
                                style={{
                                    padding: '4px 10px', fontSize: '11px', fontWeight: 600,
                                    border: 'none', cursor: 'pointer',
                                    backgroundColor: payoutFilter === 'all' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                    color: payoutFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)'
                                }}
                            >
                                All ({bankPayouts.length})
                            </button>
                        </div>

                        <button
                            onClick={() => setIsPayoutsCollapsed(!isPayoutsCollapsed)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center'
                            }}
                            title={isPayoutsCollapsed ? 'Expand Matcher' : 'Collapse Matcher'}
                        >
                            {isPayoutsCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </div>

                {/* Matcher Content */}
                {!isPayoutsCollapsed && (
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {visiblePayouts.length === 0 ? (
                            <div style={{
                                padding: '24px', textAlign: 'center',
                                backgroundColor: 'var(--bg-secondary)', borderRadius: '8px',
                                border: '1px dashed var(--border-primary)', color: 'var(--text-secondary)'
                            }}>
                                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>All Bank Payouts Reconciled!</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', maxWidth: '420px', margin: '4px auto 0' }}>
                                    When new settlement credits hit HDFC (e.g. from Google India Digital Services or Razorpay) via your statement upload or Gmail scraper, they will appear here with automatic variance analysis.
                                </div>
                            </div>
                        ) : (
                            visiblePayouts.map(payout => {
                                const isMissing = payout.discrepancyType === 'missing_receipts';
                                const isShort = payout.discrepancyType === 'short_settlement';
                                const isMatched = payout.discrepancyType === 'matched';
                                const isReconciled = payout.isReconciled;

                                const borderColor = isReconciled ? 'var(--border-primary)' : (isMissing ? '#ef4444' : (isShort ? '#f59e0b' : '#10b981'));
                                const badgeBg = isReconciled ? 'rgba(100, 116, 139, 0.12)' : (isMissing ? 'rgba(239, 68, 68, 0.12)' : (isShort ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)'));
                                const badgeColor = isReconciled ? '#64748b' : (isMissing ? '#ef4444' : (isShort ? '#f59e0b' : '#10b981'));

                                return (
                                    <div
                                        key={`${payout.origin}-${payout.id}`}
                                        style={{
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--bg-primary)',
                                            border: `1px solid ${borderColor}`,
                                            padding: '12px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px'
                                        }}
                                    >
                                        {/* Card Top Row: Meta info & Origin */}
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '8px',
                                            borderBottom: '1px solid var(--border-primary)',
                                            paddingBottom: '8px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {payout.provider}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>•</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    Date: <strong>{fmtDate(payout.date)}</strong>
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>•</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                    Ref/UTR: {payout.ref_no || '—'}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                                    backgroundColor: payout.origin === 'statement' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                                                    color: payout.origin === 'statement' ? '#3b82f6' : '#8b5cf6',
                                                    fontWeight: 600
                                                }}>
                                                    {payout.origin === 'statement' ? '📄 HDFC STATEMENT' : '📬 GMAIL ALERT'}
                                                </span>
                                                <span style={{
                                                    fontSize: '10px', padding: '2px 8px', borderRadius: '12px',
                                                    backgroundColor: badgeBg, color: badgeColor, fontWeight: 700
                                                }}>
                                                    {isReconciled ? '✅ RECONCILED' : (isMissing ? '🚨 MISSING RECEIPTS' : (isShort ? '⚠️ SHORT / ROLLOVER' : '✅ MATCHED'))}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Comparison 3-Column Grid */}
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMobile ? '1fr' : '1.2fr 1.3fr 1.5fr',
                                            gap: '12px',
                                            alignItems: 'stretch'
                                        }}>
                                            {/* Column 1: Bank Inflow */}
                                            <div style={{
                                                padding: '10px 12px', borderRadius: '6px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                    1. HDFC Bank Credit (Actual)
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981', marginTop: '2px' }}>
                                                    ₹{fmt(payout.amount)}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={payout.particulars}>
                                                    {payout.particulars}
                                                </div>
                                            </div>

                                            {/* Column 2: Operations Receipts */}
                                            <div style={{
                                                padding: '10px 12px', borderRadius: '6px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                    2. System Collections (Batch Window)
                                                </div>
                                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                                                    ₹{fmt(payout.candidateTotal)}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    🏪 POS: <strong>₹{fmt(payout.candidatePos)}</strong> · 💼 Tech: <strong>₹{fmt(payout.candidateTech)}</strong> ({payout.candidateCount} vouchers)
                                                </div>
                                            </div>

                                            {/* Column 3: Variance & Financial Diagnosis */}
                                            <div style={{
                                                padding: '10px 12px', borderRadius: '6px',
                                                backgroundColor: isReconciled ? 'var(--bg-secondary)' : (isMissing ? 'rgba(239, 68, 68, 0.06)' : (isShort ? 'rgba(245, 158, 11, 0.06)' : 'rgba(16, 185, 129, 0.06)')),
                                                border: `1px solid ${borderColor}`,
                                                display: 'flex', flexDirection: 'column', justifyContent: 'center'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>
                                                        3. Variance & Diagnosis
                                                    </span>
                                                    <span style={{ fontSize: '14px', fontWeight: 800, color: badgeColor }}>
                                                        {payout.variance > 0 ? `+₹${fmt(payout.variance)}` : `₹${fmt(payout.variance)}`}
                                                    </span>
                                                </div>

                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.3 }}>
                                                    {isReconciled ? (
                                                        <span style={{ color: '#64748b' }}>✅ Successfully linked with vouchers and reconciled in HDFC ledger.</span>
                                                    ) : isMissing ? (
                                                        <span style={{ color: '#ef4444' }}>
                                                            <strong>🚨 Missing in System:</strong> Bank received ₹{fmt(payout.variance)} more than booked receipts. Technician or POS staff collected payment without punching a voucher!
                                                        </span>
                                                    ) : isShort ? (
                                                        <span style={{ color: '#d97706' }}>
                                                            <strong>⚠️ Short / Rollover:</strong> Receipts exceed bank payout by ₹{fmt(Math.abs(payout.variance))}. Check late cut-offs or gateway MDR commission deductions.
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#10b981' }}>
                                                            <strong>✅ Balanced:</strong> System receipts match bank payout perfectly!
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer: Action Buttons */}
                                        <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            justifyContent: 'flex-end',
                                            alignItems: 'center',
                                            gap: '8px',
                                            paddingTop: '4px'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    // Highlight candidate receipts in table below
                                                    if (payout.candidateReceipts && payout.candidateReceipts.length > 0) {
                                                        setSelectedIds(new Set(payout.candidateReceipts.map(r => r.id)));
                                                        document.getElementById('gateway-receipts-table')?.scrollIntoView({ behavior: 'smooth' });
                                                    } else {
                                                        alert('No candidate receipts found in batch window.');
                                                    }
                                                }}
                                                className="btn btn-secondary"
                                                style={{ padding: '5px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                            >
                                                <Eye size={12} /> Inspect {payout.candidateCount} Receipts in Table
                                            </button>

                                            {!isReconciled && (
                                                <button
                                                    onClick={() => openReconcileModalFor(payout)}
                                                    style={{
                                                        padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
                                                        border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: '5px'
                                                    }}
                                                >
                                                    <Sparkles size={12} /> 1-Click Match & Reconcile
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* ── Filter Bar for Receipts Table ── */}
            <div
                id="gateway-receipts-table"
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-elevated)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-primary)'
                }}
            >
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

                {/* Date Presets */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {['all', 'today', '7days', 'month'].map(p => (
                        <button
                            key={p}
                            onClick={() => handlePresetChange(p)}
                            style={{
                                padding: '4px 8px',
                                fontSize: '11px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: datePreset === p ? 'var(--primary)' : 'var(--bg-secondary)',
                                color: datePreset === p ? 'white' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                textTransform: 'capitalize'
                            }}
                        >
                            {p === '7days' ? 'Last 7 Days' : p}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search customer, UTR, job..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{
                                padding: '5px 8px 5px 26px',
                                fontSize: '12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                width: isMobile ? '130px' : '200px'
                            }}
                        />
                    </div>

                    <button
                        onClick={fetchData}
                        style={{
                            padding: '5px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-primary)',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                        title="Refresh"
                    >
                        <RefreshCw size={13} className={loading ? 'spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Selection Action Bar (when rows are selected) ── */}
            {selectedItems.length > 0 && (
                <div style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid #3b82f6',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {selectedItems.length} selected
                        </span>
                        <span style={{ color: 'var(--text-tertiary)' }}>•</span>
                        <span style={{ fontWeight: 700, color: '#3b82f6' }}>
                            Gross: ₹{fmt(selectedGross)}
                        </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={() => openCommissionModalFor(selectedItems)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: '1px solid #8b5cf6',
                                backgroundColor: 'transparent',
                                color: '#8b5cf6',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <DollarSign size={13} /> Commission Voucher
                        </button>

                        <button
                            onClick={() => openSettleModalFor(selectedItems)}
                            style={{
                                padding: '5px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                border: 'none',
                                backgroundColor: '#10b981',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <Check size={13} /> Settle to Bank
                        </button>
                    </div>
                </div>
            )}

            {/* ── Receipts Table ── */}
            <div style={{
                borderRadius: '8px',
                border: '1px solid var(--border-primary)',
                backgroundColor: 'var(--bg-elevated)',
                overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', position: 'sticky', top: 0, zIndex: 1 }}>
                                <th style={{ padding: '8px 10px', width: '36px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.size === filteredReceipts.length && filteredReceipts.length > 0}
                                        onChange={toggleSelectAll}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Voucher #</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Channel</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Party / Customer</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Job ID</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Mode</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Ref / UTR</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                                <th style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        <Loader2 size={20} className="spin" style={{ margin: '0 auto 6px' }} />
                                        Loading gateway transactions...
                                    </td>
                                </tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={10} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                                        No transactions found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredReceipts.map(r => {
                                    const isSelected = selectedIds.has(r.id);
                                    const isPos = r.channelType === 'pos';
                                    const isTech = r.channelType === 'technician';

                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => toggleSelectRow(r.id)}
                                            style={{
                                                borderBottom: '1px solid var(--border-primary)',
                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s ease'
                                            }}
                                        >
                                            <td style={{ padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(r.id)}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                                                {fmtDate(r.date)}
                                            </td>
                                            <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {r.receipt_number || '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                {isPos ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                                                        fontSize: '10px', fontWeight: 600
                                                    }}>
                                                        <Store size={10} /> POS
                                                    </span>
                                                ) : isTech ? (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                                        fontSize: '10px', fontWeight: 600
                                                    }}>
                                                        <Briefcase size={10} /> TECH
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)',
                                                        fontSize: '10px'
                                                    }}>
                                                        DIRECT
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                    {r.account_name || 'Customer'}
                                                </div>
                                                {r.technicianName && (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                        By: {r.technicianName}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                {r.jobNumber || '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '11px' }}>
                                                {r.payment_mode || 'UPI'}
                                            </td>
                                            <td style={{ padding: '8px 10px', color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'monospace' }}>
                                                {r.reference_number || r.reference || '—'}
                                            </td>
                                            <td style={{ padding: '8px 10px' }}>
                                                {r.is_settled ? (
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981',
                                                        fontSize: '10px', fontWeight: 600
                                                    }}>
                                                        SETTLED
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: '4px',
                                                        backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b',
                                                        fontSize: '10px', fontWeight: 600
                                                    }}>
                                                        HOLDING
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                ₹{fmt(r.amount)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer */}
                <div style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderTop: '1px solid var(--border-primary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                }}>
                    <div>
                        Showing <strong>{filteredReceipts.length}</strong> transactions
                    </div>
                    <div>
                        Total In View: <strong>₹{fmt(filteredReceipts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0))}</strong>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ⚡ MODAL: 1-CLICK MATCH & RECONCILE BANK PAYOUT                         */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {/* ⚡ MODAL: 1-CLICK MATCH & RECONCILE BANK PAYOUT                         */}
            {/* ═══════════════════════════════════════════════════════════════════════ */}
            {reconcileModal.open && reconcileModal.payout && (() => {
                const payout = reconcileModal.payout;
                const candidateReceipts = payout.candidateReceipts || [];
                const selectedIds = reconcileModal.selectedReceiptIds || new Set();
                const selectedRecs = candidateReceipts.filter(r => selectedIds.has(r.id));
                const selectedCount = selectedRecs.length;
                const selectedTotal = selectedRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

                const variance = +(payout.amount - selectedTotal).toFixed(2);
                const absDiff = Math.abs(variance);
                const diffPct = selectedTotal > 0 ? (absDiff / selectedTotal) * 100 : 0;
                const isExact = Math.abs(variance) < 0.05;
                const isReasonableFee = variance < 0 && diffPct <= 5.0;
                const isExcessive = variance < 0 && diffPct > 5.0;

                const q = (reconcileModal.searchCandidate || '').toLowerCase();
                const visibleCandidates = candidateReceipts.filter(r => {
                    if (!q) return true;
                    return (
                        (r.receipt_number || '').toLowerCase().includes(q) ||
                        (r.narration || '').toLowerCase().includes(q) ||
                        (r.account_name || '').toLowerCase().includes(q) ||
                        (r.technicianName || '').toLowerCase().includes(q) ||
                        (r.amount?.toString() || '').includes(q)
                    );
                });

                const toggleReceipt = (id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);

                    const newRecs = candidateReceipts.filter(r => next.has(r.id));
                    const newTot = newRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                    const newVar = +(payout.amount - newTot).toFixed(2);
                    const newDiff = Math.abs(newVar);
                    const newPct = newTot > 0 ? (newDiff / newTot) * 100 : 0;
                    const newIsFee = newVar < 0 && newPct <= 5.0;

                    setReconcileModal(prev => ({
                        ...prev,
                        selectedReceiptIds: next,
                        autoBalanceMissing: newVar > 0,
                        createCommission: newIsFee,
                        commissionFee: newIsFee ? newDiff.toFixed(2) : ''
                    }));
                };

                const updateSelection = (next) => {
                    const newRecs = candidateReceipts.filter(r => next.has(r.id));
                    const newTot = newRecs.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
                    const newVar = +(payout.amount - newTot).toFixed(2);
                    const newDiff = Math.abs(newVar);
                    const newPct = newTot > 0 ? (newDiff / newTot) * 100 : 0;
                    const newIsFee = newVar < 0 && newPct <= 5.0;

                    setReconcileModal(prev => ({
                        ...prev,
                        selectedReceiptIds: next,
                        autoBalanceMissing: newVar > 0,
                        createCommission: newIsFee,
                        commissionFee: newIsFee ? newDiff.toFixed(2) : ''
                    }));
                };

                return (
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
                            maxWidth: '640px',
                            maxHeight: '92vh',
                            border: '1px solid var(--border-primary)',
                            boxShadow: 'var(--shadow-xl)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sparkles size={16} /> Reconcile {payout.provider || 'Gateway'} Bank Payout
                                    </h4>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Ref: {payout.ref_no || '—'} · Date: {fmtDate(payout.date)} · Particulars: {payout.particulars}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setReconcileModal({ open: false, payout: null, selectedReceiptIds: new Set(), searchCandidate: '', autoBalanceMissing: true, createCommission: false, commissionFee: '', notes: '' })}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '18px', padding: '2px' }}
                                >✕</button>
                            </div>

                            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                                {/* Comparison summary in modal */}
                                <div style={{
                                    padding: '10px 14px', borderRadius: '8px',
                                    backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>HDFC Bank Credit Received</div>
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>+₹{fmt(payout.amount)}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Selected Collections in Batch</div>
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>₹{fmt(selectedTotal)}</div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-tertiary)' }}>{selectedCount} of {candidateReceipts.length} collections selected</div>
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
                                            Candidate Receipts ({selectedCount} selected · ₹{fmt(selectedTotal)})
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const best = findBestMatchingSubset(visibleCandidates.length > 0 ? visibleCandidates : candidateReceipts, payout.amount);
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
                                            <button
                                                type="button"
                                                onClick={() => updateSelection(new Set(visibleCandidates.map(r => r.id)))}
                                                style={{
                                                    padding: '3px 6px', fontSize: '10.5px', borderRadius: '4px',
                                                    border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)',
                                                    color: 'var(--text-secondary)', cursor: 'pointer'
                                                }}
                                            >
                                                Select All
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => updateSelection(new Set())}
                                                style={{
                                                    padding: '3px 6px', fontSize: '10.5px', borderRadius: '4px',
                                                    border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)',
                                                    color: 'var(--text-secondary)', cursor: 'pointer'
                                                }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>

                                    {/* Search input for candidates */}
                                    {candidateReceipts.length > 5 && (
                                        <div style={{ position: 'relative' }}>
                                            <Search size={12} style={{ position: 'absolute', left: '8px', top: '7px', color: 'var(--text-tertiary)' }} />
                                            <input
                                                type="text"
                                                value={reconcileModal.searchCandidate || ''}
                                                onChange={e => setReconcileModal(prev => ({ ...prev, searchCandidate: e.target.value }))}
                                                placeholder="Filter candidate receipts by receipt #, customer, tech..."
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
                                        maxHeight: '180px',
                                        overflowY: 'auto',
                                        border: '1px solid var(--border-secondary)',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-primary)'
                                    }}>
                                        {visibleCandidates.length === 0 ? (
                                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '11px' }}>
                                                No receipts found matching criteria.
                                            </div>
                                        ) : (
                                            visibleCandidates.map(r => {
                                                const isChecked = selectedIds.has(r.id);
                                                return (
                                                    <div
                                                        key={r.id}
                                                        onClick={() => toggleReceipt(r.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '6px 10px',
                                                            borderBottom: '1px solid var(--border-secondary)',
                                                            backgroundColor: isChecked ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                                                            cursor: 'pointer', fontSize: '11px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => toggleReceipt(r.id)}
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

                                {/* Discrepancy diagnosis box */}
                                {isExact ? (
                                    <div style={{
                                        padding: '10px 12px', borderRadius: '6px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                        display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '12px', fontWeight: 600
                                    }}>
                                        <CheckCircle size={15} /> Selected customer collections match bank payout deposit exactly (₹{fmt(payout.amount)})!
                                    </div>
                                ) : variance > 0 ? (
                                    <div style={{
                                        padding: '10px 12px', borderRadius: '6px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)',
                                        display: 'flex', flexDirection: 'column', gap: '6px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontWeight: 700, fontSize: '12.5px' }}>
                                            <AlertTriangle size={15} /> Missing System Receipts: +₹{fmt(variance)}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            HDFC Bank received ₹{fmt(variance)} more than the selected customer receipts punched in Sorted.
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                                            <input
                                                type="checkbox"
                                                checked={reconcileModal.autoBalanceMissing}
                                                onChange={e => setReconcileModal(prev => ({ ...prev, autoBalanceMissing: e.target.checked }))}
                                                style={{ marginTop: '2px' }}
                                            />
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                                                <strong>Auto-create balancing receipt voucher for ₹{fmt(variance)}</strong>
                                                <br />
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                    Credits Sales Revenue so your books balance with HDFC immediately without manual ledger adjustments.
                                                </span>
                                            </span>
                                        </label>
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '10px 12px', borderRadius: '6px',
                                        backgroundColor: isExcessive ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                        border: `1px solid ${isExcessive ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                        display: 'flex', flexDirection: 'column', gap: '6px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isExcessive ? '#ef4444' : '#d97706', fontWeight: 700, fontSize: '12.5px' }}>
                                            <AlertTriangle size={15} />
                                            {isExcessive
                                                ? `Collections Exceed Bank Credit: -₹${fmt(absDiff)} (${diffPct.toFixed(0)}% extra)`
                                                : `Gateway MDR Commission: -₹${fmt(absDiff)} (~${diffPct.toFixed(2)}%)`}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                            {isExcessive
                                                ? `Selected collections exceed the bank payout by ₹${fmt(absDiff)}. Some of these receipts likely belong to another day or batch. Please uncheck receipts or click "🎯 Auto-Match Total".`
                                                : `Selected receipts exceed bank credit by ₹${fmt(absDiff)}. This difference corresponds to payment gateway MDR transaction processing fees.`}
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', marginTop: '4px' }}>
                                            <input
                                                type="checkbox"
                                                checked={reconcileModal.createCommission}
                                                onChange={e => setReconcileModal(prev => ({ ...prev, createCommission: e.target.checked }))}
                                                style={{ marginTop: '2px' }}
                                            />
                                            <span style={{ fontSize: '11.5px', color: 'var(--text-primary)' }}>
                                                <strong>Auto-create Purchase Voucher for Gateway Commission (₹{fmt(absDiff)})</strong>
                                            </span>
                                        </label>
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        Reconciliation Narration / Notes
                                    </label>
                                    <input
                                        type="text"
                                        value={reconcileModal.notes}
                                        onChange={e => setReconcileModal(prev => ({ ...prev, notes: e.target.value }))}
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            <div style={{
                                padding: '10px 16px',
                                borderTop: '1px solid var(--border-primary)',
                                display: 'flex', justifyContent: 'flex-end', gap: '8px',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <button
                                    onClick={() => setReconcileModal({ open: false, payout: null, selectedReceiptIds: new Set(), searchCandidate: '', autoBalanceMissing: true, createCommission: false, commissionFee: '', notes: '' })}
                                    className="btn btn-secondary"
                                    style={{ padding: '6px 12px', fontSize: '11px' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReconcilePayout}
                                    disabled={processingAction || (selectedCount === 0 && !reconcileModal.autoBalanceMissing)}
                                    style={{
                                        padding: '6px 16px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700,
                                        border: 'none', backgroundColor: '#10b981', color: 'white', cursor: (selectedCount === 0 && !reconcileModal.autoBalanceMissing) ? 'not-allowed' : 'pointer',
                                        opacity: (selectedCount === 0 && !reconcileModal.autoBalanceMissing) ? 0.5 : 1,
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    {processingAction ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                                    Confirm Settlement ({selectedCount} items · ₹{fmt(selectedTotal)})
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── Modal: Manual Commission Purchase Voucher ── */}
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
                        maxWidth: '480px',
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
                                    🧾 Create Gateway Commission Purchase Voucher
                                </h4>
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    Creates an accounting Purchase Voucher with GST input tax credit
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

            {/* ── Modal: Settle to HDFC Bank (Manual Selection) ── */}
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
                                    Records payout transfer from Gateway → HDFC Current A/c
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
                                        Gateway Payout Ref / UTR
                                    </label>
                                    <input
                                        type="text"
                                        value={settleRef} onChange={e => setSettleRef(e.target.value)}
                                        placeholder="e.g. AXNGG..."
                                        style={{ width: '100%', padding: '6px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>

                            {/* Optional Commission Deduction Toggle */}
                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                                display: 'flex', flexDirection: 'column', gap: '8px'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={createCommWithSettle}
                                        onChange={e => setCreateCommWithSettle(e.target.checked)}
                                    />
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        Auto-deduct Commission & Generate Purchase Voucher
                                    </span>
                                </label>

                                {createCommWithSettle && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MDR Rate %:</span>
                                        <input
                                            type="number" step="0.01"
                                            value={settleFeePercent} onChange={e => setSettleFeePercent(e.target.value)}
                                            style={{ width: '70px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                        />
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                            Fee: ₹{fmt(settleCalc.baseFee)} + GST: ₹{fmt(settleCalc.tax)} = ₹{fmt(settleCalc.totalFee)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{
                                padding: '10px 12px', borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Net Transfer into HDFC:</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Gross minus Commission</div>
                                </div>
                                <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981' }}>
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
                                onClick={handleSettleBatch}
                                disabled={processingAction || settleCalc.net <= 0}
                                style={{
                                    padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
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
