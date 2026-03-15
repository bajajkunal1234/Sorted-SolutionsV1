'use client'

import { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, Tag, FileText, AlertCircle } from 'lucide-react';

export default function ExpensesList({ technicianId }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: 'travel',
        amount: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch expenses
    useEffect(() => {
        if (!technicianId) return;

        const fetchExpenses = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/technician/expenses?technicianId=${technicianId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch expenses');
                }

                const data = await response.json();
                setExpenses(data.expenses || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching expenses:', err);
                setError('Failed to load expenses');
            } finally {
                setLoading(false);
            }
        };

        fetchExpenses();
    }, [technicianId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/technician/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_id: technicianId,
                    date: formData.date,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    description: formData.description
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit expense');
            }

            // Add new expense to list
            setExpenses([data.expense, ...expenses]);

            // Reset form
            setFormData({
                date: new Date().toISOString().split('T')[0],
                category: 'travel',
                amount: '',
                description: ''
            });
            setShowAddForm(false);
            alert('Expense submitted successfully!');
        } catch (err) {
            console.error('Error submitting expense:', err);
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryColor = (category) => {
        const colors = {
            'travel': '#3b82f6',
            'food': '#10b981',
            'parts': '#f59e0b',
            'tools': '#8b5cf6',
            'other': '#6b7280'
        };
        return colors[category] || '#6b7280';
    };

    const getCategoryLabel = (category) => {
        const labels = {
            'travel': 'Travel',
            'food': 'Food',
            'parts': 'Parts',
            'tools': 'Tools',
            'other': 'Other'
        };
        return labels[category] || category;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getTotalExpenses = () => {
        return expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Add Button */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '4px' }}>
                        Expenses
                    </h2>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Total: ₹{getTotalExpenses().toLocaleString('en-IN')}
                    </div>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="btn btn-primary"
                    style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                >
                    <Plus size={18} style={{ marginRight: 'var(--spacing-xs)' }} />
                    Add
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    margin: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    color: '#ef4444'
                }}>
                    <AlertCircle size={18} />
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                </div>
            )}

            {/* Add Expense Form */}
            {showAddForm && (
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-primary)'
                }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    required
                                >
                                    <option value="travel">Travel</option>
                                    <option value="food">Food</option>
                                    <option value="parts">Parts</option>
                                    <option value="tools">Tools</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-xs)'
                                }}>
                                    Description (Optional)
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    rows={2}
                                    placeholder="Add details..."
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary"
                                    style={{ flex: 1 }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Expense'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Expenses List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        Loading expenses...
                    </div>
                ) : expenses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.3 }} />
                        <div>No expenses recorded yet</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>
                            Click "Add" to submit your first expense
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                        {expenses.map((expense) => (
                            <div
                                key={expense.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--spacing-sm)',
                                    transition: 'all var(--transition-normal)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-xs)' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '4px' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                backgroundColor: getCategoryColor(expense.category) + '20',
                                                color: getCategoryColor(expense.category),
                                                borderRadius: 'var(--radius-md)',
                                                fontSize: 'var(--font-size-xs)',
                                                fontWeight: 600
                                            }}>
                                                {getCategoryLabel(expense.category)}
                                            </span>
                                        </div>
                                        {expense.description && (
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                                                {expense.description}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>
                                            ₹{parseFloat(expense.amount).toLocaleString('en-IN')}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                            {formatDate(expense.date)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
