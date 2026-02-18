'use client'

import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Edit2, Save, X, MapPin, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI, websiteLocationsAPI } from '@/lib/adminAPI';

function FooterLocationsSettings() {
    const [headOffice, setHeadOffice] = useState({
        name: '',
        address: '',
        area: '',
        city: '',
        pincode: '',
        phone: ''
    });

    const [otherLocations, setOtherLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [locationsData, headOfficeData] = await Promise.all([
                websiteLocationsAPI.getAll({ footer: true }),
                websiteSettingsAPI.getByKey('footer-head-office')
            ]);

            if (locationsData) {
                setOtherLocations(locationsData.filter(l => !l.is_head_office).map(l => ({
                    id: l.id,
                    name: l.name,
                    address: l.address || '',
                    phone: l.phone || ''
                })));
            }

            if (headOfficeData && headOfficeData.value) {
                setHeadOffice(headOfficeData.value);
            } else {
                setHeadOffice({
                    name: 'Head Office',
                    address: '',
                    area: '',
                    city: '',
                    pincode: '',
                    phone: ''
                });
            }
        } catch (err) {
            console.error('Failed to fetch footer locations:', err);
        } finally {
            setLoading(false);
        }
    };

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

    const handleDeleteLocation = async (id) => {
        if (confirm('Are you sure you want to delete this location?')) {
            try {
                await websiteLocationsAPI.update(id, { display_in_footer: false });
                setOtherLocations(otherLocations.filter(loc => loc.id !== id));
            } catch (error) {
                console.error('Error deleting location:', error);
                alert('Failed to delete location');
            }
        }
    };

    const handleAddLocation = async () => {
        if (newLocation.name.trim()) {
            try {
                const added = await websiteLocationsAPI.create({
                    name: newLocation.name.trim(),
                    address: newLocation.address,
                    phone: newLocation.phone,
                    display_in_footer: true,
                    type: 'Office'
                });

                if (added) {
                    setOtherLocations([...otherLocations, {
                        id: added.id,
                        name: added.name,
                        address: added.address,
                        phone: added.phone
                    }]);
                    setNewLocation({ name: '', address: '', phone: '+91-8928895590' });
                    setShowAddForm(false);
                }
            } catch (error) {
                console.error('Error adding location:', error);
                alert('Failed to add location');
            }
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            // Save Head Office to generic settings
            // Other locations are already updated in real-time or via reconcile
            // Re-syncing other locations to ensure all edits are saved
            const updatePromises = otherLocations.map(loc =>
                websiteLocationsAPI.update(loc.id, {
                    name: loc.name,
                    address: loc.address,
                    phone: loc.phone
                })
            );

            await Promise.all([
                ...updatePromises,
                websiteSettingsAPI.save('footer-head-office', headOffice, 'Head office location details')
            ]);

            alert('Footer settings saved successfully!');
        } catch (err) {
            console.error('Failed to save footer settings:', err);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                            Footer Office Locations
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Manage head office and other office locations displayed in the footer
                        </p>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={fetchSettings}
                        disabled={loading}
                        style={{ padding: '6px 12px' }}
                    >
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} />
                    </button>
                </div>
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
                    {loading ? (
                        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                            <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md) auto', display: 'block' }} />
                            <p style={{ color: 'var(--text-secondary)' }}>Loading locations...</p>
                        </div>
                    ) : (
                        otherLocations.map((location) => (
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
                        ))
                    )}
                </div>
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                <button
                    onClick={handleSaveAll}
                    disabled={saving || loading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>
        </div>
    );
}

export default FooterLocationsSettings;
