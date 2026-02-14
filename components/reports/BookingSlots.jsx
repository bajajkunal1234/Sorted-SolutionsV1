'use client'

import { useState } from 'react';
import { Clock, Plus, Edit2, Trash2, Save, Calendar } from 'lucide-react';

function BookingSlots() {
    const [slots, setSlots] = useState([
        { id: 's1', day: 'monday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true },
        { id: 's2', day: 'monday', startTime: '14:00', endTime: '18:00', maxBookings: 6, active: true },
        { id: 's3', day: 'tuesday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true },
        { id: 's4', day: 'tuesday', startTime: '14:00', endTime: '18:00', maxBookings: 6, active: true },
        { id: 's5', day: 'wednesday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true },
        { id: 's6', day: 'wednesday', startTime: '14:00', endTime: '18:00', maxBookings: 6, active: true },
        { id: 's7', day: 'thursday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true },
        { id: 's8', day: 'thursday', startTime: '14:00', endTime: '18:00', maxBookings: 6, active: true },
        { id: 's9', day: 'friday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true },
        { id: 's10', day: 'friday', startTime: '14:00', endTime: '18:00', maxBookings: 6, active: true },
        { id: 's11', day: 'saturday', startTime: '09:00', endTime: '13:00', maxBookings: 3, active: true }
    ]);

    const [editingSlot, setEditingSlot] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        day: 'monday',
        startTime: '09:00',
        endTime: '12:00',
        maxBookings: 4,
        active: true
    });

    const days = [
        { id: 'monday', label: 'Monday' },
        { id: 'tuesday', label: 'Tuesday' },
        { id: 'wednesday', label: 'Wednesday' },
        { id: 'thursday', label: 'Thursday' },
        { id: 'friday', label: 'Friday' },
        { id: 'saturday', label: 'Saturday' },
        { id: 'sunday', label: 'Sunday' }
    ];

    const handleAdd = () => {
        const newSlot = {
            id: `s${Date.now()}`,
            ...formData
        };
        setSlots([...slots, newSlot]);
        setShowForm(false);
        setFormData({ day: 'monday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true });
    };

    const handleUpdate = () => {
        setSlots(slots.map(s => s.id === editingSlot.id ? { ...editingSlot, ...formData } : s));
        setEditingSlot(null);
        setFormData({ day: 'monday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true });
    };

    const handleEdit = (slot) => {
        setEditingSlot(slot);
        setFormData({
            day: slot.day,
            startTime: slot.startTime,
            endTime: slot.endTime,
            maxBookings: slot.maxBookings,
            active: slot.active
        });
    };

    const handleDelete = (slotId) => {
        if (confirm('Are you sure you want to delete this time slot?')) {
            setSlots(slots.filter(s => s.id !== slotId));
        }
    };

    const handleToggleActive = (slotId) => {
        setSlots(slots.map(s => s.id === slotId ? { ...s, active: !s.active } : s));
    };

    const getDayLabel = (dayId) => {
        return days.find(d => d.id === dayId)?.label || dayId;
    };

    const groupedSlots = days.reduce((acc, day) => {
        acc[day.id] = slots.filter(s => s.day === day.id).sort((a, b) => a.startTime.localeCompare(b.startTime));
        return acc;
    }, {});

    const totalActiveSlots = slots.filter(s => s.active).length;
    const totalCapacity = slots.filter(s => s.active).reduce((sum, s) => sum + s.maxBookings, 0);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--spacing-md)'
            }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0, marginBottom: '4px' }}>
                        Booking Slots Management
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure available time slots for customer bookings
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowForm(true)}
                    style={{ padding: '6px 16px', fontSize: 'var(--font-size-sm)' }}
                >
                    <Plus size={16} />
                    Add Time Slot
                </button>
            </div>

            {/* Stats */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Active Slots
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-success)' }}>
                        {totalActiveSlots}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Total Capacity/Week
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {totalCapacity}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginBottom: '4px' }}>
                        Avg Capacity/Slot
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                        {totalActiveSlots > 0 ? Math.round(totalCapacity / totalActiveSlots) : 0}
                    </div>
                </div>
            </div>

            {/* Slots by Day */}
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--spacing-md)' }}>
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {days.map(day => {
                        const daySlots = groupedSlots[day.id];
                        if (daySlots.length === 0) return null;

                        return (
                            <div key={day.id}>
                                <h4 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    marginBottom: 'var(--spacing-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-xs)'
                                }}>
                                    <Calendar size={16} />
                                    {day.label}
                                    <span style={{
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 500,
                                        color: 'var(--text-tertiary)',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-sm)'
                                    }}>
                                        {daySlots.filter(s => s.active).length} active
                                    </span>
                                </h4>

                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    {daySlots.map(slot => (
                                        <div
                                            key={slot.id}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                opacity: slot.active ? 1 : 0.5,
                                                transition: 'all var(--transition-fast)'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                                <Clock size={20} style={{ color: 'var(--color-primary)' }} />
                                                <div>
                                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, fontFamily: 'monospace' }}>
                                                        {slot.startTime} - {slot.endTime}
                                                    </div>
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                                        Max {slot.maxBookings} bookings
                                                        {!slot.active && <span style={{ color: 'var(--color-danger)', marginLeft: '8px' }}>● Inactive</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => handleToggleActive(slot.id)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: 'var(--font-size-xs)',
                                                        backgroundColor: slot.active ? 'var(--bg-tertiary)' : 'var(--color-success)',
                                                        color: slot.active ? 'var(--text-secondary)' : 'var(--text-inverse)'
                                                    }}
                                                >
                                                    {slot.active ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => handleEdit(slot)}
                                                    style={{ padding: '6px 10px', fontSize: 'var(--font-size-xs)' }}
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => handleDelete(slot.id)}
                                                    style={{ padding: '6px 10px', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {slots.length === 0 && (
                    <div style={{
                        padding: 'var(--spacing-2xl)',
                        textAlign: 'center',
                        color: 'var(--text-tertiary)'
                    }}>
                        No booking slots configured. Add your first slot to get started.
                    </div>
                )}
            </div>

            {/* Add/Edit Form Modal */}
            {(showForm || editingSlot) && (
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
                        maxWidth: '500px',
                        width: '100%'
                    }}>
                        <div style={{
                            padding: 'var(--spacing-lg)',
                            borderBottom: '1px solid var(--border-primary)'
                        }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                                {editingSlot ? 'Edit' : 'Add'} Time Slot
                            </h3>
                        </div>

                        <div style={{ padding: 'var(--spacing-lg)' }}>
                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Day of Week *
                                    </label>
                                    <select
                                        value={formData.day}
                                        onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    >
                                        {days.map(day => (
                                            <option key={day.id} value={day.id}>{day.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            Start Time *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                            End Time *
                                        </label>
                                        <input
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: '4px' }}>
                                        Max Bookings *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxBookings}
                                        onChange={(e) => setFormData({ ...formData, maxBookings: parseInt(e.target.value) || 1 })}
                                        min="1"
                                        max="20"
                                        className="form-input"
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                                        Maximum number of bookings allowed in this time slot
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="checkbox"
                                        id="active-checkbox"
                                        checked={formData.active}
                                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    <label htmlFor="active-checkbox" style={{ fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                                        Active (available for customer bookings)
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={editingSlot ? handleUpdate : handleAdd}
                                    style={{ flex: 1, padding: 'var(--spacing-sm)' }}
                                >
                                    <Save size={16} />
                                    {editingSlot ? 'Update' : 'Add'} Slot
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingSlot(null);
                                        setFormData({ day: 'monday', startTime: '09:00', endTime: '12:00', maxBookings: 4, active: true });
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

export default BookingSlots;





