'use client'

import { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Edit2, Save, X, GripVertical, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI, websiteWhyChooseUsAPI } from '@/lib/adminAPI';

function WhyChooseUsSettings() {
    const [features, setFeatures] = useState([]);
    const [horizontalScroll, setHorizontalScroll] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displaySettings, setDisplaySettings] = useState({
        sectionTitle: 'Why Choose Us?',
        sectionDescription: 'Experience the premium quality and reliability of our service network.'
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [featuresData, configData] = await Promise.all([
                websiteWhyChooseUsAPI.getAll(),
                websiteSettingsAPI.getByKey('why-choose-us-config')
            ]);

            if (featuresData) {
                setFeatures(featuresData);
            }
            if (configData && configData.value) {
                setHorizontalScroll(configData.value.horizontalScroll !== undefined ? configData.value.horizontalScroll : true);
                setDisplaySettings({
                    sectionTitle: configData.value.sectionTitle || 'Why Choose Us?',
                    sectionDescription: configData.value.sectionDescription || 'Experience the premium quality and reliability of our service network.'
                });
            }
        } catch (err) {
            console.error('Failed to fetch why choose us settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newFeature, setNewFeature] = useState({
        title: '',
        description: '',
        icon: '✨',
        url: ''
    });

    const iconOptions = ['⏰', '📋', '💳', '🏢', '🗺️', '📍', '📝', '⭐', '✨', '🔧', '🛡️', '💯', '🎯', '🚀', '💡', '🏆'];

    const handleEdit = (feature) => {
        setEditingId(feature.id);
        setEditForm({ ...feature });
    };

    const handleSaveEdit = () => {
        setFeatures(features.map(f => f.id === editingId ? editForm : f));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this feature?')) {
            setFeatures(features.filter(f => f.id !== id));
        }
    };

    const handleAddFeature = () => {
        if (newFeature.title && newFeature.description) {
            const newId = Math.max(...features.map(f => f.id), 0) + 1;
            setFeatures([...features, { ...newFeature, id: newId, order: features.length + 1 }]);
            setNewFeature({ title: '', description: '', icon: '✨', url: '' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            // Dedicated table for features
            // Generic table for simple display config
            await Promise.all([
                websiteWhyChooseUsAPI.saveAll(features),
                websiteSettingsAPI.save('why-choose-us-config', { ...displaySettings, horizontalScroll }, 'Display config for Why Choose Us section')
            ]);
            alert('Settings saved successfully!');
        } catch (err) {
            console.error('Failed to save why choose us settings:', err);
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
                            Why Choose Us Settings
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Manage feature cards that highlight your unique selling points
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

                <div className="card" style={{ padding: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Display Settings
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Section Title (on Homepage)
                            </label>
                            <input
                                type="text"
                                value={displaySettings.sectionTitle}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, sectionTitle: e.target.value })}
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
                                Section Description
                            </label>
                            <input
                                type="text"
                                value={displaySettings.sectionDescription}
                                onChange={(e) => setDisplaySettings({ ...displaySettings, sectionDescription: e.target.value })}
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

            {/* Display Options */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Display Options
                </h4>

                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={horizontalScroll}
                        onChange={(e) => setHorizontalScroll(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                        <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                            Enable Horizontal Scroll
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            Features will scroll horizontally on mobile devices
                        </div>
                    </div>
                </label>
            </div>

            {/* Add New Feature Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} />
                    Add New Feature
                </button>
            )}

            {/* Add Feature Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Add New Feature
                    </h4>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Feature Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., 24/7 Support"
                                value={newFeature.title}
                                onChange={(e) => setNewFeature({ ...newFeature, title: e.target.value })}
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
                                Description *
                            </label>
                            <textarea
                                placeholder="Brief description of this feature..."
                                value={newFeature.description}
                                onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Icon
                            </label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                {iconOptions.map(icon => (
                                    <button
                                        key={icon}
                                        onClick={() => setNewFeature({ ...newFeature, icon })}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            fontSize: '24px',
                                            border: newFeature.icon === icon ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: newFeature.icon === icon ? 'var(--color-primary)10' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Link URL (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="/features/real-time-tracking"
                                value={newFeature.url}
                                onChange={(e) => setNewFeature({ ...newFeature, url: e.target.value })}
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
                            onClick={handleAddFeature}
                            className="btn btn-primary"
                            disabled={!newFeature.title || !newFeature.description}
                        >
                            <Save size={16} />
                            Add Feature
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewFeature({ title: '', description: '', icon: '✨', url: '' });
                            }}
                            className="btn btn-secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Features List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                        <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md) auto', display: 'block' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Loading features...</p>
                    </div>
                ) : features.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No features found. Add one above.</p>
                    </div>
                ) : (
                    features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className="card"
                            style={{
                                padding: 'var(--spacing-lg)',
                                border: editingId === feature.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                            }}
                        >
                            {editingId === feature.id ? (
                                // Edit Mode
                                <div>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Feature Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.title}
                                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
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
                                                Description
                                            </label>
                                            <textarea
                                                value={editForm.description}
                                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                rows={2}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    resize: 'vertical'
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Icon
                                            </label>
                                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                                {iconOptions.map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setEditForm({ ...editForm, icon })}
                                                        style={{
                                                            width: '48px',
                                                            height: '48px',
                                                            fontSize: '24px',
                                                            border: editForm.icon === icon ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            backgroundColor: editForm.icon === icon ? 'var(--color-primary)10' : 'transparent',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Link URL
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.url}
                                                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
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
                                        <button onClick={handleSaveEdit} className="btn btn-primary">
                                            <Save size={16} />
                                            Save
                                        </button>
                                        <button onClick={handleCancelEdit} className="btn btn-secondary">
                                            <X size={16} />
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                                    <GripVertical size={18} style={{ color: 'var(--text-tertiary)', cursor: 'grab', marginTop: '4px' }} />

                                    <div style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: 'var(--radius-lg)',
                                        backgroundColor: '#ec489915',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '28px',
                                        flexShrink: 0
                                    }}>
                                        {feature.icon}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>
                                            {feature.title}
                                        </h4>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-xs) 0', lineHeight: 1.5 }}>
                                            {feature.description}
                                        </p>
                                        {feature.url && (
                                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', margin: 0, fontFamily: 'monospace' }}>
                                                URL: {feature.url}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            onClick={() => handleEdit(feature)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(feature.id)}
                                            className="btn btn-danger"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
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

export default WhyChooseUsSettings;
