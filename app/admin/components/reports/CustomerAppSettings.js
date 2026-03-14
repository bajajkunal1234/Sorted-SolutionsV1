'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';

export default function CustomerAppSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Configuration state for customer app banners
    const [config, setConfig] = useState({
        banners: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const configRes = await fetch('/api/settings/section-configs?id=customer-app-banners');
            if (configRes.ok) {
                const configData = await configRes.json();
                if (configData.success && configData.data?.extra_config) {
                    setConfig({
                        banners: configData.data.extra_config.banners || []
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching customer app banners settings:', error);
            setMessage({ type: 'error', text: 'Failed to load configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section_id: 'customer-app-banners',
                    extra_config: config
                })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Customer App Banners saved successfully!' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                throw new Error(data.message || 'Failed to save');
            }
        } catch (error) {
            console.error('Error saving:', error);
            setMessage({ type: 'error', text: error.message || 'Failed to save configuration.' });
        } finally {
            setSaving(false);
        }
    };

    const addBanner = () => {
        setConfig({
            ...config,
            banners: [
                ...config.banners,
                { id: Date.now().toString(), title: 'New Banner', imageUrl: '', targetUrl: '', active: true }
            ]
        });
    };

    const removeBanner = (idToRemove) => {
        setConfig({
            ...config,
            banners: config.banners.filter(b => b.id !== idToRemove)
        });
    };

    const updateBanner = (id, field, value) => {
        setConfig({
            ...config,
            banners: config.banners.map(b => b.id === id ? { ...b, [field]: value } : b)
        });
    };

    const moveBanner = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === config.banners.length - 1)) return;
        
        const newBanners = [...config.banners];
        const temp = newBanners[index];
        newBanners[index] = newBanners[index + direction];
        newBanners[index + direction] = temp;
        
        setConfig({ ...config, banners: newBanners });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Customer App Banners
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Manage the promotional banners displayed on the customer app homepage.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                >
                    {saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />}
                    Save Changes
                </button>
            </div>

            {message.text && (
                <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--spacing-md)',
                    fontSize: 'var(--font-size-sm)',
                    background: message.type === 'error' ? '#ef444415' : '#10b98115',
                    color: message.type === 'error' ? '#ef4444' : '#10b981',
                    border: `1px solid ${message.type === 'error' ? '#ef444430' : '#10b98130'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                }}>
                    <AlertCircle size={16} />
                    {message.text}
                </div>
            )}

            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Active Banners ({config.banners.length})</h4>
                    <button
                        onClick={addBanner}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                        <Plus size={16} />
                        Add Banner
                    </button>
                </div>

                {config.banners.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--text-secondary)' }}>
                        <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)', display: 'block', margin: '0 auto var(--spacing-sm)' }} />
                        <p style={{ margin: 0 }}>No banners added yet. Click <strong>"Add Banner"</strong> to create your first app banner.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {config.banners.map((banner, index) => (
                            <div key={banner.id} style={{
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr',
                                gap: 'var(--spacing-md)',
                                padding: 'var(--spacing-md)',
                                background: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-primary)'
                            }}>
                                {/* Ordering Controls */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', paddingRight: 'var(--spacing-md)', borderRight: '1px solid var(--border-primary)' }}>
                                    <button 
                                        onClick={() => moveBanner(index, -1)}
                                        disabled={index === 0}
                                        style={{ padding: 4, background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                    <button 
                                        onClick={() => moveBanner(index, 1)}
                                        disabled={index === config.banners.length - 1}
                                        style={{ padding: 4, background: 'transparent', border: 'none', cursor: index === config.banners.length - 1 ? 'not-allowed' : 'pointer', color: index === config.banners.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)' }}
                                    >
                                        <ArrowDown size={16} />
                                    </button>
                                </div>

                                {/* Details */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 300px) 1fr', gap: 'var(--spacing-lg)' }}>
                                    
                                    {/* Image Preview Area */}
                                    <div style={{ 
                                        borderRadius: 'var(--radius-md)', 
                                        overflow: 'hidden', 
                                        background: 'var(--bg-primary)', 
                                        border: '1px solid var(--border-primary)',
                                        position: 'relative',
                                        aspectRatio: '16/7',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column'
                                    }}>
                                        {banner.imageUrl ? (
                                            <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <>
                                                <ImageIcon size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 8 }} />
                                                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>No Image Provided</span>
                                            </>
                                        )}
                                        
                                        {!banner.active && (
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ padding: '4px 8px', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 'bold', borderRadius: 4 }}>INACTIVE</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Edit Fields */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Banner Title (Internal)</label>
                                            <input
                                                type="text"
                                                value={banner.title}
                                                onChange={(e) => updateBanner(banner.id, 'title', e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                placeholder="e.g. 90-Minute Service Promo"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Image URL</label>
                                            <input
                                                type="text"
                                                value={banner.imageUrl}
                                                onChange={(e) => updateBanner(banner.id, 'imageUrl', e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                placeholder="https://example.com/banner.png"
                                            />
                                        </div>
                                        
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-xs)', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Target Link (Optional)</label>
                                            <input
                                                type="text"
                                                value={banner.targetUrl}
                                                onChange={(e) => updateBanner(banner.id, 'targetUrl', e.target.value)}
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                placeholder="e.g. /services/ac-repair"
                                            />
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 'var(--font-size-sm)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={banner.active}
                                                    onChange={(e) => updateBanner(banner.id, 'active', e.target.checked)}
                                                    style={{ width: 16, height: 16 }}
                                                />
                                                Show on App Homepage
                                            </label>
                                            
                                            <button
                                                onClick={() => removeBanner(banner.id)}
                                                style={{ padding: 6, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                title="Delete Banner"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
