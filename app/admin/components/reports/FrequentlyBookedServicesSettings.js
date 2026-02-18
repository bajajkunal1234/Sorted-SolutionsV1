'use client'

import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, Save, X, Upload, Tag, Loader2, RefreshCcw } from 'lucide-react';
import { websiteFrequentlyBookedAPI, websiteSettingsAPI } from '@/lib/adminAPI';

function FrequentlyBookedServicesSettings() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [displaySettings, setDisplaySettings] = useState({
        sectionTitle: 'Frequently Booked Appliance Repairs',
        sectionDescription: 'Quick solutions for common appliance problems. Same day service available across Mumbai.'
    });
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [data, configData] = await Promise.all([
                websiteFrequentlyBookedAPI.getAll(),
                websiteSettingsAPI.getByKey('frequently-booked-config')
            ]);

            if (data) {
                setServices(data || []);
            }
            if (configData && configData.value) {
                setDisplaySettings({
                    sectionTitle: configData.value.sectionTitle || 'Frequently Booked Appliance Repairs',
                    sectionDescription: configData.value.sectionDescription || 'Quick solutions for common appliance problems. Same day service available across Mumbai.'
                });
            }
        } catch (err) {
            console.error('Failed to fetch frequent services:', err);
        } finally {
            setLoading(false);
        }
    };
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newService, setNewService] = useState({
        title: '',
        keywords: '',
        url: '',
        badge: '',
        badgeColor: '#10b981'
    });

    const badgeOptions = [
        { label: 'None', value: null, color: null },
        { label: 'Popular', value: 'Popular', color: '#10b981' },
        { label: 'Seasonal', value: 'Seasonal', color: '#f59e0b' },
        { label: 'Emergency', value: 'Emergency', color: '#ef4444' },
        { label: 'New', value: 'New', color: '#3b82f6' }
    ];

    const handleEdit = (service) => {
        setEditingId(service.id);
        setEditForm({ ...service });
    };

    const handleSaveEdit = () => {
        setServices(services.map(s => s.id === editingId ? editForm : s));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this service?')) {
            setServices(services.filter(s => s.id !== id));
        }
    };

    const handleAddService = () => {
        if (newService.title && newService.url) {
            const newId = Math.max(...services.map(s => s.id), 0) + 1;
            setServices([...services, { ...newService, id: newId }]);
            setNewService({ title: '', keywords: '', url: '', badge: '', badgeColor: '#10b981' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            await Promise.all([
                websiteFrequentlyBookedAPI.saveAll(services),
                websiteSettingsAPI.save('frequently-booked-config', displaySettings, 'Display config for Frequently Booked Services section')
            ]);
            alert('Services saved successfully!');
        } catch (err) {
            console.error('Failed to save frequent services:', err);
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
                            Frequently Booked Services
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Manage seasonal services displayed on the homepage
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

            {/* Add New Service Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} />
                    Add New Service
                </button>
            )}

            {/* Add Service Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Add New Service
                    </h4>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Service Title *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., AC Cleaning & Service"
                                value={newService.title}
                                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
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
                                SEO Keywords
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Air conditioner cleaning Mumbai"
                                value={newService.keywords}
                                onChange={(e) => setNewService({ ...newService, keywords: e.target.value })}
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
                                Service URL *
                            </label>
                            <input
                                type="text"
                                placeholder="/services/ac-cleaning"
                                value={newService.url}
                                onChange={(e) => setNewService({ ...newService, url: e.target.value })}
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
                                Badge (Optional)
                            </label>
                            <select
                                value={newService.badge || ''}
                                onChange={(e) => {
                                    const selected = badgeOptions.find(b => b.value === e.target.value);
                                    setNewService({
                                        ...newService,
                                        badge: selected?.value || null,
                                        badgeColor: selected?.color || null
                                    });
                                }}
                                style={{
                                    width: '100%',
                                    padding: 'var(--spacing-sm)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)'
                                }}
                            >
                                {badgeOptions.map(option => (
                                    <option key={option.label} value={option.value || ''}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                        <button
                            onClick={handleAddService}
                            className="btn btn-primary"
                            disabled={!newService.title || !newService.url}
                        >
                            <Save size={16} />
                            Add Service
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewService({ title: '', keywords: '', url: '', badge: '', badgeColor: '#10b981' });
                            }}
                            className="btn btn-secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Services List */}
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                {loading ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                        <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md) auto', display: 'block' }} />
                        <p style={{ color: 'var(--text-secondary)' }}>Loading services...</p>
                    </div>
                ) : services.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)' }}>
                        <p style={{ color: 'var(--text-secondary)' }}>No services found. Add one above.</p>
                    </div>
                ) : (
                    services.map((service) => (
                        <div
                            key={service.id}
                            className="card"
                            style={{
                                padding: 'var(--spacing-lg)',
                                border: editingId === service.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                            }}
                        >
                            {editingId === service.id ? (
                                // Edit Mode
                                <div>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Service Title
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
                                                SEO Keywords
                                            </label>
                                            <input
                                                type="text"
                                                value={editForm.keywords}
                                                onChange={(e) => setEditForm({ ...editForm, keywords: e.target.value })}
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
                                                Service URL
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

                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                                Badge
                                            </label>
                                            <select
                                                value={editForm.badge || ''}
                                                onChange={(e) => {
                                                    const selected = badgeOptions.find(b => b.value === e.target.value);
                                                    setEditForm({
                                                        ...editForm,
                                                        badge: selected?.value || null,
                                                        badgeColor: selected?.color || null
                                                    });
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            >
                                                {badgeOptions.map(option => (
                                                    <option key={option.label} value={option.value || ''}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
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
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: 'var(--radius-md)',
                                        backgroundColor: '#3b82f615',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Package size={24} style={{ color: '#3b82f6' }} />
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                {service.title}
                                            </h4>
                                            {service.badge && (
                                                <span style={{
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    backgroundColor: service.badgeColor,
                                                    color: 'white',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {service.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-xs) 0', fontStyle: 'italic' }}>
                                            {service.keywords}
                                        </p>
                                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)', margin: 0 }}>
                                            URL: {service.url}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                        <button
                                            onClick={() => handleEdit(service)}
                                            className="btn btn-secondary"
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service.id)}
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

export default FrequentlyBookedServicesSettings;
