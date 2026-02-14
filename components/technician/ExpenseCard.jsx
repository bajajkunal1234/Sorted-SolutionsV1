'use client'

import { Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

function ExpenseCard({ expense, onEdit, onDelete }) {
    const categoryConfig = {
        petrol: { label: 'Petrol/Fuel', color: '#ef4444', icon: '⛽' },
        transport: { label: 'Transport', color: '#3b82f6', icon: '🚌' },
        spare_parts: { label: 'Spare Parts', color: '#8b5cf6', icon: '🔧' },
        food: { label: 'Food/Meals', color: '#10b981', icon: '🍽️' },
        other: { label: 'Other', color: '#6b7280', icon: '📝' }
    };

    const config = categoryConfig[expense.category] || categoryConfig.other;

    return (
        <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-primary)',
            marginBottom: 'var(--spacing-sm)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-md)'
        }}>
            {/* Category Icon */}
            <div style={{
                width: '48px',
                height: '48px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: `${config.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                flexShrink: 0
            }}>
                {config.icon}
            </div>

            {/* Expense Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xs)' }}>
                    <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: config.color }}>
                            {config.label}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            {expense.time}
                        </div>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ₹{expense.amount.toFixed(2)}
                    </div>
                </div>

                {/* Description */}
                <div style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-xs)',
                    lineHeight: 1.4
                }}>
                    {expense.description}
                </div>

                {/* Receipt Thumbnail & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
                    {expense.receiptPhoto ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            <ImageIcon size={14} color="var(--text-secondary)" />
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Receipt attached
                            </span>
                        </div>
                    ) : (
                        <div></div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                        <button
                            onClick={() => onEdit(expense)}
                            className="btn btn-secondary"
                            style={{
                                padding: '4px 8px',
                                fontSize: 'var(--font-size-xs)',
                                minWidth: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Edit2 size={12} />
                            Edit
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to delete this expense?')) {
                                    onDelete(expense.id);
                                }
                            }}
                            className="btn"
                            style={{
                                padding: '4px 8px',
                                fontSize: 'var(--font-size-xs)',
                                minWidth: 'auto',
                                backgroundColor: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Trash2 size={12} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExpenseCard;

