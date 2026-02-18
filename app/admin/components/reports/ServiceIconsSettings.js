'use client'
import { useState, useEffect } from 'react';

import { Wrench, Plus, Trash2, Edit2, Save, X, ChevronDown, Loader2, RefreshCcw } from 'lucide-react';
import { websiteSettingsAPI } from '@/lib/adminAPI';

function ServiceIconsSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [serviceIcons, setServiceIcons] = useState([
        {
            id: 1,
            name: 'AC Repair',
            icon: '❄️',
            hoverDropdown: true,
            dropdownItems: [
                { id: 1, label: 'AC Installation', url: '/services/ac-installation' },
                { id: 2, label: 'AC Repair', url: '/services/ac-repair' },
                { id: 3, label: 'AC Maintenance', url: '/services/ac-maintenance' },
                { id: 4, label: 'AC Gas Refilling', url: '/services/ac-gas-refilling' }
            ],
            order: 1
        },
        {
            id: 2,
            name: 'Washing Machine',
            icon: '🧺',
            hoverDropdown: true,
            dropdownItems: [
                { id: 1, label: 'WM Installation', url: '/services/wm-installation' },
                { id: 2, label: 'WM Repair', url: '/services/wm-repair' },
                { id: 3, label: 'Drum Cleaning', url: '/services/drum-cleaning' }
            ],
            order: 2
        },
        {
            id: 3,
            name: 'Refrigerator',
            icon: '🧊',
            hoverDropdown: true,
            dropdownItems: [
                { id: 1, label: 'Fridge Repair', url: '/services/fridge-repair' },
                { id: 2, label: 'Freezer Repair', url: '/services/freezer-repair' },
                { id: 3, label: 'Gas Refilling', url: '/services/fridge-gas-refilling' }
            ],
            order: 3
        },
        {
            id: 4,
            name: 'Microwave',
            icon: '📻',
            hoverDropdown: false,
            dropdownItems: [],
            order: 4
        }
    ]);

    const [displaySettings, setDisplaySettings] = useState({
        showOnHomepage: true,
        showOnHeader: true,
        iconSize: 'medium',
        showLabels: true,
        dropdownAnimation: 'fade',
        dropdownDelay: 200
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [iconsData, configData] = await Promise.all([
                websiteSettingsAPI.getByKey('service-icons'),
                websiteSettingsAPI.getByKey('service-icons-config')
            ]);

            if (iconsData && iconsData.value) setServiceIcons(iconsData.value);
            if (configData && configData.value) setDisplaySettings(configData.value);
        } catch (err) {
            console.error('Failed to fetch service icons settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newService, setNewService] = useState({
        name: '',
        icon: '🔧',
        hoverDropdown: false,
        dropdownItems: []
    });

    const iconOptions = ['❄️', '🧺', '🧊', '📻', '🔧', '💡', '🚿', '🔌', '📺', '🎮', '💻', '🖨️', '☕', '🍳', '🧹', '🔥'];
    const iconSizes = ['small', 'medium', 'large'];
    const animations = ['fade', 'slide', 'scale', 'none'];

    const handleEdit = (service) => {
        setEditingId(service.id);
        setEditForm({ ...service, dropdownItems: [...service.dropdownItems] });
    };

    const handleSaveEdit = () => {
        setServiceIcons(serviceIcons.map(s => s.id === editingId ? editForm : s));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this service icon?')) {
            setServiceIcons(serviceIcons.filter(s => s.id !== id));
        }
    };

    const handleAddService = () => {
        if (newService.name) {
            const newId = Math.max(...serviceIcons.map(s => s.id), 0) + 1;
            setServiceIcons([...serviceIcons, { ...newService, id: newId, order: serviceIcons.length + 1 }]);
            setNewService({ name: '', icon: '🔧', hoverDropdown: false, dropdownItems: [] });
            setShowAddForm(false);
        }
    };

    const handleAddDropdownItem = (isEdit = false) => {
        const newItem = { id: Date.now(), label: '', url: '' };
        if (isEdit) {
            setEditForm({
                ...editForm,
                dropdownItems: [...editForm.dropdownItems, newItem]
            });
        } else {
            setNewService({
                ...newService,
                dropdownItems: [...newService.dropdownItems, newItem]
            });
        }
    };

    const handleRemoveDropdownItem = (itemId, isEdit = false) => {
        if (isEdit) {
            setEditForm({
                ...editForm,
                dropdownItems: editForm.dropdownItems.filter(item => item.id !== itemId)
            });
        } else {
            setNewService({
                ...newService,
                dropdownItems: newService.dropdownItems.filter(item => item.id !== itemId)
            });
        }
    };

    const handleUpdateDropdownItem = (itemId, field, value, isEdit = false) => {
        if (isEdit) {
            setEditForm({
                ...editForm,
                dropdownItems: editForm.dropdownItems.map(item =>
                    item.id === itemId ? { ...item, [field]: value } : item
                )
            });
        } else {
            setNewService({
                ...newService,
                dropdownItems: newService.dropdownItems.map(item =>
                    item.id === itemId ? { ...item, [field]: value } : item
                )
            });
        }
    };

    const handleSaveAll = async () => {
        try {
            setSaving(true);
            await Promise.all([
                websiteSettingsAPI.save('service-icons', serviceIcons, 'Service icons with dropdown configurations'),
                websiteSettingsAPI.save('service-icons-config', displaySettings, 'Display settings for service icons')
            ]);
            alert('Service icons settings saved successfully!');
        } catch (err) {
            console.error('Failed to save service icons settings:', err);
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
                            Service Icons Settings
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                            Manage service icons and their hover dropdown menus
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

            {loading ? (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md) auto', display: 'block' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading service icons...</p>
                </div>
            ) : (
                <>

                    {/* Display Settings */}
                    <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Display Settings
                        </h4>

                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                                    Show Icons On
                                </label>
                                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.showOnHomepage}
                                            onChange={(e) => setDisplaySettings({ ...displaySettings, showOnHomepage: e.target.checked })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Homepage</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={displaySettings.showOnHeader}
                                            onChange={(e) => setDisplaySettings({ ...displaySettings, showOnHeader: e.target.checked })}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Header Navigation</span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Icon Size
                                    </label>
                                    <select
                                        value={displaySettings.iconSize}
                                        onChange={(e) => setDisplaySettings({ ...displaySettings, iconSize: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    >
                                        {iconSizes.map(size => (
                                            <option key={size} value={size}>{size.charAt(0).toUpperCase() + size.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Dropdown Animation
                                    </label>
                                    <select
                                        value={displaySettings.dropdownAnimation}
                                        onChange={(e) => setDisplaySettings({ ...displaySettings, dropdownAnimation: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid var(--border-primary)',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    >
                                        {animations.map(anim => (
                                            <option key={anim} value={anim}>{anim.charAt(0).toUpperCase() + anim.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.showLabels}
                                        onChange={(e) => setDisplaySettings({ ...displaySettings, showLabels: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Show service labels below icons</span>
                                </label>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                    Dropdown Delay: {displaySettings.dropdownDelay}ms
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="500"
                                    step="50"
                                    value={displaySettings.dropdownDelay}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, dropdownDelay: parseInt(e.target.value) })}
                                    style={{ width: '200px' }}
                                />
                                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                                    Time before dropdown appears on hover
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Add New Service Icon Button */}
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                        >
                            <Plus size={18} />
                            Add Service Icon
                        </button>
                    )}

                    {/* Add Service Form */}
                    {showAddForm && (
                        <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                Add New Service Icon
                            </h4>

                            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                        Service Name *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g., Geyser Repair"
                                        value={newService.name}
                                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
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
                                        Icon
                                    </label>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                                        {iconOptions.map(icon => (
                                            <button
                                                key={icon}
                                                onClick={() => setNewService({ ...newService, icon })}
                                                style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    fontSize: '24px',
                                                    border: newService.icon === icon ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: newService.icon === icon ? 'var(--color-primary)10' : 'transparent',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {icon}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={newService.hoverDropdown}
                                        onChange={(e) => setNewService({ ...newService, hoverDropdown: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Enable hover dropdown menu</span>
                                </label>

                                {newService.hoverDropdown && (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                            <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                                Dropdown Items ({newService.dropdownItems.length})
                                            </label>
                                            <button
                                                onClick={() => handleAddDropdownItem(false)}
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                            >
                                                <Plus size={14} />
                                                Add Item
                                            </button>
                                        </div>
                                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                            {newService.dropdownItems.map(item => (
                                                <div key={item.id} style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Label"
                                                        value={item.label}
                                                        onChange={(e) => handleUpdateDropdownItem(item.id, 'label', e.target.value, false)}
                                                        style={{
                                                            flex: 1,
                                                            padding: 'var(--spacing-xs)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            fontSize: 'var(--font-size-sm)'
                                                        }}
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="URL"
                                                        value={item.url}
                                                        onChange={(e) => handleUpdateDropdownItem(item.id, 'url', e.target.value, false)}
                                                        style={{
                                                            flex: 1,
                                                            padding: 'var(--spacing-xs)',
                                                            border: '1px solid var(--border-primary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            fontSize: 'var(--font-size-sm)'
                                                        }}
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveDropdownItem(item.id, false)}
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px' }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button
                                    onClick={handleAddService}
                                    className="btn btn-primary"
                                    disabled={!newService.name}
                                >
                                    <Save size={16} />
                                    Add Service
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setNewService({ name: '', icon: '🔧', hoverDropdown: false, dropdownItems: [] });
                                    }}
                                    className="btn btn-secondary"
                                >
                                    <X size={16} />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Service Icons List */}
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {serviceIcons.map((service) => (
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
                                                    Service Name
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

                                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={editForm.hoverDropdown}
                                                    onChange={(e) => setEditForm({ ...editForm, hoverDropdown: e.target.checked })}
                                                    style={{ width: '18px', height: '18px' }}
                                                />
                                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Enable hover dropdown menu</span>
                                            </label>

                                            {editForm.hoverDropdown && (
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                                        <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                                            Dropdown Items
                                                        </label>
                                                        <button
                                                            onClick={() => handleAddDropdownItem(true)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                        >
                                                            <Plus size={14} />
                                                            Add Item
                                                        </button>
                                                    </div>
                                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                                        {editForm.dropdownItems.map(item => (
                                                            <div key={item.id} style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Label"
                                                                    value={item.label}
                                                                    onChange={(e) => handleUpdateDropdownItem(item.id, 'label', e.target.value, true)}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: 'var(--spacing-xs)',
                                                                        border: '1px solid var(--border-primary)',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        fontSize: 'var(--font-size-sm)'
                                                                    }}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="URL"
                                                                    value={item.url}
                                                                    onChange={(e) => handleUpdateDropdownItem(item.id, 'url', e.target.value, true)}
                                                                    style={{
                                                                        flex: 1,
                                                                        padding: 'var(--spacing-xs)',
                                                                        border: '1px solid var(--border-primary)',
                                                                        borderRadius: 'var(--radius-md)',
                                                                        fontSize: 'var(--font-size-sm)'
                                                                    }}
                                                                />
                                                                <button
                                                                    onClick={() => handleRemoveDropdownItem(item.id, true)}
                                                                    className="btn btn-danger"
                                                                    style={{ padding: '6px' }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: 'var(--radius-lg)',
                                            backgroundColor: '#3b82f615',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '32px',
                                            flexShrink: 0
                                        }}>
                                            {service.icon}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                                    {service.name}
                                                </h4>
                                                {service.hoverDropdown && (
                                                    <span style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '10px',
                                                        fontWeight: 600,
                                                        backgroundColor: '#3b82f615',
                                                        color: '#3b82f6',
                                                        border: '1px solid #3b82f630'
                                                    }}>
                                                        <ChevronDown size={12} />
                                                        DROPDOWN
                                                    </span>
                                                )}
                                            </div>

                                            {service.hoverDropdown && service.dropdownItems.length > 0 && (
                                                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: '0 0 var(--spacing-xs) 0' }}>
                                                        Dropdown Items ({service.dropdownItems.length}):
                                                    </p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
                                                        {service.dropdownItems.map(item => (
                                                            <span
                                                                key={item.id}
                                                                style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '8px',
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    backgroundColor: 'var(--bg-secondary)',
                                                                    border: '1px solid var(--border-primary)'
                                                                }}
                                                            >
                                                                {item.label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
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
                        ))}
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
                </>
            )}
        </div>
    );
}

export default ServiceIconsSettings;
