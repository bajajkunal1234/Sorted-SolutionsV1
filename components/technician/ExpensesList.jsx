'use client'

import { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, Tag, FileText, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function ExpensesList({ technicianId }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Fetch admin-defined expense categories
        fetch('/api/admin/expense-categories')
            .then(r => r.json())
            .then(data => {
                const cats = data.categories || [];
                setCategories(cats);
                if (cats.length > 0) setFormData(f => ({ ...f, category: cats[0].id }));
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!technicianId) return;
        fetchExpenses();
    }, [technicianId]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/technician/expenses?technicianId=${technicianId}`);
            if (!response.ok) throw new Error('Failed to fetch expenses');
            const data = await response.json();
            setExpenses(data.expenses || []);
            setError(null);
        } catch (err) {
            setError('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

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
            if (!response.ok) throw new Error(data.error || 'Failed to submit expense');

            setExpenses([data.expense, ...expenses]);
            setFormData({ date: new Date().toISOString().split('T')[0], category: categories[0]?.id || '', amount: '', description: '' });
            setShowAddForm(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getCatInfo = (catId) => {
        const cat = categories.find(c => c.id === catId);
        return cat || { name: catId, color: '#6b7280', daily_limit: 0 };
    };

    const getStatusBadge = (status) => {
        const map = {
            pending:  { icon: <Clock size={11} />, label: 'Pending',  bg: '#fef3c7', color: '#d97706' },
            approved: { icon: <CheckCircle size={11} />, label: 'Approved', bg: '#d1fae5', color: '#059669' },
            rejected: { icon: <XCircle size={11} />, label: 'Rejected', bg: '#fee2e2', color: '#dc2626' }
        };
        const s = map[status] || map.pending;
        return (
            <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', padding:'2px 7px', borderRadius:'9999px', fontSize:'10px', fontWeight:600, backgroundColor:s.bg, color:s.color }}>
                {s.icon} {s.label}
            </span>
        );
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const getTotalExpenses = () => expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const pendingCount = expenses.filter(e => e.status === 'pending').length;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: '2px' }}>Expenses</h2>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <span>Total: ₹{getTotalExpenses().toLocaleString('en-IN')}</span>
                        {pendingCount > 0 && <span style={{ color: '#d97706' }}>· {pendingCount} pending approval</span>}
                    </div>
                </div>
                <button onClick={() => setShowAddForm(!showAddForm)} className="btn btn-primary" style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', display:'flex', alignItems:'center', gap:'4px' }}>
                    <Plus size={18} /> Add
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', margin: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: '#ef4444' }}>
                    <AlertCircle size={18} /><span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                </div>
            )}

            {/* Add Form */}
            {showAddForm && (
                <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Date</label>
                                <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="form-input" style={{ width: '100%' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Category</label>
                                {categories.length > 0 ? (
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="form-input" style={{ width: '100%' }} required>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}{cat.daily_limit > 0 ? ` (limit ₹${cat.daily_limit}/day)` : ''}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)', color: '#d97706' }}>
                                        No categories defined yet. Ask your admin to configure expense categories.
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Amount (₹)</label>
                                <input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="form-input" style={{ width: '100%' }} placeholder="0" step="0.01" min="0" required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Description (Optional)</label>
                                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-input" style={{ width: '100%' }} rows={2} placeholder="Add details..." />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                <button type="submit" disabled={submitting || categories.length === 0} className="btn btn-primary" style={{ flex: 1 }}>
                                    {submitting ? 'Submitting...' : 'Submit Expense'}
                                </button>
                                <button type="button" onClick={() => setShowAddForm(false)} className="btn btn-secondary">Cancel</button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Expenses List */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>Loading expenses...</div>
                ) : expenses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        <FileText size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.3 }} />
                        <div>No expenses recorded yet</div>
                        <div style={{ fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-xs)' }}>Click "Add" to submit your first expense</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                        {expenses.map(expense => {
                            const cat = getCatInfo(expense.category);
                            return (
                                <div key={expense.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `1px solid ${expense.status === 'rejected' ? 'rgba(239,68,68,0.3)' : expense.status === 'approved' ? 'rgba(16,185,129,0.3)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '4px', flexWrap: 'wrap' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-md)', fontSize: '11px', fontWeight: 600, backgroundColor: cat.color + '20', color: cat.color }}>{cat.name}</span>
                                                {getStatusBadge(expense.status || 'pending')}
                                            </div>
                                            {expense.description && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>{expense.description}</div>}
                                            {expense.admin_notes && expense.status === 'rejected' && (
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626', marginTop: '4px', fontStyle: 'italic' }}>Admin note: {expense.admin_notes}</div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-sm)' }}>
                                            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{formatDate(expense.date)}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
