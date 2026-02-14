'use client'

import { useState } from 'react';
import { X, Bell, Calendar, AlertCircle } from 'lucide-react';

function AddReminderModal({ accountId, accountName, onClose, onSave }) {
    const [formData, setFormData] = useState({
        type: 'follow_up',
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        isRecurring: false,
        recurrencePattern: {
            frequency: 'monthly',
            interval: 1
        }
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }

        if (!formData.dueDate) {
            newErrors.dueDate = 'Due date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const newReminder = {
            id: `REM-${Date.now()}`,
            ...formData,
            accountId,
            accountName,
            status: 'pending',
            createdAt: new Date().toISOString(),
            relatedTo: null
        };

        onSave(newReminder);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <Bell size={20} color="var(--color-primary)" />
                        <h2 className="modal-title">Add Reminder</h2>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit}>
                    <div className="modal-content" style={{ padding: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {/* Account Info */}
                            <div style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)'
                            }}>
                                Reminder for: <strong style={{ color: 'var(--text-primary)' }}>{accountName}</strong>
                            </div>

                            {/* Reminder Type */}
                            <div className="form-group">
                                <label className="form-label">Reminder Type *</label>
                                <select
                                    className="form-select"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="follow_up">Follow-up</option>
                                    <option value="payment_follow_up">Payment Follow-up</option>
                                    <option value="rent_payment">Rent Payment</option>
                                    <option value="amc_service">AMC Service</option>
                                    <option value="amc_renewal">AMC Renewal</option>
                                    <option value="rental_renewal">Rental Renewal</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            {/* Title */}
                            <div className="form-group">
                                <label className="form-label">Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g., Follow up on pending payment"
                                />
                                {errors.title && (
                                    <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                        <AlertCircle size={12} />
                                        {errors.title}
                                    </span>
                                )}
                            </div>

                            {/* Description */}
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Additional details about this reminder..."
                                    rows={3}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            {/* Due Date and Priority */}
                            <div className="form-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
                                <div className="form-group">
                                    <label className="form-label">Due Date *</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    {errors.dueDate && (
                                        <span style={{ color: '#ef4444', fontSize: 'var(--font-size-xs)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                            <AlertCircle size={12} />
                                            {errors.dueDate}
                                        </span>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select
                                        className="form-select"
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            {/* Recurring */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isRecurring}
                                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                    />
                                    <span style={{ fontWeight: 500 }}>Make this a recurring reminder</span>
                                </label>
                            </div>

                            {/* Recurrence Pattern */}
                            {formData.isRecurring && (
                                <div style={{
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-primary)'
                                }}>
                                    <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                        Recurrence Pattern
                                    </h4>
                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                        <div className="form-group">
                                            <label className="form-label">Frequency</label>
                                            <select
                                                className="form-select"
                                                value={formData.recurrencePattern.frequency}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    recurrencePattern: { ...formData.recurrencePattern, frequency: e.target.value }
                                                })}
                                            >
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                                <option value="quarterly">Quarterly</option>
                                                <option value="yearly">Yearly</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Interval</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={formData.recurrencePattern.interval}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    recurrencePattern: { ...formData.recurrencePattern, interval: parseInt(e.target.value) || 1 }
                                                })}
                                                min="1"
                                                placeholder="1"
                                            />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--spacing-xs)' }}>
                                        Reminder will repeat every {formData.recurrencePattern.interval} {formData.recurrencePattern.frequency}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            <Bell size={16} />
                            Create Reminder
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddReminderModal;
