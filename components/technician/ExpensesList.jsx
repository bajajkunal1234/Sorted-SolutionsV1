'use client'

import { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, DollarSign, Tag, FileText, AlertCircle, Clock, CheckCircle, XCircle, Camera, Trash2, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiCall, uploadOrQueueFile } from '@/lib/offlineSync';

const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getCoords = () => {
    return new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            resolve(null);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                resolve({
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude
                });
            },
            (err) => {
                console.error('GPS error:', err);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
};

export default function ExpensesList({ technicianId }) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        date: getLocalDateString(),
        category: '',
        amount: '',
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Segment Toggle state
    const [viewSegment, setViewSegment] = useState('claims'); // 'claims' or 'ledger'
    const [ledgerData, setLedgerData] = useState({ summary: { total_expenses: 0, total_payments: 0, balance: 0 }, ledger: [] });
    const [ledgerLoading, setLedgerLoading] = useState(false);

    // Photo/Receipt states
    const fileInputRef = useRef(null);
    const [receiptPhoto, setReceiptPhoto] = useState(null);
    const [receiptUrl, setReceiptUrl] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        // Fetch admin-defined expense categories
        apiCall('/api/admin/expense-categories')
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
        if (viewSegment === 'ledger') {
            fetchLedger();
        } else {
            fetchExpenses();
        }
    }, [technicianId, viewSegment]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await apiCall(`/api/technician/expenses?technicianId=${technicianId}`);
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

    const fetchLedger = async () => {
        try {
            setLedgerLoading(true);
            const response = await apiCall(`/api/technician/expenses/ledger?technicianId=${technicianId}`);
            if (!response.ok) throw new Error('Failed to fetch ledger');
            const data = await response.json();
            setLedgerData({
                summary: data.summary || { total_expenses: 0, total_payments: 0, balance: 0 },
                ledger: data.ledger || []
            });
            setError(null);
        } catch (err) {
            setError('Failed to load ledger statement');
        } finally {
            setLedgerLoading(false);
        }
    };

    const handlePhotoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Instant local preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setReceiptPhoto(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload to server
        setUploading(true);
        setError(null);
        try {
            const safeFileName = file.name ? file.name.replace(/[^a-zA-Z0-9.\-_]/g, '') : 'image.jpg';
            const url = await uploadOrQueueFile(file, safeFileName);
            if (url) {
                setReceiptUrl(url);
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error('Receipt upload error:', err);
            setError('Receipt upload failed: ' + err.message);
            setReceiptPhoto(null);
            setReceiptUrl(null);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!window.confirm('Are you sure you want to delete this expense request?')) return;
        
        setError(null);
        try {
            const res = await apiCall(`/api/technician/expenses?id=${expenseId}&technicianId=${technicianId}`, {
                method: 'DELETE'
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to delete expense');
            }

            // Remove from state list
            setExpenses(prev => prev.filter(e => e.id !== expenseId));
            alert('✅ Expense request deleted successfully.');
        } catch (err) {
            console.error('Delete expense error:', err);
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }
        if (!receiptUrl) {
            setError('Receipt image is mandatory. Please capture/upload a photo.');
            return;
        }

        const todayStr = getLocalDateString();
        if (formData.date < todayStr) {
            setError('Back-dated expenses are not allowed. Please select today or a future date.');
            return;
        }

        setSubmitting(true);
        setError(null);

        let coords = null;
        if (['mopid-petrol', 'bike-petrol'].includes(formData.category)) {
            coords = await getCoords();
        }

        let techName = 'Technician';
        if (typeof window !== 'undefined') {
            const storedTech = localStorage.getItem('technicianData');
            if (storedTech) {
                try { techName = JSON.parse(storedTech).name || techName; } catch(e){}
            }
        }

        try {
            const response = await apiCall('/api/technician/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    technician_id: technicianId,
                    technician_name: techName,
                    date: formData.date,
                    category: formData.category,
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    receipt: receiptUrl,
                    latitude: coords?.latitude || null,
                    longitude: coords?.longitude || null
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to submit expense');

            setExpenses([data.expense, ...expenses]);
            setFormData({ date: getLocalDateString(), category: categories[0]?.id || '', amount: '', description: '' });
            setReceiptPhoto(null);
            setReceiptUrl(null);
            setShowAddForm(false);

            // Send Supabase realtime broadcast
            const channel = supabase.channel('realtime:technician_updates');
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: 'expense_submitted',
                        payload: { technicianId }
                    });
                    supabase.removeChannel(channel);
                }
            });
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

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${datePart}, ${timePart}`;
    };
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
                {viewSegment === 'claims' && (
                    <button 
                        onClick={() => {
                            if (showAddForm) {
                                setReceiptPhoto(null);
                                setReceiptUrl(null);
                            }
                            setShowAddForm(!showAddForm);
                        }} 
                        className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'}`} 
                        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', display:'flex', alignItems:'center', gap:'4px' }}
                    >
                        {showAddForm ? <X size={18} /> : <Plus size={18} />}
                        {showAddForm ? 'Close' : 'Add'}
                    </button>
                )}
            </div>

            {/* Segment Selector */}
            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', gap: 'var(--spacing-xs)' }}>
                <button 
                    onClick={() => setViewSegment('claims')} 
                    className={`btn ${viewSegment === 'claims' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <FileText size={14} /> Claims List
                </button>
                <button 
                    onClick={() => setViewSegment('ledger')} 
                    className={`btn ${viewSegment === 'ledger' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                    <DollarSign size={14} /> Ledger Statement
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{ padding: 'var(--spacing-sm)', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', margin: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: '#ef4444' }}>
                    <AlertCircle size={18} /><span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                </div>
            )}

            {/* Claims View */}
            {viewSegment === 'claims' && (
                <>
                    {/* Add Form */}
                    {showAddForm ? (
                        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)' }}>
                            <form onSubmit={handleSubmit} style={{ paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Date</label>
                                        <input 
                                            type="date" 
                                            value={formData.date} 
                                            min={getLocalDateString()}
                                            onChange={e => setFormData({ ...formData, date: e.target.value })} 
                                            className="form-input" 
                                            style={{ width: '100%' }} 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Category</label>
                                        {categories.length > 0 ? (
                                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="form-input" style={{ width: '100%' }} required>
                                                {categories.map(cat => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
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
                                        {['mopid-petrol', 'bike-petrol'].includes(formData.category) && formData.amount && parseFloat(formData.amount) > 0 && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>🚲 Approx. Distance: </span>
                                                <strong style={{ color: '#10b981' }}>
                                                    {((parseFloat(formData.amount) / 100) * (formData.category === 'mopid-petrol' ? 35 : 45)).toFixed(1)} Kms
                                                </strong>
                                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>(assuming ₹100/L petrol price)</span>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>Description (Optional)</label>
                                        <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="form-input" style={{ width: '100%' }} rows={2} placeholder="Add details..." />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                                            Receipt Photo (Mandatory)
                                        </label>
                                        
                                        {!receiptPhoto ? (
                                            <div
                                                onClick={() => !uploading && fileInputRef.current?.click()}
                                                style={{
                                                    border: '2px dashed var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    padding: 'var(--spacing-md)',
                                                    textAlign: 'center',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    cursor: uploading ? 'not-allowed' : 'pointer',
                                                    transition: 'border-color var(--transition-normal)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 'var(--spacing-xs)'
                                                }}
                                                onMouseEnter={(e) => !uploading && (e.currentTarget.style.borderColor = '#3b82f6')}
                                                onMouseLeave={(e) => !uploading && (e.currentTarget.style.borderColor = 'var(--border-primary)')}
                                            >
                                                <Camera size={24} color="var(--text-secondary)" />
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                    Tap to capture or upload receipt
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                    (Petrol bill, tools bill, etc.)
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-sm)' }}>
                                                <img src={receiptPhoto} alt="Receipt Preview" style={{ maxHeight: '180px', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
                                                
                                                {uploading ? (
                                                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#fff' }}>
                                                        <Loader2 className="animate-spin" size={24} />
                                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>Uploading to media store...</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReceiptPhoto(null);
                                                            setReceiptUrl(null);
                                                        }}
                                                        className="btn"
                                                        style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            right: '8px',
                                                            padding: '4px 8px',
                                                            backgroundColor: '#ef4444',
                                                            color: '#fff',
                                                            minWidth: 'auto',
                                                            borderRadius: 'var(--radius-md)',
                                                            border: 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
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
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                                        <button type="submit" disabled={submitting || uploading || categories.length === 0} className="btn btn-primary" style={{ flex: 1 }}>
                                            {submitting ? 'Submitting...' : uploading ? 'Uploading Receipt...' : 'Submit Expense'}
                                        </button>
                                        <button type="button" onClick={() => {
                                            setShowAddForm(false);
                                            setReceiptPhoto(null);
                                            setReceiptUrl(null);
                                        }} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* Expenses List */
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
                                                        {['mopid-petrol', 'bike-petrol'].includes(expense.category) && (
                                                            <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                                                🚲 {((parseFloat(expense.amount || 0) / 100) * (expense.category === 'mopid-petrol' ? 35 : 45)).toFixed(1)} Kms
                                                            </span>
                                                        )}
                                                        {['mopid-petrol', 'bike-petrol'].includes(expense.category) && expense.latitude && expense.longitude && (
                                                            <a 
                                                                href={`https://www.google.com/maps?q=${expense.latitude},${expense.longitude}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'underline' }}
                                                            >
                                                                📍 Location
                                                            </a>
                                                        )}
                                                        {getStatusBadge(expense.status || 'pending')}
                                                        {expense.status === 'pending' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteExpense(expense.id)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'var(--text-tertiary)',
                                                                    cursor: 'pointer',
                                                                    padding: '2px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    marginLeft: '4px'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                                                title="Delete expense request"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {expense.description && <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 'var(--spacing-xs)' }}>{expense.description}</div>}
                                                    {expense.receipt && (
                                                        <div style={{ marginTop: 'var(--spacing-xs)' }}>
                                                            <a href={expense.receipt} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                                                <img 
                                                                    src={expense.receipt} 
                                                                    alt="Receipt Thumbnail" 
                                                                    style={{ 
                                                                        maxHeight: '50px', 
                                                                        borderRadius: 'var(--radius-md)', 
                                                                        border: '1px solid var(--border-primary)',
                                                                        backgroundColor: '#fff',
                                                                        padding: '2px',
                                                                        cursor: 'pointer'
                                                                    }} 
                                                                />
                                                            </a>
                                                        </div>
                                                    )}
                                                    {expense.admin_notes && expense.status === 'rejected' && (
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: '#dc2626', marginTop: '4px', fontStyle: 'italic' }}>Admin note: {expense.admin_notes}</div>
                                                    )}
                                                </div>
                                                <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-sm)' }}>
                                                    <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>₹{parseFloat(expense.amount).toLocaleString('en-IN')}</div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>{formatDate(expense.created_at || expense.date)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
                </>
            )}

            {/* Ledger View */}
            {viewSegment === 'ledger' && (
                <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                    {ledgerLoading ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>Loading ledger statement...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                            {/* Balance Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Approved Claims</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>₹{ledgerData.summary.total_expenses.toLocaleString('en-IN')}</div>
                                </div>
                                <div style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-sm)', textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Received Payments</div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>₹{ledgerData.summary.total_payments.toLocaleString('en-IN')}</div>
                                </div>
                            </div>

                            {/* Net Balance Card */}
                            <div style={{ 
                                backgroundColor: 'var(--bg-elevated)', 
                                border: '1px solid var(--border-primary)', 
                                borderRadius: 'var(--radius-lg)', 
                                padding: 'var(--spacing-md)', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                borderLeft: `4px solid ${ledgerData.summary.balance > 0 ? '#10b981' : ledgerData.summary.balance < 0 ? '#ef4444' : 'var(--border-primary)'}`
                            }}>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700 }}>
                                        {ledgerData.summary.balance > 0 ? 'Company owes you' : ledgerData.summary.balance < 0 ? 'You owe company' : 'Settled balance'}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {ledgerData.summary.balance > 0 ? 'Pending reimbursement' : ledgerData.summary.balance < 0 ? 'Company cash advance / balance' : 'No outstanding amount'}
                                    </div>
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: ledgerData.summary.balance > 0 ? '#10b981' : ledgerData.summary.balance < 0 ? '#ef4444' : 'var(--text-primary)' }}>
                                    ₹{Math.abs(ledgerData.summary.balance).toLocaleString('en-IN')}
                                </div>
                            </div>

                            {/* Ledger List */}
                            <div>
                                <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Chronological Statement</h3>
                                {ledgerData.ledger.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                                        No transactions posted to your ledger yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        {ledgerData.ledger.map(entry => (
                                            <div key={entry.id} style={{ 
                                                backgroundColor: 'var(--bg-elevated)', 
                                                border: '1px solid var(--border-primary)', 
                                                borderRadius: 'var(--radius-md)', 
                                                padding: 'var(--spacing-sm)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formatDate(entry.raw?.created_at || entry.date)}</span>
                                                    <span style={{ 
                                                        padding: '2px 6px', 
                                                        borderRadius: 'var(--radius-sm)', 
                                                        fontSize: '9px', 
                                                        fontWeight: 700,
                                                        backgroundColor: entry.type === 'Expense' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                        color: entry.type === 'Expense' ? '#10b981' : '#3b82f6',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {entry.type}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                                            {entry.reference}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                            {entry.description}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', marginLeft: 'var(--spacing-sm)', flexShrink: 0 }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 700, color: entry.type === 'Expense' ? '#10b981' : '#3b82f6' }}>
                                                            {entry.type === 'Expense' ? `+ ₹${entry.credit}` : `- ₹${entry.debit}`}
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                                                            Bal: ₹{entry.balance.toLocaleString('en-IN')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
