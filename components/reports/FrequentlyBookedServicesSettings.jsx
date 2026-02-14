'use client'

import { useState } from 'react';
import { Package, Plus, Trash2, Edit2, Save, X, Upload, Tag } from 'lucide-react';

function FrequentlyBookedServicesSettings() {
    const [services, setServices] = useState([
        { id: 1, title: 'AC Cleaning & Service', keywords: 'Air conditioner cleaning Mumbai', url: '/services/ac-cleaning', badge: 'Popular', badgeColor: '#10b981' },
        { id: 2, title: 'RO Filter Replacement', keywords: 'RO water purifier service', url: '/services/ro-filter', badge: 'Seasonal', badgeColor: '#f59e0b' },
        { id: 3, title: 'Washing Machine Repair', keywords: 'WM spin issue repair', url: '/services/wm-spin', badge: null, badgeColor: null },
        { id: 4, title: 'Refrigerator Not Cooling', keywords: 'Fridge cooling problem fix', url: '/services/fridge-cooling', badge: 'Emergency', badgeColor: '#ef4444' },
        { id: 5, title: 'Microwave Not Heating', keywords: 'Microwave oven repair', url: '/services/microwave-heating', badge: null, badgeColor: null },
        { id: 6, title: 'Gas Stove Burner Repair', keywords: 'Gas hob service Mumbai', url: '/services/gas-stove', badge: null, badgeColor: null }
    ]);
    const [editingId, setEditingId] = useState(null);
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

    const handleSaveAll = () => {
        // TODO: Save to backend
        alert('Services saved successfully!');
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Frequently Booked Services
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage seasonal services displayed on the homepage
                </p>
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
                {services.map((service) => (
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
                ))}
            </div>

            {/* Save All Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
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

export default FrequentlyBookedServicesSettings;





