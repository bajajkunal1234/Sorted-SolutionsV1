'use client'

import { useState, useEffect } from 'react';
import {
    Calendar, Plus, Trash2, Edit2, Save, X, Upload, Loader2,
    Package, Layers, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp,
    Globe, CheckCircle, Construction, Settings2, Tag
} from 'lucide-react';
import { quickBookingAPI } from '@/lib/adminAPI';

// Removed PageBuilderPanel from here. It is now a standalone tool in the Reports tab.

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
    const [newPincode, setNewPincode] = useState({ pincode: '', locality: '', appliances: [] });
    const [activeTab, setActiveTab] = useState('general');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedSubcategory, setExpandedSubcategory] = useState(null);

    // ── Issue pricing inline editor ────────────────────────────────────────────
    // editingPrice: { issueId, price, price_label } | null
    const [editingPrice, setEditingPrice] = useState(null);
    const [savingPrice, setSavingPrice] = useState(false);

    const openPriceEditor = (issue) => {
        setEditingPrice({
            issueId: issue.id,
            price: issue.price !== null && issue.price !== undefined ? String(issue.price) : '',
            price_label: issue.price_label || 'Starting from',
        });
    };

    const savePriceForIssue = async () => {
        if (!editingPrice) return;
        setSavingPrice(true);
        try {
            const res = await fetch('/api/settings/quick-booking', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'issue',
                    id: editingPrice.issueId,
                    data: {
                        price: editingPrice.price === '' ? null : editingPrice.price,
                        price_label: editingPrice.price_label
                    }
                })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            // Update local state so the badge reflects immediately
            setSettings(prev => ({
                ...prev,
                categories: prev.categories.map(cat => ({
                    ...cat,
                    subcategories: (cat.subcategories || []).map(sub => ({
                        ...sub,
                        issues: (sub.issues || []).map(issue =>
                            issue.id === editingPrice.issueId
                                ? { ...issue, price: editingPrice.price === '' ? null : Number(editingPrice.price), price_label: editingPrice.price_label }
                                : issue
                        )
                    }))
                }))
            }));
            setEditingPrice(null);
        } catch (e) {
            alert('Failed to save price: ' + e.message);
        } finally {
            setSavingPrice(false);
        }
    };

    // ── Brands ────────────────────────────────────────────────────────────────
    const [brands, setBrands] = useState([]);
    const [brandsLoading, setBrandsLoading] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [brandsSaving, setBrandsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchBrands();
    }, []);

    const fetchBrands = async () => {
        setBrandsLoading(true);
        try {
            const res = await fetch('/api/settings/booking-brands');
            const data = await res.json();
            if (data.success) setBrands(data.data || []);
        } catch (e) {
            console.error('Error fetching brands:', e);
        } finally {
            setBrandsLoading(false);
        }
    };

    const handleAddBrand = async () => {
        if (!newBrandName.trim()) return;
        setBrandsSaving(true);
        try {
            const res = await fetch('/api/settings/booking-brands', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBrandName.trim() })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            setNewBrandName('');
            await fetchBrands();
        } catch (e) {
            alert('Failed to add brand: ' + e.message);
        } finally {
            setBrandsSaving(false);
        }
    };

    const handleDeleteBrand = async (id, name) => {
        if (!confirm(`Delete brand "${name}"?`)) return;
        try {
            const res = await fetch('/api/settings/booking-brands', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            await fetchBrands();
        } catch (e) {
            alert('Failed to delete brand: ' + e.message);
        }
    };

    const handleToggleBrand = async (id, currentActive) => {
        try {
            const res = await fetch('/api/settings/booking-brands', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, is_active: !currentActive })
            });
            const result = await res.json();
            if (!result.success) throw new Error(result.error);
            await fetchBrands();
        } catch (e) {
            alert('Failed to update brand: ' + e.message);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await quickBookingAPI.getSettings();
            if (data) {
                setSettings(data);
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
            // Ensure legacy serviceable_pincodes stays somewhat in sync with advanced list
            const advancedArray = settings.advanced_pincodes || [];
            const legacyArray = advancedArray.map(ap => ap.pincode);
            const updatedSettings = { ...settings, serviceable_pincodes: legacyArray };

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
            // Automatically generate a basic slug to ensure DB constraints are happy and page builder has a starting point
            const slug = name.toLowerCase().trim().replace(/\s+/g, '-') + '-repair';
            const result = await quickBookingAPI.createItem('category', {
                name: name.trim(),
                slug: slug,
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
            // Generate sub-slug
            const slug = name.toLowerCase().trim().replace(/\s+/g, '-');
            const result = await quickBookingAPI.createItem('subcategory', {
                categoryId: selectedCategory.id,
                name: name.trim(),
                slug: slug,
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
                    { id: 'issues', icon: AlertCircle, label: 'All Issues', count: getAllIssues().length },
                    { id: 'brands', icon: Tag, label: 'Brands', count: brands.length }
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
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Serviceable Area Pincodes</h4>

                                {/* Add new pincode form */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr) minmax(0, 2fr) auto', gap: '8px', alignItems: 'end', marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Pincode *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 400063"
                                            value={newPincode.pincode}
                                            onChange={e => setNewPincode({ ...newPincode, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Locality Name *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Goregaon East"
                                            value={newPincode.locality}
                                            onChange={e => setNewPincode({ ...newPincode, locality: e.target.value })}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Allowed Appliances</label>
                                        <div style={{ padding: '4px 0' }}>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={newPincode.appliances.length === 0}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setNewPincode({ ...newPincode, appliances: [] });
                                                        }}
                                                    /> All
                                                </label>
                                                {(settings.categories || []).map(cat => (
                                                    <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newPincode.appliances.includes(String(cat.id))}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setNewPincode(prev => ({
                                                                    ...prev,
                                                                    appliances: checked
                                                                        ? [...prev.appliances, String(cat.id)]
                                                                        : prev.appliances.filter(id => id !== String(cat.id))
                                                                }));
                                                            }}
                                                        /> {cat.name}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: '8px 16px', height: '37px' }}
                                        disabled={newPincode.pincode.length < 6 || !newPincode.locality.trim()}
                                        onClick={() => {
                                            const newEntry = {
                                                pincode: newPincode.pincode,
                                                locality: newPincode.locality.trim(),
                                                appliances: [...newPincode.appliances]
                                            };
                                            const exists = (settings.advanced_pincodes || []).findIndex(p => p.pincode === newEntry.pincode);
                                            let updatedList = [...(settings.advanced_pincodes || [])];
                                            if (exists >= 0) {
                                                updatedList[exists] = newEntry; // update if exists
                                            } else {
                                                updatedList.push(newEntry);
                                            }
                                            setSettings({ ...settings, advanced_pincodes: updatedList });
                                            setNewPincode({ pincode: '', locality: '', appliances: [] });
                                        }}
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* List of active pincodes */}
                                <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 2fr 40px', gap: '12px', padding: '10px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                        <div>Pincode</div>
                                        <div>Locality Name</div>
                                        <div>Allowed Appliances</div>
                                        <div style={{ textAlign: 'right' }}></div>
                                    </div>

                                    {(settings.advanced_pincodes || []).length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                            No pincodes added yet. Add one above.
                                        </div>
                                    ) : (
                                        (settings.advanced_pincodes || []).map((pinData, idx) => (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1.5fr 2fr 40px', gap: '12px', padding: '10px 16px', borderBottom: idx < settings.advanced_pincodes.length - 1 ? '1px solid var(--border-primary)' : 'none', alignItems: 'center', fontSize: '13px' }}>
                                                <div style={{ fontWeight: 600 }}>{pinData.pincode}</div>
                                                <div>{pinData.locality}</div>
                                                <div style={{ color: 'var(--text-secondary)' }}>
                                                    {pinData.appliances?.length > 0
                                                        ? pinData.appliances.map(id => settings.categories?.find(c => String(c.id) === String(id))?.name || `ID:${id}`).join(', ')
                                                        : <span style={{ color: '#10b981', fontWeight: 500 }}>All Appliances</span>
                                                    }
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => {
                                                            const updated = settings.advanced_pincodes.filter((_, i) => i !== idx);
                                                            setSettings({ ...settings, advanced_pincodes: updated });
                                                        }}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                        title="Remove pincode"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    Total serviceable pincodes: {(settings.advanced_pincodes || []).length}
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
                            {/* Info banner about page builder removed from here */}
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
                                        🚀 Page Builder Tool
                                    </p>
                                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                        Seeding and building frontend pages is now handled by the standalone <strong>Page Builder Tool</strong> in the <b>Reports</b> tab.
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

                                    {/* ── Page Builder Panel Removed ── */}
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

                            {/* Pricing info banner */}
                            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: '#10b98110', borderRadius: 'var(--radius-md)', border: '1px solid #10b98130', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                💰 Click the <strong>₹ Add Price</strong> button on any issue to set a repair estimate. This price is shown to customers in the new <strong>Step 4 — Fee Preview</strong> of the booking form. Prices are optional — issues without a price show "Price shared after diagnosis".
                            </div>

                            {settings.categories.map(category => (
                                <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>{category.name}</h4>
                                    {(category.subcategories || []).map(sub => (
                                        <div key={sub.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)', paddingBottom: '4px', borderBottom: '1px solid var(--border-primary)' }}>{sub.name}</h5>
                                            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                                {(sub.issues || []).map(issue => (
                                                    <div key={issue.id}>
                                                        {/* Issue row */}
                                                        <div style={{
                                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                                            border: issue.showOnBookingForm ? '1px solid #10b981' : '1px solid var(--border-primary)',
                                                            borderRadius: editingPrice?.issueId === issue.id ? 'var(--radius-md) var(--radius-md) 0 0' : 'var(--radius-md)',
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: 'var(--spacing-sm)'
                                                        }}>
                                                            {/* Name + price badge */}
                                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                                <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, flex: 1 }}>{issue.name}</span>
                                                                {issue.price != null ? (
                                                                    <span style={{
                                                                        fontSize: '11px', fontWeight: 700,
                                                                        padding: '2px 8px', borderRadius: '20px',
                                                                        backgroundColor: '#10b98115', color: '#059669',
                                                                        whiteSpace: 'nowrap', flexShrink: 0
                                                                    }}>
                                                                        {issue.price_label} ₹{Number(issue.price).toLocaleString('en-IN')}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{
                                                                        fontSize: '11px', padding: '2px 8px', borderRadius: '20px',
                                                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)',
                                                                        whiteSpace: 'nowrap', flexShrink: 0
                                                                    }}>No price</span>
                                                                )}
                                                            </div>
                                                            {/* Actions */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                                <button
                                                                    onClick={() => editingPrice?.issueId === issue.id ? setEditingPrice(null) : openPriceEditor(issue)}
                                                                    title="Set price"
                                                                    style={{
                                                                        padding: '4px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                                                                        backgroundColor: editingPrice?.issueId === issue.id ? '#f97316' : (issue.price != null ? '#10b98115' : '#3b82f615'),
                                                                        color: editingPrice?.issueId === issue.id ? 'white' : (issue.price != null ? '#059669' : '#3b82f6'),
                                                                        cursor: 'pointer', fontSize: '12px', fontWeight: 600
                                                                    }}
                                                                >
                                                                    {editingPrice?.issueId === issue.id ? '✕ Cancel' : (issue.price != null ? '₹ Edit' : '₹ Add Price')}
                                                                </button>
                                                                <button onClick={() => handleRename('issue', issue.id, issue.name)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px' }} title="Rename">
                                                                    <Edit2 size={13} />
                                                                </button>
                                                                <button onClick={() => handleDelete('issue', issue.id, issue.name)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }} title="Delete">
                                                                    <Trash2 size={13} />
                                                                </button>
                                                                <button onClick={() => toggleIssueVisibility(issue.id)} style={{ padding: '4px 8px', border: 'none', borderRadius: 'var(--radius-sm)', backgroundColor: issue.showOnBookingForm ? '#10b98115' : '#ef444415', color: issue.showOnBookingForm ? '#10b981' : '#ef4444', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500 }}>
                                                                    {issue.showOnBookingForm ? <Eye size={12} /> : <EyeOff size={12} />}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Inline price editor — shown only for the issue being edited */}
                                                        {editingPrice?.issueId === issue.id && (
                                                            <div style={{
                                                                padding: 'var(--spacing-md)',
                                                                backgroundColor: '#f97316' + '08',
                                                                border: '1px solid #f9731630',
                                                                borderTop: 'none',
                                                                borderRadius: '0 0 var(--radius-md) var(--radius-md)',
                                                                display: 'grid',
                                                                gridTemplateColumns: '1fr 1fr auto',
                                                                gap: 'var(--spacing-sm)',
                                                                alignItems: 'end'
                                                            }}>
                                                                {/* Amount input */}
                                                                <div>
                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>PRICE (₹)</label>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="50"
                                                                        placeholder="e.g. 500"
                                                                        value={editingPrice.price}
                                                                        onChange={e => setEditingPrice(prev => ({ ...prev, price: e.target.value }))}
                                                                        autoFocus
                                                                        style={{
                                                                            width: '100%', padding: '8px 10px',
                                                                            border: '1px solid #f97316',
                                                                            borderRadius: 'var(--radius-md)',
                                                                            fontSize: 'var(--font-size-sm)',
                                                                            backgroundColor: 'var(--bg-elevated)',
                                                                            color: 'var(--text-primary)'
                                                                        }}
                                                                    />
                                                                </div>
                                                                {/* Label selector */}
                                                                <div>
                                                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>PRICE LABEL</label>
                                                                    <select
                                                                        value={editingPrice.price_label}
                                                                        onChange={e => setEditingPrice(prev => ({ ...prev, price_label: e.target.value }))}
                                                                        style={{
                                                                            width: '100%', padding: '8px 10px',
                                                                            border: '1px solid #f97316',
                                                                            borderRadius: 'var(--radius-md)',
                                                                            fontSize: 'var(--font-size-sm)',
                                                                            backgroundColor: 'var(--bg-elevated)',
                                                                            color: 'var(--text-primary)',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {['Starting from', 'Fixed', 'Up to', 'Approx.'].map(opt => (
                                                                            <option key={opt} value={opt} style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>{opt}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                {/* Save / Clear */}
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    <button
                                                                        onClick={savePriceForIssue}
                                                                        disabled={savingPrice}
                                                                        className="btn btn-primary"
                                                                        style={{ padding: '8px 14px', backgroundColor: '#f97316', borderColor: '#f97316', fontSize: 'var(--font-size-sm)' }}
                                                                    >
                                                                        {savingPrice ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                                                                        Save
                                                                    </button>
                                                                    {issue.price != null && (
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingPrice(prev => ({ ...prev, price: '' }));
                                                                                setTimeout(savePriceForIssue, 0);
                                                                            }}
                                                                            className="btn"
                                                                            style={{ padding: '8px 10px', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
                                                                        >
                                                                            Clear
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {(sub.issues || []).length === 0 && (
                                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: 'var(--spacing-xs)' }}>No issues</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Brands Tab */}
                    {activeTab === 'brands' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            {/* Add Brand */}
                            <div className="card" style={{ padding: 'var(--spacing-md)', border: '2px dashed #f97316', backgroundColor: '#f9731608' }}>
                                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: '#ea580c' }}>Add New Brand</h4>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <input
                                        type="text"
                                        placeholder="e.g. Samsung, LG, Whirlpool..."
                                        value={newBrandName}
                                        onChange={e => setNewBrandName(e.target.value)}
                                        onKeyPress={e => e.key === 'Enter' && handleAddBrand()}
                                        style={{
                                            flex: 1,
                                            padding: 'var(--spacing-sm)',
                                            border: '1px solid #f97316',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 'var(--font-size-sm)'
                                        }}
                                    />
                                    <button
                                        onClick={handleAddBrand}
                                        disabled={brandsSaving || !newBrandName.trim()}
                                        className="btn btn-primary"
                                        style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ea580c', borderColor: '#ea580c' }}
                                    >
                                        {brandsSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                                        Add Brand
                                    </button>
                                </div>
                            </div>

                            {/* Brand list */}
                            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>
                                        🏷️ Brand List
                                    </h4>
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', padding: '4px 10px', backgroundColor: '#f9731620', borderRadius: 'var(--radius-sm)', color: '#ea580c', fontWeight: 600 }}>
                                        {brands.filter(b => b.is_active).length} active
                                    </span>
                                </div>
                                {brandsLoading ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: 'var(--spacing-lg)', justifyContent: 'center' }}>
                                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>Loading brands...</span>
                                    </div>
                                ) : brands.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                        No brands added yet. Add your first brand above.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                        {brands.map(brand => (
                                            <div key={brand.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-sm)',
                                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                                backgroundColor: brand.is_active ? '#f9731608' : 'var(--bg-secondary)',
                                                border: `1px solid ${brand.is_active ? '#f97316' : 'var(--border-primary)'}`,
                                                borderRadius: 'var(--radius-md)',
                                                opacity: brand.is_active ? 1 : 0.6
                                            }}>
                                                <span style={{ fontSize: '1em' }}>🏷️</span>
                                                <span style={{ flex: 1, fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>{brand.name}</span>
                                                <button
                                                    onClick={() => handleToggleBrand(brand.id, brand.is_active)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '4px',
                                                        padding: '4px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: brand.is_active ? '#10b98115' : '#ef444415',
                                                        color: brand.is_active ? '#10b981' : '#ef4444',
                                                        cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 500
                                                    }}
                                                >
                                                    {brand.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                                                    {brand.is_active ? 'Active' : 'Hidden'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteBrand(brand.id, brand.name)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '4px' }}
                                                    title="Delete brand"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Note */}
                            <div style={{ padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: '#3b82f610', borderRadius: 'var(--radius-md)', border: '1px solid #3b82f630', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                ℹ️ Brands marked as <strong>Active</strong> will appear in the Brand dropdown on the website booking form. The brand the customer selects is saved with the booking request.
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default QuickBookingFormSettings;
