'use client'

import { useState } from 'react';
import { Check, X, Eye, Download, Filter, Calendar } from 'lucide-react';
import { sampleExpenses, expenseCategories } from '../../data/reportsData';
import { formatCurrency } from '../../utils/accountingHelpers';

function DailyExpenses() {
    const [expenses, setExpenses] = useState(sampleExpenses);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [filterCategory, setFilterCategory] = useState('all');
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [approvalNotes, setApprovalNotes] = useState('');

    const filteredExpenses = expenses.filter(exp => {
        const matchesStatus = filterStatus === 'all' || exp.status === filterStatus;
        const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
        return matchesStatus && matchesCategory;
    });

    const stats = {
        pending: expenses.filter(e => e.status === 'pending').length,
        approved: expenses.filter(e => e.status === 'approved').length,
        rejected: expenses.filter(e => e.status === 'rejected').length,
        totalPending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0)
    };

    const handleApprove = (expenseId) => {
        setExpenses(prev => prev.map(exp =>
            exp.id === expenseId
                ? {
                    ...exp,
                    status: 'approved',
                    approvedBy: 'admin',
                    approvedDate: new Date().toISOString(),
                    notes: approvalNotes || 'Approved'
                }
                : exp
        ));
        setSelectedExpense(null);
        setApprovalNotes('');
    };

    const handleReject = (expenseId) => {
        if (!approvalNotes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }
        setExpenses(prev => prev.map(exp =>
            exp.id === expenseId
                ? {
                    ...exp,
                    status: 'rejected',
                    approvedBy: 'admin',
                    approvedDate: new Date().toISOString(),
                    notes: approvalNotes
                }
                : exp
        ));
        setSelectedExpense(null);
        setApprovalNotes('');
    };

    const getCategoryInfo = (categoryId) => {
        return expenseCategories.find(c => c.id === categoryId) || expenseCategories[expenseCategories.length - 1];
    };

    const getStatusColor = (status) => {
        const colors = {
            pending: '#f59e0b',
            approved: '#10b981',
            rejected: '#ef4444'
        };
        return colors[status] || '#6b7280';
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Filters and Stats */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)'
            }}>
                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-md)'
                }}>
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(245, 158, 11, 0.3)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                            Pending Approval
                        </div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-warning)' }}>
                            {stats.pending}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {formatCurrency(stats.totalPending)}
                        </div>
                    </div>

                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(16, 185, 129, 0.3)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                            Approved
                        </div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                            {stats.approved}
                        </div>
                    </div>

                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(239, 68, 68, 0.3)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                            Rejected
                        </div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-danger)' }}>
                            {stats.rejected}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <Filter size={16} style={{ color: 'var(--text-tertiary)' }} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="form-input"
                        style={{ fontSize: 'var(--font-size-sm)', padding: '6px 10px' }}
                    >
                        <option value="all">All Categories</option>
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.label}</option>
                        ))}
                    </select>

                    <div style={{ flex: 1 }} />

                    <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: 'var(--font-size-sm)' }}
                        onClick={() => console.log('Export')}
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Expenses List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    {filteredExpenses.map(expense => {
                        const categoryInfo = getCategoryInfo(expense.category);
                        const statusColor = getStatusColor(expense.status);

                        return (
                            <div
                                key={expense.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-md)',
                                    transition: 'all var(--transition-fast)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                                onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                            >
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                    {/* Receipt Thumbnail */}
                                    {expense.receipt && (
                                        <img
                                            src={expense.receipt}
                                            alt="Receipt"
                                            style={{
                                                width: '80px',
                                                height: '80px',
                                                borderRadius: 'var(--radius-md)',
                                                objectFit: 'cover',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => window.open(expense.receipt, '_blank')}
                                        />
                                    )}

                                    {/* Expense Details */}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                            <div>
                                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '4px' }}>
                                                    {expense.technicianName}
                                                </h4>
                                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                    <Calendar size={12} />
                                                    {new Date(expense.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                    {formatCurrency(expense.amount)}
                                                </div>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600,
                                                    backgroundColor: `${statusColor}20`,
                                                    color: statusColor,
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {expense.status}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                backgroundColor: `${categoryInfo.color}20`,
                                                color: categoryInfo.color,
                                                fontWeight: 500
                                            }}>
                                                {categoryInfo.label}
                                            </span>
                                        </div>

                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)' }}>
                                            {expense.description}
                                        </p>

                                        {expense.jobId && (
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
                                                Linked to: <span style={{ fontFamily: 'monospace', color: 'var(--color-primary)' }}>{expense.jobId}</span>
                                            </div>
                                        )}

                                        {expense.notes && (
                                            <div style={{
                                                padding: 'var(--spacing-sm)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                                marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                <strong>Admin Notes:</strong> {expense.notes}
                                            </div>
                                        )}

                                        {/* Action Buttons for Pending */}
                                        {expense.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                                <button
                                                    className="btn"
                                                    onClick={() => handleApprove(expense.id)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: 'var(--font-size-sm)',
                                                        backgroundColor: 'var(--color-success)',
                                                        color: 'var(--text-inverse)'
                                                    }}
                                                >
                                                    <Check size={14} />
                                                    Quick Approve
                                                </button>
                                                <button
                                                    className="btn"
                                                    onClick={() => setSelectedExpense(expense)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        fontSize: 'var(--font-size-sm)',
                                                        backgroundColor: 'var(--color-primary)',
                                                        color: 'var(--text-inverse)'
                                                    }}
                                                >
                                                    <Eye size={14} />
                                                    Review
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredExpenses.length === 0 && (
                    <div style={{
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)'
                    }}>
                        No expenses found for the selected filters.
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {selectedExpense && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-lg)',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            borderBottom: '1px solid var(--border-primary)'
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                                Review Expense
                            </h3>
                        </div>

                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            {selectedExpense.receipt && (
                                <img
                                    src={selectedExpense.receipt}
                                    alt="Receipt"
                                    style={{
                                        width: '100%',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--spacing-md)'
                                    }}
                                />
                            )}

                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                    Notes (Required for Rejection)
                                </label>
                                <textarea
                                    value={approvalNotes}
                                    onChange={(e) => setApprovalNotes(e.target.value)}
                                    placeholder="Add approval/rejection notes..."
                                    className="form-input"
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button
                                    className="btn"
                                    onClick={() => handleApprove(selectedExpense.id)}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--color-success)',
                                        color: 'var(--text-inverse)'
                                    }}
                                >
                                    <Check size={16} />
                                    Approve
                                </button>
                                <button
                                    className="btn"
                                    onClick={() => handleReject(selectedExpense.id)}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--spacing-sm)',
                                        backgroundColor: 'var(--color-danger)',
                                        color: 'var(--text-inverse)'
                                    }}
                                >
                                    <X size={16} />
                                    Reject
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setSelectedExpense(null);
                                        setApprovalNotes('');
                                    }}
                                    style={{ padding: 'var(--spacing-sm)' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DailyExpenses;





