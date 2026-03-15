'use client'

import { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle, Search, RefreshCcw } from 'lucide-react';
import { transactionsAPI } from '@/lib/adminAPI';

function CollectRentForm({ rental, onClose, onSave }) {
    // Support both camelCase (old) and snake_case (Supabase) field names
    const monthlyRent = Number(rental.monthly_rent || rental.monthlyRent || 0);
    const customerId = rental.customer_id || rental.customerId;
    const productName = rental.product_name || rental.productName || '';
    const serialNumber = rental.serial_number || rental.serialNumber || '';
    const nextDue = rental.next_rent_due_date || rental.nextRentDueDate;

    const [formData, setFormData] = useState({
        amount: monthlyRent,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionRef: '',
        notes: ''
    });

    // Receipt linking
    const [receipts, setReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(false);
    const [linkedReceipt, setLinkedReceipt] = useState(null);
    const [showReceiptPicker, setShowReceiptPicker] = useState(false);
    const [receiptSearch, setReceiptSearch] = useState('');

    // Load customer receipts and auto-match
    useEffect(() => {
        if (!customerId) return;
        setLoadingReceipts(true);
        transactionsAPI.getAll({ type: 'receipt', account_id: customerId })
            .then(data => {
                setReceipts(data || []);
                // Auto-link matching receipt
                const match = (data || []).find(r => Number(r.amount) === monthlyRent);
                if (match) setLinkedReceipt(match);
            })
            .catch(console.error)
            .finally(() => setLoadingReceipts(false));
    }, [customerId, monthlyRent]);

    // Re-auto-link when amount changes
    const handleAmountChange = (val) => {
        const amount = parseFloat(val) || 0;
        setFormData(prev => ({ ...prev, amount }));
        const match = receipts.find(r => Number(r.amount) === amount);
        setLinkedReceipt(match || null);
    };

    const amtMatch = linkedReceipt && Number(linkedReceipt.amount) === Number(formData.amount);

    const filteredReceipts = receipts.filter(r => {
        const term = receiptSearch.toLowerCase();
        return !term || (r.reference || '').toLowerCase().includes(term)
            || (r.description || '').toLowerCase().includes(term)
            || String(r.amount || '').includes(term);
    });

    const fmtAmt = n => `₹${Number(n || 0).toLocaleString()}`;
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            rentalId: rental.id,
            ...formData,
            linkedReceiptId: linkedReceipt?.id || null,
            useExistingReceipt: !!linkedReceipt,
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Collect Rent Payment</h2>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                        {/* Rental Info */}
                        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 4 }}>
                                {rental.customer_name || rental.customerName}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {productName}{serialNumber ? ` • SN: ${serialNumber}` : ''}
                            </div>
                            {nextDue && (
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>
                                    Due Date: {new Date(nextDue).toLocaleDateString('en-GB')}
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label className="form-label">Amount (₹) *</label>
                            <input type="number" className="form-input" value={formData.amount}
                                onChange={e => handleAmountChange(e.target.value)} min="0" required />
                        </div>

                        {/* Receipt Linking */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Link Receipt Voucher <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional)</span></span>
                                {loadingReceipts && <RefreshCcw size={12} className="spin" />}
                            </label>

                            {linkedReceipt ? (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                                    backgroundColor: amtMatch ? '#10b98110' : '#f59e0b10',
                                    border: `1px solid ${amtMatch ? '#10b98140' : '#f59e0b40'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CheckCircle size={14} color={amtMatch ? '#10b981' : '#f59e0b'} />
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>
                                                {linkedReceipt.reference || `Receipt #${linkedReceipt.id}`}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                {fmtAmt(linkedReceipt.amount)} · {fmtDate(linkedReceipt.date)}
                                                {!amtMatch && <span style={{ color: '#f59e0b' }}> · amount mismatch</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button type="button" onClick={() => setShowReceiptPicker(true)}
                                            className="btn btn-secondary" style={{ fontSize: 11, padding: '4px 8px' }}>Change</button>
                                        <button type="button" onClick={() => setLinkedReceipt(null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={() => setShowReceiptPicker(true)}>
                                    <Receipt size={14} style={{ marginRight: 6 }} />
                                    {receipts.length > 0 ? `Link Existing Receipt (${receipts.length} available)` : 'Link Receipt Voucher'}
                                </button>
                            )}
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                                {linkedReceipt
                                    ? 'Payment will be marked against this existing receipt.'
                                    : 'If no receipt is linked, a new receipt voucher will be created automatically.'}
                            </div>
                        </div>

                        {/* Payment Method — only if not using existing receipt */}
                        {!linkedReceipt && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Payment Method *</label>
                                    <select className="form-select" value={formData.paymentMethod}
                                        onChange={e => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))} required>
                                        <option value="cash">Cash</option>
                                        <option value="upi">UPI</option>
                                        <option value="card">Card</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Payment Date *</label>
                                    <input type="date" className="form-input" value={formData.paymentDate}
                                        onChange={e => setFormData(prev => ({ ...prev, paymentDate: e.target.value }))} required />
                                </div>

                                {formData.paymentMethod !== 'cash' && (
                                    <div className="form-group">
                                        <label className="form-label">Transaction Reference</label>
                                        <input type="text" className="form-input" value={formData.transactionRef}
                                            onChange={e => setFormData(prev => ({ ...prev, transactionRef: e.target.value }))}
                                            placeholder="Transaction ID / Cheque Number" />
                                    </div>
                                )}
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea className="form-input" value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                rows="2" placeholder="Additional notes..." />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {linkedReceipt ? 'Confirm Payment' : 'Collect & Create Receipt'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Receipt Picker */}
            {showReceiptPicker && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowReceiptPicker(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Select Receipt Voucher</h3>
                            <button className="btn-icon" onClick={() => setShowReceiptPicker(false)}><X size={18} /></button>
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
                                        const match = Number(r.amount) === Number(formData.amount);
                                        return (
                                            <button key={r.id} type="button"
                                                onClick={() => { setLinkedReceipt(r); setShowReceiptPicker(false); }}
                                                style={{
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    padding: '10px 14px', border: `2px solid ${match ? '#10b981' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-md)', backgroundColor: match ? '#10b98108' : 'var(--bg-secondary)',
                                                    cursor: 'pointer', textAlign: 'left', width: '100%'
                                                }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                        {r.reference || `Receipt #${r.id}`}
                                                        {match && <span style={{ marginLeft: 8, fontSize: 11, color: '#10b981' }}>✓ MATCHES</span>}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(r.date)}</div>
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
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowReceiptPicker(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CollectRentForm;
