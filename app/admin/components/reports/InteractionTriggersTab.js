'use client';

import { useState, useEffect } from 'react';
import { Zap, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, RefreshCcw, Save, X, ChevronDown } from 'lucide-react';

const CATEGORIES = ['job', 'account', 'booking', 'financial', 'rental', 'website', 'auth', 'other'];
const SOURCES = ['Admin', 'Customer App', 'Technician App', 'Website', 'System'];

const BUILT_IN_TRIGGERS = [
    { type: 'job-created-admin', category: 'job', source: 'Admin', description: 'Logged when admin creates a new job', is_builtin: true },
    { type: 'job-assigned', category: 'job', source: 'Admin', description: 'Logged when a job is assigned to a technician', is_builtin: true },
    { type: 'job-started', category: 'job', source: 'Admin', description: 'Logged when job status changes to In Progress', is_builtin: true },
    { type: 'job-completed', category: 'job', source: 'Admin', description: 'Logged when a job is marked completed', is_builtin: true },
    { type: 'job-cancelled', category: 'job', source: 'Admin', description: 'Logged when a job is cancelled', is_builtin: true },
    { type: 'job-reassigned', category: 'job', source: 'Admin', description: 'Logged when a job is reassigned to a different technician', is_builtin: true },
    { type: 'job-edited', category: 'job', source: 'Admin', description: 'Logged when admin edits job details', is_builtin: true },
    { type: 'job-started', category: 'job', source: 'Technician App', description: 'Logged when technician marks job as started via app', is_builtin: true },
    { type: 'job-completed', category: 'job', source: 'Technician App', description: 'Logged when technician marks job as completed via app', is_builtin: true },
    { type: 'customer-login', category: 'auth', source: 'Customer App', description: 'Logged when a customer logs into the Customer App', is_builtin: true },
    { type: 'customer-signup', category: 'auth', source: 'Customer App', description: 'Logged when a new customer registers', is_builtin: true },
    { type: 'admin-login', category: 'auth', source: 'Admin', description: 'Logged when an admin logs in', is_builtin: true },
    { type: 'online-booking', category: 'booking', source: 'Website', description: 'Logged when a customer books via the website', is_builtin: true },
    { type: 'appliance-added', category: 'account', source: 'Customer App', description: 'Logged when a customer adds an appliance in the app', is_builtin: true },
    { type: 'receipt-voucher-created', category: 'financial', source: 'Admin', description: 'Logged when a receipt voucher is created', is_builtin: true },
    { type: 'payment-voucher-created', category: 'financial', source: 'Admin', description: 'Logged when a payment voucher is created', is_builtin: true },
    { type: 'rental-started', category: 'rental', source: 'Admin', description: 'Logged when a new rental agreement is created', is_builtin: true },
    { type: 'rental-rent-due', category: 'rental', source: 'Admin', description: 'Logged when a rent due notification is sent', is_builtin: true },
    { type: 'property-linked', category: 'account', source: 'Admin', description: 'Logged when a property is linked to a customer', is_builtin: true },
    { type: 'property-unlinked', category: 'account', source: 'Admin', description: 'Logged when a property is unlinked from a customer', is_builtin: true },
    { type: 'property-added', category: 'account', source: 'Admin', description: 'Logged when a new property is created', is_builtin: true },
    { type: 'account-created', category: 'account', source: 'Admin', description: 'Logged when a new account/customer is created', is_builtin: true },
    { type: 'website-click', category: 'website', source: 'Website', description: 'Logged when a visitor clicks a tracked element on the website', is_builtin: true },
];

const CATEGORY_COLORS = {
    job: '#6366f1',
    account: '#10b981',
    booking: '#f59e0b',
    financial: '#3b82f6',
    rental: '#ec4899',
    website: '#8b5cf6',
    auth: '#64748b',
    other: '#94a3b8',
};

const BLANK_TRIGGER = { type: '', category: 'other', source: 'Admin', description: '', is_enabled: true, webhook_url: '' };

