'use client'

import { useState } from 'react';
import { Package, Layers, AlertCircle, Eye, EyeOff, ChevronDown, ChevronUp, Save } from 'lucide-react';

function IssuesManagement() {
    const [activeTab, setActiveTab] = useState('categories');
    const [expandedCategory, setExpandedCategory] = useState(null);
    const [expandedSubcategory, setExpandedSubcategory] = useState(null);

    // Default hierarchical data structure
    const [data, setData] = useState({
        categories: [
            {
                id: 1,
                name: 'Refrigerator',
                showOnBookingForm: true,
                order: 1,
                subcategories: [
                    {
                        id: 1,
                        name: 'Single Door',
                        categoryId: 1,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 1, name: 'Not Cooling', subcategoryId: 1, showOnBookingForm: true, order: 1 },
                            { id: 2, name: 'Ice Formation', subcategoryId: 1, showOnBookingForm: true, order: 2 },
                            { id: 3, name: 'Water Leakage', subcategoryId: 1, showOnBookingForm: true, order: 3 },
                            { id: 4, name: 'Strange Noise', subcategoryId: 1, showOnBookingForm: true, order: 4 },
                            { id: 5, name: 'Door Not Closing', subcategoryId: 1, showOnBookingForm: true, order: 5 }
                        ]
                    },
                    {
                        id: 2,
                        name: 'Double Door',
                        categoryId: 1,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 6, name: 'Not Cooling', subcategoryId: 2, showOnBookingForm: true, order: 1 },
                            { id: 7, name: 'Ice Formation', subcategoryId: 2, showOnBookingForm: true, order: 2 },
                            { id: 8, name: 'Water Leakage', subcategoryId: 2, showOnBookingForm: true, order: 3 },
                            { id: 9, name: 'Freezer Not Working', subcategoryId: 2, showOnBookingForm: true, order: 4 }
                        ]
                    },
                    {
                        id: 3,
                        name: 'Side by Side',
                        categoryId: 1,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 10, name: 'Not Cooling', subcategoryId: 3, showOnBookingForm: true, order: 1 },
                            { id: 11, name: 'Ice Maker Issue', subcategoryId: 3, showOnBookingForm: true, order: 2 },
                            { id: 12, name: 'Water Dispenser Issue', subcategoryId: 3, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            },
            {
                id: 2,
                name: 'Air Conditioner',
                showOnBookingForm: true,
                order: 2,
                subcategories: [
                    {
                        id: 4,
                        name: 'Split AC',
                        categoryId: 2,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 13, name: 'Not Cooling', subcategoryId: 4, showOnBookingForm: true, order: 1 },
                            { id: 14, name: 'Water Leakage', subcategoryId: 4, showOnBookingForm: true, order: 2 },
                            { id: 15, name: 'Strange Noise', subcategoryId: 4, showOnBookingForm: true, order: 3 },
                            { id: 16, name: 'Not Turning On', subcategoryId: 4, showOnBookingForm: true, order: 4 },
                            { id: 17, name: 'Remote Not Working', subcategoryId: 4, showOnBookingForm: true, order: 5 },
                            { id: 18, name: 'Bad Smell', subcategoryId: 4, showOnBookingForm: true, order: 6 }
                        ]
                    },
                    {
                        id: 5,
                        name: 'Window AC',
                        categoryId: 2,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 19, name: 'Not Cooling', subcategoryId: 5, showOnBookingForm: true, order: 1 },
                            { id: 20, name: 'Water Leakage', subcategoryId: 5, showOnBookingForm: true, order: 2 },
                            { id: 21, name: 'Strange Noise', subcategoryId: 5, showOnBookingForm: true, order: 3 },
                            { id: 22, name: 'Not Turning On', subcategoryId: 5, showOnBookingForm: true, order: 4 }
                        ]
                    },
                    {
                        id: 6,
                        name: 'Cassette AC',
                        categoryId: 2,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 23, name: 'Not Cooling', subcategoryId: 6, showOnBookingForm: true, order: 1 },
                            { id: 24, name: 'Water Leakage', subcategoryId: 6, showOnBookingForm: true, order: 2 },
                            { id: 25, name: 'Panel Not Working', subcategoryId: 6, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            },
            {
                id: 3,
                name: 'Oven',
                showOnBookingForm: true,
                order: 3,
                subcategories: [
                    {
                        id: 7,
                        name: 'Microwave Oven',
                        categoryId: 3,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 26, name: 'Not Heating', subcategoryId: 7, showOnBookingForm: true, order: 1 },
                            { id: 27, name: 'Display Not Working', subcategoryId: 7, showOnBookingForm: true, order: 2 },
                            { id: 28, name: 'Door Not Closing', subcategoryId: 7, showOnBookingForm: true, order: 3 },
                            { id: 29, name: 'Sparking', subcategoryId: 7, showOnBookingForm: true, order: 4 },
                            { id: 30, name: 'Timer Issue', subcategoryId: 7, showOnBookingForm: true, order: 5 }
                        ]
                    },
                    {
                        id: 8,
                        name: 'OTG',
                        categoryId: 3,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 31, name: 'Not Heating', subcategoryId: 8, showOnBookingForm: true, order: 1 },
                            { id: 32, name: 'Temperature Control Issue', subcategoryId: 8, showOnBookingForm: true, order: 2 },
                            { id: 33, name: 'Timer Not Working', subcategoryId: 8, showOnBookingForm: true, order: 3 }
                        ]
                    },
                    {
                        id: 9,
                        name: 'Convection Oven',
                        categoryId: 3,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 34, name: 'Not Heating', subcategoryId: 9, showOnBookingForm: true, order: 1 },
                            { id: 35, name: 'Fan Not Working', subcategoryId: 9, showOnBookingForm: true, order: 2 },
                            { id: 36, name: 'Display Issue', subcategoryId: 9, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            },
            {
                id: 4,
                name: 'HOB Top Stoves',
                showOnBookingForm: true,
                order: 4,
                subcategories: [
                    {
                        id: 10,
                        name: 'Gas Stove',
                        categoryId: 4,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 37, name: 'Burner Not Igniting', subcategoryId: 10, showOnBookingForm: true, order: 1 },
                            { id: 38, name: 'Flame Issue', subcategoryId: 10, showOnBookingForm: true, order: 2 },
                            { id: 39, name: 'Gas Leakage', subcategoryId: 10, showOnBookingForm: true, order: 3 },
                            { id: 40, name: 'Auto Ignition Not Working', subcategoryId: 10, showOnBookingForm: true, order: 4 }
                        ]
                    },
                    {
                        id: 11,
                        name: 'Induction Cooktop',
                        categoryId: 4,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 41, name: 'Not Heating', subcategoryId: 11, showOnBookingForm: true, order: 1 },
                            { id: 42, name: 'Display Not Working', subcategoryId: 11, showOnBookingForm: true, order: 2 },
                            { id: 43, name: 'Touch Panel Issue', subcategoryId: 11, showOnBookingForm: true, order: 3 },
                            { id: 44, name: 'Error Code Showing', subcategoryId: 11, showOnBookingForm: true, order: 4 }
                        ]
                    },
                    {
                        id: 12,
                        name: 'Electric Cooktop',
                        categoryId: 4,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 45, name: 'Not Heating', subcategoryId: 12, showOnBookingForm: true, order: 1 },
                            { id: 46, name: 'Coil Damaged', subcategoryId: 12, showOnBookingForm: true, order: 2 },
                            { id: 47, name: 'Temperature Control Issue', subcategoryId: 12, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            },
            {
                id: 5,
                name: 'Washing Machine',
                showOnBookingForm: true,
                order: 5,
                subcategories: [
                    {
                        id: 13,
                        name: 'Front Load',
                        categoryId: 5,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 48, name: 'Not Spinning', subcategoryId: 13, showOnBookingForm: true, order: 1 },
                            { id: 49, name: 'Water Not Draining', subcategoryId: 13, showOnBookingForm: true, order: 2 },
                            { id: 50, name: 'Not Starting', subcategoryId: 13, showOnBookingForm: true, order: 3 },
                            { id: 51, name: 'Door Not Opening', subcategoryId: 13, showOnBookingForm: true, order: 4 },
                            { id: 52, name: 'Excessive Vibration', subcategoryId: 13, showOnBookingForm: true, order: 5 },
                            { id: 53, name: 'Water Leakage', subcategoryId: 13, showOnBookingForm: true, order: 6 }
                        ]
                    },
                    {
                        id: 14,
                        name: 'Top Load',
                        categoryId: 5,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 54, name: 'Not Spinning', subcategoryId: 14, showOnBookingForm: true, order: 1 },
                            { id: 55, name: 'Water Not Draining', subcategoryId: 14, showOnBookingForm: true, order: 2 },
                            { id: 56, name: 'Not Starting', subcategoryId: 14, showOnBookingForm: true, order: 3 },
                            { id: 57, name: 'Excessive Vibration', subcategoryId: 14, showOnBookingForm: true, order: 4 }
                        ]
                    },
                    {
                        id: 15,
                        name: 'Semi-Automatic',
                        categoryId: 5,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 58, name: 'Not Spinning', subcategoryId: 15, showOnBookingForm: true, order: 1 },
                            { id: 59, name: 'Motor Issue', subcategoryId: 15, showOnBookingForm: true, order: 2 },
                            { id: 60, name: 'Timer Not Working', subcategoryId: 15, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            },
            {
                id: 6,
                name: 'Water Purifier',
                showOnBookingForm: true,
                order: 6,
                subcategories: [
                    {
                        id: 16,
                        name: 'RO',
                        categoryId: 6,
                        showOnBookingForm: true,
                        order: 1,
                        issues: [
                            { id: 61, name: 'Water Not Purifying', subcategoryId: 16, showOnBookingForm: true, order: 1 },
                            { id: 62, name: 'Low Water Flow', subcategoryId: 16, showOnBookingForm: true, order: 2 },
                            { id: 63, name: 'Leakage', subcategoryId: 16, showOnBookingForm: true, order: 3 },
                            { id: 64, name: 'Filter Change Required', subcategoryId: 16, showOnBookingForm: true, order: 4 },
                            { id: 65, name: 'Taste/Odor Issue', subcategoryId: 16, showOnBookingForm: true, order: 5 }
                        ]
                    },
                    {
                        id: 17,
                        name: 'UV',
                        categoryId: 6,
                        showOnBookingForm: true,
                        order: 2,
                        issues: [
                            { id: 66, name: 'UV Light Not Working', subcategoryId: 17, showOnBookingForm: true, order: 1 },
                            { id: 67, name: 'Low Water Flow', subcategoryId: 17, showOnBookingForm: true, order: 2 },
                            { id: 68, name: 'Filter Change Required', subcategoryId: 17, showOnBookingForm: true, order: 3 }
                        ]
                    },
                    {
                        id: 18,
                        name: 'UF',
                        categoryId: 6,
                        showOnBookingForm: true,
                        order: 3,
                        issues: [
                            { id: 69, name: 'Low Water Flow', subcategoryId: 18, showOnBookingForm: true, order: 1 },
                            { id: 70, name: 'Filter Change Required', subcategoryId: 18, showOnBookingForm: true, order: 2 },
                            { id: 71, name: 'Taste/Odor Issue', subcategoryId: 18, showOnBookingForm: true, order: 3 }
                        ]
                    }
                ]
            }
        ]
    });

    // Helper functions
    const getAllSubcategories = () => {
        return data.categories.flatMap(cat => cat.subcategories);
    };

    const getAllIssues = () => {
        return data.categories.flatMap(cat =>
            cat.subcategories.flatMap(sub => sub.issues)
        );
    };

    // Toggle visibility
    const toggleCategoryVisibility = (categoryId) => {
        setData({
            ...data,
            categories: data.categories.map(cat =>
                cat.id === categoryId
                    ? { ...cat, showOnBookingForm: !cat.showOnBookingForm }
                    : cat
            )
        });
    };

    const toggleSubcategoryVisibility = (subcategoryId) => {
        setData({
            ...data,
            categories: data.categories.map(cat => ({
                ...cat,
                subcategories: cat.subcategories.map(sub =>
                    sub.id === subcategoryId
                        ? { ...sub, showOnBookingForm: !sub.showOnBookingForm }
                        : sub
                )
            }))
        });
    };

    const toggleIssueVisibility = (issueId) => {
        setData({
            ...data,
            categories: data.categories.map(cat => ({
                ...cat,
                subcategories: cat.subcategories.map(sub => ({
                    ...sub,
                    issues: sub.issues.map(issue =>
                        issue.id === issueId
                            ? { ...issue, showOnBookingForm: !issue.showOnBookingForm }
                            : issue
                    )
                }))
            }))
        });
    };

    const handleSaveAll = () => {
        // Store in localStorage for now (will be replaced with backend API)
        localStorage.setItem('issuesManagementData', JSON.stringify(data));
        alert('Issues management settings saved successfully!');
    };

    return (
        <div>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Issues Management
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    Manage product categories, subcategories, and issues for the booking form
                </p>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--border-primary)' }}>
                {[
                    { id: 'categories', icon: Package, label: 'Categories', count: data.categories.length },
                    { id: 'subcategories', icon: Layers, label: 'Subcategories', count: getAllSubcategories().length },
                    { id: 'issues', icon: AlertCircle, label: 'Issues', count: getAllIssues().length }
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
                            {tab.label} ({tab.count})
                        </button>
                    );
                })}
            </div>

            {/* Categories Tab */}
            {activeTab === 'categories' && (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {data.categories.map(category => (
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
                                        {category.subcategories.length} subcategories
                                    </p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
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
                                        {category.showOnBookingForm ? 'Visible on Form' : 'Hidden from Form'}
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

                            {/* Expanded Subcategories */}
                            {expandedCategory === category.id && (
                                <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--border-primary)' }}>
                                    <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                                        Subcategories:
                                    </h5>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        {category.subcategories.map(sub => (
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
                                                <span style={{ fontSize: 'var(--font-size-sm)' }}>{sub.name} ({sub.issues.length} issues)</span>
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
                                                    {sub.showOnBookingForm ? '✓ Visible' : '✗ Hidden'}
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

            {/* Subcategories Tab */}
            {activeTab === 'subcategories' && (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {data.categories.map(category => (
                        <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
                                {category.name}
                            </h4>
                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                {category.subcategories.map(sub => (
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
                                                    {sub.issues.length} issues
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

                                        {/* Expanded Issues */}
                                        {expandedSubcategory === sub.id && (
                                            <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--border-primary)' }}>
                                                <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
                                                    {sub.issues.map(issue => (
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
                    {data.categories.map(category => (
                        <div key={category.id} className="card" style={{ padding: 'var(--spacing-lg)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>
                                {category.name}
                            </h4>
                            {category.subcategories.map(sub => (
                                <div key={sub.id} style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <h5 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                        {sub.name}
                                    </h5>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-sm)' }}>
                                        {sub.issues.map(issue => (
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

            {/* Save Button */}
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

export default IssuesManagement;





