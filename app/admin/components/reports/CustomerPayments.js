'use client'

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Search, RefreshCw, Filter, ShieldCheck, User, Calendar, DollarSign, Briefcase, Paperclip, Edit, Link, Clock, Image as ImageIcon, Banknote, QrCode, LayoutGrid, List, ChevronRight, ChevronLeft, ArrowUpRight, Eye, Building, Check, X, AlertTriangle } from 'lucide-react';
import ReceiptVoucherForm from '../accounts/ReceiptVoucherForm';

// Helper component to display live Razorpay status
function PaymentLinkStatusBadge({ linkId }) {
    const [status, setStatus] = useState('loading');
    
    useEffect(() => {
        let mounted = true;
        const fetchStatus = async () => {
            try {
                const res = await fetch(`/api/payment/check-link-status?id=${linkId}`);
                const data = await res.json();
                if (mounted && data.success) {
                    setStatus(data.status); // e.g. 'paid', 'created', 'expired', 'cancelled'
                } else if (mounted) {
                    setStatus('error');
                }
            } catch (err) {
                if (mounted) setStatus('error');
            }
        };
        fetchStatus();
    }, [linkId]);

    if (status === 'loading') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'var(--bg-secondary)', fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                <Loader2 size={10} className="spin" /> Checking Link...
            </span>
        );
    }
    
    if (status === 'paid') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#10b98115', fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
                <CheckCircle size={10} /> Paid via Link
            </span>
        );
    }

    if (status === 'expired' || status === 'cancelled') {
        return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#ef444415', fontSize: '10px', fontWeight: 600, color: '#ef4444', textTransform: 'uppercase' }}>
                <XCircle size={10} /> {status}
            </span>
        );
    }

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f59e0b15', fontSize: '10px', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>
            <Clock size={10} /> Pending Payment ({status})
        </span>
    );
}

