'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    X,
    Calendar,
    DollarSign,
    MapPin,
    CheckSquare,
    Clock,
    AlertCircle,
    Phone,
    User,
    FileText,
    ArrowDownLeft,
    ArrowUpRight,
    Repeat,
    Building2,
    Check,
    Wrench,
    Search
} from 'lucide-react';

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}

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
    const [isCustomAssigned, setIsCustomAssigned] = useState(false);
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    // Recurring state
    const [recurrenceFrequency, setRecurrenceFrequency] = useState('none'); // 'none' | 'monthly' | 'weekly' | 'daily'

    // Account link state
    const [accountId, setAccountId] = useState(null);
    const [accountSearchText, setAccountSearchText] = useState('');
    const [showAccountDropdown, setShowAccountDropdown] = useState(false);
    const [accountsList, setAccountsList] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);

    // Technicians state
    const [techniciansList, setTechniciansList] = useState([]);
    const [loadingTechnicians, setLoadingTechnicians] = useState(false);

    const accountDropdownRef = useRef(null);

    // Fetch accounts and technicians on mount
    useEffect(() => {
        if (!isOpen) return;

        // Fetch Accounts
        const fetchAccounts = async () => {
            try {
                setLoadingAccounts(true);
                const res = await fetch('/api/admin/accounts?limit=250');
                const data = await res.json();
                if (data?.data && Array.isArray(data.data)) {
                    setAccountsList(data.data);
                } else if (Array.isArray(data)) {
                    setAccountsList(data);
                }
            } catch (err) {
                console.warn('Failed to load accounts list:', err);
            } finally {
                setLoadingAccounts(false);
            }
        };

        // Fetch Technicians
        const fetchTechnicians = async () => {
            try {
                setLoadingTechnicians(true);
                const res = await fetch('/api/admin/technicians');
                const data = await res.json();
                if (data?.data && Array.isArray(data.data)) {
                    setTechniciansList(data.data);
                }
            } catch (err) {
                console.warn('Failed to load technicians list:', err);
            } finally {
                setLoadingTechnicians(false);
            }
        };

        fetchAccounts();
        fetchTechnicians();
    }, [isOpen]);

    // Close account dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) {
                setShowAccountDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initialize or reset form values
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
            setIsCustomAssigned(false);
            setDescription(editItem.description || '');
            setAccountId(editItem.account_id || null);

            // Recurrence
            if (editItem.is_recurring) {
                setRecurrenceFrequency(editItem.recurrence_pattern?.frequency || 'monthly');
            } else {
                setRecurrenceFrequency('none');
            }
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
            setIsCustomAssigned(false);
            setDescription('');
            setAccountId(null);
            setRecurrenceFrequency('none');
        }
        setErrors({});
        setShowAccountDropdown(false);
    }, [isOpen, editItem, initialDate]);

    // Filter accounts by current contactName / search text
    const filteredAccounts = useMemo(() => {
        const query = (contactName || accountSearchText || '').trim().toLowerCase();
        if (!query) return accountsList.slice(0, 8);
        return accountsList
            .filter(a => {
                const name = a.name?.toLowerCase() || '';
                const mobile = a.mobile || a.phone || '';
                return name.includes(query) || mobile.includes(query);
            })
            .slice(0, 8);
    }, [accountsList, contactName, accountSearchText]);

    // Handle account selection from dropdown
    const handleSelectAccount = (account) => {
        setAccountId(account.id);
        setContactName(account.name);
        if (account.mobile || account.phone) {
            setContactPhone(account.mobile || account.phone);
        }
        setShowAccountDropdown(false);
    };

    // Unlink account
    const handleUnlinkAccount = () => {
        setAccountId(null);
    };

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
            const isRecurring = recurrenceFrequency !== 'none';
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
                account_id: accountId || null,
                is_recurring: isRecurring,
                recurrence_pattern: isRecurring ? {
                    frequency: recurrenceFrequency,
                    interval: 1,
                    completed_dates: editItem?.recurrence_pattern?.completed_dates || []
                } : {},
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

    // Current due day number for recurrence display
    const dueDayNum = dueDate ? new Date(dueDate + 'T00:00:00').getDate() : new Date().getDate();

    if (!isOpen) return null;

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
                        padding: '14px 18px',
                        borderBottom: '1px solid var(--border-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: 'var(--bg-elevated)',
                        flexShrink: 0
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
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            {reminderType === 'payment' && <DollarSign size={18} />}
                            {reminderType === 'visit' && <MapPin size={18} />}
                            {reminderType === 'task' && <CheckSquare size={18} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                                {editItem ? 'Edit Scheduled Plan' : 'Plan Day Activity'}
                            </h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {reminderType === 'payment' ? 'Schedule a payment reminder' :
                                    reminderType === 'visit' ? 'Schedule a client or site visit' : 'Add a task or daily follow-up'}
                            </span>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose} type="button" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Form Type Tabs */}
                <div
                    style={{
                        padding: '10px 18px 4px',
                        backgroundColor: 'var(--bg-elevated)',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '6px',
                        flexShrink: 0
                    }}
                >
                    <button
                        type="button"
                        onClick={() => setReminderType('payment')}
                        style={{
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'payment' ? '#10b981' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'payment' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'payment' ? '#10b981' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                        }}
                    >
                        <DollarSign size={14} />
                        Payment
                    </button>

                    <button
                        type="button"
                        onClick={() => setReminderType('visit')}
                        style={{
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'visit' ? '#8b5cf6' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'visit' ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'visit' ? '#8b5cf6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                        }}
                    >
                        <MapPin size={14} />
                        Visit
                    </button>

                    <button
                        type="button"
                        onClick={() => setReminderType('task')}
                        style={{
                            padding: '7px 10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${reminderType === 'task' ? '#3b82f6' : 'var(--border-primary)'}`,
                            backgroundColor: reminderType === 'task' ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                            color: reminderType === 'task' ? '#3b82f6' : 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                        }}
                    >
                        <CheckSquare size={14} />
                        Task
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <div
                        className="modal-content"
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            WebkitOverflowScrolling: 'touch',
                            padding: '14px 18px 24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            minHeight: 0
                        }}
                    >
                        {errors.submit && (
                            <div style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertCircle size={14} />
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
                                        gap: '5px'
                                    }}
                                >
                                    <ArrowUpRight size={13} />
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
                                        gap: '5px'
                                    }}
                                >
                                    <ArrowDownLeft size={13} />
                                    Payment to Collect (Receivable)
                                </button>
                            </div>
                        )}

                        {/* Title Field */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                {reminderType === 'payment' ? 'Payment Title / Purpose *' :
                                    reminderType === 'visit' ? 'Visit Title / Purpose *' : 'Task Title *'}
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={
                                    reminderType === 'payment' ? 'e.g. House Rent, Salary, Supplier Spares Bill, EMI' :
                                        reminderType === 'visit' ? 'e.g. Site Inspection at Tower B, AC Service Client' :
                                            'e.g. Check spare parts inventory, File GST'
                                }
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                            />
                            {errors.title && (
                                <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.title}</span>
                            )}
                        </div>

                        {/* Payment Amount Field */}
                        {reminderType === 'payment' && (
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
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
                                        style={{ width: '100%', padding: '8px 12px 8px 28px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                    />
                                </div>
                                {errors.amount && (
                                    <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.amount}</span>
                                )}
                            </div>
                        )}

                        {/* Payee / Contact Name with Account Database Search & Manual Fallback */}
                        {(reminderType === 'payment' || reminderType === 'visit') && (
                            <div className="form-group" style={{ margin: 0, position: 'relative' }} ref={accountDropdownRef}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>
                                        {reminderType === 'payment'
                                            ? (direction === 'payable' ? 'Payee / Vendor Name' : 'Customer / Payer Name')
                                            : 'Contact Person / Customer'}
                                    </label>
                                    {accountId && (
                                        <button
                                            type="button"
                                            onClick={handleUnlinkAccount}
                                            style={{
                                                fontSize: '11px',
                                                color: '#ef4444',
                                                border: 'none',
                                                background: 'transparent',
                                                cursor: 'pointer',
                                                padding: 0
                                            }}
                                        >
                                            (Unlink Account)
                                        </button>
                                    )}
                                </div>

                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={contactName}
                                        onChange={(e) => {
                                            setContactName(e.target.value);
                                            setAccountId(null);
                                            setShowAccountDropdown(true);
                                        }}
                                        onFocus={() => setShowAccountDropdown(true)}
                                        placeholder="Search account from database or type custom name..."
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: `1px solid ${accountId ? '#10b981' : 'var(--border-primary)'}`,
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {accountId && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#10b981',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                fontSize: '11px',
                                                fontWeight: 600
                                            }}
                                        >
                                            <Check size={13} />
                                            DB Account
                                        </span>
                                    )}
                                </div>

                                {/* Autocomplete Dropdown List */}
                                {showAccountDropdown && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '4px',
                                            backgroundColor: 'var(--bg-elevated)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: '8px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            zIndex: 1200
                                        }}
                                    >
                                        {/* Prompt to use custom manual name */}
                                        {contactName.trim() && (
                                            <div
                                                onClick={() => {
                                                    setAccountId(null);
                                                    setShowAccountDropdown(false);
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    borderBottom: '1px solid var(--border-primary)',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    color: 'var(--color-primary)',
                                                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <span>✍️</span>
                                                <span>Use manual name: <strong>"{contactName}"</strong></span>
                                            </div>
                                        )}

                                        {/* Matching Accounts from DB */}
                                        <div style={{ padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                            Accounts in Database ({filteredAccounts.length})
                                        </div>

                                        {filteredAccounts.length === 0 ? (
                                            <div style={{ padding: '10px 12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                No matching accounts found. Name will be saved manually.
                                            </div>
                                        ) : (
                                            filteredAccounts.map((account) => (
                                                <div
                                                    key={account.id}
                                                    onClick={() => handleSelectAccount(account)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        borderBottom: '1px solid var(--border-primary)',
                                                        transition: 'background 0.1s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <div>
                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {account.name}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                                            {account.account_type || 'Account'} {account.mobile ? `• ${account.mobile}` : ''}
                                                        </div>
                                                    </div>
                                                    <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 600 }}>
                                                        Select
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Visit Specific Fields: Phone, Location, Technician */}
                        {reminderType === 'visit' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                            Phone / Mobile
                                        </label>
                                        <input
                                            type="tel"
                                            className="form-input"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                        />
                                    </div>

                                    {/* Technician Selection Dropdown */}
                                    <div className="form-group" style={{ margin: 0 }}>
                                        <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Wrench size={13} color="#8b5cf6" />
                                            Assigned Technician
                                        </label>
                                        {!isCustomAssigned ? (
                                            <select
                                                className="form-select"
                                                value={assignedTo}
                                                onChange={(e) => {
                                                    if (e.target.value === '__custom__') {
                                                        setIsCustomAssigned(true);
                                                        setAssignedTo('');
                                                    } else {
                                                        setAssignedTo(e.target.value);
                                                    }
                                                }}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box', cursor: 'pointer' }}
                                            >
                                                <option value="">-- Unassigned --</option>
                                                <option value="Self (Admin)">Self (Admin)</option>
                                                {techniciansList.map(tech => (
                                                    <option key={tech.id} value={tech.name}>
                                                        {tech.name} {tech.phone ? `(${tech.phone})` : ''}
                                                    </option>
                                                ))}
                                                <option value="__custom__">+ Enter Custom Name...</option>
                                            </select>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={assignedTo}
                                                    onChange={(e) => setAssignedTo(e.target.value)}
                                                    placeholder="Enter technician / staff name"
                                                    autoFocus
                                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsCustomAssigned(false);
                                                        setAssignedTo('');
                                                    }}
                                                    style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                                >
                                                    List
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                        Visit Address / Location
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. Flat 402, Sunshine Heights, Koramangala"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </>
                        )}

                        {/* Date & Time Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                    Due Date *
                                </label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                />
                                {errors.dueDate && (
                                    <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.dueDate}</span>
                                )}
                            </div>

                            <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                    Time Slot
                                </label>
                                <input
                                    type="time"
                                    className="form-input"
                                    value={dueTime}
                                    onChange={(e) => setDueTime(e.target.value)}
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* Recurrence Selector (Same day each month/week - e.g. House Rent, Salary) */}
                        <div className="form-group" style={{ margin: 0, padding: '10px 12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Repeat size={14} color="#6366f1" />
                                Repeat / Recurring Schedule
                            </label>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {[
                                    { id: 'none', label: 'One-time' },
                                    { id: 'monthly', label: `Monthly (Every ${dueDayNum}${getOrdinal(dueDayNum)})` },
                                    { id: 'weekly', label: 'Weekly' },
                                    { id: 'daily', label: 'Daily' }
                                ].map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setRecurrenceFrequency(opt.id)}
                                        style={{
                                            padding: '5px 10px',
                                            borderRadius: '6px',
                                            border: `1px solid ${recurrenceFrequency === opt.id ? '#6366f1' : 'var(--border-primary)'}`,
                                            backgroundColor: recurrenceFrequency === opt.id ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-elevated)',
                                            color: recurrenceFrequency === opt.id ? '#6366f1' : 'var(--text-secondary)',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            {recurrenceFrequency === 'monthly' && (
                                <span style={{ fontSize: '11px', color: '#6366f1', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                                    ✓ Repeats on the {dueDayNum}{getOrdinal(dueDayNum)} of every month (ideal for house rent, salary, EMI).
                                </span>
                            )}
                            {recurrenceFrequency === 'weekly' && (
                                <span style={{ fontSize: '11px', color: '#6366f1', marginTop: '6px', display: 'block', fontWeight: 500 }}>
                                    ✓ Repeats automatically on the same day every week.
                                </span>
                            )}
                        </div>

                        {/* Priority Selector */}
                        <div className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
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
                            <label className="form-label" style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>
                                Notes / Details
                            </label>
                            <textarea
                                className="form-input"
                                rows={2}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add instructions, bank account details, or site notes..."
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div
                        className="modal-footer"
                        style={{
                            padding: '12px 18px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '10px',
                            backgroundColor: 'var(--bg-elevated)',
                            flexShrink: 0
                        }}
                    >
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                            style={{ padding: '7px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                            style={{
                                padding: '7px 18px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: reminderType === 'payment' ? '#10b981' :
                                    reminderType === 'visit' ? '#8b5cf6' : 'var(--color-primary)',
                                borderColor: 'transparent',
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '12px'
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