function TriggerRow({ trigger, onToggle, onEdit, onDelete }) {
    const color = CATEGORY_COLORS[trigger.category] || '#94a3b8';
    return (
        <tr style={{ borderBottom: '1px solid var(--border-primary)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={14} style={{ color }} />
                    <code style={{ fontSize: 12, background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}>
                        {trigger.type}
                    </code>
                </div>
            </td>
            <td style={{ padding: '10px 12px' }}>
                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}20`, color }}>
                    {trigger.category}
                </span>
            </td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{trigger.source}</td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300 }}>{trigger.description}</td>
            <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>
                {trigger.last_fired_at ? new Date(trigger.last_fired_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
            </td>
            <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: 13 }}>{trigger.fire_count ?? '—'}</td>
            <td style={{ padding: '10px 12px' }}>
                <button type="button" onClick={() => onToggle(trigger)} title={trigger.is_enabled ? 'Disable' : 'Enable'}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: trigger.is_enabled ? '#10b981' : '#ef4444', padding: 0 }}>
                    {trigger.is_enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
            </td>
            <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                    {!trigger.is_builtin && (
                        <>
                            <button type="button" onClick={() => onEdit(trigger)} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}><Edit2 size={11} /></button>
                            <button type="button" onClick={() => onDelete(trigger)} style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', border: '1px solid #ef444440', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><Trash2 size={11} /></button>
                        </>
                    )}
                    {trigger.is_builtin && (
                        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Built-in</span>
                    )}
                </div>
            </td>
        </tr>
    );
}

function TriggerForm({ trigger, onSave, onCancel, saving }) {
    const [form, setForm] = useState(trigger || BLANK_TRIGGER);
    const up = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' };
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' };
    return (
        <div style={{ border: '1px solid var(--color-primary)', borderRadius: 12, padding: 20, background: 'var(--bg-secondary)', marginBottom: 16 }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700 }}>{trigger?.id ? 'Edit Custom Trigger' : 'Create Custom Trigger'}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>Trigger Type Key *</label>
                    <input style={inputStyle} value={form.type} onChange={up('type')} placeholder="e.g. amc-renewed" />
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>Use lowercase with hyphens. This is the type value stored in the interactions table.</div>
                </div>
                <div>
                    <label style={labelStyle}>Category *</label>
                    <select style={inputStyle} value={form.category} onChange={up('category')}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>Source</label>
                    <select style={inputStyle} value={form.source} onChange={up('source')}>
                        {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label style={labelStyle}>Webhook URL (Optional)</label>
                    <input style={inputStyle} value={form.webhook_url || ''} onChange={up('webhook_url')} placeholder="https://..." />
                </div>
            </div>
            <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Description</label>
                <input style={inputStyle} value={form.description} onChange={up('description')} placeholder="What triggers this interaction log?" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_enabled} onChange={up('is_enabled')} />
                    Enabled (active)
                </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={13} /> Cancel</button>
                <button type="button" onClick={() => onSave(form)} disabled={saving || !form.type.trim()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Save size={13} /> {trigger?.id ? 'Update' : 'Create Trigger'}
                </button>
            </div>
        </div>
    );
}

export default function InteractionTriggersTab() {
    const [triggers, setTriggers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingTrigger, setEditingTrigger] = useState(null);
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterSource, setFilterSource] = useState('all');

    const fetchTriggers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/interaction-triggers');
            const result = await res.json();
            if (result.success) {
                // Merge DB triggers with built-in triggers: DB records override built-in defaults
                const dbMap = Object.fromEntries((result.data || []).map(t => [t.type + '|' + (t.source || ''), t]));
                const merged = BUILT_IN_TRIGGERS.map(b => {
                    const key = b.type + '|' + (b.source || '');
                    return dbMap[key] ? { ...b, ...dbMap[key] } : { ...b, id: null };
                });
                // Also add any purely custom triggers from DB not in built-ins
                (result.data || []).forEach(t => {
                    if (!BUILT_IN_TRIGGERS.find(b => b.type === t.type && b.source === t.source)) {
                        merged.push({ ...t, is_builtin: false });
                    }
                });
                setTriggers(merged);
            } else {
                // If table doesn't exist yet, show just the built-ins
                setTriggers(BUILT_IN_TRIGGERS.map(t => ({ ...t, id: null, is_enabled: true, fire_count: null, last_fired_at: null })));
            }
        } catch {
            setTriggers(BUILT_IN_TRIGGERS.map(t => ({ ...t, id: null, is_enabled: true, fire_count: null, last_fired_at: null })));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTriggers(); }, []);

    const handleToggle = async (trigger) => {
        try {
            const newState = !trigger.is_enabled;
            const res = await fetch('/api/admin/interaction-triggers', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: trigger.type, source: trigger.source, is_enabled: newState }),
            });
            const result = await res.json();
            if (result.success) {
                setTriggers(prev => prev.map(t => (t.type === trigger.type && t.source === trigger.source) ? { ...t, is_enabled: newState } : t));
            }
        } catch (e) {
            alert('Failed to toggle trigger: ' + e.message);
        }
    };

    const handleSave = async (form) => {
        setSaving(true);
        try {
            const method = editingTrigger?.id ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/interaction-triggers', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingTrigger?.id ? { ...form, id: editingTrigger.id } : form),
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            setShowForm(false);
            setEditingTrigger(null);
            await fetchTriggers();
        } catch (e) {
            alert('Failed to save trigger: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (trigger) => {
        if (!confirm(`Delete custom trigger "${trigger.type}"?`)) return;
        try {
            await fetch(`/api/admin/interaction-triggers?id=${trigger.id}`, { method: 'DELETE' });
            await fetchTriggers();
        } catch (e) {
            alert('Failed to delete trigger: ' + e.message);
        }
    };

    const handleEdit = (trigger) => {
        setEditingTrigger(trigger);
        setShowForm(true);
    };

    const filtered = triggers.filter(t =>
        (filterCategory === 'all' || t.category === filterCategory) &&
        (filterSource === 'all' || t.source === filterSource)
    );

    const enabledCount = triggers.filter(t => t.is_enabled).length;

    return (
        <div style={{ padding: 'var(--spacing-md)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Zap size={18} style={{ color: '#f59e0b' }} /> Interaction Triggers
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {enabledCount} of {triggers.length} triggers active. These control what actions get recorded as interactions.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={fetchTriggers} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12 }}>
                        <RefreshCcw size={13} /> Refresh
                    </button>
                    <button type="button" onClick={() => { setShowForm(true); setEditingTrigger(null); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', fontSize: 12 }}>
                        <Plus size={13} /> New Trigger
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <TriggerForm
                    trigger={editingTrigger}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingTrigger(null); }}
                    saving={saving}
                />
            )}

            {/* Info Banner */}
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#b45309', lineHeight: 1.5 }}>
                <strong>⚡ How triggers work:</strong> Each action in the system (job created, customer login, payment received, etc.) calls a trigger. If a trigger is <strong>enabled</strong>, a record is inserted into the <code>interactions</code> table and becomes visible across the system. Disabled triggers are silently skipped.
                <br /><strong>Note:</strong> Built-in triggers are coded into the API routes. Toggling them on/off controls whether they write to the DB, but the API code still runs.
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 12, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 12, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <option value="all">All Sources</option>
                    {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>Showing {filtered.length} triggers</span>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading triggers…</div>
            ) : (
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-primary)', borderRadius: 10 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trigger Type</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Source</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Description</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Fired</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Count</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                                <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((trigger, i) => (
                                <TriggerRow
                                    key={trigger.id || trigger.type + i}
                                    trigger={trigger}
                                    onToggle={handleToggle}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)' }}>No triggers match this filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
