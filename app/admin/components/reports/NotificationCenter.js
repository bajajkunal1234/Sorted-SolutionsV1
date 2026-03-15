'use client'

import { useState, useEffect } from 'react';
import {
    Bell, MessageSquare, Smartphone, Users, Zap, Clock,
    Plus, Trash2, Edit2, Check, X, Loader2, Save,
    CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp,
    Send, Star, Eye, EyeOff, RefreshCw, Toggle, PenLine
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const CHANNELS = [
    { id: 'push', label: 'Web Push', icon: Smartphone, color: '#6366f1', description: 'Browser push notifications (Chrome, Edge, Android)' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: '#22c55e', description: 'WhatsApp messages via API templates' },
];

const AUDIENCE_GROUPS = [
    { id: 'customers', label: 'Customers', color: '#3b82f6' },
    { id: 'technicians', label: 'Technicians', color: '#f59e0b' },
    { id: 'visitors', label: 'Website Visitors', color: '#8b5cf6' },
    { id: 'admins', label: 'Admins', color: '#ef4444' },
];

const JOB_EVENTS = [
    { id: 'job_created_admin', label: 'Job Created (Admin)', icon: '📝' },
    { id: 'job_assigned', label: 'Job Assigned to Technician', icon: '👷' },
    { id: 'job_started', label: 'Job Started', icon: '🔧' },
    { id: 'job_completed', label: 'Job Completed', icon: '✅' },
    { id: 'job_cancelled', label: 'Job Cancelled', icon: '❌' },
    { id: 'booking_created_website', label: 'New Booking from Website', icon: '🌐' },
    { id: 'account_created_website', label: 'New Customer Registered', icon: '👤' },
    { id: 'appliance_created', label: 'Appliance Added', icon: '🔌' },
    { id: 'sales_invoice_created', label: 'Sales Invoice Created', icon: '🧾' },
    { id: 'quotation_sent', label: 'Quotation Sent', icon: '📄' },
    // Rental events
    { id: 'rental_contract_created', label: 'Rental Contract Created', icon: '📋' },
    { id: 'rent_due_reminder', label: 'Rent Due Reminder', icon: '💰' },
    { id: 'rental_contract_expiring', label: 'Rental Contract Expiring (30 days)', icon: '⏰' },
];

const TEMPLATE_TYPES = [
    { id: 'job_notification', label: 'Job Notification', channel: 'both' },
    { id: 'booking_confirmation', label: 'Booking Confirmation', channel: 'both' },
    { id: 'quotation', label: 'Quotation Message', channel: 'whatsapp' },
    { id: 'payment_reminder', label: 'Payment Reminder', channel: 'whatsapp' },
    { id: 'feedback_request', label: 'Feedback Request', channel: 'both' },
    { id: 'job_completion', label: 'Job Completion', channel: 'both' },
    { id: 'general', label: 'General Announcement', channel: 'push' },
];

const STATUS_COLOR = { sent: '#10b981', failed: '#ef4444', skipped: '#f59e0b', pending: '#6366f1' };

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function TabButton({ id, label, icon: Icon, active, onClick, badge }) {
    return (
        <button
            onClick={() => onClick(id)}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 20px', border: 'none', backgroundColor: 'transparent',
                color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                borderBottom: active ? '3px solid var(--color-primary)' : '3px solid transparent',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}
        >
            <Icon size={16} />
            {label}
            {badge !== undefined && (
                <span style={{
                    fontSize: '11px', padding: '1px 6px', borderRadius: '99px',
                    backgroundColor: active ? 'var(--color-primary)' : 'var(--bg-secondary)',
                    color: active ? 'white' : 'var(--text-secondary)', fontWeight: 700
                }}>{badge}</span>
            )}
        </button>
    );
}

