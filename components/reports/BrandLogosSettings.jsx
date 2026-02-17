'use client'

import { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Upload, ExternalLink, Loader2 } from 'lucide-react';

function BrandLogosSettings() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [displaySettings, setDisplaySettings] = useState({
        showOnHomepage: true,
        showOnServicePages: true,
        autoScroll: true,
        scrollSpeed: 3,
        grayscale: true,
        colorOnHover: true
    });

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBrand, setNewBrand] = useState({
        name: '',
        logoUrl: '',
        websiteUrl: ''
    });

    // Load data
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const resB = await fetch('/api/settings/brands');
                const dataB = await resB.json();
                if (dataB.success) {
                    setBrands(dataB.data.map(b => ({
                        id: b.id,
                        name: b.name,
                        logoUrl: b.logo_url,
                        websiteUrl: b.website_url,
                        order: b.display_order
                    })));
                }

                const resC = await fetch('/api/settings/section-configs?id=brands');
                const dataC = await resC.json();
                if (dataC.success && dataC.data) {
                    setDisplaySettings(dataC.data.extra_config || displaySettings);
                }
            } catch (error) {
                console.error('Error loading brand settings:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handleEdit = (brand) => {
        setEditingId(brand.id);
        setEditForm({ ...brand });
    };

    const handleSaveEdit = () => {
        setBrands(brands.map(b => b.id === editingId ? editForm : b));
        setEditingId(null);
        setEditForm({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this brand?')) {
            setBrands(brands.filter(b => b.id !== id));
        }
    };

    const handleAddBrand = () => {
        if (newBrand.name && newBrand.logoUrl) {
            const tempId = `temp-${Date.now()}`;
            setBrands([...brands, { ...newBrand, id: tempId, order: brands.length + 1 }]);
            setNewBrand({ name: '', logoUrl: '', websiteUrl: '' });
            setShowAddForm(false);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            // Save brands
            await fetch('/api/settings/brands', {
                method: 'POST',
                body: JSON.stringify(brands)
            });

            // Save config
            await fetch('/api/settings/section-configs', {
                method: 'POST',
                body: JSON.stringify({
                    section_id: 'brands',
                    extra_config: displaySettings
                })
            });

            alert('Brand logos settings saved successfully!');
            window.location.reload();
        } catch (error) {
            console.error('Error saving brands:', error);
            alert('An error occurred.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Brand Logos Management
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage brand logos displayed on your website
                </p>
            </div>

            {/* Display Settings */}
            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Display Settings
                </h4>

                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {/* Show on Pages */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Display On
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
                                    checked={displaySettings.showOnServicePages}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, showOnServicePages: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Service Pages</span>
                            </label>
                        </div>
                    </div>

                    {/* Animation Settings */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Animation
                        </label>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.autoScroll}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, autoScroll: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)' }}>Auto-scroll logos</span>
                            </label>

                            {displaySettings.autoScroll && (
                                <div style={{ marginLeft: '26px' }}>
                                    <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xs)' }}>
                                        Scroll Speed: {displaySettings.scrollSpeed}s per logo
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={displaySettings.scrollSpeed}
                                        onChange={(e) => setDisplaySettings({ ...displaySettings, scrollSpeed: parseInt(e.target.value) })}
                                        style={{ width: '200px' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Visual Effects */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-sm)' }}>
                            Visual Effects
                        </label>
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={displaySettings.grayscale}
                                    onChange={(e) => setDisplaySettings({ ...displaySettings, grayscale: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-sm)' }}>Grayscale by default</div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Logos appear in grayscale for a professional look
                                    </div>
                                </div>
                            </label>

                            {displaySettings.grayscale && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer', marginLeft: '26px' }}>
                                    <input
                                        type="checkbox"
                                        checked={displaySettings.colorOnHover}
                                        onChange={(e) => setDisplaySettings({ ...displaySettings, colorOnHover: e.target.checked })}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>Show color on hover</span>
                                </label>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add New Brand Button */}
            {!showAddForm && (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                >
                    <Plus size={18} />
                    Add New Brand
                </button>
            )}

            {/* Add Brand Form */}
            {showAddForm && (
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                        Add New Brand
                    </h4>

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Brand Name *
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Panasonic"
                                value={newBrand.name}
                                onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
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
                                Logo URL *
                            </label>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <input
                                    type="text"
                                    placeholder="/brands/panasonic.png"
                                    value={newBrand.logoUrl}
                                    onChange={(e) => setNewBrand({ ...newBrand, logoUrl: e.target.value })}
                                    style={{
                                        flex: 1,
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}
                                />
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '8px 16px' }}
                                    title="Upload logo"
                                >
                                    <Upload size={16} />
                                </button>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0 0' }}>
                                Recommended: PNG with transparent background, 200x80px
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Website URL (Optional)
                            </label>
                            <input
                                type="text"
                                placeholder="https://www.panasonic.com"
                                value={newBrand.websiteUrl}
                                onChange={(e) => setNewBrand({ ...newBrand, websiteUrl: e.target.value })}
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
                            onClick={handleAddBrand}
                            className="btn btn-primary"
                            disabled={!newBrand.name || !newBrand.logoUrl}
                        >
                            <Save size={16} />
                            Add Brand
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewBrand({ name: '', logoUrl: '', websiteUrl: '' });
                            }}
                            className="btn btn-secondary"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Brands Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {brands.map((brand) => (
                    <div
                        key={brand.id}
                        className="card"
                        style={{
                            padding: 'var(--spacing-lg)',
                            border: editingId === brand.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)'
                        }}
                    >
                        {editingId === brand.id ? (
                            // Edit Mode
                            <div>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Brand Name
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
                                            Logo URL
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                            <input
                                                type="text"
                                                value={editForm.logoUrl}
                                                onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                                                style={{
                                                    flex: 1,
                                                    padding: 'var(--spacing-sm)',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)'
                                                }}
                                            />
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '8px' }}
                                            >
                                                <Upload size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Website URL
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.websiteUrl}
                                            onChange={(e) => setEditForm({ ...editForm, websiteUrl: e.target.value })}
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
                                    <button onClick={handleSaveEdit} className="btn btn-primary" style={{ flex: 1 }}>
                                        <Save size={16} />
                                        Save
                                    </button>
                                    <button onClick={handleCancelEdit} className="btn btn-secondary">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div>
                                <div style={{
                                    height: '80px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 'var(--spacing-md)',
                                    border: '1px solid var(--border-primary)',
                                    padding: 'var(--spacing-sm)'
                                }}>
                                    {brand.logoUrl.startsWith('http') || brand.logoUrl.startsWith('/') ? (
                                        <img
                                            src={brand.logoUrl}
                                            alt={brand.name}
                                            style={{
                                                maxWidth: '100%',
                                                maxHeight: '100%',
                                                objectFit: 'contain',
                                                filter: displaySettings.grayscale ? 'grayscale(100%)' : 'none'
                                            }}
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-tertiary)',
                                        fontSize: 'var(--font-size-sm)'
                                    }}>
                                        <Image size={24} />
                                    </div>
                                </div>

                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>
                                    {brand.name}
                                </h4>

                                {brand.websiteUrl && (
                                    <a
                                        href={brand.websiteUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--color-primary)',
                                            textDecoration: 'none',
                                            marginBottom: 'var(--spacing-md)'
                                        }}
                                    >
                                        <ExternalLink size={12} />
                                        Visit Website
                                    </a>
                                )}

                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-md)' }}>
                                    <button
                                        onClick={() => handleEdit(brand)}
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '6px 12px' }}
                                    >
                                        <Edit2 size={16} />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(brand.id)}
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

export default BrandLogosSettings;





