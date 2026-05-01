'use client'

import { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, Save, Calendar, Loader, Check, X, Settings2 } from 'lucide-react';

const DAYS = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
];

export default function BookingSlots() {
    const [config, setConfig] = useState({
        templates: [],
        defaultWeeklySchedule: { monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] },
        overrides: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    // Template Form State
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ name: '', startTime: '09:00', endTime: '12:00' });

    // Schedule Assignment State
    const [activeDay, setActiveDay] = useState('monday');
    const [assignmentForm, setAssignmentForm] = useState({ templateId: '', maxBookings: 4 });
    const [rightPanelTab, setRightPanelTab] = useState('weekly'); // 'weekly' or 'overrides'
    const [overrideDate, setOverrideDate] = useState('');

    useEffect(() => { loadConfig(); }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/booking-slots');
            const data = await res.json();
            if (data.success) {
                // Ensure defaultWeeklySchedule has all days
                const loadedConfig = data.data || {};
                const schedule = loadedConfig.defaultWeeklySchedule || {};
                DAYS.forEach(d => { if (!schedule[d.id]) schedule[d.id] = []; });
                
                setConfig({
                    templates: loadedConfig.templates || [],
                    defaultWeeklySchedule: schedule,
                    overrides: loadedConfig.overrides || {}
                });
            }
        } catch (err) {
            console.error('Error loading slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (newConfig) => {
        setSaving(true);
        setSaveMsg('');
        try {
            const res = await fetch('/api/settings/booking-slots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newConfig)
            });
            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                throw new Error(`Server returned invalid response (HTTP ${res.status}): ${text.substring(0, 150)}`);
            }
            if (!result.success) throw new Error(result.error);
            setSaveMsg('Saved successfully!');
            setTimeout(() => setSaveMsg(''), 2500);
        } catch (err) {
            setSaveMsg('Save failed: ' + err.message);
            // Optionally alert if you want it more visible: alert('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const formatTime = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h < 12 ? 'am' : 'pm';
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${hour}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
    };

    // --- Templates Management ---
    const handleSaveTemplate = () => {
        if (!templateForm.name || !templateForm.startTime || !templateForm.endTime) {
            alert('Please fill all fields');
            return;
        }

        let updatedTemplates;
        if (editingTemplate) {
            updatedTemplates = config.templates.map(t => t.id === editingTemplate.id ? { ...t, ...templateForm } : t);
        } else {
            const newId = `t_${Date.now()}`;
            updatedTemplates = [...config.templates, { id: newId, ...templateForm }];
        }

        const newConfig = { ...config, templates: updatedTemplates };
        setConfig(newConfig);
        saveConfig(newConfig);
        setShowTemplateForm(false);
        setEditingTemplate(null);
    };

    const handleDeleteTemplate = (id) => {
        if (!confirm('Delete this template? It will be removed from all weekly schedules.')) return;
        
        const updatedTemplates = config.templates.filter(t => t.id !== id);
        
        // Remove from schedules
        const updatedSchedule = { ...config.defaultWeeklySchedule };
        Object.keys(updatedSchedule).forEach(day => {
            updatedSchedule[day] = updatedSchedule[day].filter(s => s.templateId !== id);
        });

        const newConfig = { ...config, templates: updatedTemplates, defaultWeeklySchedule: updatedSchedule };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    // --- Weekly Schedule Management ---
    const handleAssignSlot = () => {
        if (!assignmentForm.templateId) {
            alert('Please select a template');
            return;
        }

        const schedule = { ...config.defaultWeeklySchedule };
        
        // Check if already assigned
        if (schedule[activeDay].some(s => s.templateId === assignmentForm.templateId)) {
            alert('This template is already assigned to ' + activeDay);
            return;
        }

        schedule[activeDay] = [...schedule[activeDay], { 
            templateId: assignmentForm.templateId, 
            maxBookings: assignmentForm.maxBookings 
        }];

        const newConfig = { ...config, defaultWeeklySchedule: schedule };
        setConfig(newConfig);
        saveConfig(newConfig);
        setAssignmentForm({ templateId: '', maxBookings: 4 });
    };

    const handleRemoveAssignment = (day, templateId) => {
        const schedule = { ...config.defaultWeeklySchedule };
        schedule[day] = schedule[day].filter(s => s.templateId !== templateId);
        
        const newConfig = { ...config, defaultWeeklySchedule: schedule };
        setConfig(newConfig);
        saveConfig(newConfig);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px' }}>
                <Loader className="spin" size={32} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>Booking Slots Engine</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Define reusable time slot templates and assign them to weekly schedules.
                    </p>
                </div>
                {saveMsg && (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: saveMsg.includes('failed') ? 'var(--color-danger)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> {saveMsg}
                    </span>
                )}
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Panel: Templates */}
                <div style={{ width: '350px', borderRight: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} /> Slot Templates
                        </h4>
                        <button className="btn btn-secondary" onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', startTime: '09:00', endTime: '12:00' }); setShowTemplateForm(true); }} style={{ padding: '4px 8px' }}>
                            <Plus size={14} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {config.templates.length === 0 ? (
                            <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: '20px 0' }}>
                                No templates created yet.
                            </div>
                        ) : (
                            config.templates.map(t => (
                                <div key={t.id} style={{ backgroundColor: 'var(--bg-primary)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{t.name}</div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                            {formatTime(t.startTime)} - {formatTime(t.endTime)}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button className="btn btn-secondary" onClick={() => handleDeleteTemplate(t.id)} style={{ padding: '4px', color: 'var(--color-danger)' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Panel: Weekly Schedule / Overrides */}
                <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h4 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={18} /> Schedule Management
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                Manage default schedules or date-specific overrides.
                            </p>
                        </div>
                        <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
                            <button onClick={() => setRightPanelTab('weekly')} style={{ padding: '4px 12px', fontSize: '13px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: rightPanelTab === 'weekly' ? 'var(--bg-elevated)' : 'transparent', color: rightPanelTab === 'weekly' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: rightPanelTab === 'weekly' ? 'var(--shadow-sm)' : 'none' }}>Weekly Schedule</button>
                            <button onClick={() => setRightPanelTab('overrides')} style={{ padding: '4px 12px', fontSize: '13px', border: 'none', borderRadius: '4px', cursor: 'pointer', background: rightPanelTab === 'overrides' ? 'var(--bg-elevated)' : 'transparent', color: rightPanelTab === 'overrides' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: rightPanelTab === 'overrides' ? 'var(--shadow-sm)' : 'none' }}>Specific Dates</button>
                        </div>
                    </div>

                    {rightPanelTab === 'weekly' && (
                        <>
                            {/* Day Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                        {DAYS.map(day => (
                            <button 
                                key={day.id} 
                                onClick={() => setActiveDay(day.id)}
                                style={{ 
                                    flex: 1, padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer',
                                    fontWeight: activeDay === day.id ? 600 : 400,
                                    color: activeDay === day.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                                    borderBottom: activeDay === day.id ? '2px solid var(--color-primary)' : '2px solid transparent'
                                }}
                            >
                                {day.label.slice(0, 3)}
                            </button>
                        ))}
                    </div>

                    {/* Schedule Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                        <h2 style={{ margin: '0 0 var(--spacing-md) 0', textTransform: 'capitalize' }}>{activeDay}</h2>
                        
                        {/* Assigment Form */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>Template</label>
                                <select className="form-input" style={{ width: '100%' }} value={assignmentForm.templateId} onChange={e => setAssignmentForm({ ...assignmentForm, templateId: e.target.value })}>
                                    <option value="">-- Select Template --</option>
                                    {config.templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({formatTime(t.startTime)} - {formatTime(t.endTime)})</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>Max Bookings</label>
                                <input type="number" className="form-input" style={{ width: '100%' }} min={1} value={assignmentForm.maxBookings} onChange={e => setAssignmentForm({ ...assignmentForm, maxBookings: parseInt(e.target.value) || 1 })} />
                            </div>
                            <button className="btn btn-primary" onClick={handleAssignSlot} style={{ height: '40px' }}>
                                Add
                            </button>
                        </div>

                        {/* Assigned Slots */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {config.defaultWeeklySchedule[activeDay]?.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                    No slots assigned for {activeDay}. System will show NO SLOTS available on this day.
                                </div>
                            ) : (
                                config.defaultWeeklySchedule[activeDay]?.map((assignment) => {
                                    const template = config.templates.find(t => t.id === assignment.templateId);
                                    if (!template) return null; // Corrupted data protection
                                    return (
                                        <div key={assignment.templateId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{template.name}</div>
                                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                    {formatTime(template.startTime)} to {formatTime(template.endTime)}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Capacity</div>
                                                    <div style={{ fontWeight: 600 }}>{assignment.maxBookings}</div>
                                                </div>
                                                <button className="btn btn-secondary" onClick={() => handleRemoveAssignment(activeDay, assignment.templateId)} style={{ color: 'var(--color-danger)' }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                        </>
                    )}

                    {rightPanelTab === 'overrides' && (
                        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)' }}>
                            <h2 style={{ margin: '0 0 var(--spacing-sm) 0' }}>Specific Date Overrides</h2>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
                                Define custom slots for a specific date (e.g. holidays or restricted capacity). This fully overrides the weekly schedule for that date.
                            </p>

                            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={overrideDate}
                                    onChange={e => setOverrideDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    style={{ width: '200px' }}
                                />
                            </div>

                            {overrideDate ? (
                                <div>
                                    {/* Assignment Form for the date */}
                                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>Template</label>
                                            <select className="form-input" style={{ width: '100%' }} id="override-template">
                                                <option value="">-- Select Template --</option>
                                                {config.templates.map(t => (
                                                    <option key={t.id} value={t.id}>{t.name} ({formatTime(t.startTime)} - {formatTime(t.endTime)})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: '4px' }}>Max Bookings</label>
                                            <input type="number" className="form-input" style={{ width: '100%' }} id="override-max" defaultValue={4} min={1} />
                                        </div>
                                        <button className="btn btn-primary" style={{ height: '40px' }} onClick={() => {
                                            const tId = document.getElementById('override-template').value;
                                            const maxB = parseInt(document.getElementById('override-max').value) || 4;
                                            if (!tId) return alert('Select a template first.');
                                            
                                            const currentOverrides = config.overrides || {};
                                            const dateSlots = currentOverrides[overrideDate] || [];
                                            if (dateSlots.some(s => s.templateId === tId)) {
                                                return alert('This template is already assigned to this date.');
                                            }
                                            
                                            const newOverrides = { ...currentOverrides, [overrideDate]: [...dateSlots, { templateId: tId, maxBookings: maxB }] };
                                            const newConfig = { ...config, overrides: newOverrides };
                                            setConfig(newConfig);
                                            saveConfig(newConfig);
                                        }}>
                                            Add
                                        </button>
                                    </div>

                                    {/* Assigned Overrides */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                        {!config.overrides || !config.overrides[overrideDate] || config.overrides[overrideDate].length === 0 ? (
                                            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                                No specific slots assigned. The default weekly schedule will be used.
                                            </div>
                                        ) : (
                                            config.overrides[overrideDate].map((assignment) => {
                                                const template = config.templates.find(t => t.id === assignment.templateId);
                                                if (!template) return null;
                                                return (
                                                    <div key={assignment.templateId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{template.name}</div>
                                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                                {formatTime(template.startTime)} to {formatTime(template.endTime)}
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Capacity</div>
                                                                <div style={{ fontWeight: 600 }}>{assignment.maxBookings}</div>
                                                            </div>
                                                            <button className="btn btn-secondary" style={{ color: 'var(--color-danger)' }} onClick={() => {
                                                                const newOverrides = { ...config.overrides };
                                                                newOverrides[overrideDate] = newOverrides[overrideDate].filter(s => s.templateId !== assignment.templateId);
                                                                if (newOverrides[overrideDate].length === 0) delete newOverrides[overrideDate];
                                                                const newConfig = { ...config, overrides: newOverrides };
                                                                setConfig(newConfig);
                                                                saveConfig(newConfig);
                                                            }}>
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px 20px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    Please select a date above to manage its slots.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Template Form Modal */}
            {showTemplateForm && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--spacing-md)' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '100%', boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
                        <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Create Template</h3>
                            <button onClick={() => setShowTemplateForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
                        </div>
                        <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '6px' }}>Slot Name (e.g. Morning Slot)</label>
                                <input type="text" className="form-input" style={{ width: '100%' }} value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '6px' }}>Start Time</label>
                                    <input type="time" className="form-input" style={{ width: '100%' }} value={templateForm.startTime} onChange={e => setTemplateForm({ ...templateForm, startTime: e.target.value })} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '6px' }}>End Time</label>
                                    <input type="time" className="form-input" style={{ width: '100%' }} value={templateForm.endTime} onChange={e => setTemplateForm({ ...templateForm, endTime: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                <button className="btn btn-primary" onClick={handleSaveTemplate} style={{ flex: 1 }}>Save Template</button>
                                <button className="btn btn-secondary" onClick={() => setShowTemplateForm(false)} style={{ flex: 1 }}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
