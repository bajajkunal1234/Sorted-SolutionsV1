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

    const normalizeIds = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'string') return [val];
        return [];
    };

    // Local state for edits before save
    const [depositReceiptIds, setDepositReceiptIds] = useState(() => {
        if (rental.rent_receipts?.deposit) {
            return normalizeIds(rental.rent_receipts.deposit);
        }
        return normalizeIds(rental.deposit_receipt_id);
    });

    const [rentReceipts, setRentReceipts] = useState(() => {
        const rawReceipts = rental.rent_receipts || {};
        const initial = {};
        for (let i = 1; i <= totalMonths; i++) {
            if (rawReceipts[i]) {
                initial[i] = normalizeIds(rawReceipts[i]);
            } else {
                initial[i] = [];
            }
        }
        
        // Also handle advance receipt if any was specified during creation
        const mRent = Number(rental.monthly_rent || 0);
        const rAdvance = Number(rental.rent_advance || 0);
        const advReceiptId = rental.advance_receipt_id;
        if (mRent > 0 && rAdvance > 0 && advReceiptId) {
            const monthsCovered = Math.floor(rAdvance / mRent);
            for (let i = 1; i <= monthsCovered; i++) {
                if (!initial[i] || initial[i].length === 0) {
                    initial[i] = [advReceiptId];
                }
            }
        }
        return initial;
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

    // Calculate allocation across all slots in agreement
    const slotsInfo = useMemo(() => {
        const consumed = {};

        const allocateForSlot = (receiptIds, needed) => {
            const slotReceipts = [];
            let slotAllocatedTotal = 0;

            for (const rId of receiptIds) {
                const r = getReceiptDetails(rId);
                const receiptCode = getReceiptCode(r, rId);
                const totalAmt = Number(r?.amount || (r ? 0 : needed));
                const alreadyUsed = consumed[rId] || 0;
                const availableFromReceipt = Math.max(0, totalAmt - alreadyUsed);
                const remainingSlotNeeded = Math.max(0, needed - slotAllocatedTotal);

                const allocatedHere = Math.min(availableFromReceipt, remainingSlotNeeded);
                consumed[rId] = alreadyUsed + allocatedHere;
                slotAllocatedTotal += allocatedHere;

                slotReceipts.push({
                    id: rId,
                    receipt: r,
                    receiptCode,
                    date: r?.date,
                    allocatedAmt: allocatedHere,
                    totalAmt
                });
            }

            const remainingNeeded = Math.max(0, needed - slotAllocatedTotal);
            const isPaid = receiptIds.length > 0 && remainingNeeded === 0;
            const isPartial = receiptIds.length > 0 && remainingNeeded > 0;

            return {
                needed,
                totalLinked: slotAllocatedTotal,
                remainingNeeded,
                isPaid,
                isPartial,
                receipts: slotReceipts
            };
        };

        const deposit = allocateForSlot(depositReceiptIds, securityDeposit);

        const rents = {};
        for (let i = 1; i <= totalMonths; i++) {
            rents[i] = allocateForSlot(rentReceipts[i] || [], monthlyRent);
        }

        return { deposit, rents, consumed };
    }, [depositReceiptIds, rentReceipts, receipts, securityDeposit, monthlyRent, totalMonths]);

    const handleLink = (receipt) => {
        if (pickerState.type === 'deposit') {
            setDepositReceiptIds(prev => {
                if (prev.includes(receipt.id)) return prev;
                return [...prev, receipt.id];
            });
        } else if (pickerState.type === 'rent' && pickerState.index !== null) {
            setRentReceipts(prev => {
                const current = prev[pickerState.index] || [];
                if (current.includes(receipt.id)) return prev;
                return {
                    ...prev,
                    [pickerState.index]: [...current, receipt.id]
                };
            });
        }
        setPickerState({ isOpen: false, type: null, index: null, amountExpected: 0 });
    };

    const handleUnlinkSingle = (type, index, receiptId) => {
        if (type === 'deposit') {
            setDepositReceiptIds(prev => prev.filter(id => id !== receiptId));
        } else if (type === 'rent') {
            setRentReceipts(prev => ({
                ...prev,
                [index]: (prev[index] || []).filter(id => id !== receiptId)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Compute rents_paid & next_rent_due_date
        let earliestUnpaidIndex = 1;
        while (earliestUnpaidIndex <= totalMonths && slotsInfo.rents[earliestUnpaidIndex]?.isPaid) {
            earliestUnpaidIndex++;
        }
        
        let rentsPaidCount = 0;
        for (let i = 1; i <= totalMonths; i++) {
            if (slotsInfo.rents[i]?.isPaid) {
                rentsPaidCount++;
            }
        }
        
        const nextDueDate = new Date(startDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + (earliestUnpaidIndex - 1));
        
        const rentsRemaining = Math.max(0, totalMonths - rentsPaidCount);

        // Normalize payload to preserve single string vs array structure
        const rentReceiptsToSave = {};
        for (let i = 1; i <= totalMonths; i++) {
            const ids = rentReceipts[i] || [];
            if (ids.length === 1) {
                rentReceiptsToSave[i] = ids[0];
            } else if (ids.length > 1) {
                rentReceiptsToSave[i] = ids;
            }
        }
        if (depositReceiptIds.length > 1) {
            rentReceiptsToSave.deposit = depositReceiptIds;
        }

        onSave({
            rentalId: rental.id,
            deposit_receipt_id: depositReceiptIds[0] || null,
            rent_receipts: rentReceiptsToSave,
            rents_paid: rentsPaidCount,
            rents_remaining: rentsRemaining,
            next_rent_due_date: earliestUnpaidIndex <= totalMonths ? nextDueDate.toISOString().split('T')[0] : null
        });
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
                            const info = slotsInfo.deposit;
                            const hasReceipts = info.receipts.length > 0;
                            const isPartial = info.isPartial;

                            return (
                                <div style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    backgroundColor: hasReceipts ? (isPartial ? '#f59e0b10' : '#10b98110') : 'var(--bg-secondary)',
                                    border: `1px solid ${hasReceipts ? (isPartial ? '#f59e0b40' : '#10b98140') : 'var(--border-primary)'}`,
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
                                        
                                        {hasReceipts ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '180px' }}>
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

                                                {/* List of linked receipts in deposit slot */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                                    {info.receipts.map(rec => (
                                                        <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                            <span>
                                                                {fmtDate(rec.date)} • ID: {formatReceiptId(rec.receiptCode)}
                                                                {isPartial ? ` (${fmtAmt(rec.allocatedAmt)} of ${fmtAmt(securityDeposit)})` : (info.receipts.length > 1 ? ` (${fmtAmt(rec.allocatedAmt)})` : '')}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUnlinkSingle('deposit', null, rec.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                                title="Unlink this receipt"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Option to link the remaining part if partial */}
                                                {isPartial && (
                                                    <div style={{ marginTop: '4px' }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            style={{
                                                                padding: '2px 8px',
                                                                fontSize: '11px',
                                                                color: '#f59e0b',
                                                                borderColor: '#f59e0b60',
                                                                backgroundColor: '#f59e0b10',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontWeight: 600,
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setPickerState({
                                                                isOpen: true,
                                                                type: 'deposit',
                                                                index: null,
                                                                amountExpected: info.remainingNeeded
                                                            })}
                                                        >
                                                            <Plus size={12} /> Link Remaining {fmtAmt(info.remainingNeeded)}
                                                        </button>
                                                    </div>
                                                )}
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
                            const info = slotsInfo.rents[row.monthIndex] || { needed: row.amount, totalLinked: 0, remainingNeeded: row.amount, isPaid: false, isPartial: false, receipts: [] };
                            const hasReceipts = info.receipts.length > 0;
                            const isPartial = info.isPartial;
                            const isPaid = info.isPaid;
                            const rowIsOverdue = !isPaid && row.monthIndex > (rental.rents_paid || 0) && isOverdue(row.startDate);

                            return (
                                <div key={row.monthIndex} style={{
                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                    backgroundColor: hasReceipts ? (isPartial ? '#f59e0b10' : '#10b98110') : (rowIsOverdue ? '#ef444408' : 'var(--bg-secondary)'),
                                    border: `1px solid ${hasReceipts ? (isPartial ? '#f59e0b40' : '#10b98140') : (rowIsOverdue ? '#ef444440' : 'var(--border-primary)')}`,
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
                                        
                                        {hasReceipts ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '180px' }}>
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

                                                {/* List of linked receipts in rent slot */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                                    {info.receipts.map(rec => (
                                                        <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                            <span>
                                                                {fmtDate(rec.date)} • ID: {formatReceiptId(rec.receiptCode)}
                                                                {isPartial ? ` (${fmtAmt(rec.allocatedAmt)} of ${fmtAmt(row.amount)})` : (info.receipts.length > 1 ? ` (${fmtAmt(rec.allocatedAmt)})` : '')}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUnlinkSingle('rent', row.monthIndex, rec.id)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '2px', display: 'flex', alignItems: 'center' }}
                                                                title="Unlink this receipt"
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Option to link the remaining part if partial */}
                                                {isPartial && (
                                                    <div style={{ marginTop: '4px' }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary"
                                                            style={{
                                                                padding: '2px 8px',
                                                                fontSize: '11px',
                                                                color: '#f59e0b',
                                                                borderColor: '#f59e0b60',
                                                                backgroundColor: '#f59e0b10',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontWeight: 600,
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setPickerState({
                                                                isOpen: true,
                                                                type: 'rent',
                                                                index: row.monthIndex,
                                                                amountExpected: info.remainingNeeded
                                                            })}
                                                        >
                                                            <Plus size={12} /> Link Remaining {fmtAmt(info.remainingNeeded)}
                                                        </button>
                                                    </div>
                                                )}
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
                            <div>
                                <h3 className="modal-title" style={{ margin: 0 }}>
                                    Select {pickerState.type === 'deposit' ? 'Deposit' : 'Rent'} Receipt
                                </h3>
                                {pickerState.amountExpected > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Target amount: <strong style={{ color: 'var(--text-primary)' }}>{fmtAmt(pickerState.amountExpected)}</strong>
                                    </div>
                                )}
                            </div>
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

                                        // Check if this receipt is already in the current slot
                                        const currentSlotIds = pickerState.type === 'deposit'
                                            ? depositReceiptIds
                                            : (rentReceipts[pickerState.index] || []);
                                        const isAlreadyInThisSlot = currentSlotIds.includes(r.id);

                                        // Calculate amount consumed by other slots
                                        const currentSlotAllocatedForR = (pickerState.type === 'deposit'
                                            ? slotsInfo.deposit
                                            : slotsInfo.rents[pickerState.index]
                                        )?.receipts?.find(x => x.id === r.id)?.allocatedAmt || 0;

                                        const consumedByOtherSlots = (slotsInfo.consumed[r.id] || 0) - currentSlotAllocatedForR;
                                        const availableToLink = Math.max(0, totalAmt - consumedByOtherSlots);

                                        const isFullyLinked = availableToLink <= 0;
                                        const isOverNeeded = availableToLink > needed;
                                        const leftToLink = availableToLink - needed;
                                        const isMatch = availableToLink === needed;
                                        const isPartial = availableToLink > 0 && availableToLink < needed;

                                        const isClickable = !isAlreadyInThisSlot && !isFullyLinked;

                                        const borderColor = isAlreadyInThisSlot ? '#3b82f6'
                                            : isFullyLinked ? 'var(--border-primary)'
                                            : (isMatch || isOverNeeded) ? '#10b981'
                                            : isPartial ? '#f59e0b' : 'var(--border-primary)';

                                        const bgColor = isAlreadyInThisSlot ? '#3b82f610'
                                            : isFullyLinked ? 'var(--bg-secondary)'
                                            : (isMatch || isOverNeeded) ? '#10b98108'
                                            : isPartial ? '#f59e0b08' : 'var(--bg-secondary)';

                                        const receiptDisplayTitle = r.receipt_number || r.reference || `Receipt #${r.id?.slice(0, 8) || r.id}`;

                                        return (
                                            <button key={r.id} type="button"
                                                onClick={() => {
                                                    if (isAlreadyInThisSlot) {
                                                        alert("This receipt is already linked to this slot.");
                                                        return;
                                                    }
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
                                                    cursor: isClickable ? 'pointer' : 'not-allowed', textAlign: 'left', width: '100%',
                                                    opacity: isClickable ? 1 : 0.6
                                                }}>
                                                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span>{receiptDisplayTitle}</span>
                                                        
                                                        {isAlreadyInThisSlot && (
                                                            <span style={{ fontSize: 10, color: '#3b82f6', border: '1px solid #3b82f6', backgroundColor: '#3b82f615', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Already in this slot
                                                            </span>
                                                        )}
                                                        {!isAlreadyInThisSlot && isFullyLinked && (
                                                            <span style={{ fontSize: 10, color: '#ef4444', border: '1px solid #ef4444', backgroundColor: '#ef444415', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Fully Linked
                                                            </span>
                                                        )}
                                                        {!isAlreadyInThisSlot && !isFullyLinked && isMatch && (
                                                            <span style={{ fontSize: 10, color: '#10b981', border: '1px solid #10b981', backgroundColor: '#10b98115', padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                                                                Amount Match
                                                            </span>
                                                        )}
                                                        {!isAlreadyInThisSlot && !isFullyLinked && isOverNeeded && (
                                                            <span style={{ fontSize: 10, color: '#10b981', border: '1px solid #10b981', backgroundColor: '#10b98115', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                ₹{leftToLink.toLocaleString()} left to link
                                                            </span>
                                                        )}
                                                        {!isAlreadyInThisSlot && !isFullyLinked && isPartial && (
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
                                                    {consumedByOtherSlots > 0 && (
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
                            ? `Security Deposit${pickerState.amountExpected < securityDeposit ? ' (Part Payment)' : ''} received for ${productName}`
                            : `Rent${pickerState.amountExpected < monthlyRent ? ' (Part Payment)' : ''} received for ${productName} - Month ${pickerState.index}`
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
