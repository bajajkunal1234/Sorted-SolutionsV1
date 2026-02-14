'use client'

import { useState } from 'react';
import { Building2, Plus, Trash2, Edit2, Save, X, MapPin } from 'lucide-react';

function FooterLocationsSettings() {
    const [headOffice, setHeadOffice] = useState({
        name: 'Head Office',
        address: 'A138 Orchard Mall, Royal Palms',
        area: 'Goregaon East',
        city: 'Mumbai',
        pincode: '400063',
        phone: '+91-8928895590'
    });

    const [otherLocations, setOtherLocations] = useState([
        { id: 1, name: 'Andheri', address: '', phone: '+91-8928895590' },
        { id: 2, name: 'Dadar', address: '', phone: '+91-8928895590' },
        { id: 3, name: 'Ghatkopar', address: '', phone: '+91-8928895590' },
        { id: 4, name: 'Mumbai Central', address: '', phone: '+91-8928895590' },
        { id: 5, name: 'Kurla', address: '', phone: '+91-8928895590' },
        { id: 6, name: 'Parel', address: '', phone: '+91-8928895590' }
    ]);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newLocation, setNewLocation] = useState({
        name: '',
        address: '',
        phone: '+91-8928895590'
    });

    const handleEditLocation = (location) => {
        setEditingId(location.id);
        setEditForm({ ...location });
    };

    const handleSaveEdit = () => {
        setOtherLocations(otherLocations.map(loc =>
            loc.id === editingId ? editForm : loc
        ));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDeleteLocation = (id) => {
        if (confirm('Are you sure you want to delete this location?')) {
            setOtherLocations(otherLocations.filter(loc => loc.id !== id));
        }
    };

    const handleAddLocation = () => {
        if (newLocation.name.trim()) {
            const newId = Math.max(...otherLocations.map(l => l.id), 0) + 1;
            setOtherLocations([...otherLocations, { ...newLocation, id: newId }]);
            setNewLocation({ name: '', address: '', phone: '+91-8928895590' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = () => {
        // TODO: Save to backend
        alert('Footer locations saved successfully!');
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Footer Office Locations
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage head office and other office locations displayed in the footer
                </p>
            </div>

            {/* Head Office */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid #3b82f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <Building2 size={24} style={{ color: '#3b82f6' }} />
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Head Office
                    </h4>
                </div>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Office Name
                        </label>
                        <input
                            type="text"
                            value={headOffice.name}
                            onChange={(e) => setHeadOffice({ ...headOffice, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Address
                            </label>
                            <input
                                type="text"
                                value={headOffice.address}
                                onChange={(e) => setHeadOffice({ ...headOffice, address: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Area
                            </label>
                            <input
                                type="text"
                                value={headOffice.area}
                                onChange={(e) => setHeadOffice({ ...headOffice, area: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                City
                            </label>
                            <input
                                type="text"
                                value={headOffice.city}
                                onChange={(e) => setHeadOffice({ ...headOffice, city: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Pincode
                            </label>
                            <input
                                type="text"
                                value={headOffice.pincode}
                                onChange={(e) => setHeadOffice({ ...headOffice, pincode: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Phone
                            </label>
                            <input
                                type="text"
                                value={headOffice.phone}
                                onChange={(e) => setHeadOffice({ ...headOffice, phone: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Other Locations */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                        Other Office Locations ({otherLocations.length})
                    </h4>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '6px 12px' }}
                        >
                            <Plus size={16} />
                            Add Location
                        </button>
                    )}
                </div>

                {/* Add Location Form */}
                {showAddForm && (
                    <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                        <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Add New Location
                        </h5>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Location Name *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Bandra"
                                    value={newLocation.name}
                                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Address (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Full address"
                                    value={newLocation.address}
                                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Phone
                                </label>
                                <input
                                    type="text"
                                    value={newLocation.phone}
                                    onChange={(e) => setNewLocation({ ...newLocation, phone: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                            <button
                                onClick={handleAddLocation}
                                className="btn btn-primary"
                                disabled={!newLocation.name.trim()}
                            >
                                <Save size={16} />
                                Add Location
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewLocation({ name: '', address: '', phone: '+91-8928895590' });
                                }}
                                className="btn btn-secondary"
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Locations List */}
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                    {otherLocations.map((location) => (
                        <div
                            key={location.id}
                            className="card"
                            style={{
                                padding: 'var(--spacing-md)',
                                border: editingId === location.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                            }}
                        >
                            {editingId === location.id ? (
                                // Edit Mode
                                <div>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Location Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Address
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.address}
                                                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Phone
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.phone}
                                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                        <button onClick={handleSaveEdit} className="btn btn-primary" style={{ padding: '6px 12px' }}>
                                            <Save size={14} />
                                            Save
                                        </button>
                                        <button onClick={handleCancelEdit} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
                                            <X size={14} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b98115',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <MapPin size={20} style={{ color: '#10b981' }} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: '2px' }}>
                                            {location.name}
                                        </div>
                                        {location.address && (
                                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                                {location.address}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                                            {location.phone}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            onClick={() => handleEditLocation(location)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLocation(location.id)}
                                            className="btn btn-danger"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    onClick={handleSaveAll}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    <Save size={18} />
                    Save All Changes
                </button>
            </div>
        </div>
    );
}

export default FooterLocationsSettings;





