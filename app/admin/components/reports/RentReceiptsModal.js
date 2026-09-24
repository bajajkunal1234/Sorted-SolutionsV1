'use client'

import { useState, useEffect, useMemo } from 'react';
import { X, Receipt, CheckCircle, AlertCircle, Search, RefreshCcw, Link2, Trash2, Plus } from 'lucide-react';
import { transactionsAPI } from '@/lib/adminAPI';
import ReceiptVoucherForm from '@/app/admin/components/accounts/ReceiptVoucherForm';

function RentReceiptsModal({ rental, onClose, onSave }) {
    const customerId = rental.customer_id || rental.customerId;
    const productName = rental.product_name || rental.productName || rental.rental_plans?.product_name || '';
    const serialNumber = rental.serial_number || rental.serialNumber || '';
    
    const monthlyRent = Number(rental.monthly_rent || 0);
    const securityDeposit = Number(rental.deposit_amount || rental.security_deposit || 0);
    
    const tenure = rental.tenure || {};
    const duration = Number(tenure.duration || 1);
    const unit = tenure.unit || 'month';
    const totalMonths = unit.includes('year') ? duration * 12 : duration;
    
    const startDate = new Date(rental.start_date || new Date());

    // Local state for edits before save
    const [depositReceiptId, setDepositReceiptId] = useState(rental.deposit_receipt_id || null);
    const [rentReceipts, setRentReceipts] = useState(() => {
        const initialReceipts = { ...(rental.rent_receipts || {}) };
        const mRent = Number(rental.monthly_rent || 0);
        const rAdvance = Number(rental.rent_advance || 0);
        const advReceiptId = rental.advance_receipt_id;
        
        if (mRent > 0 && rAdvance > 0 && advReceiptId) {
            const monthsCovered = Math.floor(rAdvance / mRent);
            for (let i = 1; i <= monthsCovered; i++) {
                if (!initialReceipts[i]) {
                    initialReceipts[i] = advReceiptId;
                }
            }
        }
        return initialReceipts;
    });

    // Receipts fetching
    const [receipts, setReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);

    // Picker state
    const [pickerState, setPickerState] = useState({ isOpen: false, type: null, index: null, amountExpected: 0 }); // type: 'deposit' or 'rent'
    const [receiptSearch, setReceiptSearch] = useState('');
    const [showCreateReceiptForm, setShowCreateReceiptForm] = useState(false);

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

    const formatReceiptId = (code) => {
        if (!code) return '';
        if (code.startsWith('REC-') || code.startsWith('#')) return code;
        return `#${code}`;
    };

    const getReceiptCode = (r, fallbackId) => {
        if (r?.receipt_number) return r.receipt_number;
        const rawId = r?.id || fallbackId;
        if (!rawId) return '';
        return rawId.length > 8 ? rawId.slice(0, 8) : rawId;
    };

    // Calculate how a receipt is allocated to a specific row (deposit or month i)
    const getSlotReceiptInfo = (type, monthIndex, linkedId) => {
        if (!linkedId) return null;
        const r = getReceiptDetails(linkedId);
        const receiptCode = getReceiptCode(r, linkedId);
        const needed = type === 'deposit' ? securityDeposit : monthlyRent;

        if (!r) {
            return {
                receipt: null,
                receiptCode,
                isPartial: false,
                linkedAmt: needed,
                date: null
            };
        }

        const totalAmt = Number(r.amount || 0);

        // Calculate how much of r was consumed before this slot
        let consumedBefore = 0;
        if (depositReceiptId === r.id && type !== 'deposit') {
            consumedBefore += Math.min(totalAmt, securityDeposit);
        }

        if (type === 'rent') {
            for (let m = 1; m < monthIndex; m++) {
                if (rentReceipts[m] === r.id) {
                    const avail = Math.max(0, totalAmt - consumedBefore);
                    consumedBefore += Math.min(avail, monthlyRent);
                }
            }
        }

        const availableForSlot = Math.max(0, totalAmt - consumedBefore);
        const linkedAmt = Math.min(availableForSlot, needed);
        const isPartial = availableForSlot < needed || totalAmt < needed;

        return {
            receipt: r,
            receiptCode,
            isPartial,
            linkedAmt,
            date: r.date
        };
    };

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
            linkedId: rentReceipts[i] || null,
            startDate: dStart.toISOString()
        });
    }

    const filteredReceipts = receipts.filter(r => {
        const term = receiptSearch.toLowerCase();
        return !term || (r.reference || '').toLowerCase().includes(term)
            || (r.receipt_number || '').toLowerCase().includes(term)
            || (r.description || '').toLowerCase().includes(term)
            || (r.narration || '').toLowerCase().includes(term)
            || (r.id || '').toLowerCase().includes(term)
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
                        {(() => {
                            const slotInfo = depositReceiptId ? getSlotReceiptInfo('deposit', null, depositReceiptId) : null;
                            const isPartial = !!slotInfo?.isPartial;

                            return (
                                <div style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    backgroundColor: depositReceiptId ? (isPartial ? '#f59e0b10' : '#10b98110') : 'var(--bg-secondary)',
                                    border: `1px solid ${depositReceiptId ? (isPartial ? '#f59e0b40' : '#10b98140') : 'var(--border-primary)'}`,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 'var(--spacing-md)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>Security Deposit</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>One-time payment</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{fmtAmt(securityDeposit)}</div>
                                        
                                        {depositReceiptId ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: '180px', justifyContent: 'flex-end' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: isPartial ? '#f59e0b' : '#10b981',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        justifyContent: 'flex-end'
                                                    }}>
                                                        {isPartial ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                                                        {isPartial ? 'Partial Payment Linked' : 'Linked'}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                        {fmtDate(slotInfo?.date)} • ID: {formatReceiptId(slotInfo?.receiptCode)}
                                                        {isPartial && slotInfo?.linkedAmt !== undefined ? ` (${fmtAmt(slotInfo.linkedAmt)} of ${fmtAmt(securityDeposit)})` : ''}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleUnlink('deposit')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }} title="Unlink Receipt">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '4px 10px', fontSize: '12px', minWidth: '180px' }}
                                                onClick={() => setPickerState({ isOpen: true, type: 'deposit', index: null, amountExpected: securityDeposit })}
                                            >
                                                <Link2 size={14} /> Link Receipt
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Rent Rows */}
                        {rentRows.map((row) => {
                            const isPaid = !!row.linkedId;
                            // Check if this row is currently overdue (if past end date and not paid)
                            const rowIsOverdue = !isPaid && row.monthIndex > (rental.rents_paid || 0) && isOverdue(row.startDate);
                            const slotInfo = isPaid ? getSlotReceiptInfo('rent', row.monthIndex, row.linkedId) : null;
                            const isPartial = !!slotInfo?.isPartial;

                            return (
                                <div key={row.monthIndex} style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    backgroundColor: isPaid ? (isPartial ? '#f59e0b10' : '#10b98110') : (rowIsOverdue ? '#ef444408' : 'var(--bg-secondary)'),
                                    border: `1px solid ${isPaid ? (isPartial ? '#f59e0b40' : '#10b98140') : (rowIsOverdue ? '#ef444440' : 'var(--border-primary)')}`,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 'var(--spacing-md)'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {row.label}
                                            {rowIsOverdue && <span style={{ fontSize: '10px', backgroundColor: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Due</span>}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{row.period}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{fmtAmt(row.amount)}</div>
                                        
                                        {isPaid ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: '180px', justifyContent: 'flex-end' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{
                                                        fontSize: '12px',
                                                        fontWeight: 600,
                                                        color: isPartial ? '#f59e0b' : '#10b981',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        justifyContent: 'flex-end'
                                                    }}>
                                                        {isPartial ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
                                                        {isPartial ? 'Partial Payment Linked' : 'Linked'}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                        {fmtDate(slotInfo?.date)} • ID: {formatReceiptId(slotInfo?.receiptCode)}
                                                        {isPartial && slotInfo?.linkedAmt !== undefined ? ` (${fmtAmt(slotInfo.linkedAmt)} of ${fmtAmt(row.amount)})` : ''}
                                                    </div>
                                                </div>
                                                <button onClick={() => handleUnlink('rent', row.monthIndex)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }} title="Unlink Receipt">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                className="btn btn-secondary" 
                                                style={{ padding: '4px 10px', fontSize: '12px', minWidth: '180px' }}
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
            {pickerState.isOpen && !showCreateReceiptForm && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 })}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 className="modal-title" style={{ margin: 0 }}>Select {pickerState.type === 'deposit' ? 'Deposit' : 'Rent'} Receipt</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button 
                                    type="button"
                                    className="btn btn-primary" 
                                    style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', border: 'none' }}
                                    onClick={() => setShowCreateReceiptForm(true)}
                                >
                                    <Plus size={14} /> Create Receipt
                                </button>
                                <button className="btn-icon" onClick={() => setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 })}><X size={18} /></button>
                            </div>
                        </div>
                        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-primary)' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input className="form-input" style={{ paddingLeft: 32, fontSize: 13 }}
                                    placeholder="Search by reference, amount, ID..." value={receiptSearch}
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
                                        const totalAmt = Number(r.amount || 0);
                                        const needed = Number(pickerState.amountExpected || 0);

                                        // Calculate already allocated amount for r across OTHER slots in this agreement
                                        let allocatedToOthers = 0;
                                        if (depositReceiptId === r.id && pickerState.type !== 'deposit') {
                                            allocatedToOthers += Math.min(totalAmt, securityDeposit);
                                        }
                                        Object.entries(rentReceipts).forEach(([mIdx, rId]) => {
                                            if (rId === r.id) {
                                                if (pickerState.type === 'rent' && String(pickerState.index) === String(mIdx)) {
                                                    return; // exclude slot currently being picked
                                                }
                                                const avail = Math.max(0, totalAmt - allocatedToOthers);
                                                allocatedToOthers += Math.min(avail, monthlyRent);
                                            }
                                        });

                                        const availableToLink = Math.max(0, totalAmt - allocatedToOthers);
                                        const isFullyLinked = availableToLink <= 0;
                                        const isOverNeeded = availableToLink > needed;
                                        const leftToLink = availableToLink - needed;
                                        const isMatch = availableToLink === needed;
                                        const isPartial = availableToLink > 0 && availableToLink < needed;

                                        const isCurrentSlotReceipt = 
                                            (pickerState.type === 'deposit' && depositReceiptId === r.id) ||
                                            (pickerState.type === 'rent' && rentReceipts[pickerState.index] === r.id);

                                        const borderColor = isFullyLinked ? 'var(--border-primary)'
                                            : isCurrentSlotReceipt ? '#3b82f6'
                                            : (isMatch || isOverNeeded) ? '#10b981'
                                            : isPartial ? '#f59e0b' : 'var(--border-primary)';

                                        const bgColor = isFullyLinked ? 'var(--bg-secondary)'
                                            : isCurrentSlotReceipt ? '#3b82f610'
                                            : (isMatch || isOverNeeded) ? '#10b98108'
                                            : isPartial ? '#f59e0b08' : 'var(--bg-secondary)';

                                        const receiptDisplayTitle = r.receipt_number || r.reference || `Receipt #${r.id?.slice(0, 8) || r.id}`;

                                        return (
                                            <button key={r.id} type="button"
                                                onClick={() => {
                                                    if (isFullyLinked) {
                                                        alert("This receipt has already been fully allocated to other slots in this agreement. Please unlink it from other slots first if you wish to re-allocate it.");
                                                        return;
                                                    }
                                                    handleLink(r);
                                                }}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px 14px', border: `2px solid ${borderColor}`,
                                                    borderRadius: 'var(--radius-md)', 
                                                    backgroundColor: bgColor,
                                                    cursor: isFullyLinked ? 'not-allowed' : 'pointer', textAlign: 'left', width: '100%',
                                                    opacity: isFullyLinked ? 0.6 : 1
                                                }}>
                                                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span>{receiptDisplayTitle}</span>
                                                        
                                                        {isCurrentSlotReceipt && (
                                                            <span style={{ fontSize: 10, color: '#3b82f6', border: '1px solid #3b82f6', backgroundColor: '#3b82f615', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Current Link
                                                            </span>
                                                        )}
                                                        {isFullyLinked && (
                                                            <span style={{ fontSize: 10, color: '#ef4444', border: '1px solid #ef4444', backgroundColor: '#ef444415', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Fully Linked
                                                            </span>
                                                        )}
                                                        {!isFullyLinked && isMatch && (
                                                            <span style={{ fontSize: 10, color: '#10b981', border: '1px solid #10b981', backgroundColor: '#10b98115', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Amount Match
                                                            </span>
                                                        )}
                                                        {!isFullyLinked && isOverNeeded && (
                                                            <span style={{ fontSize: 10, color: '#10b981', border: '1px solid #10b981', backgroundColor: '#10b98115', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                ₹{leftToLink.toLocaleString()} left to link
                                                            </span>
                                                        )}
                                                        {!isFullyLinked && isPartial && (
                                                            <span style={{ fontSize: 10, color: '#f59e0b', border: '1px solid #f59e0b', backgroundColor: '#f59e0b15', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Partial (₹{availableToLink.toLocaleString()})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {fmtDate(r.date)} • {r.narration || r.description || r.payment_mode || 'No description'}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ fontWeight: 700, fontSize: 15, color: isFullyLinked ? 'var(--text-tertiary)' : ((isMatch || isOverNeeded) ? '#10b981' : (isPartial ? '#f59e0b' : 'var(--text-primary)')) }}>
                                                        {fmtAmt(r.amount)}
                                                    </div>
                                                    {allocatedToOthers > 0 && (
                                                        <div style={{ fontSize: 10, color: isFullyLinked ? '#ef4444' : 'var(--text-secondary)', marginTop: 2 }}>
                                                            {isFullyLinked ? 'All allocated' : `${fmtAmt(availableToLink)} available`}
                                                        </div>
                                                    )}
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

            {/* Create Receipt Voucher Form Overlay */}
            {showCreateReceiptForm && (
                <ReceiptVoucherForm
                    onClose={() => setShowCreateReceiptForm(false)}
                    existingReceipt={{
                        account_id: customerId,
                        account_name: rental.customer_name || rental.accounts?.name || '',
                        amount: pickerState.amountExpected,
                        narration: pickerState.type === 'deposit'
                            ? `Security Deposit received for ${productName}`
                            : `Rent received for ${productName} - Month ${pickerState.index}`
                    }}
                    onSave={async (voucherData) => {
                        try {
                            const newReceipt = await transactionsAPI.create(voucherData, 'receipt');
                            if (newReceipt) {
                                // Add to receipts list so it shows in lookup
                                setReceipts(prev => [newReceipt, ...prev]);
                                // Auto-link to the active row
                                handleLink(newReceipt);
                                setShowCreateReceiptForm(false);
                            }
                        } catch (err) {
                            console.error('Failed to create new receipt:', err);
                            alert('Failed to save receipt: ' + err.message);
                        }
                    }}
                />
            )}
        </div>
    );
}

export default RentReceiptsModal;
