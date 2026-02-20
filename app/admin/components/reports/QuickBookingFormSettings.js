'use client'

import { useState, useEffect } from 'react';
import {
    Calendar, Plus, Trash2, Edit2, Save, X, Upload, Loader2,
    Package, Layers, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp,
    Globe, CheckCircle, Construction, Settings2
} from 'lucide-react';
import { quickBookingAPI } from '@/lib/adminAPI';

const ICON_OPTIONS = [
    'Package', 'Wind', 'Snowflake', 'Waves', 'Droplets', 'Flame',
    'FlameKindling', 'Zap', 'Thermometer', 'Fan', 'Refrigerator',
    'WashingMachine', 'Microwave', 'Tv', 'Radio', 'Coffee',
    'Monitor', 'Printer', 'PhoneCall', 'Wrench'
];

const COLOR_PRESETS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
    '#6366f1', '#14b8a6', '#f97316', '#a855f7'
];

function PageBuilderPanel({ category, onBuilt }) {
    const [open, setOpen] = useState(false);
    const [building, setBuilding] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [builtStatus, setBuiltStatus] = useState(null); // { total, built }
    const [slug, setSlug] = useState(
        category.slug ||
        category.name.toLowerCase().replace(/\s+/g, '-') + '-repair'
    );
    const [color, setColor] = useState(category.color || '#6366f1');
    const [iconName, setIconName] = useState(category.icon_name || 'Package');

    useEffect(() => {
        if (open && builtStatus === null) {
            checkStatus();
        }
    }, [open]);

    const checkStatus = async () => {
        setCheckingStatus(true);
        try {
            const res = await fetch('/api/settings/appliances');
            const data = await res.json();
            if (data.success) {
                const match = data.data.find(c => c.id === category.id);
                if (match) setBuiltStatus(match.pageIds);
            }
        } catch (e) {
            console.error('Status check failed:', e);
        } finally {
            setCheckingStatus(false);
        }
    };

    const handleBuild = async () => {
        if (!slug.trim()) {
            alert('Please enter a URL slug.');
            return;
        }
        setBuilding(true);
        try {
            const subcategories = (category.subcategories || []).map(s => ({
                id: s.id,
                name: s.name,
                slug: s.slug || s.name.toLowerCase().replace(/\s+/g, '-')
            }));

            const res = await fetch('/api/settings/appliances/build-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId: category.id,
                    slug: slug.trim(),
                    color,
                    icon_name: iconName,
                    subcategories
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✅ ${data.message}\n\nYou can now find these pages in:\n• Website Settings › Category Pages Settings\n• Website Settings › Sub Category Pages Settings\n• Website Settings › Sub Location Pages Settings`);
                await checkStatus();
                if (onBuilt) onBuilt();
            } else {
                alert('Failed: ' + data.error);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setBuilding(false);
        }
    };

    const isFullyBuilt = builtStatus && builtStatus.built === builtStatus.total && builtStatus.total > 0;
    const isPartiallyBuilt = builtStatus && builtStatus.built > 0 && builtStatus.built < builtStatus.total;

    return (
        <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    border: `2px solid ${isFullyBuilt ? '#10b981' : isPartiallyBuilt ? '#f59e0b' : '#6366f1'}`,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: isFullyBuilt ? '#10b98110' : isPartiallyBuilt ? '#f59e0b10' : '#6366f110',
                    color: isFullyBuilt ? '#10b981' : isPartiallyBuilt ? '#f59e0b' : '#6366f1',
                    cursor: 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    width: '100%',
                    justifyContent: 'space-between'
                }}
            >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={16} />
                    🌐 Page Builder
                    {builtStatus && (
                        <span style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '99px',
                            backgroundColor: isFullyBuilt ? '#10b981' : '#f59e0b',
                            color: 'white',
                            fontWeight: 700
                        }}>
                            {builtStatus.built}/{builtStatus.total} pages built
                        </span>
                    )}
                </span>
                {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {open && (
                <div style={{
                    marginTop: 'var(--spacing-md)',
                    padding: 'var(--spacing-lg)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-primary)',
                    display: 'grid',
                    gap: 'var(--spacing-md)'
                }}>
                    {/* URL Slug */}
                    <div>
                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
                            URL Slug <span style={{ color: 'var(--color-danger)', fontWeight: 400 }}>*</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>/services/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                                placeholder="e.g. dishwasher-repair"
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontFamily: 'monospace',
                                    backgroundColor: 'var(--bg-elevated)'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                            Also used for: /location/[loc]/{slug}
                        </p>
                    </div>

                    {/* Color & Icon Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
                                Admin Card Color
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {COLOR_PRESETS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setColor(c)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: c,
                                            border: color === c ? '3px solid white' : '2px solid transparent',
                                            outline: color === c ? `2px solid ${c}` : 'none',
                                            cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '6px' }}>
                                Admin Card Icon
                            </label>
                            <select
                                value={iconName}
                                onChange={e => setIconName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    backgroundColor: 'var(--bg-elevated)'
                                }}
                            >
                                {ICON_OPTIONS.map(ico => (
                                    <option key={ico} value={ico}>{ico}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Pages Preview */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
                            Pages that will be generated & registered:
                        </p>
                        <div style={{ display: 'grid', gap: '6px' }}>
                            <PreviewRow
                                label="1 Category Page"
                                url={`/services/${slug || '[slug]'}`}
                                builtCount={builtStatus ? (builtStatus.built >= 1 ? 1 : 0) : null}
                                total={1}
                            />
                            <PreviewRow
                                label={`${(category.subcategories || []).length} Sub-category Pages`}
                                url={`/services/${slug || '[slug]'}/[type]`}
                                builtCount={null}
                                total={(category.subcategories || []).length}
                            />
                            <PreviewRow
                                label="15 Sub-location Pages"
                                url={`/location/[area]/${slug || '[slug]'}`}
                                builtCount={null}
                                total={15}
                            />
                        </div>
                        {(category.subcategories || []).length === 0 && (
                            <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '8px' }}>
                                ⚠️ No appliance types added yet. Add types first, then build pages to include their sub-category settings.
                            </p>
                        )}
                    </div>

                    {/* Status / Action */}
                    {checkingStatus ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            Checking build status...
                        </div>
                    ) : (
                        <button
                            onClick={handleBuild}
                            disabled={building || !slug.trim()}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '12px 20px',
                                backgroundColor: building ? 'var(--bg-elevated)' : color,
                                color: building ? 'var(--text-secondary)' : 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: building || !slug.trim() ? 'not-allowed' : 'pointer',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 700,
                                opacity: !slug.trim() ? 0.6 : 1,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {building ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Construction size={18} />}
                            {building
                                ? 'Building pages...'
                                : isFullyBuilt
                                    ? '🔄 Rebuild & Refresh All Pages'
                                    : isPartiallyBuilt
                                        ? '⚠️ Complete Page Build'
                                        : '🚀 Build & Register All Pages'}
                        </button>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
                        This registers settings entries in Website Settings for each page and seeds default content. Safe to re-run — will not overwrite existing content.
                    </p>
                </div>
            )}
        </div>
    );
}

function PreviewRow({ label, url, builtCount, total }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={14} style={{ color: '#10b981' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{label}</span>
            </div>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-tertiary)', opacity: 0.8 }}>{url}</span>
        </div>
    );
}

function QuickBookingFormSettings() {
    const [settings, setSettings] = useState({
        title: 'Book A Technician Now',
        subtitle: 'Get same day service | Transparent pricing | Licensed technicians',
        serviceable_pincodes: [],
        valid_pincode_message: '✓ We serve here!',
        invalid_pincode_message: '✗ Not serviceable',
        help_text: 'We currently serve Mumbai areas. Call us for other locations.',
        categories: []
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pincodeText, setPincodeText] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedSubcategory, setExpandedSubcategory] = useState(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await quickBookingAPI.getSettings();
            if (data) {
                setSettings(data);
                setPincodeText((data.serviceable_pincodes || []).join(', '));
            }
        } catch (error) {
            console.error('Error fetching quick booking settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const pincodeArray = pincodeText.split(',').map(p => p.trim()).filter(p => !!p);
            const updatedSettings = { ...settings, serviceable_pincodes: pincodeArray };
            const data = await quickBookingAPI.updateSettings(updatedSettings);
            if (data) {
                alert('Settings saved successfully!');
                setSettings(data);
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const getAllSubcategories = () =>
        (settings.categories || []).flatMap(cat => cat.subcategories || []);

    const getAllIssues = () =>
        (settings.categories || []).flatMap(cat =>
            (cat.subcategories || []).flatMap(sub => sub.issues || [])
        );

    const toggleCategoryVisibility = (categoryId) => {
        setSettings({
            ...settings,
            categories: settings.categories.map(cat =>
                cat.id === categoryId ? { ...cat, showOnBookingForm: !cat.showOnBookingForm } : cat
            )
        });
    };

    const toggleSubcategoryVisibility = (subcategoryId) => {
        setSettings({
            ...settings,
            categories: settings.categories.map(cat => ({
                ...cat,
                subcategories: (cat.subcategories || []).map(sub =>
                    sub.id === subcategoryId ? { ...sub, showOnBookingForm: !sub.showOnBookingForm } : sub
                )
            }))
        });
    };

    const toggleIssueVisibility = (issueId) => {
        setSettings({
            ...settings,
            categories: settings.categories.map(cat => ({
                ...cat,
                subcategories: (cat.subcategories || []).map(sub => ({
                    ...sub,
                    issues: (sub.issues || []).map(issue =>
                        issue.id === issueId ? { ...issue, showOnBookingForm: !issue.showOnBookingForm } : issue
                    )
                }))
            }))
        });
    };

    const handleAddCategory = async () => {
        const name = prompt('Enter appliance name:');
        if (!name?.trim()) return;
        try {
            const result = await quickBookingAPI.createItem('category', {
                name: name.trim(),
                showOnBookingForm: true,
                displayOrder: settings.categories.length
            });
            if (result) { await fetchSettings(); alert('Appliance added successfully!'); }
        } catch (error) {
            alert(`Failed to add appliance: ${error.message}`);
        }
    };

    const handleRename = async (type, id, name) => {
        const newName = prompt('Rename to:', name);
        if (!newName?.trim() || newName === name) return;
        try {
            const result = await quickBookingAPI.updateItem(type, id, { name: newName.trim() });
            if (result) { await fetchSettings(); alert('Renamed!'); }
        } catch (e) { alert('Failed'); }
    };

    const handleDelete = async (type, id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try {
            await quickBookingAPI.deleteItem(type, id);
            await fetchSettings();
            alert('Deleted!');
        } catch (e) { alert('Failed to delete: ' + e.message); }
    };

    const handleAddSubcategory = async () => {
        const categoryOptions = settings.categories.map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n');
        const categorySelection = prompt(`Select appliance by number:\n\n${categoryOptions}`);
        if (!categorySelection) return;
        const categoryIndex = parseInt(categorySelection) - 1;
        if (categoryIndex < 0 || categoryIndex >= settings.categories.length) { alert('Invalid selection'); return; }
        const selectedCategory = settings.categories[categoryIndex];
        const name = prompt(`Enter appliance type name for "${selectedCategory.name}":`);
        if (!name?.trim()) return;
        try {
            const result = await quickBookingAPI.createItem('subcategory', {
                categoryId: selectedCategory.id,
                name: name.trim(),
                showOnBookingForm: true,
                displayOrder: (selectedCategory.subcategories || []).length
            });
            if (result) { await fetchSettings(); alert('Appliance type added successfully!'); }
        } catch (error) {
            alert(`Failed to add type: ${error.message}`);
        }
    };

    const handleAddIssue = async () => {
        const categoryOptions = settings.categories.map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n');
        const categorySelection = prompt(`Select appliance by number:\n\n${categoryOptions}`);
        if (!categorySelection) return;
        const categoryIndex = parseInt(categorySelection) - 1;
        if (categoryIndex < 0 || categoryIndex >= settings.categories.length) { alert('Invalid selection'); return; }
        const selectedCategory = settings.categories[categoryIndex];
        const subcategories = selectedCategory.subcategories || [];
        if (subcategories.length === 0) { alert(`No appliance types found for "${selectedCategory.name}". Please add a type first.`); return; }
        const subcategoryOptions = subcategories.map((sub, idx) => `${idx + 1}. ${sub.name}`).join('\n');
        const subcategorySelection = prompt(`Select appliance type by number:\n\n${subcategoryOptions}`);
        if (!subcategorySelection) return;
        const subcategoryIndex = parseInt(subcategorySelection) - 1;
        if (subcategoryIndex < 0 || subcategoryIndex >= subcategories.length) { alert('Invalid selection'); return; }
        const selectedSubcategory = subcategories[subcategoryIndex];
        const name = prompt(`Enter issue name for "${selectedSubcategory.name}":`);
        if (!name?.trim()) return;
        try {
            const result = await quickBookingAPI.createItem('issue', {
                subcategoryId: selectedSubcategory.id,
                name: name.trim(),
                showOnBookingForm: true,
                displayOrder: (selectedSubcategory.issues || []).length
            });
            if (result) { await fetchSettings(); alert('Issue added successfully!'); }
        } catch (error) {
            alert(`Failed to add issue: ${error.message}`);
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Quick Booking Form Settings
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Configure booking form content and build frontend pages for each appliance
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: '10px 24px' }}
                >
                    {saving ? <Loader2 className="animate-spin" size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                    {saving ? 'Saving...' : 'Save All Changes'}
                </button>
            </div>

            {/* Sub-tab Navigation */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--border-primary)' }}>
                {[
                    { id: 'general', icon: Calendar, label: 'General & Pin' },
                    { id: 'categories', icon: Package, label: 'Appliances', count: settings.categories?.length },
                    { id: 'subcategories', icon: Layers, label: 'Appliance Types', count: getAllSubcategories().length },
                    { id: 'issues', icon: AlertCircle, label: 'All Issues', count: getAllIssues().length }
                ].map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                border: 'none',
                                borderBottom: activeTab === tab.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                                backgroundColor: activeTab === tab.id ? 'var(--color-primary)10' : 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-xs)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: activeTab === tab.id ? 600 : 400,
                                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)'
                            }}
                        >
                            <Icon size={16} />
                            {tab.label} {tab.count !== undefined && `(${tab.count})`}
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                    <Loader2 size={48} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <>
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <>
                            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Form Appearance</h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Form Title</label>
                                        <input type="text" value={settings.title} onChange={(e) => setSettings({ ...settings, title: e.target.value })} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Form Sub-title</label>
                                        <textarea value={settings.subtitle} onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })} rows={2} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', resize: 'vertical' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Serviceable Pincodes</h4>
                                <textarea value={pincodeText} onChange={(e) => setPincodeText(e.target.value)} placeholder="400001, 400002, 400003..." rows={4} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace', resize: 'vertical' }} />
                                <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Total pincodes: {pincodeText.split(',').map(p => p.trim()).filter(p => !!p).length}
                                </div>
                            </div>
                            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Validation Messages</h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Valid Pincode Message</label>
                                        <input type="text" value={settings.valid_pincode_message} onChange={(e) => setSettings({ ...settings, valid_pincode_message: e.target.value })} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Invalid Pincode Message</label>
                                        <input type="text" value={settings.invalid_pincode_message} onChange={(e) => setSettings({ ...settings, invalid_pincode_message: e.target.value })} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>Help Text</label>
                                        <input type="text" value={settings.help_text} onChange={(e) => setSettings({ ...settings, help_text: e.target.value })} style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Appliances (Categories) Tab — now with Page Builder */}
                    {activeTab === 'categories' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            {/* Info banner about page builder */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: 'var(--spacing-md)',
                                backgroundColor: '#6366f110',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid #6366f130'
                            }}>
                                <Globe size={20} style={{ color: '#6366f1', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: '0 0 4px 0', color: '#6366f1' }}>
                                        🚀 Page Builder Available
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                        Each appliance has a <strong>🌐 Page Builder</strong> panel. Use it to register settings for all category, sub-category, and sub-location pages in Website Settings — so you can edit their content from the admin panel.
                                    </p>
                                </div>
                            </div>

                            <button onClick={handleAddCategory} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Plus size={18} /> Add New Appliance
                            </button>

                            {settings.categories.map(category => (
                                <div
                                    key={category.id}
                                    className="card"
                                    style={{
                                        padding: 'var(--spacing-lg)',
                                        border: category.showOnBookingForm ? '2px solid #10b981' : '1px solid var(--border-primary)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>
                                                {category.name}
                                            </h4>
                                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                                {(category.subcategories || []).length} types
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <button onClick={() => handleRename('category', category.id, category.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }} title="Rename">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete('category', category.id, category.name)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }} title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => toggleCategoryVisibility(category.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)',
                                                    padding: 'var(--spacing-sm) var(--spacing-md)', border: 'none',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: category.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                    color: category.showOnBookingForm ? '#10b981' : '#ef4444',
                                                    cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: 500
                                                }}
                                            >
                                                {category.showOnBookingForm ? <Eye size={14} /> : <EyeOff size={14} />}
                                                {category.showOnBookingForm ? 'Visible' : 'Hidden'}
                                            </button>
                                            <button
                                                onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                                                className="btn btn-secondary"
                                                style={{ padding: '6px 12px' }}
                                            >
                                                {expandedCategory === category.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedCategory === category.id && (
                                        <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                                Managing types for {category.name}:
                                            </h5>
                                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                                {(category.subcategories || []).map(sub => (
                                                    <div key={sub.id} style={{ padding: 'var(--spacing-sm)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{sub.name} ({(sub.issues || []).length} issues)</span>
                                                        <button onClick={() => toggleSubcategoryVisibility(sub.id)} style={{ padding: '4px 8px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: sub.showOnBookingForm ? '#10b98115' : '#ef444415', color: sub.showOnBookingForm ? '#10b981' : '#ef4444', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                                                            {sub.showOnBookingForm ? 'Visible' : 'Hidden'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Page Builder Panel ── */}
                                    <PageBuilderPanel
                                        category={category}
                                        onBuilt={fetchSettings}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Subcategories Tab */}
                    {activeTab === 'subcategories' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <button onClick={handleAddSubcategory} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Plus size={18} /> Add New Type
                            </button>
                            {settings.categories.map(category => (
                                <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>{category.name}</h4>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        {(category.subcategories || []).map(sub => (
                                            <div key={sub.id} style={{ padding: 'var(--spacing-md)', border: sub.showOnBookingForm ? '2px solid #10b981' : '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>{sub.name}</h5>
                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>{(sub.issues || []).length} issues</p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                        <button onClick={() => handleRename('subcategory', sub.id, sub.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }}><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDelete('subcategory', sub.id, sub.name)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}><Trash2 size={14} /></button>
                                                        <button onClick={() => toggleSubcategoryVisibility(sub.id)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)', border: 'none', borderRadius: 'var(--radius-md)', backgroundColor: sub.showOnBookingForm ? '#10b98115' : '#ef444415', color: sub.showOnBookingForm ? '#10b981' : '#ef4444', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                                                            {sub.showOnBookingForm ? <Eye size={12} /> : <EyeOff size={12} />}
                                                            {sub.showOnBookingForm ? 'Visible' : 'Hidden'}
                                                        </button>
                                                        <button onClick={() => setExpandedSubcategory(expandedSubcategory === sub.id ? null : sub.id)} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                                                            {expandedSubcategory === sub.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                {expandedSubcategory === sub.id && (
                                                    <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                                                        <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                                            {(sub.issues || []).map(issue => (
                                                                <div key={issue.id} style={{ padding: 'var(--spacing-xs)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <span style={{ fontSize: 'var(--font-size-xs)' }}>{issue.name}</span>
                                                                    <button onClick={() => toggleIssueVisibility(issue.id)} style={{ padding: '2px 6px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: issue.showOnBookingForm ? '#10b98115' : '#ef444415', color: issue.showOnBookingForm ? '#10b981' : '#ef4444', cursor: 'pointer', fontSize: '10px', fontWeight: 500 }}>
                                                                        {issue.showOnBookingForm ? '✓' : '✗'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Issues Tab */}
                    {activeTab === 'issues' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <button onClick={handleAddIssue} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Plus size={18} /> Add New Issue
                            </button>
                            {settings.categories.map(category => (
                                <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>{category.name}</h4>
                                    {(category.subcategories || []).map(sub => (
                                        <div key={sub.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>{sub.name}</h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                                {(sub.issues || []).map(issue => (
                                                    <div key={issue.id} style={{ padding: 'var(--spacing-sm)', border: issue.showOnBookingForm ? '1px solid #10b981' : '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: 'var(--font-size-sm)', flex: 1 }}>{issue.name}</span>
                                                        <button onClick={() => toggleIssueVisibility(issue.id)} style={{ padding: '4px 8px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: issue.showOnBookingForm ? '#10b98115' : '#ef444415', color: issue.showOnBookingForm ? '#10b981' : '#ef4444', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                                                            {issue.showOnBookingForm ? <Eye size={12} /> : <EyeOff size={12} />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default QuickBookingFormSettings;