function SectionCard({ children, title, subtitle, action }) {
    return (
        <div style={{
            backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '20px'
        }}>
            {(title || action) && (
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--border-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        {title && <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{title}</h3>}
                        {subtitle && <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{subtitle}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div style={{ padding: '20px' }}>{children}</div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Channels Tab
// ─────────────────────────────────────────────────────────────────────────────
function ChannelsTab({ channelSettings, setChannelSettings }) {
    const toggle = (channelId) => {
        setChannelSettings(prev => ({ ...prev, [channelId]: !prev[channelId] }));
    };

    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#6366f110', borderRadius: 'var(--radius-md)', border: '1px solid #6366f130' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Enable or disable notification channels. Disabled channels won't send even if triggers are active.
                </p>
            </div>

            {CHANNELS.map(ch => {
                const Icon = ch.icon;
                const isOn = channelSettings[ch.id] !== false;
                return (
                    <SectionCard key={ch.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    backgroundColor: `${ch.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Icon size={24} style={{ color: ch.color }} />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{ch.label}</h4>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>{ch.description}</p>
                                    <span style={{
                                        marginTop: '6px', display: 'inline-block',
                                        fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700,
                                        backgroundColor: isOn ? '#10b98115' : '#ef444415',
                                        color: isOn ? '#10b981' : '#ef4444',
                                    }}>{isOn ? '● Active' : '○ Disabled'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => toggle(ch.id)}
                                style={{
                                    width: '52px', height: '28px', borderRadius: '99px',
                                    border: 'none', cursor: 'pointer', transition: 'all 0.3s ease',
                                    backgroundColor: isOn ? ch.color : 'var(--bg-secondary)',
                                    position: 'relative', flexShrink: 0
                                }}
                            >
                                <div style={{
                                    position: 'absolute', top: '4px',
                                    left: isOn ? '26px' : '4px',
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    backgroundColor: 'white',
                                    transition: 'left 0.3s ease',
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
                                }} />
                            </button>
                        </div>
                    </SectionCard>
                );
            })}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates Tab
// ─────────────────────────────────────────────────────────────────────────────
function TemplatesTab() {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [channelFilter, setChannelFilter] = useState('all');

    const emptyForm = { name: '', channel: 'push', type: 'job_notification', content: '', variables: '' };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => { loadTemplates(); }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/notifications/templates');
            const data = await res.json();
            if (data.success) setTemplates(data.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const openNew = () => { setEditing(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (t) => {
        setEditing(t);
        setForm({ ...t, variables: (t.variables || []).join(', ') });
        setShowForm(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                ...form,
                variables: form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : [],
            };
            const method = editing ? 'PUT' : 'POST';
            const body = editing ? { ...payload, id: editing.id } : payload;
            await fetch('/api/notifications/templates', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            await loadTemplates();
            setShowForm(false);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this template?')) return;
        await fetch(`/api/notifications/templates?id=${id}`, { method: 'DELETE' });
        await loadTemplates();
    };

    const filtered = channelFilter === 'all' ? templates : templates.filter(t => t.channel === channelFilter);
    const chColor = { push: '#6366f1', whatsapp: '#22c55e' };

    if (showForm) {
        return (
            <div>
                <button onClick={() => setShowForm(false)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', fontSize: '13px', marginBottom: '20px', color: 'var(--text-secondary)' }}>
                    ← Back to Templates
                </button>
                <SectionCard title={editing ? 'Edit Template' : 'New Template'}>
                    <div style={{ display: 'grid', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Template Name *</label>
                                <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Job Completed Alert" />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Channel *</label>
                                <select className="form-control" value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                                    <option value="push">Web Push</option>
                                    <option value="whatsapp">WhatsApp</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Template Type *</label>
                            <select className="form-control" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                                {TEMPLATE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Message Content *</label>
                            <textarea className="form-control" rows={5} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Hi {customer_name}, your job #{job_id} has been completed!" style={{ resize: 'vertical' }} />
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Use {'{'}<code>variable_name</code>{'}'} for dynamic values.</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Variables (comma-separated)</label>
                            <input className="form-control" value={form.variables} onChange={e => setForm(p => ({ ...p, variables: e.target.value }))} placeholder="customer_name, job_id, technician_name" />
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={saving || !form.name || !form.content} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </SectionCard>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['all', 'push', 'whatsapp'].map(f => (
                        <button key={f} onClick={() => setChannelFilter(f)} style={{
                            padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                            backgroundColor: channelFilter === f ? 'var(--color-primary)' : 'var(--bg-elevated)',
                            color: channelFilter === f ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                        }}>
                            {f === 'all' ? 'All' : f === 'push' ? '📱 Push' : '💬 WhatsApp'}
                        </button>
                    ))}
                </div>
                <button onClick={openNew} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <Plus size={16} /> New Template
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Loader2 size={24} className="animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No templates yet. Click "New Template" to create one.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {filtered.map(t => (
                        <div key={t.id} style={{ padding: '16px', backgroundColor: 'var(--bg-elevated)', border: `1px solid ${t.is_default ? chColor[t.channel] : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', boxShadow: t.is_default ? `0 0 0 1px ${chColor[t.channel]}40` : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, backgroundColor: `${chColor[t.channel]}15`, color: chColor[t.channel] }}>
                                        {t.channel === 'push' ? '📱 Push' : '💬 WhatsApp'}
                                    </span>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700 }}>{t.name}</h4>
                                    {t.is_default && <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 700, backgroundColor: '#f59e0b20', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}><Star size={10} fill="#f59e0b" /> DEFAULT</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={() => openEdit(t)} style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer' }}><Edit2 size={13} /></button>
                                    <button onClick={() => handleDelete(t.id)} style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid #ef444430', backgroundColor: '#ef444410', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                                </div>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)', lineHeight: 1.6 }}>
                                {t.content}
                            </div>
                            {t.variables?.length > 0 && (
                                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {t.variables.map(v => <span key={v} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{`{${v}}`}</span>)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Triggers Tab
// ─────────────────────────────────────────────────────────────────────────────
function TriggersTab() {
    const [triggers, setTriggers] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toggling, setToggling] = useState(null);

    const emptyForm = { event_type: 'job_completed', channel: 'push', template_id: '', audience: ['customers'], delay_minutes: 0, is_active: true };
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        Promise.all([
            fetch('/api/notifications/triggers').then(r => r.json()),
            fetch('/api/notifications/templates').then(r => r.json()),
        ]).then(([trig, templ]) => {
            if (trig.success) setTriggers(trig.data);
            if (templ.success) setTemplates(templ.data);
        }).finally(() => setLoading(false));
    }, []);

    const reload = () => fetch('/api/notifications/triggers').then(r => r.json()).then(d => { if (d.success) setTriggers(d.data); });

    const toggleActive = async (trigger) => {
        setToggling(trigger.id);
        await fetch('/api/notifications/triggers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trigger.id, is_active: !trigger.is_active }) });
        await reload();
        setToggling(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this trigger?')) return;
        await fetch(`/api/notifications/triggers?id=${id}`, { method: 'DELETE' });
        await reload();
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetch('/api/notifications/triggers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            await reload();
            setShowForm(false);
            setForm(emptyForm);
        } finally { setSaving(false); }
    };

    const toggleAudience = (id) => setForm(p => ({
        ...p, audience: p.audience.includes(id) ? p.audience.filter(a => a !== id) : [...p.audience, id]
    }));

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Triggers define when and how notifications fire automatically.
                </p>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    {showForm ? <X size={16} /> : <Plus size={16} />}
                    {showForm ? 'Cancel' : 'Add Trigger'}
                </button>
            </div>

            {showForm && (
                <SectionCard title="New Trigger Rule" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gap: '14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>On Event *</label>
                                <select className="form-control" value={form.event_type} onChange={e => setForm(p => ({ ...p, event_type: e.target.value }))}>
                                    {JOB_EVENTS.map(e => <option key={e.id} value={e.id}>{e.icon} {e.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Channel *</label>
                                <select className="form-control" value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                                    <option value="push">📱 Web Push</option>
                                    <option value="whatsapp">💬 WhatsApp</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Template *</label>
                            <select className="form-control" value={form.template_id} onChange={e => setForm(p => ({ ...p, template_id: e.target.value }))}>
                                <option value="">— Select a template —</option>
                                {templates.filter(t => t.channel === form.channel).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                {templates.filter(t => t.channel === form.channel).length === 0 && <option disabled>No {form.channel} templates yet</option>}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Send to *</label>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {AUDIENCE_GROUPS.map(g => {
                                    const selected = form.audience.includes(g.id);
                                    return (
                                        <button key={g.id} onClick={() => toggleAudience(g.id)} style={{
                                            padding: '6px 14px', borderRadius: '99px', border: `2px solid ${selected ? g.color : 'var(--border-primary)'}`,
                                            backgroundColor: selected ? `${g.color}15` : 'var(--bg-secondary)',
                                            color: selected ? g.color : 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600
                                        }}>
                                            {selected ? '✓ ' : ''}{g.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Delay (minutes after event)</label>
                            <input type="number" min="0" max="1440" className="form-control" value={form.delay_minutes} onChange={e => setForm(p => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))} style={{ maxWidth: '180px' }} />
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>0 = immediately</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSave} disabled={saving || !form.template_id || form.audience.length === 0} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                {saving ? 'Saving...' : 'Save Trigger'}
                            </button>
                        </div>
                    </div>
                </SectionCard>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={24} className="animate-spin" /></div>
            ) : triggers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <Zap size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No triggers yet. Add one to start sending automatic notifications.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {triggers.map(tr => {
                        const event = JOB_EVENTS.find(e => e.id === tr.event_type);
                        const tmpl = tr.notification_templates;
                        return (
                            <div key={tr.id} style={{
                                padding: '16px', backgroundColor: 'var(--bg-elevated)',
                                border: `1px solid ${tr.is_active ? '#6366f140' : 'var(--border-primary)'}`,
                                borderRadius: 'var(--radius-md)', opacity: tr.is_active ? 1 : 0.6,
                                transition: 'opacity 0.2s'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '20px' }}>{event?.icon || '⚡'}</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{event?.label || tr.event_type}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {tr.channel === 'push' ? '📱 Push' : '💬 WhatsApp'} · {tmpl?.name || 'Unknown template'} · to {(tr.audience || []).join(', ')}
                                                {tr.delay_minutes > 0 && ` · after ${tr.delay_minutes}m`}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => toggleActive(tr)}
                                            disabled={toggling === tr.id}
                                            style={{
                                                padding: '6px 14px', borderRadius: '99px', border: 'none', cursor: 'pointer',
                                                backgroundColor: tr.is_active ? '#10b98120' : '#ef444420',
                                                color: tr.is_active ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '12px',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            {toggling === tr.id ? <Loader2 size={12} className="animate-spin" /> : (tr.is_active ? <Eye size={12} /> : <EyeOff size={12} />)}
                                            {tr.is_active ? 'Active' : 'Paused'}
                                        </button>
                                        <button onClick={() => handleDelete(tr.id)} style={{ padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid #ef444430', backgroundColor: '#ef444410', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audience Tab
// ─────────────────────────────────────────────────────────────────────────────
function AudienceTab() {
    return (
        <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f59e0b10', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b30' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Audience groups define <strong>who</strong> receives notifications. Assign groups when creating triggers.
                </p>
            </div>
            {AUDIENCE_GROUPS.map(g => (
                <SectionCard key={g.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: `${g.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={22} style={{ color: g.color }} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700 }}>{g.label}</h4>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {g.id === 'customers' && 'Registered customers with a customer account. Receives job status updates, booking confirmations.'}
                                {g.id === 'technicians' && 'Technicians assigned to jobs. Receives job assignment, schedule change notifications.'}
                                {g.id === 'visitors' && 'Non-registered website visitors. Currently only reachable via WhatsApp using the phone number from their booking form.'}
                                {g.id === 'admins' && 'Admin users of the panel. Receives alerts for new bookings, job completions, or any event you configure.'}
                            </p>
                            <span style={{ marginTop: '8px', display: 'inline-block', fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 700, backgroundColor: `${g.color}15`, color: g.color }}>
                                {g.id === 'visitors' ? 'WhatsApp only' : 'Push + WhatsApp'}
                            </span>
                        </div>
                    </div>
                </SectionCard>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logs Tab
// ─────────────────────────────────────────────────────────────────────────────
function LogsTab() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/notifications/logs?limit=50');
            const data = await res.json();
            if (data.success) setLogs(data.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const fmtTime = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Last 50 notification attempts</p>
                <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', cursor: 'pointer', fontSize: '13px' }}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><Loader2 size={24} className="animate-spin" /></div>
            ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', border: '2px dashed var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
                    <Send size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No notifications sent yet.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border-primary)' }}>
                                {['Time', 'Event', 'Channel', 'Recipient', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '12px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{fmtTime(log.sent_at)}</td>
                                    <td style={{ padding: '10px 12px' }}>{(JOB_EVENTS.find(e => e.id === log.event_type)?.icon || '⚡') + ' ' + (log.event_type || '-')}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, backgroundColor: log.channel === 'push' ? '#6366f115' : '#22c55e15', color: log.channel === 'push' ? '#6366f1' : '#22c55e' }}>
                                            {log.channel === 'push' ? '📱 Push' : '💬 WhatsApp'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 12px' }}>{log.recipient_name || log.recipient_id || '-'}</td>
                                    <td style={{ padding: '10px 12px' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: STATUS_COLOR[log.status] || 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' }}>
                                            {log.status === 'sent' ? <CheckCircle size={14} /> : log.status === 'failed' ? <XCircle size={14} /> : <AlertCircle size={14} />}
                                            {log.status || '-'}
                                        </span>
                                        {log.error && <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{log.error}</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose Tab — manual send
// ─────────────────────────────────────────────────────────────────────────────
function ComposeTab() {
    const [templates, setTemplates] = useState([]);
    const [channel, setChannel] = useState('push');
    const [audienceType, setAudienceType] = useState('all_customers');
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [sending, setSending] = useState(false);
    const [results, setResults] = useState(null); // null = not sent yet

    // Load templates for preview population
    useEffect(() => {
        fetch('/api/notifications/templates').then(r => r.json()).then(d => {
            if (d.success) setTemplates(d.data);
        });
    }, []);

    const channelTemplates = templates.filter(t => t.channel === channel);

    const loadTemplate = (id) => {
        setSelectedTemplateId(id);
        const tmpl = templates.find(t => t.id === id);
        if (tmpl) {
            setTitle(tmpl.name);
            setMessage(tmpl.content);
        }
    };

    const handleSend = async () => {
        if (!message.trim()) return;
        setSending(true);
        setResults(null);
        try {
            const res = await fetch('/api/notifications/compose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    channel,
                    audience_type: audienceType,
                    title: title || 'Sorted Solutions',
                    message,
                }),
            });
            const data = await res.json();
            setResults(data);
        } catch (e) {
            setResults({ success: false, error: e.message });
        } finally {
            setSending(false);
        }
    };

    const AUDIENCE_OPTIONS = [
        { id: 'all_customers', label: '👥 All Customers', description: 'Every registered customer with a push token' },
        { id: 'all_technicians', label: '🔧 All Technicians', description: 'Every active technician' },
        { id: 'all_admins', label: '⚙️ Admins Only', description: 'Admin devices that have allowed notifications' },
    ];

    return (
        <div style={{ maxWidth: '680px' }}>
            <div style={{ padding: '12px 16px', backgroundColor: '#f59e0b10', borderRadius: 'var(--radius-md)', border: '1px solid #f59e0b30', marginBottom: '20px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Send a one-off notification right now — not tied to any trigger. Use <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '3px' }}>{'{name}'}</code> to personalise per recipient.
                </p>
            </div>

            <SectionCard title="Compose Message">
                <div style={{ display: 'grid', gap: '16px' }}>

                    {/* Channel */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Channel</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {CHANNELS.map(ch => {
                                const Icon = ch.icon;
                                const active = channel === ch.id;
                                return (
                                    <button key={ch.id} onClick={() => { setChannel(ch.id); setSelectedTemplateId(''); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                                            borderRadius: 'var(--radius-md)', border: `2px solid ${active ? ch.color : 'var(--border-primary)'}`,
                                            backgroundColor: active ? `${ch.color}12` : 'var(--bg-secondary)',
                                            color: active ? ch.color : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                                            transition: 'all 0.2s'
                                        }}>
                                        <Icon size={16} /> {ch.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Audience */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Send To</label>
                        <div style={{ display: 'grid', gap: '8px' }}>
                            {AUDIENCE_OPTIONS.map(opt => (
                                <label key={opt.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                                    border: `2px solid ${audienceType === opt.id ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                    backgroundColor: audienceType === opt.id ? 'var(--color-primary-subtle, #6366f110)' : 'var(--bg-secondary)',
                                    transition: 'all 0.2s'
                                }}>
                                    <input type="radio" name="audienceType" value={opt.id} checked={audienceType === opt.id}
                                        onChange={() => setAudienceType(opt.id)} style={{ accentColor: 'var(--color-primary)' }} />
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{opt.label}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{opt.description}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Load from template */}
                    {channelTemplates.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Load from Template <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>(optional)</span></label>
                            <select className="form-control" value={selectedTemplateId} onChange={e => loadTemplate(e.target.value)}>
                                <option value="">— start fresh —</option>
                                {channelTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Title (push only) */}
                    {channel === 'push' && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Notification Title</label>
                            <input className="form-control" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Service Update from Sorted Solutions" />
                        </div>
                    )}

                    {/* Message body */}
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Message *</label>
                        <textarea className="form-control" rows={5} value={message} onChange={e => setMessage(e.target.value)}
                            placeholder={`Hi {name}, your appointment has been confirmed! Our team will be there shortly.`}
                            style={{ resize: 'vertical' }} />
                        <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <code style={{ backgroundColor: 'var(--bg-secondary)', padding: '1px 4px', borderRadius: '3px' }}>{'{name}'}</code> will be replaced with each recipient's name.
                        </p>
                    </div>

                    {/* Send */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSend} disabled={sending || !message.trim()} className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '14px', fontWeight: 700 }}>
                            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                            {sending ? 'Sending...' : `Send via ${channel === 'push' ? 'Push' : 'WhatsApp'}`}
                        </button>
                    </div>
                </div>
            </SectionCard>

            {/* Results */}
            {results && (
                <SectionCard title="Send Results">
                    {!results.success && results.error ? (
                        <div style={{ color: '#ef4444', fontSize: '13px' }}>❌ Error: {results.error}</div>
                    ) : (
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '20px', padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>{results.sent}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SENT</div>
                                </div>
                                {results.skipped > 0 && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#f59e0b' }}>{results.skipped}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SKIPPED</div>
                                    </div>
                                )}
                                {results.failed > 0 && (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444' }}>{results.failed}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>FAILED</div>
                                    </div>
                                )}
                            </div>
                            {results.results?.filter(r => r.status !== 'sent').map((r, i) => (
                                <div key={i} style={{ fontSize: '12px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: r.status === 'failed' ? '#ef444410' : '#f59e0b10', color: r.status === 'failed' ? '#ef4444' : '#f59e0b' }}>
                                    {r.status === 'failed' ? '❌' : '⚠️'} <strong>{r.name}</strong>: {r.error || r.status}
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NotificationCenter
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationCenter() {
    const [activeTab, setActiveTab] = useState('channels');
    const [channelSettings, setChannelSettings] = useState({ push: true, whatsapp: true });

    const tabs = [
        { id: 'channels', label: 'Channels', icon: Smartphone },
        { id: 'templates', label: 'Templates', icon: MessageSquare },
        { id: 'audience', label: 'Audience', icon: Users },
        { id: 'triggers', label: 'Triggers', icon: Zap },
        { id: 'compose', label: 'Compose & Send', icon: PenLine },
        { id: 'logs', label: 'Logs', icon: Clock },
    ];

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1000px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800 }}>Notification Center</h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Manage notification channels, templates, triggers and logs across all user groups.
                </p>
            </div>

            {/* Tab Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', marginBottom: '24px', overflowX: 'auto' }}>
                {tabs.map(tab => (
                    <TabButton key={tab.id} {...tab} active={activeTab === tab.id} onClick={setActiveTab} />
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'channels' && <ChannelsTab channelSettings={channelSettings} setChannelSettings={setChannelSettings} />}
            {activeTab === 'templates' && <TemplatesTab />}
            {activeTab === 'audience' && <AudienceTab />}
            {activeTab === 'triggers' && <TriggersTab />}
            {activeTab === 'compose' && <ComposeTab />}
            {activeTab === 'logs' && <LogsTab />}

            <style jsx>{`
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    font-size: 13px;
                    background-color: var(--bg-elevated);
                    color: var(--text-primary);
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .form-control:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
