'use client'

import { useState, useRef } from 'react';
import { Camera, X } from 'lucide-react';

function ExpenseEntry({ onSave, onCancel, existingExpense = null }) {
    const [date, setDate] = useState(existingExpense?.date || new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(existingExpense?.time || new Date().toTimeString().slice(0, 5));
    const [category, setCategory] = useState(existingExpense?.category || '');
    const [amount, setAmount] = useState(existingExpense?.amount || '');
    const [description, setDescription] = useState(existingExpense?.description || '');
    const [receiptPhoto, setReceiptPhoto] = useState(existingExpense?.receiptPhoto || null);
    const fileInputRef = useRef(null);

    const categories = [
        { value: 'petrol', label: 'Petrol/Fuel', color: '#ef4444' },
        { value: 'transport', label: 'Transport (Bus/Train/Auto)', color: '#3b82f6' },
        { value: 'spare_parts', label: 'Spare Parts Sourced', color: '#8b5cf6' },
        { value: 'food', label: 'Food/Meals', color: '#10b981' },
        { value: 'other', label: 'Other', color: '#6b7280' }
    ];

    const handlePhotoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setReceiptPhoto(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = () => {
        if (!category) {
            alert('Please select a category');
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }
        if (!description.trim()) {
            alert('Please enter a description');
            return;
        }

        const expense = {
            id: existingExpense?.id || `exp_${Date.now()}`,
            date,
            time,
            category,
            amount: parseFloat(amount),
            description,
            receiptPhoto,
            createdAt: existingExpense?.createdAt || new Date().toISOString()
        };

        onSave(expense);
    };

    return (
        <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '600px',
            margin: '0 auto'
        }}>
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                {existingExpense ? 'Edit Expense' : 'Add Expense'}
            </h3>

            {/* Date & Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Date *
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        Time *
                    </label>
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="form-input"
                        style={{ width: '100%' }}
                    />
                </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Category *
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                    style={{ width: '100%' }}
                >
                    <option value="">Select category...</option>
                    {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                            {cat.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    ₹ Amount *
                </label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="form-input"
                    style={{ width: '100%' }}
                    min="0"
                    step="10"
                />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Description *
                </label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter details about this expense..."
                    className="form-input"
                    rows="3"
                    style={{ width: '100%', resize: 'vertical' }}
                />
            </div>

            {/* Receipt Photo */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                    Receipt Photo (Optional)
                </label>

                {!receiptPhoto ? (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: '2px dashed var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-lg)',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            cursor: 'pointer'
                        }}
                    >
                        <Camera size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--spacing-sm)' }} />
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Tap to upload receipt photo
                        </div>
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                        <img src={receiptPhoto} alt="Receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', backgroundColor: '#f3f4f6' }} />
                        <button
                            onClick={() => setReceiptPhoto(null)}
                            className="btn"
                            style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                padding: '4px 8px',
                                backgroundColor: '#ef4444',
                                minWidth: 'auto'
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={onCancel}
                    className="btn btn-secondary"
                    style={{ padding: 'var(--spacing-md)', width: '100%' }}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    style={{ padding: 'var(--spacing-md)', width: '100%', backgroundColor: '#10b981' }}
                >
                    {existingExpense ? 'Update Expense' : 'Add Expense'}
                </button>
            </div>
        </div>
    );
}

export default ExpenseEntry;

