'use client'

import { useState, useEffect } from 'react';
import {
    Globe, Construction, CheckCircle, AlertCircle, Loader2,
    ChevronRight, Info, Search, RefreshCw, Layers, MapPin
} from 'lucide-react';

export default function PageBuilderTool() {
    const [appliances, setAppliances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [building, setBuilding] = useState(false);
    const [statusData, setStatusData] = useState(null);

    // Form fields for building
    const [slug, setSlug] = useState('');
    const [color, setColor] = useState('#6366f1');
    const [iconName, setIconName] = useState('Package');

    useEffect(() => {
        fetchAppliances();
    }, []);

    const fetchAppliances = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/appliances');
            const data = await res.json();
            if (data.success) {
                setAppliances(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch appliances:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAppliance = (appId) => {
        const app = appliances.find(a => a.id === appId);
        setSelectedCategoryId(appId);
        if (app) {
            setSlug(app.slug || app.name.toLowerCase().replace(/\s+/g, '-') + '-repair');
            setColor(app.color || '#6366f1');
            setIconName(app.icon_name || 'Package');
            setStatusData(app.pageIds);
        } else {
            setSlug('');
            setStatusData(null);
        }
    };

    const handleBuild = async () => {
        const app = appliances.find(a => a.id === selectedCategoryId);
        if (!app) return;

        if (!slug.trim()) {
            alert('Please enter a URL slug.');
            return;
        }

        setBuilding(true);
        try {
            const subcategories = (app.subcategories || []).map(s => ({
                id: s.id,
                name: s.name,
                slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-')
            }));

            const res = await fetch('/api/settings/appliances/build-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: app.id,
                    slug: slug.trim(),
                    color,
                    icon_name: iconName,
                    subcategories
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ Successfully built/refreshed pages for ${app.name}`);
                await fetchAppliances(); // Refresh data
                // Update local status with new data
                const refreshedApp = data.data; // The API returns updated cat
                if (refreshedApp) setStatusData(refreshedApp.pageIds);
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setBuilding(false);
        }
    };

    const selectedApp = appliances.find(a => a.id === selectedCategoryId);

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-sm)' }}>
                    <Globe size={32} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>
                        Frontend Page Builder
                    </h2>
                </div>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', margin: 0 }}>
                    Seed and register frontend pages for newly added appliances or repair types.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>

                {/* Left Column: Appliance List */}
                <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--spacing-md)',
                        borderBottom: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, margin: 0 }}>
                            Select Appliance
                        </h3>
                        <button
                            onClick={fetchAppliances}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                        >
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)', margin: '0 auto' }} />
                        </div>
                    ) : (
                        <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {appliances.map(app => {
                                const isSelected = selectedCategoryId === app.id;
                                const isBuilt = app.pageIds?.built === app.pageIds?.total && app.pageIds?.total > 0;

                                return (
                                    <button
                                        key={app.id}
                                        onClick={() => handleSelectAppliance(app.id)}
                                        style={{
                                            width: '100%',
                                            padding: '14px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            border: 'none',
                                            borderBottom: '1px solid var(--border-primary)',
                                            backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: isBuilt ? '#10b981' : '#f59e0b'
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: isSelected ? 'var(--color-primary)' : 'var(--text-primary)' }}>
                                                {app.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                                {app.pageIds?.built || 0} / {app.pageIds?.total || 0} pages registered
                                            </div>
                                        </div>
                                        <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', opacity: isSelected ? 1 : 0.3 }} />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Build Form */}
                <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
                    {!selectedCategoryId ? (
                        <div className="card" style={{
                            padding: 'var(--spacing-2xl)',
                            textAlign: 'center',
                            border: '2px dashed var(--border-primary)',
                            backgroundColor: 'transparent'
                        }}>
                            <Search size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-md)', opacity: 0.2 }} />
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Select an appliance to start
                            </h3>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>
                                Choose an appliance from the left sidebar to build its service pages.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Build Configuration Form */}
                            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Construction size={20} style={{ color: color }} />
                                    Build Configuration for {selectedApp?.name}
                                </h3>

                                <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                                    {/* Slug & Icon Row */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
                                                URL Slug
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-tertiary)' }}>/services/</span>
                                                <input
                                                    type="text"
                                                    value={slug}
                                                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                    style={{
                                                        flex: 1,
                                                        padding: '10px',
                                                        border: '1px solid var(--border-primary)',
                                                        borderRadius: 'var(--radius-md)',
                                                        fontSize: 'var(--font-size-sm)',
                                                        fontFamily: 'monospace',
                                                        backgroundColor: 'var(--bg-elevated)'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
                                                Interface Icon (Lucide)
                                            </label>
                                            <input
                                                type="text"
                                                value={iconName}
                                                onChange={e => setIconName(e.target.value)}
                                                placeholder="Package, Shield, Zap..."
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    backgroundColor: 'var(--bg-elevated)'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Color Picker Component (Simplified) */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px' }}>
                                            Brand Color (Admin UI)
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <input
                                                type="color"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                style={{ width: '50px', height: '40px', padding: '2px', border: '1px solid var(--border-primary)', borderRadius: '4px' }}
                                            />
                                            <input
                                                type="text"
                                                value={color}
                                                onChange={e => setColor(e.target.value)}
                                                style={{ padding: '10px', width: '100px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Preview Banner */}
                                    <div style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: `${color}10`,
                                        border: `1px solid ${color}30`,
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px'
                                    }}>
                                        <Info size={18} style={{ color: color, marginTop: '2px' }} />
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: 600, color: color, margin: '0 0 4px 0' }}>
                                                Generation Preview
                                            </p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                                                Target path: /services/<b>{slug || '...'}</b><br />
                                                This will seed {1 + (selectedApp?.subcategories?.length || 0) + 15} entries in Website Settings.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Build Button */}
                                    <button
                                        onClick={handleBuild}
                                        disabled={building || !slug}
                                        style={{
                                            padding: '16px',
                                            backgroundColor: building ? 'var(--bg-tertiary)' : color,
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: 700,
                                            cursor: building ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '10px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        {building ? <Loader2 className="animate-spin" size={20} /> : <Construction size={20} />}
                                        {building ? 'Building Pages...' : (statusData?.built > 0 ? '🔄 Rebuild/Refresh All Pages' : '🚀 Build & Seed Pages')}
                                    </button>
                                </div>
                            </div>

                            {/* Status and Paths Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Layers size={14} /> Sections to Seed
                                    </h4>
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        <StatusItem label="Category Settings" built={statusData?.built >= 1} />
                                        <StatusItem label="Subcategory Settings" count={selectedApp?.subcategories?.length} total={selectedApp?.subcategories?.length} />
                                        <StatusItem label="Mumbai Locations" count={15} total={15} />
                                    </div>
                                </div>

                                <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MapPin size={14} /> Sample URLs
                                    </h4>
                                    <div style={{ display: 'grid', gap: '4px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                        <div>/services/{slug}</div>
                                        <div>/services/{slug}/{selectedApp?.subcategories?.[0]?.slug || 'top-load'}</div>
                                        <div>/location/andheri/{slug}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatusItem({ label, built, count, total }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {total !== undefined ? `${total} entries` : (built ? 'Ready' : 'Pending')}
                </span>
                {built !== undefined ? (
                    built ? <CheckCircle size={14} style={{ color: '#10b981' }} /> : <AlertCircle size={14} style={{ color: '#f59e0b' }} />
                ) : null}
            </div>
        </div>
    );
}
