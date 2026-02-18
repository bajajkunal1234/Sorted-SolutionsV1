'use client'

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, GripVertical, Save, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI, websiteLocationsAPI } from '@/lib/adminAPI';

function HeaderLocations() {
    const [locations, setLocations] = useState([]);
    const [newLocation, setNewLocation] = useState('');
    const [rotationInterval, setRotationInterval] = useState(3);
    const [animationEnabled, setAnimationEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [locationsData, configData] = await Promise.all([
                websiteLocationsAPI.getAll({ header: true }),
                websiteSettingsAPI.getByKey('header-locations-config')
            ]);

            if (locationsData) {
                setLocations(locationsData.map(l => ({
                    id: l.id,
                    name: l.name,
                    order: l.header_order
                })));
            }

            if (configData && configData.value) {
                setRotationInterval(configData.value.rotationInterval || 3);
                setAnimationEnabled(configData.value.animationEnabled ?? true);
            }
        } catch (err) {
            console.error('Failed to fetch header locations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLocation = async () => {
        if (newLocation.trim()) {
            try {
                const added = await websiteLocationsAPI.create({
                    name: newLocation.trim(),
                    display_in_header: true,
                    header_order: locations.length + 1,
                    type: 'Service Area' // Default type
                });

                if (added) {
                    setLocations([...locations, {
                        id: added.id,
                        name: added.name,
                        order: added.header_order
                    }]);
                    setNewLocation('');
                }
            } catch (error) {
                console.error('Error adding location:', error);
                alert('Failed to add location');
            }
        }
    };

    const handleRemoveLocation = async (id) => {
        if (confirm('Are you sure you want to remove this location from header?')) {
            try {
                // We'll update it to not display in header instead of deleting
                await websiteLocationsAPI.update(id, { display_in_header: false });
                setLocations(locations.filter(l => l.id !== id));
            } catch (error) {
                console.error('Error removing location:', error);
                alert('Failed to remove location');
            }
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // Re-order locations
            const updatePromises = locations.map((loc, index) =>
                websiteLocationsAPI.update(loc.id, { header_order: index + 1 })
            );

            await Promise.all([
                ...updatePromises,
                websiteSettingsAPI.save('header-locations-config', {
                    rotationInterval,
                    animationEnabled
                }, 'Config for rotating header locations')
            ]);

            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Failed to save header locations:', err);
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
                            Homepage Header Locations
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Manage locations that rotate in the hero section headline
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

            {/* Animation Settings */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Animation Settings
                </h4>

                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Enable Animation
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={animationEnabled}
                                onChange={(e) => setAnimationEnabled(e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>
                                Rotate locations automatically
                            </span>
                        </label>
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                            Rotation Interval (seconds)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={rotationInterval}
                            onChange={(e) => setRotationInterval(parseInt(e.target.value))}
                            disabled={!animationEnabled}
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

            {/* Add New Location */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Add New Location
                </h4>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <input
                        type="text"
                        placeholder="Enter location name (e.g., Bandra)"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                        style={{
                            flex: 1,
                            padding: 'var(--spacing-sm)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)'
                        }}
                    />
                    <button
                        onClick={handleAddLocation}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '8px 16px' }}
                    >
                        <Plus size={18} />
                        Add
                    </button>
                </div>
            </div>

            {/* Locations List */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Current Locations ({locations.length})
                </h4>

                {locations.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-lg)' }}>
                        No locations added yet. Add your first location above.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {locations.map((location, index) => (
                            <div
                                key={location.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-md)',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)'
                                }}
                            >
                                <GripVertical size={18} style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} />

                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10b98115',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <MapPin size={16} style={{ color: '#10b981' }} />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 'var(--font-size-base)', fontWeight: 500 }}>
                                        {location.name}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Position {index + 1}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRemoveLocation(location.id)}
                                    className="btn btn-danger"
                                    style={{
                                        padding: '6px 12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-xs)'
                                    }}
                                >
                                    <Trash2 size={16} />
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}

export default HeaderLocations;
