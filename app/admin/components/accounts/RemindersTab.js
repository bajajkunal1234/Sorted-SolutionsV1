'use client'

import { useState } from 'react';
import { Bell, Plus, Calendar, DollarSign, Wrench, RefreshCw, Check, X, Filter } from 'lucide-react';
import AddReminderModal from './AddReminderModal';

function RemindersTab({ accountId, accountName }) {
    const [reminders, setReminders] = useState([
        {
            id: 'REM-001',
            type: 'rent_payment',
            title: 'Monthly Rent Due',
            description: 'Washing Machine rental payment due',
            dueDate: '2026-02-15',
            priority: 'high',
            status: 'pending',
            relatedTo: { type: 'rental', id: 'RENTAL-001' },
            isRecurring: true,
            recurrencePattern: { frequency: 'monthly', interval: 1 }
        },
        {
            id: 'REM-002',
            type: 'amc_service',
            title: 'AMC Service Due',
            description: 'RO filter change scheduled',
            dueDate: '2026-04-19',
            priority: 'medium',
            status: 'pending',
            relatedTo: { type: 'amc', id: 'AMC-001' },
            isRecurring: false
        },
        {
            id: 'REM-003',
            type: 'follow_up',
            title: 'Payment Follow-up',
            description: 'Follow up on pending invoice payment',
            dueDate: '2026-01-25',
            priority: 'high',
            status: 'pending',
            relatedTo: null,
            isRecurring: false
        }
    ]);

    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);

    const handleSaveReminder = (newReminder) => {
        setReminders([newReminder, ...reminders]);
    };

    const filteredReminders = reminders.filter(r => {
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchesType = filterType === 'all' || r.type === filterType;
        return matchesStatus && matchesType;
    });

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return '#ef4444';
            case 'medium': return '#f59e0b';
            case 'low': return '#10b981';
            default: return 'var(--text-secondary)';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'rent_payment': return DollarSign;
            case 'amc_service': return Wrench;
            case 'amc_renewal': return RefreshCw;
            default: return Bell;
        }
    };

    const handleComplete = (reminderId) => {
        setReminders(reminders.map(r =>
            r.id === reminderId ? { ...r, status: 'completed', completedAt: new Date().toISOString() } : r
        ));
    };

    const handleCancel = (reminderId) => {
        if (window.confirm('Are you sure you want to cancel this reminder?')) {
            setReminders(reminders.map(r =>
                r.id === reminderId ? { ...r, status: 'cancelled' } : r
            ));
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header with Filters */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, margin: 0 }}>
                    Reminders & Follow-ups
                </h3>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={{
                            padding: '4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '4px 8px',
                            fontSize: 'var(--font-size-xs)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="rent_payment">Rent Payment</option>
                        <option value="amc_service">AMC Service</option>
                        <option value="amc_renewal">AMC Renewal</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="payment_follow_up">Payment Follow-up</option>
                    </select>

                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                    >
                        <Plus size={16} />
                        Add Reminder
                    </button>
                </div>
            </div>

            {/* Reminders List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {filteredReminders.map(reminder => {
                    const TypeIcon = getTypeIcon(reminder.type);
                    const isOverdue = new Date(reminder.dueDate) < new Date() && reminder.status === 'pending';
                    const daysUntilDue = Math.ceil((new Date(reminder.dueDate) - new Date()) / (1000 * 60 * 60 * 24));

                    return (
                        <div
                            key={reminder.id}
                            style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: `2px solid ${isOverdue ? '#ef4444' : 'var(--border-primary)'}`,
                                opacity: reminder.status === 'completed' || reminder.status === 'cancelled' ? 0.6 : 1
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        <TypeIcon size={18} color={getPriorityColor(reminder.priority)} />
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                            {reminder.title}
                                        </h4>
                                        <span style={{
                                            padding: '2px 8px',
                                            backgroundColor: `${getPriorityColor(reminder.priority)}20`,
                                            color: getPriorityColor(reminder.priority),
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)',
                                            fontWeight: 600,
                                            textTransform: 'uppercase'
                                        }}>
                                            {reminder.priority}
                                        </span>
                                        {reminder.isRecurring && (
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                color: '#3b82f6',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600
                                            }}>
                                                <RefreshCw size={12} style={{ display: 'inline', marginRight: '4px' }} />
                                                RECURRING
                                            </span>
                                        )}
                                    </div>

                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                        {reminder.description}
                                    </p>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                                        <div>
                                            <Calendar size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                            <span style={{ color: isOverdue ? '#ef4444' : 'var(--text-primary)', fontWeight: 500 }}>
                                                {new Date(reminder.dueDate).toLocaleDateString()}
                                            </span>
                                            {reminder.status === 'pending' && (
                                                <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>
                                                    {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`}
                                                </span>
                                            )}
                                        </div>
                                        {reminder.relatedTo && (
                                            <div style={{ color: 'var(--text-tertiary)' }}>
                                                Related: {reminder.relatedTo.type.toUpperCase()} ({reminder.relatedTo.id})
                                            </div>
                                        )}
                                    </div>

                                    {reminder.status !== 'pending' && (
                                        <div style={{
                                            marginTop: 'var(--spacing-sm)',
                                            padding: 'var(--spacing-xs)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-tertiary)'
                                        }}>
                                            Status: {reminder.status.toUpperCase()}
                                            {reminder.completedAt && ` on ${new Date(reminder.completedAt).toLocaleDateString()}`}
                                        </div>
                                    )}
                                </div>

                                {reminder.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            onClick={() => handleComplete(reminder.id)}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: 'var(--font-size-xs)',
                                                border: 'none',
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: '#10b981',
                                                color: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Check size={14} />
                                            Complete
                                        </button>
                                        <button
                                            onClick={() => handleCancel(reminder.id)}
                                            className="btn-icon"
                                            style={{ padding: '6px' }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredReminders.length === 0 && (
                <div style={{
                    padding: 'var(--spacing-xl)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    border: '2px dashed var(--border-primary)'
                }}>
                    <Bell size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.5 }} />
                    <p style={{ fontSize: 'var(--font-size-md)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                        No Reminders Found
                    </p>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        {filterStatus !== 'all' || filterType !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Set reminders for follow-ups, payments, and important dates'}
                    </p>
                </div>
            )}

            {/* Add Reminder Modal */}
            {showAddModal && (
                <AddReminderModal
                    accountId={accountId}
                    accountName={accountName}
                    onClose={() => setShowAddModal(false)}
                    onSave={handleSaveReminder}
                />
            )}
        </div>
    );
}

export default RemindersTab;
