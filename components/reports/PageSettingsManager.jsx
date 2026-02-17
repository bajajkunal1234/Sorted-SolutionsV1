'use client'

import { useState, useEffect } from 'react';
import {
    Save,
    Plus,
    Trash2,
    Settings,
    AlertCircle,
    HelpCircle,
    Layers,
    MapPin,
    Tag,
    Image as ImageIcon,
    ChevronRight,
    Loader2
} from 'lucide-react';

function PageSettingsManager({ pageId, pageLabel }) {
    const [activeTab, setActiveTab] = useState('problems');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);
    const [globalFaqs, setGlobalFaqs] = useState([]);
    const [globalBrands, setGlobalBrands] = useState([]);

    useEffect(() => {
        fetchSettings();
        fetchGlobalData();
    }, [pageId]);

    const fetchSettings = async () => {
        console.log('🔍 FETCHING SETTINGS FOR:', pageId);
        setLoading(true);
        try {
            const res = await fetch(`/api/settings/page/${pageId}`);
            const data = await res.json();
            console.log('✅ API RESPONSE:', data);
            if (data.success) {
                const d = data.data;
                if (!d) {
                    console.error('❌ API returned success but null data');
                    return;
                }
                if (!d.brands_settings) d.brands_settings = { items: [] };
                if (!d.faqs_settings) d.faqs_settings = { items: [] };
                if (!d.brands_settings.items) d.brands_settings.items = [];
                if (!d.faqs_settings.items) d.faqs_settings.items = [];

                console.log('💾 SETTING STATE:', d);
                setSettings(d);
            } else {
                console.error('❌ API SUCCESS FALSE:', data.error);
            }
        } catch (error) {
            console.error('❌ FETCH ERROR:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGlobalData = async () => {
        try {
            const [faqRes, brandRes] = await Promise.all([
                fetch('/api/settings/faqs'),
                fetch('/api/settings/brand-logos')
            ]);
            const faqData = await faqRes.json();
            const brandData = await brandRes.json();

            if (faqData.success) setGlobalFaqs(faqData.data);
            if (brandData.success) setGlobalBrands(brandData.data);
        } catch (error) {
            console.error('Error fetching global data:', error);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/settings/page/${pageId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (data.success) {
                alert('Settings saved successfully!');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const updateSection = (section, key, value) => {
        setSettings({
            ...settings,
            [section]: {
                ...settings[section],
                [key]: value
            }
        });
    };

    const addItem = (section) => {
        if (section === 'problems_settings') {
            const items = [...settings.problems_settings.items, { question: '', answer: '' }];
            updateSection(section, 'items', items);
        } else if (section === 'services_settings') {
            const items = [...settings.services_settings.items, { name: '', price: '' }];
            updateSection(section, 'items', items);
        } else if (section === 'localities_settings') {
            const items = [...settings.localities_settings.items, ''];
            updateSection(section, 'items', items);
        }
    };

    const removeItem = (section, index) => {
        const items = [...settings[section].items];
        items.splice(index, 1);
        updateSection(section, 'items', items);
    };

    const toggleSelection = (section, id) => {
        const items = settings[section].items || [];
        const newItems = items.includes(id)
            ? items.filter(i => i !== id)
            : [...items, id];
        updateSection(section, 'items', newItems);
    };

    const updateItem = (section, index, field, value) => {
        const items = [...settings[section].items];
        if (typeof items[index] === 'object') {
            items[index] = { ...items[index], [field]: value };
        } else {
            items[index] = value;
        }
        updateSection(section, 'items', items);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <Loader2 className="animate-spin text-primary" size={48} />
                <span style={{ marginLeft: '12px', fontSize: '18px', color: 'var(--text-secondary)' }}>Loading settings...</span>
            </div>
        );
    }

    if (!settings || !settings.problems_settings) {
        console.log('⚠️ RENDER BLOCKED: settings is null or missing problems_settings', { settings });
        return (
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px' }}>Failed to load settings</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                    {!settings ? 'Could not fetch settings for this page.' : 'Settings data is corrupted (missing problems_settings).'}
                </p>
                <button onClick={fetchSettings} className="btn btn-secondary" style={{ marginTop: '16px' }}>Retry</button>
            </div>
        );
    }

    console.log('🎨 RENDERING PageSettingsManager for', pageId);

    const tabs = [
        { id: 'problems', label: 'Problems', icon: AlertCircle },
        { id: 'brands', label: 'Brands', icon: ImageIcon },
        { id: 'localities', label: 'Localities', icon: MapPin },
        { id: 'services', label: 'Services', icon: Tag },
        { id: 'faqs', label: 'FAQs', icon: HelpCircle }
    ];

    return (
        <div className="page-settings-manager">
            {/* Page Header */}
            <div style={{
                marginBottom: 'var(--spacing-xl)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)'
            }}>
                <div>
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                        {pageLabel}
                    </h2>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                        ID: <span style={{ fontFamily: 'monospace', opacity: 0.7 }}>{pageId}</span>
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            {/* Tabs Navigation */}
            <div style={{
                display: 'flex',
                gap: '4px',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--border-primary)',
                padding: '0 8px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                            borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            marginTop: '3px'
                        }}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="card" style={{ padding: 'var(--spacing-xl)', minHeight: '400px' }}>
                {activeTab === 'problems' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                <input
                                    type="text"
                                    value={settings.problems_settings.title}
                                    onChange={(e) => updateSection('problems_settings', 'title', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                <input
                                    type="text"
                                    value={settings.problems_settings.subtitle}
                                    onChange={(e) => updateSection('problems_settings', 'subtitle', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <label style={{ fontWeight: 600 }}>Problems We Solve</label>
                                <button onClick={() => addItem('problems_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                    <Plus size={14} /> Add Problem
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {settings.problems_settings.items.map((item, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)'
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="text"
                                                placeholder="Problem (e.g., AC not cooling)"
                                                value={item.question}
                                                onChange={(e) => updateItem('problems_settings', index, 'question', e.target.value)}
                                                style={{ marginBottom: '8px', width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                            />
                                            <textarea
                                                placeholder="Brief solution description"
                                                value={item.answer}
                                                onChange={(e) => updateItem('problems_settings', index, 'answer', e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)', minHeight: '60px' }}
                                            />
                                        </div>
                                        <button onClick={() => removeItem('problems_settings', index)} className="btn btn-danger" style={{ height: 'fit-content' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'brands' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#3b82f615', borderRadius: 'var(--radius-md)', color: '#3b82f6' }}>
                            <ImageIcon size={20} />
                            <p style={{ margin: 0, fontSize: '14px' }}>Select brand logos from the global library to display on this page.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                            {globalBrands.map(brand => {
                                const isSelected = settings.brands_settings.items.includes(brand.id);
                                return (
                                    <div
                                        key={brand.id}
                                        onClick={() => toggleSelection('brands_settings', brand.id)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                            backgroundColor: isSelected ? 'var(--color-primary)05' : 'var(--bg-secondary)',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            transition: 'all 0.2s ease',
                                            position: 'relative'
                                        }}
                                    >
                                        {isSelected && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '-8px',
                                                right: '-8px',
                                                backgroundColor: 'var(--color-primary)',
                                                color: 'white',
                                                borderRadius: '50%',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Save size={12} />
                                            </div>
                                        )}
                                        <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                            <img src={brand.logo_url} alt={brand.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 600 }}>{brand.name}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {globalBrands.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No brands found in global library.</p>}
                    </div>
                )}

                {activeTab === 'localities' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                <input
                                    type="text"
                                    value={settings.localities_settings.title}
                                    onChange={(e) => updateSection('localities_settings', 'title', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                <input
                                    type="text"
                                    value={settings.localities_settings.subtitle}
                                    onChange={(e) => updateSection('localities_settings', 'subtitle', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <label style={{ fontWeight: 600 }}>Localities / Areas served</label>
                                <button onClick={() => addItem('localities_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                    <Plus size={14} /> Add Locality
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                {settings.localities_settings.items.map((item, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => updateItem('localities_settings', index, null, e.target.value)}
                                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                            placeholder="Area name"
                                        />
                                        <button onClick={() => removeItem('localities_settings', index)} className="btn btn-danger" style={{ padding: '8px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'services' && (
                    <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Title</label>
                                <input
                                    type="text"
                                    value={settings.services_settings.title}
                                    onChange={(e) => updateSection('services_settings', 'title', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Section Subtitle</label>
                                <input
                                    type="text"
                                    value={settings.services_settings.subtitle}
                                    onChange={(e) => updateSection('services_settings', 'subtitle', e.target.value)}
                                    className="form-control"
                                />
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <label style={{ fontWeight: 600 }}>Popular Services & Pricing</label>
                                <button onClick={() => addItem('services_settings')} className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
                                    <Plus size={14} /> Add Service
                                </button>
                            </div>
                            <div style={{ display: 'grid', gap: '12px' }}>
                                {settings.services_settings.items.map((item, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-primary)',
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ flex: 2 }}>
                                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Service Name</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateItem('services_settings', index, 'name', e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px', opacity: 0.7 }}>Starts From (₹)</label>
                                            <input
                                                type="number"
                                                value={item.price}
                                                onChange={(e) => updateItem('services_settings', index, 'price', e.target.value)}
                                                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-primary)' }}
                                            />
                                        </div>
                                        <button onClick={() => removeItem('services_settings', index)} className="btn btn-danger" style={{ marginTop: '20px' }}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'faqs' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', padding: '16px', backgroundColor: '#8b5cf615', borderRadius: 'var(--radius-md)', color: '#8b5cf6' }}>
                            <HelpCircle size={20} />
                            <p style={{ margin: 0, fontSize: '14px' }}>Select FAQs from the global library to display on this page.</p>
                        </div>

                        <div style={{ display: 'grid', gap: '12px' }}>
                            {globalFaqs.map(faq => {
                                const isSelected = settings.faqs_settings.items.includes(faq.id);
                                return (
                                    <div
                                        key={faq.id}
                                        onClick={() => toggleSelection('faqs_settings', faq.id)}
                                        style={{
                                            padding: '16px',
                                            borderRadius: 'var(--radius-md)',
                                            border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                                            backgroundColor: isSelected ? 'var(--color-primary)05' : 'var(--bg-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            gap: '16px',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <div style={{
                                            flexShrink: 0,
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-tertiary)'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--color-primary)',
                                            backgroundColor: isSelected ? 'white' : 'transparent'
                                        }}>
                                            {isSelected && <ChevronRight size={16} />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{faq.question}</div>
                                            <div style={{ fontSize: '13px', opacity: 0.8, color: 'var(--text-secondary)' }}>{faq.answer.substring(0, 150)}{faq.answer.length > 150 ? '...' : ''}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {globalFaqs.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '40px' }}>No FAQs found in global library.</p>}
                    </div>
                )}
            </div>

            <style jsx>{`
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    background-color: var(--bg-elevated);
                    color: var(--text-primary);
                    transition: border-color 0.2s;
                }
                .form-control:focus {
                    outline: none;
                    border-color: var(--color-primary);
                }
                .btn-danger {
                    background-color: #ef444415;
                    color: #ef4444;
                    border: 1px solid #ef444430;
                    padding: 8px;
                    display: flex;
                    alignItems: center;
                    justifyContent: center;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }
                .btn-danger:hover {
                    background-color: #ef444425;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default PageSettingsManager;
