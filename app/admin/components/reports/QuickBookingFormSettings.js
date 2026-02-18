'use client'

import { useState, useEffect } from 'react';
import {
    Calendar, Plus, Trash2, Edit2, Save, X, Upload, Loader2,
    Package, Layers, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp
} from 'lucide-react';
import { quickBookingAPI } from '@/lib/adminAPI';

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
            const updatedSettings = {
                ...settings,
                serviceable_pincodes: pincodeArray
            };

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

    // --- Hierarchical Management Logic ---

    const getAllSubcategories = () => {
        return (settings.categories || []).flatMap(cat => cat.subcategories || []);
    };

    const getAllIssues = () => {
        return (settings.categories || []).flatMap(cat =>
            (cat.subcategories || []).flatMap(sub => sub.issues || [])
        );
    };

    const toggleCategoryVisibility = (categoryId) => {
        setSettings({
            ...settings,
            categories: settings.categories.map(cat =>
                cat.id === categoryId
                    ? { ...cat, showOnBookingForm: !cat.showOnBookingForm }
                    : cat
            )
        });
    };

    const toggleSubcategoryVisibility = (subcategoryId) => {
        setSettings({
            ...settings,
            categories: settings.categories.map(cat => ({
                ...cat,
                subcategories: (cat.subcategories || []).map(sub =>
                    sub.id === subcategoryId
                        ? { ...sub, showOnBookingForm: !sub.showOnBookingForm }
                        : sub
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
                        issue.id === issueId
                            ? { ...issue, showOnBookingForm: !issue.showOnBookingForm }
                            : issue
                    )
                }))
            }))
        });
    };

    // CRUD Operations
    const handleAddCategory = async () => {
        const name = prompt('Enter appliance name:');
        if (!name?.trim()) return;

        try {
            const result = await quickBookingAPI.createItem('category', {
                name: name.trim(),
                showOnBookingForm: true,
                displayOrder: settings.categories.length
            });

            if (result) {
                await fetchSettings();
                alert('Appliance added successfully!');
            }
        } catch (error) {
            console.error('Error adding appliance:', error);
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
            const result = await quickBookingAPI.deleteItem(type, id);
            if (result) { await fetchSettings(); alert('Deleted!'); }
        } catch (e) { alert('Failed'); }
    };

    const handleAddSubcategory = async () => {
        // Get list of categories for selection
        const categoryOptions = settings.categories.map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n');
        const categorySelection = prompt(`Select appliance by number:\n\n${categoryOptions}`);

        if (!categorySelection) return;
        const categoryIndex = parseInt(categorySelection) - 1;

        if (categoryIndex < 0 || categoryIndex >= settings.categories.length) {
            alert('Invalid selection');
            return;
        }

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

            if (result) {
                await fetchSettings();
                alert('Appliance type added successfully!');
            }
        } catch (error) {
            console.error('Error adding type:', error);
            alert(`Failed to add type: ${error.message}`);
        }
    };

    const handleAddIssue = async () => {
        // Get list of categories
        const categoryOptions = settings.categories.map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n');
        const categorySelection = prompt(`Select appliance by number:\n\n${categoryOptions}`);

        if (!categorySelection) return;
        const categoryIndex = parseInt(categorySelection) - 1;

        if (categoryIndex < 0 || categoryIndex >= settings.categories.length) {
            alert('Invalid selection');
            return;
        }

        const selectedCategory = settings.categories[categoryIndex];

        // Get list of subcategories for selected category
        const subcategories = selectedCategory.subcategories || [];
        if (subcategories.length === 0) {
            alert(`No appliance types found for "${selectedCategory.name}". Please add a type first.`);
            return;
        }

        const subcategoryOptions = subcategories.map((sub, idx) => `${idx + 1}. ${sub.name}`).join('\n');
        const subcategorySelection = prompt(`Select appliance type by number:\n\n${subcategoryOptions}`);

        if (!subcategorySelection) return;
        const subcategoryIndex = parseInt(subcategorySelection) - 1;

        if (subcategoryIndex < 0 || subcategoryIndex >= subcategories.length) {
            alert('Invalid selection');
            return;
        }

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

            if (result) {
                await fetchSettings();
                alert('Issue added successfully!');
            }
        } catch (error) {
            console.error('Error adding issue:', error);
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
                        Configure content, messages, and appliance/issue hierarchy for the booking form
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
                    <Loader2 className="animate-spin text-primary" size={48} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (
                <>
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <>
                            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                    Form Appearance
                                </h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Form Title
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.title}
                                            onChange={(e) => setSettings({ ...settings, title: e.target.value })}
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
                                            Form Sub-title
                                        </label>
                                        <textarea
                                            value={settings.subtitle}
                                            onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
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
                                </div>
                            </div>

                            <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                    Serviceable Pincodes
                                </h4>
                                <textarea
                                    value={pincodeText}
                                    onChange={(e) => setPincodeText(e.target.value)}
                                    placeholder="400001, 400002, 400003..."
                                    rows={4}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--spacing-sm)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontFamily: 'monospace',
                                        resize: 'vertical'
                                    }}
                                />
                                <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    Total pincodes: {pincodeText.split(',').map(p => p.trim()).filter(p => !!p).length}
                                </div>
                            </div>

                            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                                    Validation Messages
                                </h4>
                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                            Valid Pincode Message
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.valid_pincode_message}
                                            onChange={(e) => setSettings({ ...settings, valid_pincode_message: e.target.value })}
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
                                            Invalid Pincode Message
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.invalid_pincode_message}
                                            onChange={(e) => setSettings({ ...settings, invalid_pincode_message: e.target.value })}
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
                                            Help Text (shown for invalid pincodes)
                                        </label>
                                        <input
                                            type="text"
                                            value={settings.help_text}
                                            onChange={(e) => setSettings({ ...settings, help_text: e.target.value })}
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
                        </>
                    )}

                    {/* Appliances (Categories) Tab */}
                    {activeTab === 'categories' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
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
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-xs)',
                                                    padding: 'var(--spacing-sm) var(--spacing-md)',
                                                    border: 'none',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: category.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                    color: category.showOnBookingForm ? '#10b981' : '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--font-size-sm)',
                                                    fontWeight: 500
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
                                                    <div
                                                        key={sub.id}
                                                        style={{
                                                            padding: 'var(--spacing-sm)',
                                                            backgroundColor: 'var(--bg-secondary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{sub.name} ({(sub.issues || []).length} issues)</span>
                                                        <button
                                                            onClick={() => toggleSubcategoryVisibility(sub.id)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-sm)',
                                                                backgroundColor: sub.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                                color: sub.showOnBookingForm ? '#10b981' : '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {sub.showOnBookingForm ? 'Visible' : 'Hidden'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Subcategories (Types) Tab */}
                    {activeTab === 'subcategories' && (
                        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                            <button onClick={handleAddSubcategory} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Plus size={18} /> Add New Type
                            </button>
                            {settings.categories.map(category => (
                                <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
                                        {category.name}
                                    </h4>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        {(category.subcategories || []).map(sub => (
                                            <div
                                                key={sub.id}
                                                style={{
                                                    padding: 'var(--spacing-md)',
                                                    border: sub.showOnBookingForm ? '2px solid #10b981' : '1px solid var(--border-primary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: 'var(--bg-elevated)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, margin: '0 0 var(--spacing-xs) 0' }}>
                                                            {sub.name}
                                                        </h5>
                                                        <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>
                                                            {(sub.issues || []).length} issues
                                                        </p>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                                        <button
                                                            onClick={() => toggleSubcategoryVisibility(sub.id)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 'var(--spacing-xs)',
                                                                padding: 'var(--spacing-xs) var(--spacing-sm)',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-md)',
                                                                backgroundColor: sub.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                                color: sub.showOnBookingForm ? '#10b981' : '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            {sub.showOnBookingForm ? <Eye size={12} /> : <EyeOff size={12} />}
                                                            {sub.showOnBookingForm ? 'Visible' : 'Hidden'}
                                                        </button>
                                                        <button
                                                            onClick={() => setExpandedSubcategory(expandedSubcategory === sub.id ? null : sub.id)}
                                                            className="btn btn-secondary"
                                                            style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                                                        >
                                                            {expandedSubcategory === sub.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedSubcategory === sub.id && (
                                                    <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                                                        <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                                            {(sub.issues || []).map(issue => (
                                                                <div
                                                                    key={issue.id}
                                                                    style={{
                                                                        padding: 'var(--spacing-xs)',
                                                                        backgroundColor: 'var(--bg-secondary)',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'center'
                                                                    }}
                                                                >
                                                                    <span style={{ fontSize: 'var(--font-size-xs)' }}>{issue.name}</span>
                                                                    <button
                                                                        onClick={() => toggleIssueVisibility(issue.id)}
                                                                        style={{
                                                                            padding: '2px 6px',
                                                                            border: 'none',
                                                                            borderRadius: 'var(--radius-sm)',
                                                                            backgroundColor: issue.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                                            color: issue.showOnBookingForm ? '#10b981' : '#ef4444',
                                                                            cursor: 'pointer',
                                                                            fontSize: '10px',
                                                                            fontWeight: 500
                                                                        }}
                                                                    >
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
                                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
                                        {category.name}
                                    </h4>
                                    {(category.subcategories || []).map(sub => (
                                        <div key={sub.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                                            <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                                {sub.name}
                                            </h5>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                                {(sub.issues || []).map(issue => (
                                                    <div
                                                        key={issue.id}
                                                        style={{
                                                            padding: 'var(--spacing-sm)',
                                                            border: issue.showOnBookingForm ? '1px solid #10b981' : '1px solid var(--border-primary)',
                                                            borderRadius: 'var(--radius-md)',
                                                            backgroundColor: 'var(--bg-elevated)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <span style={{ fontSize: 'var(--font-size-sm)', flex: 1 }}>{issue.name}</span>
                                                        <button
                                                            onClick={() => toggleIssueVisibility(issue.id)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-sm)',
                                                                backgroundColor: issue.showOnBookingForm ? '#10b98115' : '#ef444415',
                                                                color: issue.showOnBookingForm ? '#10b981' : '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 500
                                                            }}
                                                        >
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
