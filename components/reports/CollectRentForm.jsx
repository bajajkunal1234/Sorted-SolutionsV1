'use client'

import { useState } from 'react';
import { X } from 'lucide-react';

function CollectRentForm({ rental, onClose, onSave }) {
    const [formData, setFormData] = useState({
        amount: rental.monthlyRent,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionRef: '',
        notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            rentalId: rental.id,
            ...formData
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Collect Rent Payment</h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                        {/* Rental Info */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                <strong>{rental.customerName}</strong>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                {rental.productName} • SN: {rental.serialNumber}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                Due Date: {new Date(rental.nextRentDueDate).toLocaleDateString('en-GB')}
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label className="form-label">Amount (₹) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                min="0"
                                required
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="form-group">
                            <label className="form-label">Payment Method *</label>
                            <select
                                className="form-select"
                                value={formData.paymentMethod}
                                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                                required
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>

                        {/* Payment Date */}
                        <div className="form-group">
                            <label className="form-label">Payment Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                required
                            />
                        </div>

                        {/* Transaction Reference */}
                        {formData.paymentMethod !== 'cash' && (
                            <div className="form-group">
                                <label className="form-label">Transaction Reference</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.transactionRef}
                                    onChange={(e) => setFormData({ ...formData, transactionRef: e.target.value })}
                                    placeholder="Transaction ID / Cheque Number"
                                />
                            </div>
                        )}

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-input"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows="2"
                                placeholder="Additional notes..."
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Collect Payment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CollectRentForm;





