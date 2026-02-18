'use client'

import { useState, useEffect } from 'react';
import { Bell, Plus, Calendar, DollarSign, Wrench, RefreshCw, Check, X, Filter } from 'lucide-react';
import AddReminderModal from './AddReminderModal';

function RemindersTab({ accountId, accountName }) {
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        if (accountId) {
            fetchReminders();
        }
    }, [accountId]);

    const fetchReminders = async () => {
        try {
            setLoading(true);
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) return;

            const { data, error } = await supabase
                .from('reminders')
                .select('*')
                .eq('account_id', accountId)
                .order('due_date', { ascending: true });

            if (error) throw error;
            setReminders(data || []);
        } catch (err) {
            console.error('Error fetching reminders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReminder = async (newReminderData) => {
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) return;

            const reminderToSave = {
                ...newReminderData,
                account_id: accountId
            };

            const { data, error } = await supabase
                .from('reminders')
                .insert([reminderToSave])
                .select()
                .single();

            if (error) throw error;
            setReminders([data, ...reminders]);
            setShowAddModal(false);
        } catch (err) {
            console.error('Error saving reminder:', err);
            alert('Failed to save reminder');
        }
    };

    const filteredReminders = reminders.filter(r => {
        const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchesType = filterType === 'all' || (r.related_to_type || r.type) === filterType;
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

    const handleComplete = async (reminderId) => {
        try {
            const { supabase } = await import('@/lib/supabase');
            if (!supabase) return;

            const { error } = await supabase
                .from('reminders')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', reminderId);

            if (error) throw error;

            setReminders(reminders.map(r =>
                r.id === reminderId ? { ...r, status: 'completed', completed_at: new Date().toISOString() } : r
            ));
        } catch (err) {
            console.error('Error completing reminder:', err);
            alert('Failed to update status');
        }
    };

    const handleCancel = async (reminderId) => {
        if (window.confirm('Are you sure you want to cancel this reminder?')) {
            try {
                const { supabase } = await import('@/lib/supabase');
                if (!supabase) return;

                const { error } = await supabase
                    .from('reminders')
                    .update({ status: 'cancelled' })
                    .eq('id', reminderId);

                if (error) throw error;

                setReminders(reminders.map(r =>
                    r.id === reminderId ? { ...r, status: 'cancelled' } : r
                ));
            } catch (err) {
                console.error('Error cancelling reminder:', err);
                alert('Failed to update status');
            }
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', minHeight: '200px' }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>Loading reminders...</div>
                ) : (
                    filteredReminders.map(reminder => {
                        const TypeIcon = getTypeIcon(reminder.related_to_type || reminder.type); // Handle inconsistent naming if any
                        const isOverdue = new Date(reminder.due_date) < new Date() && reminder.status === 'pending';
                        const daysUntilDue = Math.ceil((new Date(reminder.due_date) - new Date()) / (1000 * 60 * 60 * 24));

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
                                            {reminder.is_recurring && (
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
                                                    {new Date(reminder.due_date).toLocaleDateString()}
                                                </span>
                                                {reminder.status === 'pending' && (
                                                    <span style={{ marginLeft: '8px', color: 'var(--text-tertiary)' }}>
                                                        {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : `in ${daysUntilDue} days`}
                                                    </span>
                                                )}
                                            </div>
                                            {reminder.related_to_type && (
                                                <div style={{ color: 'var(--text-tertiary)' }}>
                                                    Related: {reminder.related_to_type.toUpperCase()}
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
                                                {reminder.completed_at && ` on ${new Date(reminder.completed_at).toLocaleDateString()}`}
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
                    })
                )}
            </div>

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
