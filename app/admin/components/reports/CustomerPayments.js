'use client'

import { useState, useEffect } from 'react';
import { Loader2, CheckCircle, XCircle, Search, RefreshCw, Filter, ShieldCheck, User, Calendar, DollarSign, Briefcase, Paperclip } from 'lucide-react';

export default function CustomerPayments({ subSection, setSubSection, searchTerm, setSearchTerm }) {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submittingId, setSubmittingId] = useState(null);

    const loadPendingPayments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/transactions?type=receipt');
            const data = await res.json();
            if (data.success) {
                const pending = (data.data || []).filter(tx => tx.status === 'pending_verification' || tx.status === 'draft');
                setPayments(pending);
            }
        } catch (err) {
            console.error("Failed to load pending payments:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPendingPayments();
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
        <div style={{ padding: 'var(--spacing-lg)', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={28} color="var(--color-primary)" />
                        Pending Payment Verification
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0, maxWidth: '600px' }}>
                        Review payments collected by technicians or admins in the field. Once verified, these receipts will be marked as "Cleared" and posted fully to the accounting daybook. 
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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

            {filteredPayments.length === 0 ? (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-primary)' }}>
                    <ShieldCheck size={48} color="var(--text-tertiary)" style={{ margin: '0 auto var(--spacing-md)' }} />
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>All Caught Up!</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>There are no pending payments waiting for your verification.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--spacing-lg)' }}>
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
                                backgroundColor: '#f59e0b'
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div>
                                    <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: '0 0 4px 0' }}>{payment.account_name}</h4>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        <span style={{ padding: '2px 6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontWeight: 500 }}>
                                            {payment.payment_mode || 'Money'}
                                        </span>
                                        •
                                        <span>{payment.receipt_number || payment.id.slice(0, 8)}</span>
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
                                        <div style={{ fontStyle: 'italic', wordBreak: 'break-word' }}>"{payment.narration}"</div>
                                    </>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
                                <button 
                                    className="btn btn-secondary" 
                                    style={{ flex: 1, padding: '8px', color: 'var(--error)', borderColor: 'var(--error)' }}
                                    onClick={() => handleReject(payment)}
                                    disabled={submittingId === payment.id}
                                >
                                    <XCircle size={16} style={{ marginRight: '6px' }} />
                                    Reject
                                </button>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ flex: 2, padding: '8px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                    onClick={() => handleVerify(payment)}
                                    disabled={submittingId === payment.id}
                                >
                                    {submittingId === payment.id ? (
                                        <Loader2 size={16} className="spin" />
                                    ) : (
                                        <>
                                            <CheckCircle size={16} style={{ marginRight: '6px' }} />
                                            Verify & Clear
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