export default function CustomerPayments({ subSection, setSubSection, searchTerm, setSearchTerm }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState(null);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [handovers, setHandovers] = useState([]);
    const [selectedTechnicianLedger, setSelectedTechnicianLedger] = useState(null);
    const [verifyingHandoverId, setVerifyingHandoverId] = useState(null);
    const [viewingDepositSlip, setViewingDepositSlip] = useState(null);
    const [ledgerTab, setLedgerTab] = useState('handovers'); // 'handovers' | 'receipts'
    const [viewMode, setViewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('customer_payments_view_mode') || 'grid';
        }
        return 'grid';
    });

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleViewModeChange = (mode) => {
        setViewMode(mode);
        localStorage.setItem('customer_payments_view_mode', mode);
    };

    const loadHandovers = async () => {
        try {
            const res = await fetch('/api/technician/cash-handovers');
            const data = await res.json();
            if (data.success) {
                setHandovers(data.handovers || []);
            }
        } catch (err) {
            console.error("Failed to load cash handovers:", err);
        }
    };

    const loadPendingPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/transactions?type=receipt&status=pending_verification,draft');
            const data = await res.json();
            if (data.success) {
                setPayments(data.data || []);
            }
        } catch (err) {
            console.error("Failed to load pending payments:", err);
        } finally {
            setLoading(false);
        }
        loadHandovers();
    };

    const handleVerifyHandover = async (handover) => {
        if (!window.confirm(`Are you sure you want to verify this cash handover of ₹${handover.amount} from ${handover.technician_name}?`)) return;

        setVerifyingHandoverId(handover.id);
        try {
            const res = await fetch('/api/technician/cash-handovers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: handover.id,
                    status: 'verified',
                    verified_by: 'Admin'
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Handover verified successfully!');
                loadHandovers();
            } else {
                throw new Error(data.error || 'Failed to verify handover');
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setVerifyingHandoverId(null);
        }
    };

    const handleRejectHandover = async (handover) => {
        if (!window.confirm(`Are you sure you want to REJECT this cash handover of ₹${handover.amount}?`)) return;

        setVerifyingHandoverId(handover.id);
        try {
            const res = await fetch('/api/technician/cash-handovers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: handover.id,
                    status: 'rejected',
                    verified_by: 'Admin'
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('Handover marked as rejected.');
                loadHandovers();
            } else {
                throw new Error(data.error || 'Failed to reject handover');
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setVerifyingHandoverId(null);
        }
    };

    const handleSettleBatch = async (techId) => {
        if (!window.confirm('Are you sure you want to mark all active handovers for this technician as settled?')) return;
        try {
            const res = await fetch('/api/technician/cash-handovers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'settle_all',
                    technician_id: techId
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('All active handovers in this cycle marked as settled!');
                loadHandovers();
                loadPendingPayments();
            } else {
                throw new Error(data.error || 'Failed to settle batch');
            }
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    useEffect(() => {
        loadPendingPayments();
        loadHandovers();
    }, []);

    const filteredPayments = payments.filter(p => {
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (p.account_name?.toLowerCase().includes(s) || 
                p.receipt_number?.toLowerCase().includes(s) || 
                p.narration?.toLowerCase().includes(s) ||
                p.reference_number?.toLowerCase().includes(s) ||
                p.payment_mode?.toLowerCase().includes(s)
        );
    });

    const handleVerify = async (payment) => {
        if (!window.confirm(`Are you sure you want to verify the receipt for ₹${payment.amount} collected from ${payment.account_name}?`)) return;

        setSubmittingId(payment.id);
        try {
            const res = await fetch(`/api/admin/transactions?type=receipt`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: payment.id, status: 'cleared' })
            });
            const data = await res.json();
            
            if (data.success) {
                alert("Payment verified successfully. It is now officially logged in the accounting system.");
                setPayments(prev => prev.filter(p => p.id !== payment.id));
            } else {
                throw new Error(data.error || "Failed to verify payment");
            }
        } catch (err) {
            alert(`Error verifying payment: ${err.message}`);
        } finally {
            setSubmittingId(null);
        }
    };

    const handleReject = async (payment) => {
        if (!window.confirm(`Are you sure you want to DELETE this pending payment record? This action cannot be undone.`)) return;

        setSubmittingId(payment.id);
        try {
            const res = await fetch(`/api/admin/transactions?type=receipt&id=${payment.id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (data.success) {
                setPayments(prev => prev.filter(p => p.id !== payment.id));
            } else {
                throw new Error(data.error || "Failed to delete payment");
            }
        } catch (err) {
            alert(`Error deleting payment: ${err.message}`);
        } finally {
            setSubmittingId(null);
        }
    };

    const handleFormSave = async (voucher) => {
        try {
            const res = await fetch(`/api/admin/transactions?type=receipt`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...voucher, id: editingReceipt.id, status: 'cleared' })
            });
            const data = await res.json();
            if (data.success) {
                alert("Receipt verified and updated successfully!");
                setEditingReceipt(null);
                loadPendingPayments();
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert(`Failed to save: ${err.message}`);
        }
    };

    const getCollectorName = (payment) => {
        if (!payment.narration) return 'Unknown';
        const match = payment.narration.match(/Collected by (.*?)(?:\(|$)/);
        if (match && match[1]) return match[1].trim();
        return 'Unknown';
    };

    if (loading && payments.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 'var(--spacing-2xl)' }}>
                <Loader2 size={32} className="spin" style={{ color: 'var(--color-primary)' }} />
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-lg)', height: '100%', overflowY: 'auto' }}>
            <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-end', 
                marginBottom: 'var(--spacing-lg)' 
            }}>
                <div style={{ 
                    display: 'flex', 
                    gap: 'var(--spacing-sm)', 
                    alignItems: 'center',
                    justifyContent: isMobile ? 'space-between' : 'flex-end',
                    width: isMobile ? '100%' : 'auto',
                    flexWrap: 'wrap'
                }}>
                    <div style={{ 
                        display: 'flex', 
                        backgroundColor: 'var(--bg-secondary)', 
                        padding: '4px', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)',
                        gap: '2px',
                        marginRight: 'var(--spacing-xs)'
                    }}>
                        <button 
                            onClick={() => handleViewModeChange('grid')}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: viewMode === 'grid' ? 'var(--bg-elevated)' : 'transparent',
                                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                            title="Grid/Card View"
                        >
                            <LayoutGrid size={14} />
                            Cards
                        </button>
                        <button 
                            onClick={() => handleViewModeChange('table')}
                            style={{
                                padding: '6px 12px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: viewMode === 'table' ? 'var(--bg-elevated)' : 'transparent',
                                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)'
                            }}
                            title="Table View"
                        >
                            <List size={14} />
                            Table
                        </button>
                    </div>

                    <button onClick={loadPendingPayments} className="btn btn-secondary">
                        <RefreshCw size={16} style={{ marginRight: '6px' }} />
                        Refresh Queue
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={24} color="#f59e0b" />
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {payments.length}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Pending Validations</div>
                    </div>
                </div>
                
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DollarSign size={24} color="#10b981" />
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                            ₹{payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>Total Pending Amount</div>
                    </div>
                </div>
            </div>

            {/* Technician Breakdown Cards */}
            {(() => {
                const cashPayments = payments.filter(p => (p.payment_mode || '').toLowerCase() === 'cash');
                const techMap = {};

                // Group pending cash receipts
                cashPayments.forEach(p => {
                    const tech = p.jobs?.technician_name || p.created_by || getCollectorName(p);
                    const techId = p.jobs?.technician_id || null;
                    if (!techMap[tech]) {
                        techMap[tech] = { name: tech, id: techId, collected: 0, handedOver: 0, receipts: [], handovers: [] };
                    }
                    if (techId && !techMap[tech].id) techMap[tech].id = techId;
                    techMap[tech].collected += (parseFloat(p.amount) || 0);
                    techMap[tech].receipts.push(p);
                });

                // Group active handovers (status != 'rejected' and !is_settled)
                (handovers || []).forEach(h => {
                    if (h.status === 'rejected' || h.is_settled) return;
                    const tech = h.technician_name || 'Unknown';
                    if (!techMap[tech]) {
                        techMap[tech] = { name: tech, id: h.technician_id, collected: 0, handedOver: 0, receipts: [], handovers: [] };
                    }
                    if (h.technician_id && !techMap[tech].id) techMap[tech].id = h.technician_id;
                    techMap[tech].handedOver += (parseFloat(h.amount) || 0);
                    techMap[tech].handovers.push(h);
                });

                if (Object.keys(techMap).length === 0) return null;

                return (
                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} /> Cash Collected by Technician
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--color-primary)', textTransform: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                💡 Click technician card to view cash ledger, review CDM slips & post transactions
                            </span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                            {Object.entries(techMap).map(([techName, data]) => {
                                const netBalance = data.collected - data.handedOver;
                                return (
                                    <div 
                                        key={techName} 
                                        className="card" 
                                        onClick={() => {
                                            setSelectedTechnicianLedger(data);
                                            setLedgerTab('handovers');
                                        }}
                                        style={{ 
                                            padding: '12px 16px', 
                                            backgroundColor: 'var(--bg-elevated)', 
                                            border: '1.5px solid var(--border-primary)', 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            gap: '4px', 
                                            borderRadius: 'var(--radius-md)',
                                            minWidth: '180px',
                                            cursor: 'pointer',
                                            flex: isMobile ? '1 1 calc(50% - 8px)' : '0 1 auto',
                                            transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                                            boxShadow: 'var(--shadow-sm)'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.borderColor = '#10b981';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                        }}
                                        title="Click to open Cash Handover Ledger"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {techName}
                                            </span>
                                            <ChevronRight size={14} color="var(--text-tertiary)" />
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 800, color: netBalance > 0 ? '#f59e0b' : (netBalance < 0 ? '#ef4444' : '#10b981') }}>
                                                ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                in hand
                                            </span>
                                        </div>

                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-primary)', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                                            <span>Coll: ₹{data.collected.toLocaleString('en-IN')}</span>
                                            {data.handedOver > 0 && (
                                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>Handed: ₹{data.handedOver.toLocaleString('en-IN')}</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}            {filteredPayments.length === 0 ? (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <ShieldCheck size={48} color="var(--text-tertiary)" style={{ margin: '0 auto var(--spacing-md)' }} />
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>All Caught Up!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>There are no pending payments waiting for your verification.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--spacing-lg)' }}>
                    {filteredPayments.map(payment => (
                        <div key={payment.id} className="card" style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                                backgroundColor: payment.payment_mode === 'Cash' ? '#10b981' : (payment.payment_mode === 'UPI' ? '#3b82f6' : '#8b5cf6')
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div>
                                    <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: '0 0 4px 0' }}>{payment.account_name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        <span style={{ 
                                            padding: '2px 8px', 
                                            backgroundColor: payment.payment_mode === 'Cash' ? '#10b98115' : (payment.payment_mode === 'UPI' ? '#3b82f615' : '#8b5cf615'), 
                                            color: payment.payment_mode === 'Cash' ? '#10b981' : (payment.payment_mode === 'UPI' ? '#3b82f6' : '#8b5cf6'),
                                            borderRadius: '6px', 
                                            fontWeight: 700,
                                            border: `1px solid ${payment.payment_mode === 'Cash' ? '#10b98130' : (payment.payment_mode === 'UPI' ? '#3b82f630' : '#8b5cf630')}`
                                        }}>
                                            {payment.payment_mode || 'Money'}
                                        </span>
                                        •
                                        <span>{payment.receipt_number || payment.id.slice(0, 8)}</span>
                                        
                                        {/* Status checker if it's a link */}
                                        {payment.narration?.includes('[LinkID:') && (
                                            <PaymentLinkStatusBadge linkId={payment.narration.match(/\[LinkID:(.*?)\]/)[1]} />
                                        )}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                                        ₹{(parseFloat(payment.amount) || 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid', gridTemplateColumns: 'min-content 1fr', gap: 'var(--spacing-sm)',
                                fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)'
                            }}>
                                <Calendar size={14} style={{ marginTop: '2px' }} />
                                <div>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>

                                <User size={14} style={{ marginTop: '2px' }} />
                                <div>Collected by <strong>{getCollectorName(payment)}</strong></div>

                                {payment.reference_number && (
                                    <>
                                        <Briefcase size={14} style={{ marginTop: '2px' }} />
                                        <div>Ref / Job: {payment.reference_number}</div>
                                    </>
                                )}

                                {payment.narration && (
                                    <>
                                        <Paperclip size={14} style={{ marginTop: '2px' }} />
                                        <div style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>
                                            "{payment.narration.replace(/\[LinkID:.*?\]/g, '').replace(/\[Screenshot:.*?\]/g, '').trim()}"
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mode-Specific Verification Alert Banners */}
                            {payment.payment_mode === 'Cash' && (
                                <div style={{
                                    marginTop: '12px',
                                    marginBottom: '16px',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    color: '#10b981'
                                }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Banknote size={20} color="#10b981" />
                                    </div>
                                    <div style={{ flex: 1, fontSize: '13px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px', color: '#10b981' }}>Action Required: Physical Cash Handover</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
                                            Verify that physical cash (₹{(parseFloat(payment.amount) || 0).toFixed(2)}) has been collected from <strong>{getCollectorName(payment)}</strong> before posting to accounts.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {payment.payment_mode === 'UPI' && (
                                <div style={{
                                    marginTop: '12px',
                                    marginBottom: '16px',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    color: '#3b82f6'
                                }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <QrCode size={20} color="#3b82f6" />
                                    </div>
                                    <div style={{ flex: 1, fontSize: '13px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px', color: '#3b82f6' }}>UPI QR Payment Proof</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
                                            Collected by {getCollectorName(payment)} via company QR. Check attached screenshot proof.
                                        </div>
                                    </div>
                                    {payment.narration?.includes('[Screenshot:') && (
                                        <a 
                                            href={payment.narration.match(/\[Screenshot:(.*?)\]/)[1]} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            style={{ padding: '8px 12px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)' }}
                                        >
                                            <ImageIcon size={14} /> View Proof
                                        </a>
                                    )}
                                </div>
                            )}

                            {(payment.payment_mode === 'Payment Link' || payment.narration?.includes('[LinkID:')) && (
                                <div style={{
                                    marginTop: '12px',
                                    marginBottom: '16px',
                                    padding: '12px 16px',
                                    backgroundColor: 'rgba(139, 92, 246, 0.08)',
                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    color: '#8b5cf6'
                                }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Link size={20} color="#8b5cf6" />
                                    </div>
                                    <div style={{ flex: 1, fontSize: '13px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px', color: '#8b5cf6' }}>Razorpay Payment Link</div>
                                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: 1.4 }}>
                                            Collected by {getCollectorName(payment)}. Live Razorpay status verification is active.
                                        </div>
                                    </div>
                                    {payment.narration?.includes('[LinkID:') && (
                                        <div style={{ flexShrink: 0 }}>
                                            <PaymentLinkStatusBadge linkId={payment.narration.match(/\[LinkID:(.*?)\]/)[1]} />
                                        </div>
                                    )}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ padding: '8px 12px', color: 'var(--error)', borderColor: 'var(--error)', backgroundColor: 'transparent' }}
                                    onClick={() => handleReject(payment)}
                                    disabled={submittingId === payment.id}
                                    title="Reject and delete receipt"
                                >
                                    <XCircle size={16} />
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 1, padding: '8px', backgroundColor: '#6366f1', borderColor: '#6366f1', color: 'white' }}
                                    onClick={() => setEditingReceipt(payment)}
                                    disabled={submittingId === payment.id}
                                    title="Open form to link invoices and verify"
                                >
                                    <Edit size={16} style={{ marginRight: '6px' }} />
                                    Review & Post
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ 
                    overflowX: 'auto', 
                    backgroundColor: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-lg)', 
                    border: '1px solid var(--border-primary)'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: 'var(--font-size-sm)',
                        textAlign: 'left'
                    }}>
                        <thead>
                            <tr style={{
                                backgroundColor: 'var(--bg-secondary)',
                                borderBottom: '2px solid var(--border-primary)'
                            }}>
                                {!isMobile && <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Date</th>}
                                <th style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', fontWeight: 600 }}>Customer</th>
                                {!isMobile && <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Receipt No / Job</th>}
                                {!isMobile && <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Collector</th>}
                                <th style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', fontWeight: 600 }}>Payment Mode</th>
                                <th style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                                {!isMobile && <th style={{ padding: 'var(--spacing-md)', fontWeight: 600 }}>Proof / Status</th>}
                                <th style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPayments.map(payment => {
                                const collector = getCollectorName(payment);
                                const modeColor = payment.payment_mode === 'Cash' ? '#10b981' : (payment.payment_mode === 'UPI' ? '#3b82f6' : '#8b5cf6');
                                const modeBg = payment.payment_mode === 'Cash' ? '#10b98115' : (payment.payment_mode === 'UPI' ? '#3b82f615' : '#8b5cf615');
                                const modeBorder = payment.payment_mode === 'Cash' ? '#10b98130' : (payment.payment_mode === 'UPI' ? '#3b82f630' : '#8b5cf630');

                                return (
                                    <tr 
                                        key={payment.id} 
                                        style={{ 
                                            borderBottom: '1px solid var(--border-primary)',
                                            transition: 'background-color var(--transition-fast)'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {!isMobile && (
                                            <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap' }}>
                                                {new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                        )}
                                        <td style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}>
                                            <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                                {payment.account_name}
                                            </div>
                                            {isMobile && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                                                    <span>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                                    •
                                                    <span>{payment.receipt_number || payment.id.slice(0, 8)}</span>
                                                    {collector && collector !== 'Unknown' && (
                                                        <>
                                                            •
                                                            <span>{collector}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                            {isMobile && payment.reference_number && (
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    Job: {payment.reference_number}
                                                </div>
                                            )}
                                            {/* For mobile, display inline Proof / Status information */}
                                            {isMobile && (
                                                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {payment.narration?.includes('[LinkID:') && (
                                                        <PaymentLinkStatusBadge linkId={payment.narration.match(/\[LinkID:(.*?)\]/)[1]} />
                                                    )}
                                                    {payment.payment_mode === 'Cash' && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '10px', fontWeight: 500 }}>
                                                            <Banknote size={10} /> Verify Cash Handover
                                                        </span>
                                                    )}
                                                    {payment.payment_mode === 'UPI' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '10px', fontWeight: 500 }}>
                                                                <QrCode size={10} /> QR Proof
                                                            </span>
                                                            {payment.narration?.includes('[Screenshot:') && (
                                                                <a 
                                                                    href={payment.narration.match(/\[Screenshot:(.*?)\]/)[1]} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    style={{ color: '#6366f1', textDecoration: 'underline', fontSize: '10px', fontWeight: 600 }}
                                                                >
                                                                    View Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        {!isMobile && (
                                            <td style={{ padding: 'var(--spacing-md)' }}>
                                                <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                                                    {payment.receipt_number || payment.id.slice(0, 8)}
                                                </div>
                                                {payment.reference_number && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        Job: {payment.reference_number}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {!isMobile && (
                                            <td style={{ padding: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
                                                {collector}
                                            </td>
                                        )}
                                        <td style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)' }}>
                                            <span style={{ 
                                                padding: '2px 8px', 
                                                backgroundColor: modeBg, 
                                                color: modeColor,
                                                borderRadius: '6px', 
                                                fontWeight: 700,
                                                fontSize: isMobile ? '10px' : 'var(--font-size-xs)',
                                                border: `1px solid ${modeBorder}`
                                            }}>
                                                {payment.payment_mode || 'Money'}
                                            </span>
                                        </td>
                                        <td style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                                            ₹{(parseFloat(payment.amount) || 0).toFixed(2)}
                                        </td>
                                        {!isMobile && (
                                            <td style={{ padding: 'var(--spacing-md)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {payment.narration?.includes('[LinkID:') && (
                                                        <PaymentLinkStatusBadge linkId={payment.narration.match(/\[LinkID:(.*?)\]/)[1]} />
                                                    )}
                                                    {payment.payment_mode === 'Cash' && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10b981', fontSize: '11px', fontWeight: 500 }}>
                                                            <Banknote size={12} /> Verify Cash Handover
                                                        </span>
                                                    )}
                                                    {payment.payment_mode === 'UPI' && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '11px', fontWeight: 500 }}>
                                                                <QrCode size={12} /> QR Proof
                                                            </span>
                                                            {payment.narration?.includes('[Screenshot:') && (
                                                                <a 
                                                                    href={payment.narration.match(/\[Screenshot:(.*?)\]/)[1]} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    style={{ color: '#6366f1', textDecoration: 'underline', fontSize: '11px', fontWeight: 600 }}
                                                                >
                                                                    View Proof
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                    {payment.narration && (
                                                        <div 
                                                            style={{ fontStyle: 'italic', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} 
                                                            title={payment.narration.replace(/\[LinkID:.*?\]/g, '').replace(/\[Screenshot:.*?\]/g, '').trim()}
                                                        >
                                                            "{payment.narration.replace(/\[LinkID:.*?\]/g, '').replace(/\[Screenshot:.*?\]/g, '').trim()}"
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td style={{ padding: isMobile ? 'var(--spacing-sm)' : 'var(--spacing-md)', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', gap: 'var(--spacing-xs)' }}>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: '6px', color: 'var(--error)', borderColor: 'var(--error)', backgroundColor: 'transparent', minWidth: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    onClick={() => handleReject(payment)}
                                                    disabled={submittingId === payment.id}
                                                    title="Reject and delete receipt"
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ 
                                                        padding: isMobile ? '6px' : '6px 12px', 
                                                        backgroundColor: '#6366f1', 
                                                        borderColor: '#6366f1', 
                                                        color: 'white', 
                                                        fontSize: isMobile ? '10px' : 'var(--font-size-xs)', 
                                                        height: '28px', 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '4px' 
                                                    }}
                                                    onClick={() => setEditingReceipt(payment)}
                                                    disabled={submittingId === payment.id}
                                                    title="Open form to link invoices and verify"
                                                >
                                                    <Edit size={12} />
                                                    {!isMobile && "Review & Post"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Technician Cash Ledger Modal */}
            {selectedTechnicianLedger && (() => {
                const techName = selectedTechnicianLedger.name;
                const techId = selectedTechnicianLedger.id;
                
                const techReceipts = payments.filter(p => 
                    (p.payment_mode || '').toLowerCase() === 'cash' && 
                    ((techId && p.jobs?.technician_id === techId) || (p.jobs?.technician_name === techName) || (p.created_by === techName) || getCollectorName(p) === techName)
                );

                const techHandovers = handovers.filter(h => 
                    (techId && h.technician_id === techId) || (h.technician_name === techName)
                );

                const totalCollected = techReceipts.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                const totalHandedOver = techHandovers.filter(h => h.status !== 'rejected' && !h.is_settled).reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
                const netBalance = totalCollected - totalHandedOver;

                return (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(6px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isMobile ? '8px' : '20px'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '92vh',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                        }}>
                            {/* Modal Header */}
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid var(--border-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-primary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                        <Banknote size={20} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {techName} — Cash Handover Ledger
                                        </h3>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            Operational Tracking Ledger · Decoupled from core accounts
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedTechnicianLedger(null)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        padding: '6px',
                                        borderRadius: '6px'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Summary Metrics Bar */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                                gap: '10px',
                                padding: '14px 20px',
                                backgroundColor: 'var(--bg-secondary)',
                                borderBottom: '1px solid var(--border-primary)'
                            }}>
                                <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Collected (Pending)</div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                                        ₹{totalCollected.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{techReceipts.length} customer receipts</div>
                                </div>

                                <div style={{ backgroundColor: 'var(--bg-elevated)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Handed Over</div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6', marginTop: '2px' }}>
                                        ₹{totalHandedOver.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{techHandovers.length} handover entries</div>
                                </div>

                                <div style={{
                                    backgroundColor: netBalance > 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-elevated)',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: netBalance > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-primary)',
                                    gridColumn: isMobile ? 'span 2' : 'auto'
                                }}>
                                    <div style={{ fontSize: '11px', color: netBalance > 0 ? '#f59e0b' : 'var(--text-secondary)', fontWeight: 700 }}>Net Cash in Hand</div>
                                    <div style={{ fontSize: '20px', fontWeight: 800, color: netBalance > 0 ? '#f59e0b' : (netBalance < 0 ? '#ef4444' : '#10b981'), marginTop: '2px' }}>
                                        ₹{netBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                        {netBalance === 0 ? 'Fully settled' : (netBalance > 0 ? 'Pending handover to company' : 'Excess deposited')}
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div style={{ display: 'flex', padding: '0 20px', borderBottom: '1px solid var(--border-primary)', gap: '16px', backgroundColor: 'var(--bg-primary)' }}>
                                <button
                                    onClick={() => setLedgerTab('handovers')}
                                    style={{
                                        padding: '12px 4px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: ledgerTab === 'handovers' ? '2.5px solid #3b82f6' : '2.5px solid transparent',
                                        color: ledgerTab === 'handovers' ? '#3b82f6' : 'var(--text-secondary)',
                                        fontSize: '13px',
                                        fontWeight: ledgerTab === 'handovers' ? 700 : 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Building size={15} />
                                    Cash Handovers & CDM Receipts ({techHandovers.length})
                                </button>
                                <button
                                    onClick={() => setLedgerTab('receipts')}
                                    style={{
                                        padding: '12px 4px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: ledgerTab === 'receipts' ? '2.5px solid #6366f1' : '2.5px solid transparent',
                                        color: ledgerTab === 'receipts' ? '#6366f1' : 'var(--text-secondary)',
                                        fontSize: '13px',
                                        fontWeight: ledgerTab === 'receipts' ? 700 : 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Edit size={15} />
                                    Pending Receipts to Review & Post ({techReceipts.length})
                                </button>
                            </div>

                            {/* Tab Content */}
                            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
                                {ledgerTab === 'handovers' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {techHandovers.length === 0 ? (
                                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                                No cash handovers recorded yet for {techName}.
                                            </div>
                                        ) : (
                                            techHandovers.map(h => {
                                                const hDate = new Date(h.created_at || h.date);
                                                const isBank = h.handover_type === 'bank_deposit';
                                                const isBusy = verifyingHandoverId === h.id;

                                                return (
                                                    <div
                                                        key={h.id}
                                                        style={{
                                                            padding: '12px 16px',
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            flexDirection: isMobile ? 'column' : 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: isMobile ? 'flex-start' : 'center',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{
                                                                width: '38px',
                                                                height: '38px',
                                                                borderRadius: '8px',
                                                                backgroundColor: isBank ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                                                color: isBank ? '#3b82f6' : '#10b981',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                {isBank ? <Building size={18} /> : <User size={18} />}
                                                            </div>

                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                        {isBank ? 'CDM Bank Deposit' : `In-Person Handover to ${h.handover_to || 'Admin'}`}
                                                                    </span>
                                                                    <span style={{
                                                                        fontSize: '10px',
                                                                        fontWeight: 700,
                                                                        padding: '2px 6px',
                                                                        borderRadius: '4px',
                                                                        textTransform: 'uppercase',
                                                                        backgroundColor: h.status === 'verified' ? 'rgba(16, 185, 129, 0.15)' : (h.status === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : (h.status === 'settled' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)')),
                                                                        color: h.status === 'verified' ? '#10b981' : (h.status === 'rejected' ? '#ef4444' : (h.status === 'settled' ? '#8b5cf6' : '#f59e0b'))
                                                                    }}>
                                                                        {h.status}
                                                                    </span>
                                                                </div>

                                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                                    <span>{hDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {hDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                                                                    {isBank && <span>• A/c 50200068074298</span>}
                                                                    {h.verified_by && <span>• Verified by {h.verified_by}</span>}
                                                                </div>

                                                                {h.notes && (
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '4px' }}>
                                                                        "{h.notes}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', borderTop: isMobile ? '1px solid var(--border-primary)' : 'none', paddingTop: isMobile ? '8px' : '0' }}>
                                                            {h.receipt_url && (
                                                                <button
                                                                    onClick={() => setViewingDepositSlip(h.receipt_url)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: '1px solid var(--border-primary)',
                                                                        borderRadius: '6px',
                                                                        padding: '6px 10px',
                                                                        color: 'var(--color-primary)',
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                >
                                                                    <Eye size={13} /> View Slip
                                                                </button>
                                                            )}

                                                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#3b82f6' }}>
                                                                ₹{(parseFloat(h.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </div>

                                                            {h.status === 'submitted' && (
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button
                                                                        onClick={() => handleVerifyHandover(h)}
                                                                        disabled={isBusy}
                                                                        style={{
                                                                            backgroundColor: '#10b981',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            padding: '6px 10px',
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}
                                                                        title="Acknowledge cash received"
                                                                    >
                                                                        <Check size={12} /> Verify
                                                                    </button>

                                                                    <button
                                                                        onClick={() => handleRejectHandover(h)}
                                                                        disabled={isBusy}
                                                                        style={{
                                                                            backgroundColor: 'transparent',
                                                                            color: '#ef4444',
                                                                            border: '1px solid #ef4444',
                                                                            borderRadius: '6px',
                                                                            padding: '6px 8px',
                                                                            fontSize: '11px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer'
                                                                        }}
                                                                        title="Reject handover"
                                                                    >
                                                                        <X size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {techReceipts.length === 0 ? (
                                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                                🎉 All customer receipts for {techName} have been verified and posted!
                                            </div>
                                        ) : (
                                            techReceipts.map(payment => {
                                                const propData = payment.jobs?.property;
                                                const locality = propData?.locality || propData?.city || 'Customer site';
                                                const isBusy = submittingId === payment.id;

                                                return (
                                                    <div
                                                        key={payment.id}
                                                        style={{
                                                            padding: '12px 16px',
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: '10px',
                                                            display: 'flex',
                                                            flexDirection: isMobile ? 'column' : 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: isMobile ? 'flex-start' : 'center',
                                                            gap: '12px'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                    {payment.account_name || payment.jobs?.customer_name || 'Customer'}
                                                                </span>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {payment.jobs?.job_number || payment.reference_number || 'General'}
                                                                </span>
                                                            </div>

                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span>{new Date(payment.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                                <span>• {payment.receipt_number}</span>
                                                                <span>• {locality}</span>
                                                                {payment.jobs?.appliance && <span>• {payment.jobs.appliance}</span>}
                                                            </div>

                                                            {payment.narration && (
                                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                                                                    "{payment.narration.replace(/\[LinkID:.*?\]/g, '').replace(/\[Screenshot:.*?\]/g, '').trim()}"
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'space-between' : 'flex-end', borderTop: isMobile ? '1px solid var(--border-primary)' : 'none', paddingTop: isMobile ? '8px' : '0' }}>
                                                            <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981' }}>
                                                                ₹{(parseFloat(payment.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => handleReject(payment)}
                                                                    disabled={isBusy}
                                                                    style={{
                                                                        padding: '6px 8px',
                                                                        backgroundColor: 'transparent',
                                                                        color: 'var(--error)',
                                                                        border: '1px solid var(--error)',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    title="Reject receipt"
                                                                >
                                                                    <XCircle size={14} />
                                                                </button>

                                                                <button
                                                                    onClick={() => setEditingReceipt(payment)}
                                                                    disabled={isBusy}
                                                                    style={{
                                                                        padding: '6px 12px',
                                                                        backgroundColor: '#6366f1',
                                                                        border: 'none',
                                                                        borderRadius: '6px',
                                                                        color: 'white',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px'
                                                                    }}
                                                                    title="Open form to link invoices and verify into accounts"
                                                                >
                                                                    <Edit size={13} /> Review & Post
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div style={{
                                padding: '12px 20px',
                                borderTop: '1px solid var(--border-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-primary)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    Technician: <strong>{techName}</strong>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {techHandovers.some(h => h.status !== 'rejected' && !h.is_settled) && (
                                        <button
                                            onClick={() => handleSettleBatch(techId)}
                                            style={{
                                                padding: '8px 14px',
                                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                                color: '#8b5cf6',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                            title="Mark verified handovers as settled to close this cycle"
                                        >
                                            Settle Cycle Handovers
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setSelectedTechnicianLedger(null)}
                                        style={{
                                            padding: '8px 16px',
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)',
                                            color: 'var(--text-primary)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Deposit Slip Lightbox Preview */}
            {viewingDepositSlip && (
                <div
                    onClick={() => setViewingDepositSlip(null)}
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        zIndex: 10000,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}
                >
                    <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setViewingDepositSlip(null)}
                            style={{
                                position: 'absolute',
                                top: '-40px',
                                right: '0',
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                padding: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={viewingDepositSlip}
                            alt="Deposit slip"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '85vh',
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                            }}
                        />
                    </div>
                </div>
            )}

            {editingReceipt && (
                <ReceiptVoucherForm
                    existingReceipt={editingReceipt}
                    onSave={handleFormSave}
                    onClose={() => setEditingReceipt(null)}
                />
            )}
        </div>
    );
}
