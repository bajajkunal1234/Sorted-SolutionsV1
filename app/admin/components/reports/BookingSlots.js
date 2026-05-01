'use client'

import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, Calendar, Loader2, RefreshCcw, AlertCircle, LayoutTemplate } from 'lucide-react';

export default function BookingSlots() {
    const [config, setConfig] = useState({
        templates: [],
        defaultWeeklySchedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
        overrides: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('templates');

    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ name: '', startTime: '09:00', endTime: '12:00' });

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [editingDay, setEditingDay] = useState('monday');
    const [scheduleForm, setScheduleForm] = useState({ templateId: '', maxBookings: 4 });

    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [overrideForm, setOverrideForm] = useState({ date: '', templateId: '', maxBookings: 4 });

    const days = [
        { id: 'monday', label: 'Monday' },
        { id: 'tuesday', label: 'Tuesday' },
        { id: 'wednesday', label: 'Wednesday' },
        { id: 'thursday', label: 'Thursday' },
        { id: 'friday', label: 'Friday' },
        { id: 'saturday', label: 'Saturday' },
        { id: 'sunday', label: 'Sunday' }
    ];

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/booking-slots');
            const data = await res.json();
            
            if (data.success && data.data) {
                const val = data.data;
                const schedule = val.defaultWeeklySchedule || {};
                days.forEach(d => { if (!schedule[d.id]) schedule[d.id] = []; });
                setConfig({
                    templates: val.templates || [],
                    defaultWeeklySchedule: schedule,
                    overrides: val.overrides || {}
                });
            }
        } catch (err) {
            console.error('Failed to fetch slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (newConfig) => {
        try {
            setSaving(true);
            const res = await fetch('/api/settings/booking-slots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to save');
            
            setConfig(newConfig);
        } catch (err) {
            console.error('Failed to save slots:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveTemplate = () => {
        if (!templateForm.name || !templateForm.startTime || !templateForm.endTime) return alert("Please fill all fields");
        let newTemplates = [...config.templates];
        if (editingTemplate) {
            newTemplates = newTemplates.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t);
        } else {
            newTemplates.push({ id: `t_${Date.now()}`, ...templateForm });
        }
        saveConfig({ ...config, templates: newTemplates });
        setShowTemplateModal(false);
    };

    const handleDeleteTemplate = (id) => {
        if (confirm('Delete this template? It will also be removed from schedules.')) {
            const newTemplates = config.templates.filter(t => t.id !== id);
            const newSchedule = { ...config.defaultWeeklySchedule };
            days.forEach(d => { newSchedule[d.id] = newSchedule[d.id].filter(s => s.templateId !== id); });
            const newOverrides = { ...config.overrides };
            Object.keys(newOverrides).forEach(date => {
                newOverrides[date] = newOverrides[date].filter(s => s.templateId !== id);
                if (newOverrides[date].length === 0) delete newOverrides[date];
            });
            saveConfig({ templates: newTemplates, defaultWeeklySchedule: newSchedule, overrides: newOverrides });
        }
    };

    const handleAddSchedule = () => {
        if (!scheduleForm.templateId) return alert("Select a template");
        const newSchedule = { ...config.defaultWeeklySchedule };
        if (newSchedule[editingDay].some(s => s.templateId === scheduleForm.templateId)) return alert("Template already assigned to this day");
        newSchedule[editingDay].push({ templateId: scheduleForm.templateId, maxBookings: scheduleForm.maxBookings });
        saveConfig({ ...config, defaultWeeklySchedule: newSchedule });
        setShowScheduleModal(false);
    };

    const handleRemoveSchedule = (day, templateId) => {
        const newSchedule = { ...config.defaultWeeklySchedule };
        newSchedule[day] = newSchedule[day].filter(s => s.templateId !== templateId);
        saveConfig({ ...config, defaultWeeklySchedule: newSchedule });
    };

    const handleAddOverride = () => {
        if (!overrideForm.date || !overrideForm.templateId) return alert("Select date and template");
        const newOverrides = { ...config.overrides };
        if (!newOverrides[overrideForm.date]) newOverrides[overrideForm.date] = [];
        if (newOverrides[overrideForm.date].some(s => s.templateId === overrideForm.templateId)) return alert("Template already overridden for this date");
        newOverrides[overrideForm.date].push({ templateId: overrideForm.templateId, maxBookings: overrideForm.maxBookings });
        saveConfig({ ...config, overrides: newOverrides });
        setShowOverrideModal(false);
    };

    const handleRemoveOverride = (date, templateId) => {
        const newOverrides = { ...config.overrides };
        newOverrides[date] = newOverrides[date].filter(s => s.templateId !== templateId);
        if (newOverrides[date].length === 0) delete newOverrides[date];
        saveConfig({ ...config, overrides: newOverrides });
    };

    const getTemplate = (id) => config.templates.find(t => t.id === id);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>Booking Slots Settings</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>Manage slot templates and availability.</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchConfig} disabled={loading} style={{ padding: '6px 12px' }}>
                    <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                </button>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', padding: '0 var(--spacing-md)' }}>
                {[
                    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
                    { id: 'weekly', icon: Calendar, label: 'Weekly Schedule' },
                    { id: 'overrides', icon: Clock, label: 'Date Overrides' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            padding: 'var(--spacing-md) var(--spacing-lg)',
                            border: 'none',
                            background: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <tab.icon size={18} /> {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}><Loader2 className="spin" size={32} /></div>
                ) : (
                    <>
                        {activeTab === 'templates' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                                    <h4 style={{ margin: 0 }}>Slot Templates</h4>
                                    <button className="btn btn-primary" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', startTime: '09:00', endTime: '12:00' }); setShowTemplateModal(true); }}>
                                        <Plus size={16} /> Add Template
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                                    {config.templates.map(t => (
                                        <div key={t.id} className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between' }}>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{t.name}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{t.startTime} - {t.endTime}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button className="btn btn-secondary" onClick={() => { setEditingTemplate(t); setTemplateForm(t); setShowTemplateModal(true); }}><Edit2 size={14} /></button>
                                                <button className="btn btn-secondary" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteTemplate(t.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {config.templates.length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>No templates defined yet.</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'weekly' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                                {days.map(day => (
                                    <div key={day.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                                            <h4 style={{ margin: 0 }}>{day.label}</h4>
                                            <button className="btn btn-secondary" onClick={() => { setEditingDay(day.id); setScheduleForm({ templateId: '', maxBookings: 4 }); setShowScheduleModal(true); }}>
                                                <Plus size={14} /> Assign Slot
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                            {config.defaultWeeklySchedule[day.id]?.map(s => {
                                                const t = getTemplate(s.templateId);
                                                if (!t) return null;
                                                return (
                                                    <div key={s.templateId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border-primary)' }}>
                                                        <span style={{ fontWeight: 600 }}>{t.name}</span>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>({t.startTime}-{t.endTime})</span>
                                                        <span style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>Max: {s.maxBookings}</span>
                                                        <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => handleRemoveSchedule(day.id, s.templateId)}>&times;</button>
                                                    </div>
                                                )
                                            })}
                                            {(!config.defaultWeeklySchedule[day.id] || config.defaultWeeklySchedule[day.id].length === 0) && <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>No slots assigned.</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'overrides' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                                    <h4 style={{ margin: 0 }}>Date Overrides</h4>
                                    <button className="btn btn-primary" onClick={() => { setOverrideForm({ date: '', templateId: '', maxBookings: 4 }); setShowOverrideModal(true); }}>
                                        <Plus size={16} /> Add Override
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    {Object.entries(config.overrides).map(([date, slots]) => (
                                        <div key={date} className="card" style={{ padding: 'var(--spacing-md)' }}>
                                            <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--color-primary)' }}>{new Date(date).toDateString()}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                                                {slots.map(s => {
                                                    const t = getTemplate(s.templateId);
                                                    if (!t) return null;
                                                    return (
                                                        <div key={s.templateId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border-primary)' }}>
                                                            <span style={{ fontWeight: 600 }}>{t.name}</span>
                                                            <span style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>Max: {s.maxBookings}</span>
                                                            <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-danger)' }} onClick={() => handleRemoveOverride(date, s.templateId)}>&times;</button>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(config.overrides).length === 0 && <div style={{ color: 'var(--text-tertiary)' }}>No date overrides defined.</div>}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            {showTemplateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 400, padding: 'var(--spacing-lg)' }}>
                        <h3>{editingTemplate ? 'Edit' : 'Add'} Template</h3>
                        <div style={{ marginBottom: 12 }}>
                            <label>Slot Name</label>
                            <input className="form-input" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} placeholder="e.g. Slot 1" />
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                            <div style={{ flex: 1 }}><label>Start Time</label><input type="time" className="form-input" value={templateForm.startTime} onChange={e => setTemplateForm({...templateForm, startTime: e.target.value})} /></div>
                            <div style={{ flex: 1 }}><label>End Time</label><input type="time" className="form-input" value={templateForm.endTime} onChange={e => setTemplateForm({...templateForm, endTime: e.target.value})} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={saving} style={{ flex: 1 }}>Save</button>
                            <button className="btn btn-secondary" onClick={() => setShowTemplateModal(false)} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showScheduleModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 400, padding: 'var(--spacing-lg)' }}>
                        <h3>Assign to {days.find(d => d.id === editingDay)?.label}</h3>
                        <div style={{ marginBottom: 12 }}>
                            <label>Template</label>
                            <select className="form-input" value={scheduleForm.templateId} onChange={e => setScheduleForm({...scheduleForm, templateId: e.target.value})}>
                                <option value="">Select a template...</option>
                                {config.templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.startTime}-{t.endTime})</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label>Max Bookings</label>
                            <input type="number" className="form-input" min="1" value={scheduleForm.maxBookings} onChange={e => setScheduleForm({...scheduleForm, maxBookings: parseInt(e.target.value) || 1})} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-primary" onClick={handleAddSchedule} disabled={saving} style={{ flex: 1 }}>Add</button>
                            <button className="btn btn-secondary" onClick={() => setShowScheduleModal(false)} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {showOverrideModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: 400, padding: 'var(--spacing-lg)' }}>
                        <h3>Add Date Override</h3>
                        <div style={{ marginBottom: 12 }}>
                            <label>Date</label>
                            <input type="date" className="form-input" value={overrideForm.date} onChange={e => setOverrideForm({...overrideForm, date: e.target.value})} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label>Template</label>
                            <select className="form-input" value={overrideForm.templateId} onChange={e => setOverrideForm({...overrideForm, templateId: e.target.value})}>
                                <option value="">Select a template...</option>
                                {config.templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.startTime}-{t.endTime})</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label>Max Bookings</label>
                            <input type="number" className="form-input" min="1" value={overrideForm.maxBookings} onChange={e => setOverrideForm({...overrideForm, maxBookings: parseInt(e.target.value) || 1})} />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-primary" onClick={handleAddOverride} disabled={saving} style={{ flex: 1 }}>Add</button>
                            <button className="btn btn-secondary" onClick={() => setShowOverrideModal(false)} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
