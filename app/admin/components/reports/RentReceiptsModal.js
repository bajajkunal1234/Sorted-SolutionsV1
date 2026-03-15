'use client'

import { useState, useEffect, useMemo } from 'react';
import { X, Receipt, CheckCircle, Search, RefreshCcw, Link2, Trash2 } from 'lucide-react';
import { transactionsAPI } from '@/lib/adminAPI';

function RentReceiptsModal({ rental, onClose, onSave }) {
    const customerId = rental.customer_id || rental.customerId;
    const productName = rental.product_name || rental.productName || rental.rental_plans?.product_name || '';
    const serialNumber = rental.serial_number || rental.serialNumber || '';
    
    const monthlyRent = Number(rental.monthly_rent || 0);
    const securityDeposit = Number(rental.security_deposit || 0);
    
    const tenure = rental.tenure || {};
    const duration = Number(tenure.duration || 1);
    const unit = tenure.unit || 'month';
    const totalMonths = unit.includes('year') ? duration * 12 : duration;
    
    const startDate = new Date(rental.start_date || new Date());

    // Local state for edits before save
    const [depositReceiptId, setDepositReceiptId] = useState(rental.deposit_receipt_id || null);
    const [rentReceipts, setRentReceipts] = useState(rental.rent_receipts || {}); // { "1": receipt_id, "2": receipt_id }

    // Receipts fetching
    const [receipts, setReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);

    // Picker state
    const [pickerState, setPickerState] = useState({ isOpen: false, type: null, index: null, amountExpected: 0 }); // type: 'deposit' or 'rent'
    const [receiptSearch, setReceiptSearch] = useState('');

    useEffect(() => {
        if (!customerId) return;
        setLoadingReceipts(true);
        transactionsAPI.getAll({ type: 'receipt', account_id: customerId })
            .then(data => setReceipts(data || []))
            .catch(console.error)
            .finally(() => setLoadingReceipts(false));
    }, [customerId]);

    const handleLink = (receipt) => {
        if (pickerState.type === 'deposit') {
            setDepositReceiptId(receipt.id);
        } else if (pickerState.type === 'rent' && pickerState.index !== null) {
            setRentReceipts(prev => ({ ...prev, [pickerState.index]: receipt.id }));
        }
        setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 });
    };

    const handleUnlink = (type, index) => {
        if (type === 'deposit') {
            setDepositReceiptId(null);
        } else if (type === 'rent') {
            setRentReceipts(prev => {
                const next = { ...prev };
                delete next[index];
                return next;
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Compute rents_paid & next_rent_due_date
        let earliestUnpaidIndex = 1;
        while (earliestUnpaidIndex <= totalMonths && rentReceipts[earliestUnpaidIndex]) {
            earliestUnpaidIndex++;
        }
        
        const rentsPaid = Object.keys(rentReceipts).length;
        
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + (earliestUnpaidIndex - 1));
        
        const rentsRemaining = Math.max(0, totalMonths - rentsPaid);

        // Map it back to parent
        onSave({
            rentalId: rental.id,
            deposit_receipt_id: depositReceiptId,
            rent_receipts: rentReceipts,
            rents_paid: rentsPaid,
            rents_remaining: rentsRemaining,
            next_rent_due_date: earliestUnpaidIndex <= totalMonths ? nextDueDate.toISOString().split('T')[0] : null
        });
    };

    // Helper formats
    const fmtAmt = n => `₹${Number(n || 0).toLocaleString()}`;
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const getReceiptDetails = (id) => receipts.find(r => r.id === id);

    // Build rent rows
    const rentRows = [];
    for (let i = 1; i <= totalMonths; i++) {
        const dStart = new Date(startDate);
        dStart.setMonth(dStart.getMonth() + (i - 1));
        const dEnd = new Date(startDate);
        dEnd.setMonth(dEnd.getMonth() + i);
        dEnd.setDate(dEnd.getDate() - 1);
        
        rentRows.push({
            monthIndex: i,
            label: `Month ${i}`,
            period: `${fmtDate(dStart)} - ${fmtDate(dEnd)}`,
            amount: monthlyRent,
            linkedId: rentReceipts[i] || null
        });
    }

    const filteredReceipts = receipts.filter(r => {
        const term = receiptSearch.toLowerCase();
        return !term || (r.reference || '').toLowerCase().includes(term)
            || (r.description || '').toLowerCase().includes(term)
            || String(r.amount || '').includes(term);
    });

    const isOverdue = (dateStr) => dateStr && new Date(dateStr) < new Date();

    return (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div className="modal-header" style={{ flexShrink: 0 }}>
                    <div>
                        <h2 className="modal-title">Rent Receipts Linking</h2>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {rental.customer_name || rental.accounts?.name} • {productName} {serialNumber ? `(SN: ${serialNumber})` : ''}
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-content" style={{ padding: 'var(--spacing-md) var(--spacing-lg)', overflowY: 'auto', flex: 1 }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600 }}>Payment Schedule</h3>
                        {loadingReceipts && <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}><RefreshCcw size={12} className="spin" /> Loading receipts...</div>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {/* Security Deposit Row */}
                        <div style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            backgroundColor: depositReceiptId ? '#10b98110' : 'var(--bg-secondary)',
                            border: `1px solid ${depositReceiptId ? '#10b98140' : 'var(--border-primary)'}`,
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Security Deposit</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>One-time payment</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{fmtAmt(securityDeposit)}</div>
                                
                                {depositReceiptId ? (() => {
                                    const r = getReceiptDetails(depositReceiptId);
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', width: '180px', justifyContent: 'flex-end' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <CheckCircle size={12} /> {r?.reference || 'Linked'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{fmtDate(r?.date)}</div>
                                            </div>
                                            <button onClick={() => handleUnlink('deposit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }} title="Unlink Receipt">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )
                                })() : (
                                    <button 
                                        className="btn btn-secondary" 
                                        style={{ padding: '4px 10px', fontSize: '12px', width: '180px' }}
                                        onClick={() => setPickerState({ isOpen: true, type: 'deposit', index: null, amountExpected: securityDeposit })}
                                    >
                                        <Link2 size={14} /> Link Receipt
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Rent Rows */}
                        {rentRows.map((row) => {
                            const isPaid = !!row.linkedId;
                            // Check if this row is currently overdue (if past end date and not paid)
                            // Or maybe just past start date
                            const rowStartDate = new Date(startDate);
                            rowStartDate.setMonth(rowStartDate.getMonth() + (row.monthIndex - 1));
                            const rowIsOverdue = !isPaid && isOverdue(rowStartDate.toISOString());

                            return (
                                <div key={row.monthIndex} style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    backgroundColor: isPaid ? '#10b98110' : (rowIsOverdue ? '#ef444408' : 'var(--bg-secondary)'),
                                    border: `1px solid ${isPaid ? '#10b98140' : (rowIsOverdue ? '#ef444440' : 'var(--border-primary)')}`,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {row.label}
                                            {rowIsOverdue && <span style={{ fontSize: '10px', backgroundColor: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Due</span>}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.period}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{fmtAmt(row.amount)}</div>
                                        
                                        {isPaid ? (() => {
                                            const r = getReceiptDetails(row.linkedId);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', width: '180px', justifyContent: 'flex-end' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                            <CheckCircle size={12} /> {r?.reference || 'Linked'}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{fmtDate(r?.date)}</div>
                                                    </div>
                                                    <button onClick={() => handleUnlink('rent', row.monthIndex)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }} title="Unlink Receipt">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })() : (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '4px 10px', fontSize: '12px', width: '180px' }}
                                                onClick={() => setPickerState({ isOpen: true, type: 'rent', index: row.monthIndex, amountExpected: row.amount })}
                                            >
                                                <Link2 size={14} /> Link Receipt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>

                <div className="modal-footer" style={{ flexShrink: 0 }}>
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={handleSubmit}>Save Changes</button>
                </div>
            </div>

            {/* Receipt Picker Overlay */}
            {pickerState.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 })}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Select {pickerState.type === 'deposit' ? 'Deposit' : 'Rent'} Receipt</h3>
                            <button className="btn-icon" onClick={() => setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 })}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-primary)' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
                                    placeholder="Search by reference, amount..." value={receiptSearch}
                                    onChange={e => setReceiptSearch(e.target.value)} autoFocus />
                            </div>
                        </div>
                        <div style={{ padding: '12px 20px', maxHeight: '340px', overflowY: 'auto' }}>
                            {filteredReceipts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                                    <Receipt size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                                    <p>{receipts.length === 0 ? 'No receipts found for this customer.' : 'No receipts match search.'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {filteredReceipts.map(r => {
                                        const match = Number(r.amount) === Number(pickerState.amountExpected);
                                        // Highlight receipts that are already linked elsewhere to warn the user
                                        const isAlreadyLinked = 
                                            r.id === depositReceiptId || 
                                            Object.values(rentReceipts).includes(r.id);
                                            
                                        return (
                                            <button key={r.id} type="button"
                                                onClick={() => handleLink(r)}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px 14px', border: `2px solid ${match ? '#10b981' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-md)', 
                                                    backgroundColor: match ? '#10b98108' : (isAlreadyLinked ? '#ef444408' : 'var(--bg-secondary)'),
                                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                                    opacity: isAlreadyLinked ? 0.6 : 1
                                                }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center' }}>
                                                        {r.reference || `Receipt #${r.id}`}
                                                        {match && <span style={{ marginLeft: 8, fontSize: 10, color: '#10b981', border: '1px solid #10b981', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase' }}>Amount Match</span>}
                                                        {isAlreadyLinked && <span style={{ marginLeft: 8, fontSize: 10, color: '#ef4444', border: '1px solid #ef4444', padding: '1px 4px', borderRadius: '4px', textTransform: 'uppercase' }}>Already Linked</span>}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.date)} • {r.description || 'No description'}</div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: match ? '#10b981' : 'var(--text-primary)', marginLeft: 16 }}>
                                                    {fmtAmt(r.amount)}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RentReceiptsModal;
