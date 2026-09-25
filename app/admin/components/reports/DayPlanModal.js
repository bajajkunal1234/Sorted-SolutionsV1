'use client'

import { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, MapPin, CheckSquare, Clock, AlertCircle, Phone, User, FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function DayPlanModal({ isOpen, onClose, onSave, initialDate, editItem = null }) {
    const [reminderType, setReminderType] = useState('payment'); // 'payment' | 'visit' | 'task'
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [direction, setDirection] = useState('payable'); // 'payable' (to make) | 'receivable' (to collect)
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [location, setLocation] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [dueTime, setDueTime] = useState('');
    const [priority, setPriority] = useState('medium');
    const [assignedTo, setAssignedTo] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (!isOpen) return;

        if (editItem) {
            setReminderType(editItem.reminder_type || 'payment');
            setTitle(editItem.title || '');
            setAmount(editItem.amount ? String(editItem.amount) : '');
            setDirection(editItem.metadata?.direction || 'payable');
            setContactName(editItem.contact_name || '');
            setContactPhone(editItem.contact_phone || '');
            setLocation(editItem.location || '');
            setDueDate(editItem.due_date || '');
            setDueTime(editItem.due_time || '');
            setPriority(editItem.priority || 'medium');
            setAssignedTo(editItem.metadata?.assigned_to || '');
            setDescription(editItem.description || '');
        } else {
            // Default new
            setReminderType('payment');
            setTitle('');
            setAmount('');
            setDirection('payable');
            setContactName('');
            setContactPhone('');
            setLocation('');
            setDueDate(initialDate || new Date().toISOString().split('T')[0]);
            setDueTime('10:00');
            setPriority('medium');
            setAssignedTo('');
            setDescription('');
        }
        setErrors({});
    }, [isOpen, editItem, initialDate]);

    if (!isOpen) return null;

    const validate = () => {
        const errs = {};
        if (!title.trim()) {
            errs.title = 'Title is required';
        }
        if (!dueDate) {
            errs.dueDate = 'Due date is required';
        }
        if (reminderType === 'payment') {
            if (amount !== '' && (isNaN(Number(amount)) || Number(amount) < 0)) {
                errs.amount = 'Please enter a valid amount';
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            setSaving(true);
            const payload = {
                title: title.trim(),
                due_date: dueDate,
                due_time: dueTime || null,
                reminder_type: reminderType,
                amount: reminderType === 'payment' ? (parseFloat(amount) || 0) : 0,
                contact_name: contactName.trim() || null,
                contact_phone: contactPhone.trim() || null,
                location: location.trim() || null,
                description: description.trim() || null,
                priority,
                status: editItem ? editItem.status : 'pending',
                metadata: {
                    ...(editItem?.metadata || {}),
                    direction: reminderType === 'payment' ? direction : undefined,
                    assigned_to: assignedTo.trim() || undefined
                }
            };

            if (editItem?.id) {
                payload.id = editItem.id;
            }

            await onSave(payload);
            onClose();
        } catch (err) {
            console.error('Error saving plan:', err);
            setErrors({ submit: err.message || 'Failed to save plan' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
            <div
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: '560px',
                    width: '94%',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 'var(--radius-lg, 12px)',
                    overflow: 'hidden',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                }}
            >
                {/* Modal Header */}
                <div
                    className="modal-header"
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-elevated)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                backgroundColor: reminderType === 'payment' ? 'rgba(16, 185, 129, 0.15)' :
                                    reminderType === 'visit' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                color: reminderType === 'payment' ? '#10b981' :
                                    reminderType === 'visit' ? '#8b5cf6' : '#3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {reminderType === 'payment' && <DollarSign size={20} />}
                            {reminderType === 'visit' && <MapPin size={20} />}
                            {reminderType === 'task' && <CheckSquare size={20} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 600 }}>
                                {editItem ? 'Edit Scheduled Plan' : 'Plan Day Activity'}
                            </h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {reminderType === 'payment' ? 'Schedule a payment reminder' :
                                    reminderType === 'visit' ? 'Schedule a client or site visit' : 'Add a task or daily follow-up'}
                            </span>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose} type="button" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form Type Tabs */}
                <div
                    style={{
                        padding: '12px 20px 4px',
                        backgroundColor: 'var(--bg-elevated)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px'
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setReminderType('payment')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'payment' ? '#10b981' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'payment' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'payment' ? '#10b981' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <DollarSign size={15} />
                        Payment
                    </button>

                    <button
                        type="button"
                        onClick={() => setReminderType('visit')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'visit' ? '#8b5cf6' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'visit' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'visit' ? '#8b5cf6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <MapPin size={15} />
                        Visit
                    </button>

                    <button
                        type="button"
                        onClick={() => setReminderType('task')}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'task' ? '#3b82f6' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'task' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'task' ? '#3b82f6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <CheckSquare size={15} />
                        Task
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {errors.submit && (
                            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={15} />
                                {errors.submit}
                            </div>
                        )}

                        {/* Payment Direction Toggle (Only for Payment) */}
                        {reminderType === 'payment' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setDirection('payable')}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        borderRadius: '6px',
                                        border: `1px solid ${direction === 'payable' ? '#ef4444' : 'var(--border-primary)'}`,
                                        backgroundColor: direction === 'payable' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-secondary)',
                                        color: direction === 'payable' ? '#ef4444' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowUpRight size={14} />
                                    Payment to Make (Payable)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDirection('receivable')}
                                    style={{
                                        flex: 1,
                                        padding: '7px 10px',
                                        borderRadius: '6px',
                                        border: `1px solid ${direction === 'receivable' ? '#10b981' : 'var(--border-primary)'}`,
                                        backgroundColor: direction === 'receivable' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                                        color: direction === 'receivable' ? '#10b981' : 'var(--text-secondary)',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <ArrowDownLeft size={14} />
                                    Payment to Collect (Receivable)
                                </button>
                            </div>
                        )}

                        {/* Title Field */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                {reminderType === 'payment' ? 'Payment Title / Purpose *' :
                                    reminderType === 'visit' ? 'Visit Title / Purpose *' : 'Task Title *'}
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={
                                    reminderType === 'payment' ? 'e.g. Office Rent, Supplier Parts Bill, GST EMI' :
                                        reminderType === 'visit' ? 'e.g. Site Inspection at Tower B, AC Installation Client' :
                                            'e.g. Check spare parts inventory, Call insurance agent'
                                }
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            {errors.title && (
                                <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '3px', display: 'block' }}>{errors.title}</span>
                            )}
                        </div>

                        {/* Payment Specific Fields: Amount & Payee */}
                        {reminderType === 'payment' && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                        Amount (₹)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 600 }}>₹</span>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '9px 12px 9px 28px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    {errors.amount && (
                                        <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '3px', display: 'block' }}>{errors.amount}</span>
                                    )}
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                        {direction === 'payable' ? 'Payee / Vendor Name' : 'Customer / Payer Name'}
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={contactName}
                                        onChange={(e) => setContactName(e.target.value)}
                                        placeholder="e.g. Landlord, Voltas Distributor"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Visit Specific Fields: Contact, Phone, Location */}
                        {reminderType === 'visit' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                            Contact Person / Customer
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={contactName}
                                            onChange={(e) => setContactName(e.target.value)}
                                            placeholder="e.g. Rajesh Kumar"
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>

                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                            Phone / Mobile
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                            style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                        Visit Address / Location
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. Flat 402, Sunshine Heights, Koramangala"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                        Assigned Staff / Technician
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        placeholder="e.g. Ramesh Tech, Self"
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </>
                        )}

                        {/* Date & Time Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                    Due Date *
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                />
                                {errors.dueDate && (
                                    <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '3px', display: 'block' }}>{errors.dueDate}</span>
                                )}
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                    Time Slot
                                </label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>

                        {/* Priority Selector */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                Priority
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[
                                    { id: 'low', label: 'Low', color: '#10b981' },
                                    { id: 'medium', label: 'Medium', color: '#f59e0b' },
                                    { id: 'high', label: 'High', color: '#ef4444' }
                                ].map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPriority(p.id)}
                                        style={{
                                            flex: 1,
                                            padding: '6px 10px',
                                            borderRadius: '6px',
                                            border: `1px solid ${priority === p.id ? p.color : 'var(--border-primary)'}`,
                                            backgroundColor: priority === p.id ? `${p.color}20` : 'var(--bg-secondary)',
                                            color: priority === p.id ? p.color : 'var(--text-secondary)',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes / Description */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                Notes / Details
                            </label>
                            <textarea
                                className="form-input"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add any additional instructions, bank account details, or site notes..."
                                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical' }}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div
                        style={{
                            padding: '12px 20px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            backgroundColor: 'var(--bg-elevated)'
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                            style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{
                                padding: '8px 20px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: reminderType === 'payment' ? '#10b981' :
                                    reminderType === 'visit' ? '#8b5cf6' : 'var(--color-primary)',
                                borderColor: 'transparent',
                                color: '#ffffff',
                                fontWeight: 600
                            }}
                        >
                            {saving ? 'Saving...' : editItem ? 'Update Plan' : 'Save Plan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
