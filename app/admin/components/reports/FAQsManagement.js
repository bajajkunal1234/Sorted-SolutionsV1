'use client'

import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, Loader2, RefreshCcw } from 'lucide-react';

function FAQsManagement() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
    const [expandedId, setExpandedId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => { fetchFaqs(); }, []);

    const fetchFaqs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/faqs');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');
            setFaqs(data.data || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddFaq = async () => {
        if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: newFaq.question.trim(),
                    answer: newFaq.answer.trim(),
                    pages: [],
                    display_order: faqs.length + 1,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to add FAQ');
            setFaqs(prev => [...prev, data.data]);
            setNewFaq({ question: '', answer: '' });
            setShowAddForm(false);
            showToast('FAQ added!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/faqs', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    question: editForm.question,
                    answer: editForm.answer,
                    pages: editForm.pages || [],
                    display_order: editForm.display_order,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to update');
            setFaqs(faqs.map(f => f.id === editingId ? data.data : f));
            setEditingId(null);
            setEditForm({});
            showToast('FAQ updated!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this FAQ?')) return;
        try {
            const res = await fetch(`/api/settings/faqs?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete');
            setFaqs(faqs.filter(f => f.id !== id));
            showToast('FAQ deleted.');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
            <Loader2 size={24} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Loading FAQs...</span>
        </div>
    );

    return (
        <div style={{ position: 'relative' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                    backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Global FAQ Library
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        {faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} · Changes save immediately
                    </p>
                </div>
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={fetchFaqs}
                    disabled={loading}
                    style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                    <RefreshCcw size={16} /> Refresh
                </button>
            </div>

            {/* Add Button */}
            {!showAddForm && (
                <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} /> Add New FAQ
                </button>
            )}

            {/* Add Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>New FAQ</h4>
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Question *</label>
                            <input
                                type="text"
                                placeholder="e.g., What is your service area?"
                                value={newFaq.question}
                                onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Answer *</label>
                            <textarea
                                placeholder="Enter the answer to this question..."
                                value={newFaq.answer}
                                onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                                rows={4}
                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', resize: 'vertical', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button
                            type="button"
                            onClick={handleAddFaq}
                            className="btn btn-primary"
                            disabled={!newFaq.question.trim() || !newFaq.answer.trim() || saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Add FAQ'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowAddForm(false); setNewFaq({ question: '', answer: '' }); }}
                            className="btn btn-secondary"
                        >
                            <X size={16} /> Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {faqs.length === 0 && !showAddForm && (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <HelpCircle size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                    <p>No FAQs yet. Click "Add New FAQ" to get started.</p>
                </div>
            )}

            {/* FAQ List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {faqs.map((faq) => (
                    <div
                        key={faq.id}
                        className="card"
                        style={{ padding: 'var(--spacing-lg)', border: editingId === faq.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}
                    >
                        {editingId === faq.id ? (
                            <div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Question</label>
                                        <input
                                            type="text"
                                            value={editForm.question || ''}
                                            onChange={e => setEditForm({ ...editForm, question: e.target.value })}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Answer</label>
                                        <textarea
                                            value={editForm.answer || ''}
                                            onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                                            rows={4}
                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', resize: 'vertical', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    <button
                                        type="button"
                                        onClick={handleSaveEdit}
                                        className="btn btn-primary"
                                        disabled={saving}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save
                                    </button>
                                    <button type="button" onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary"><X size={16} /></button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#f9731615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <HelpCircle size={18} style={{ color: '#f97316' }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 4px 0' }}>{faq.question}</h4>
                                        {expandedId === faq.id && (
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '8px 0 0 0', lineHeight: 1.6 }}>{faq.answer}</p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 10px' }}
                                        >
                                            {expandedId === faq.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setEditingId(faq.id); setEditForm({ ...faq }); }}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 10px' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(faq.id)}
                                            style={{ padding: '6px 10px', background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default FAQsManagement;
