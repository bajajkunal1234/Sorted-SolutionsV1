'use client'

import { useState, useEffect } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, Calendar, Loader, X, Check } from 'lucide-react';

const DAYS = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
];

const EMPTY_FORM = { day: 'monday', startTime: '09:00', endTime: '12:00', label: '', maxBookings: 4, active: true };

function BookingSlots() {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const [editingSlot, setEditingSlot] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(EMPTY_FORM);

    useEffect(() => { loadSlots(); }, []);

    const loadSlots = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/booking-slots');
            const data = await res.json();
            if (data.success) setSlots(data.data || []);
        } catch (err) {
            console.error('Error loading slots:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveSlots = async (newSlots) => {
        setSaving(true);
        setSaveMsg('');
        try {
            const res = await fetch('/api/settings/booking-slots', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slots: newSlots })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            setSaveMsg('Saved!');
            setTimeout(() => setSaveMsg(''), 2500);
        } catch (err) {
            setSaveMsg('Save failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const buildLabel = (fd) =>
        fd.label.trim() ||
        `${formatTime(fd.startTime)} – ${formatTime(fd.endTime)}`;

    const formatTime = (t) => {
        if (!t) return '';
        const [h, m] = t.split(':').map(Number);
        const ampm = h < 12 ? 'am' : 'pm';
        const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${hour}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
    };

    const handleAdd = () => {
        const newSlot = { id: `s${Date.now()}`, ...formData, label: buildLabel(formData) };
        const updated = [...slots, newSlot];
        setSlots(updated);
        saveSlots(updated);
        setShowForm(false);
        setFormData(EMPTY_FORM);
    };

    const handleUpdate = () => {
        const updated = slots.map(s => s.id === editingSlot.id
            ? { ...s, ...formData, label: buildLabel(formData) }
            : s);
        setSlots(updated);
        saveSlots(updated);
        setEditingSlot(null);
        setFormData(EMPTY_FORM);
    };

    const handleEdit = (slot) => {
        setEditingSlot(slot);
        setFormData({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime, label: slot.label || '', maxBookings: slot.maxBookings, active: slot.active });
        setShowForm(false);
    };

    const handleDelete = (slotId) => {
        if (!confirm('Delete this time slot?')) return;
        const updated = slots.filter(s => s.id !== slotId);
        setSlots(updated);
        saveSlots(updated);
    };

    const handleToggle = (slotId) => {
        const updated = slots.map(s => s.id === slotId ? { ...s, active: !s.active } : s);
        setSlots(updated);
        saveSlots(updated);
    };

    const groupedSlots = DAYS.reduce((acc, day) => {
        acc[day.id] = slots.filter(s => s.day === day.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return acc;
    }, {});

    const totalActive = slots.filter(s => s.active).length;
    const totalCap = slots.filter(s => s.active).reduce((sum, s) => sum + (s.maxBookings || 0), 0);

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
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>Booking Slots Management</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure available time slots — toggle off when full, add or remove anytime
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    {saveMsg && (
                        <span style={{ fontSize: 'var(--font-size-sm)', color: saveMsg.startsWith('Save failed') ? 'var(--color-danger)' : 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Check size={14} /> {saveMsg}
                        </span>
                    )}
                    <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingSlot(null); setFormData(EMPTY_FORM); }} style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}>
                        <Plus size={16} /> Add Time Slot
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
                {[
                    { label: 'Active Slots', value: totalActive, color: 'var(--color-success)' },
                    { label: 'Total Capacity / Week', value: totalCap, color: 'var(--color-primary)' },
                    { label: 'Avg per Slot', value: totalActive > 0 ? Math.round(totalCap / totalActive) : 0, color: '' },
                ].map(stat => (
                    <div key={stat.label} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>{stat.label}</div>
                        <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: stat.color || 'inherit' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Slots by Day */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {DAYS.map(day => {
                        const daySlots = groupedSlots[day.id];
                        return (
                            <div key={day.id}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Calendar size={16} /> {day.label}
                                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                                        {daySlots.filter(s => s.active).length} active
                                    </span>
                                </h4>

                                {daySlots.length === 0 ? (
                                    <div style={{ padding: 'var(--spacing-sm)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', fontStyle: 'italic' }}>No slots configured for {day.label}</div>
                                ) : (
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        {daySlots.map(slot => (
                                            <div key={slot.id} style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: slot.active ? 1 : 0.5, transition: 'all var(--transition-fast)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                                    <Clock size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                                                    <div>
                                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
                                                            {slot.label || `${slot.startTime} – ${slot.endTime}`}
                                                        </div>
                                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                                            {slot.startTime} – {slot.endTime} · Max {slot.maxBookings} bookings
                                                            {!slot.active && <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>● Off</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                                                    <button className="btn btn-secondary" onClick={() => handleToggle(slot.id)} style={{ padding: '5px 10px', fontSize: 'var(--font-size-xs)', backgroundColor: slot.active ? '#f59e0b20' : '#10b98120', color: slot.active ? '#d97706' : '#10b981', border: `1px solid ${slot.active ? '#f59e0b' : '#10b981'}` }}>
                                                        {slot.active ? 'Mark Full' : 'Re-enable'}
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => handleEdit(slot)} style={{ padding: '5px 10px', fontSize: 'var(--font-size-xs)' }}>
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="btn btn-secondary" onClick={() => handleDelete(slot.id)} style={{ padding: '5px 10px', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Add / Edit Modal */}
            {(showForm || editingSlot) && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--spacing-md)' }}>
                    <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', maxWidth: '480px', width: '100%', boxShadow: 'var(--shadow-xl)' }}>
                        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontWeight: 600 }}>{editingSlot ? 'Edit' : 'Add'} Time Slot</h3>
                            <button onClick={() => { setShowForm(false); setEditingSlot(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>

                        <div style={{ padding: 'var(--spacing-lg)', display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Day of Week *</label>
                                <select className="form-input" style={{ width: '100%' }} value={formData.day} onChange={e => setFormData({ ...formData, day: e.target.value })}>
                                    {DAYS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Start Time *</label>
                                    <input type="time" className="form-input" style={{ width: '100%' }} value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>End Time *</label>
                                    <input type="time" className="form-input" style={{ width: '100%' }} value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>
                                    Display Label <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>(optional — auto-generated if blank)</span>
                                </label>
                                <input type="text" className="form-input" style={{ width: '100%' }} placeholder="e.g. Morning, Evening Rush Hour…" value={formData.label} onChange={e => setFormData({ ...formData, label: e.target.value })} />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontWeight: 500, fontSize: 'var(--font-size-sm)', marginBottom: '4px' }}>Max Bookings per Slot *</label>
                                <input type="number" className="form-input" style={{ width: '100%' }} min={1} max={50} value={formData.maxBookings} onChange={e => setFormData({ ...formData, maxBookings: parseInt(e.target.value) || 1 })} />
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>How many jobs can be taken in this window</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                <input type="checkbox" id="slot-active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                                <label htmlFor="slot-active" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>Active (visible to customers)</label>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                                <button className="btn btn-primary" onClick={editingSlot ? handleUpdate : handleAdd} style={{ flex: 1, padding: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <Save size={16} /> {editingSlot ? 'Update' : 'Add'} Slot
                                </button>
                                <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingSlot(null); setFormData(EMPTY_FORM); }} style={{ padding: 'var(--spacing-sm)' }}>
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

export default BookingSlots;
