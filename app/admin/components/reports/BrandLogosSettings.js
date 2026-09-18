'use client'

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Image as ImageIcon,
    Plus,
    Trash2,
    Edit2,
    Save,
    X,
    Upload,
    ExternalLink,
    Loader2,
    Eye,
    EyeOff,
    Layers,
    CheckCircle2,
    Search,
    RefreshCw,
    AlertCircle,
    Globe
} from 'lucide-react';

// iOS-style animated toggle switch
function ToggleSwitch({ checked, onChange, disabled, loading }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled || loading}
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled && !loading) onChange(!checked);
            }}
            style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                width: 46,
                height: 24,
                borderRadius: 999,
                backgroundColor: checked ? '#10b981' : 'var(--bg-tertiary, #334155)',
                border: checked ? '1px solid #10b981' : '1px solid var(--border-secondary, #475569)',
                cursor: disabled || loading ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                padding: 0,
                outline: 'none',
                flexShrink: 0
            }}
            title={checked ? 'Click to hide Brands section on this page' : 'Click to show Brands section on this page'}
        >
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                    transform: checked ? 'translateX(24px)' : 'translateX(3px)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
            >
                {loading && (
                    <Loader2 size={11} className="animate-spin" style={{ color: checked ? '#10b981' : '#64748b' }} />
                )}
            </span>
        </button>
    );
}

function BrandLogosSettings() {
    const [activeTab, setActiveTab] = useState('logos'); // 'logos' | 'visibility'

    // Brands state
    const [brands, setBrands] = useState([]);
    const [loadingBrands, setLoadingBrands] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBrand, setNewBrand] = useState({ name: '', logo_url: '', website_url: '' });
    const [toast, setToast] = useState(null);

    // Page Visibility state
    const [pages, setPages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(true);
    const [pagesFilter, setPagesFilter] = useState('all'); // 'all' | 'homepage' | 'category' | 'subcategory' | 'location' | 'sublocation'
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'visible' | 'hidden'
    const [searchQuery, setSearchQuery] = useState('');
    const [togglingIds, setTogglingIds] = useState(new Set());
    const [bulkUpdating, setBulkUpdating] = useState(false);

    const addFileRef = useRef(null);
    const editFileRef = useRef(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    useEffect(() => {
        fetchBrands();
        fetchPages();
    }, []);

    const fetchBrands = async () => {
        setLoadingBrands(true);
        try {
            const res = await fetch('/api/settings/brand-logos');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');
            setBrands(data.data || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoadingBrands(false);
        }
    };

    const fetchPages = async () => {
        setLoadingPages(true);
        try {
            const res = await fetch('/api/settings/brands-visibility');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load page visibility settings');
            setPages(data.pages || []);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoadingPages(false);
        }
    };

    // ── Upload logo to Supabase Storage ──
    const handleFileUpload = async (file, onSuccess) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/settings/upload-logo', { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Upload failed');
            onSuccess(data.url);
            showToast('Logo uploaded!');
        } catch (err) {
            showToast('Upload failed: ' + err.message, 'error');
        } finally {
            setUploading(false);
        }
    };

    // ── Add Brand ──
    const handleAddBrand = async () => {
        if (!newBrand.name.trim() || !newBrand.logo_url.trim()) return;
        setSaving(true);
        try {
            const res = await fetch('/api/settings/brand-logos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newBrand.name.trim(),
                    logo_url: newBrand.logo_url.trim(),
                    website_url: newBrand.website_url.trim() || null,
                    display_order: brands.length + 1,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to add brand');
            setBrands(prev => [...prev, data.data]);
            setNewBrand({ name: '', logo_url: '', website_url: '' });
            setShowAddForm(false);
            showToast('Brand added!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Save Edit ──
    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/brand-logos', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingId,
                    name: editForm.name,
                    logo_url: editForm.logo_url,
                    website_url: editForm.website_url || null,
                    display_order: editForm.display_order,
                }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to update');
            setBrands(brands.map(b => b.id === editingId ? data.data : b));
            setEditingId(null);
            setEditForm({});
            showToast('Brand updated!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ──
    const handleDelete = async (id) => {
        if (!confirm('Delete this brand?')) return;
        try {
            const res = await fetch(`/api/settings/brand-logos?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) {
                // Specific error formatting for clarity
                const errMsg = data.error || 'Failed to delete';
                const details = data.details ? `\n\nDetails: ${data.details}` : '';
                throw new Error(`${errMsg}${details}`);
            }
            setBrands(brands.filter(b => b.id !== id));
            showToast('Brand deleted.');
        } catch (err) {
            console.error('[UI-DELETE] Error:', err);
            // Show alert for critical constraint errors or toast for others
            if (err.message.includes('in use') || err.message.includes('constraint')) {
                alert(`DELETE FAILED\n\n${err.message}`);
            } else {
                showToast(err.message, 'error');
            }
        }
    };

    // ── Toggle Single Page Visibility ──
    const handleTogglePageVisibility = async (pageId, currentVisible, pageName) => {
        const nextVisible = !currentVisible;
        setTogglingIds(prev => new Set(prev).add(pageId));

        // Optimistic UI update
        setPages(prev => prev.map(p => p.id === pageId ? { ...p, visible: nextVisible } : p));

        try {
            const res = await fetch('/api/settings/brands-visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageId, visible: nextVisible })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to update page visibility');
            showToast(`Brands section turned ${nextVisible ? 'ON' : 'OFF'} for ${pageName || pageId}`);
        } catch (err) {
            // Revert on error
            setPages(prev => prev.map(p => p.id === pageId ? { ...p, visible: currentVisible } : p));
            showToast(`Failed to update: ${err.message}`, 'error');
        } finally {
            setTogglingIds(prev => {
                const next = new Set(prev);
                next.delete(pageId);
                return next;
            });
        }
    };

    // ── Bulk Toggle Visibility ──
    const handleBulkToggle = async (targetVisible) => {
        const targetLabel = pagesFilter === 'all' ? 'All 91 Pages' : `${pagesFilter} pages`;
        const actionLabel = targetVisible ? 'ENABLE' : 'DISABLE';
        if (!confirm(`Are you sure you want to ${actionLabel} the Brands section for ${targetLabel}?`)) return;

        setBulkUpdating(true);
        try {
            const res = await fetch('/api/settings/brands-visibility', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pageType: pagesFilter, visible: targetVisible })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Bulk update failed');

            await fetchPages();
            showToast(`Brands section ${targetVisible ? 'enabled' : 'disabled'} for ${targetLabel}!`);
        } catch (err) {
            showToast(`Bulk update failed: ${err.message}`, 'error');
        } finally {
            setBulkUpdating(false);
        }
    };

    // ── Computed Statistics ──
    const stats = useMemo(() => {
        const total = pages.length;
        const visibleCount = pages.filter(p => p.visible).length;
        const hiddenCount = total - visibleCount;
        const countsByType = {
            homepage: pages.filter(p => p.type === 'homepage').length,
            category: pages.filter(p => p.type === 'category').length,
            subcategory: pages.filter(p => p.type === 'subcategory').length,
            location: pages.filter(p => p.type === 'location').length,
            sublocation: pages.filter(p => p.type === 'sublocation').length,
        };
        return { total, visibleCount, hiddenCount, countsByType };
    }, [pages]);

    // ── Filtered Pages List ──
    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            // Tab group filter
            if (pagesFilter !== 'all' && p.type !== pagesFilter) return false;
            // Status filter
            if (statusFilter === 'visible' && !p.visible) return false;
            if (statusFilter === 'hidden' && p.visible) return false;
            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = (p.name || '').toLowerCase().includes(q);
                const matchUrl = (p.url || '').toLowerCase().includes(q);
                const matchId = (p.id || '').toLowerCase().includes(q);
                if (!matchName && !matchUrl && !matchId) return false;
            }
            return true;
        });
    }, [pages, pagesFilter, statusFilter, searchQuery]);

    // Helper for Type Badge
    const getTypeBadge = (type) => {
        switch (type) {
            case 'homepage':
                return { label: 'Homepage', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.35)' };
            case 'category':
                return { label: 'Main Category', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: 'rgba(168, 85, 247, 0.35)' };
            case 'subcategory':
                return { label: 'Subcategory', bg: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: 'rgba(99, 102, 241, 0.35)' };
            case 'location':
                return { label: 'Location Area', bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: 'rgba(16, 185, 129, 0.35)' };
            case 'sublocation':
                return { label: 'Sublocation', bg: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.35)' };
            default:
                return { label: type, bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: 'var(--border-primary)' };
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Hidden file inputs */}
            <input ref={addFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, url => setNewBrand(b => ({ ...b, logo_url: url })));
                    e.target.value = '';
                }} />
            <input ref={editFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, url => setEditForm(f => ({ ...f, logo_url: url })));
                    e.target.value = '';
                }} />

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 9999,
                    padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 14,
                    backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <span>{toast.type === 'error' ? '❌' : '✅'}</span>
                    <span>{toast.msg}</span>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            Global Brand Logos Library
                        </h3>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                            Manage brand logos and control where the "Brands We Serve" section appears across all pages of the website.
                        </p>
                    </div>

                    {/* Quick status badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-primary)',
                            fontWeight: 600
                        }}>
                            {brands.length} Brands Loaded
                        </span>
                        <span style={{
                            fontSize: 12,
                            padding: '4px 10px',
                            borderRadius: 999,
                            backgroundColor: stats.hiddenCount > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: stats.hiddenCount > 0 ? '#f59e0b' : '#10b981',
                            border: stats.hiddenCount > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                            fontWeight: 600
                        }}>
                            {stats.visibleCount}/{stats.total} Pages Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Primary Navigation Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '2px solid var(--border-primary)',
                marginBottom: 'var(--spacing-lg)'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('logos')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 18px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        color: activeTab === 'logos' ? 'var(--color-primary-light, #818cf8)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'logos' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        marginBottom: -2,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <ImageIcon size={18} />
                    <span>Brand Logos Library</span>
                    <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: activeTab === 'logos' ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                        color: activeTab === 'logos' ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 700
                    }}>
                        {brands.length}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('visibility')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 18px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14,
                        color: activeTab === 'visibility' ? 'var(--color-primary-light, #818cf8)' : 'var(--text-secondary)',
                        borderBottom: activeTab === 'visibility' ? '3px solid var(--color-primary)' : '3px solid transparent',
                        marginBottom: -2,
                        transition: 'all 0.15s ease'
                    }}
                >
                    <Layers size={18} />
                    <span>Page Visibility & Placement</span>
                    <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: activeTab === 'visibility' ? '#10b981' : 'var(--bg-tertiary)',
                        color: activeTab === 'visibility' ? '#ffffff' : 'var(--text-secondary)',
                        fontWeight: 700
                    }}>
                        {stats.total || 91} Pages
                    </span>
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                 TAB 1: LOGOS LIBRARY (Logo Upload & Edit)
               ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'logos' && (
                <div>
                    {/* Information Callout */}
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Globe size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                Want to show or hide the Brands section on specific pages? Click over to the <strong>Page Visibility & Placement</strong> tab.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveTab('visibility')}
                            className="btn btn-secondary"
                            style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            <Eye size={14} /> Open Page Visibility
                        </button>
                    </div>

                    {loadingBrands ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: 'var(--text-secondary)' }}>Loading brands...</span>
                        </div>
                    ) : (
                        <>
                            {/* Add New Brand Button */}
                            {!showAddForm && (
                                <button
                                    type="button"
                                    onClick={() => setShowAddForm(true)}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-md)' }}
                                >
                                    <Plus size={18} /> Add New Brand
                                </button>
                            )}

                            {/* Add Brand Form */}
                            {showAddForm && (
                                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid var(--color-primary)' }}>
                                    <h4 style={{ marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>New Brand</h4>
                                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Brand Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Panasonic"
                                                value={newBrand.name}
                                                onChange={e => setNewBrand({ ...newBrand, name: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Logo * (upload required)</label>
                                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary"
                                                    onClick={() => addFileRef.current?.click()}
                                                    disabled={uploading}
                                                    style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, border: '1px dashed var(--border-primary)' }}
                                                >
                                                    {uploading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={18} />}
                                                    <span style={{ fontWeight: 600 }}>{uploading ? 'Uploading...' : 'Choose Logo File'}</span>
                                                </button>
                                                {newBrand.logo_url && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ padding: 4, backgroundColor: 'var(--bg-secondary)', borderRadius: 6, height: 40, width: 40, display: 'flex', alignItems: 'center' }}>
                                                            <img src={newBrand.logo_url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                        </div>
                                                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✅ Ready!</span>
                                                    </div>
                                                )}
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>PNG with transparent background, 200×80px recommended</p>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Website URL (Optional)</label>
                                            <input
                                                type="text"
                                                placeholder="https://www.panasonic.com"
                                                value={newBrand.website_url}
                                                onChange={e => setNewBrand({ ...newBrand, website_url: e.target.value })}
                                                style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                        <button
                                            type="button"
                                            onClick={handleAddBrand}
                                            className="btn btn-primary"
                                            disabled={!newBrand.name.trim() || !newBrand.logo_url.trim() || saving || uploading}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                        >
                                            {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                                            {saving ? 'Saving...' : 'Add Brand'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddForm(false); setNewBrand({ name: '', logo_url: '', website_url: '' }); }}
                                            className="btn btn-secondary"
                                        >
                                            <X size={16} /> Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Empty state */}
                            {brands.length === 0 && !showAddForm && (
                                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <ImageIcon size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                                    <p>No brands yet. Click "Add New Brand" to get started.</p>
                                </div>
                            )}

                            {/* Brands Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                                {brands.map((brand) => (
                                    <div
                                        key={brand.id}
                                        className="card"
                                        style={{ padding: 'var(--spacing-lg)', border: editingId === brand.id ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)' }}
                                    >
                                        {editingId === brand.id ? (
                                            <div>
                                                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Brand Name</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.name || ''}
                                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Logo</label>
                                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            <button
                                                                type="button"
                                                                className="btn btn-secondary"
                                                                onClick={() => editFileRef.current?.click()}
                                                                disabled={uploading}
                                                                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                                                            >
                                                                {uploading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={18} />}
                                                                <span style={{ fontWeight: 600 }}>{uploading ? 'Uploading...' : 'Change Logo'}</span>
                                                            </button>
                                                            {editForm.logo_url && (
                                                                <div style={{ padding: 4, backgroundColor: 'var(--bg-secondary)', borderRadius: 6, height: 40, width: 40, display: 'flex', alignItems: 'center', border: '1px solid var(--border-primary)' }}>
                                                                    <img src={editForm.logo_url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 4 }}>Website URL</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.website_url || ''}
                                                            onChange={e => setEditForm({ ...editForm, website_url: e.target.value })}
                                                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', boxSizing: 'border-box' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveEdit}
                                                        className="btn btn-primary"
                                                        disabled={saving}
                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                                    >
                                                        {saving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />} Save
                                                    </button>
                                                    <button type="button" onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary"><X size={16} /></button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ height: 80, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, border: '1px solid var(--border-primary)', padding: 8 }}>
                                                    {brand.logo_url ? (
                                                        <img src={brand.logo_url} alt={brand.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
                                                    ) : (
                                                        <ImageIcon size={24} style={{ color: 'var(--text-tertiary)' }} />
                                                    )}
                                                </div>
                                                <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 4px 0' }}>{brand.name}</h4>
                                                {brand.website_url && (
                                                    <a href={brand.website_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-primary)', textDecoration: 'none', marginBottom: 12 }}>
                                                        <ExternalLink size={12} /> Visit Website
                                                    </a>
                                                )}
                                                <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setEditingId(brand.id); setEditForm({ ...brand }); }}
                                                        className="btn btn-secondary"
                                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px' }}
                                                    >
                                                        <Edit2 size={15} /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(brand.id)}
                                                        style={{ padding: '6px 12px', background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════
                 TAB 2: PAGE VISIBILITY & PLACEMENT (Toggle Per Page)
               ═══════════════════════════════════════════════════════════ */}
            {activeTab === 'visibility' && (
                <div>
                    {/* Summary Card */}
                    <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pages</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{stats.total}</div>
                                </div>
                                <div style={{ height: 32, width: 1, backgroundColor: 'var(--border-primary)' }} />
                                <div>
                                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981', fontWeight: 600 }}>Brands Visible</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.visibleCount}</div>
                                </div>
                                <div style={{ height: 32, width: 1, backgroundColor: 'var(--border-primary)' }} />
                                <div>
                                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ef4444', fontWeight: 600 }}>Brands Hidden</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.hiddenCount}</div>
                                </div>
                            </div>

                            {/* Refresh & Bulk Controls */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    type="button"
                                    onClick={fetchPages}
                                    disabled={loadingPages || bulkUpdating}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 12px' }}
                                    title="Reload latest visibility settings"
                                >
                                    <RefreshCw size={14} className={loadingPages ? 'animate-spin' : ''} />
                                    <span>Refresh</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleBulkToggle(true)}
                                    disabled={bulkUpdating || loadingPages}
                                    className="btn btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 13,
                                        padding: '8px 12px',
                                        color: '#34d399',
                                        borderColor: 'rgba(16, 185, 129, 0.4)',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)'
                                    }}
                                >
                                    <Eye size={14} />
                                    <span>Enable All ({pagesFilter === 'all' ? 'All' : pagesFilter})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleBulkToggle(false)}
                                    disabled={bulkUpdating || loadingPages}
                                    className="btn btn-secondary"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 13,
                                        padding: '8px 12px',
                                        color: '#f87171',
                                        borderColor: 'rgba(239, 68, 68, 0.4)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)'
                                    }}
                                >
                                    <EyeOff size={14} />
                                    <span>Disable All ({pagesFilter === 'all' ? 'All' : pagesFilter})</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar & Search */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        marginBottom: 16
                    }}>
                        {/* Page Type Filter Pills */}
                        <div style={{
                            display: 'flex',
                            gap: 6,
                            overflowX: 'auto',
                            paddingBottom: 4
                        }}>
                            {[
                                { id: 'all', label: 'All Pages', count: stats.total },
                                { id: 'homepage', label: 'Homepage', count: stats.countsByType.homepage },
                                { id: 'category', label: 'Main Categories', count: stats.countsByType.category },
                                { id: 'subcategory', label: 'Subcategories', count: stats.countsByType.subcategory },
                                { id: 'location', label: 'Location Areas', count: stats.countsByType.location },
                                { id: 'sublocation', label: 'Sublocations', count: stats.countsByType.sublocation },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setPagesFilter(tab.id)}
                                    style={{
                                        padding: '7px 14px',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        fontWeight: pagesFilter === tab.id ? 700 : 500,
                                        border: '1px solid',
                                        borderColor: pagesFilter === tab.id ? 'var(--color-primary)' : 'var(--border-primary)',
                                        backgroundColor: pagesFilter === tab.id ? 'var(--color-primary)' : 'var(--bg-elevated)',
                                        color: pagesFilter === tab.id ? '#ffffff' : 'var(--text-primary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span>{tab.label}</span>
                                    <span style={{
                                        fontSize: 11,
                                        padding: '1px 7px',
                                        borderRadius: 10,
                                        backgroundColor: pagesFilter === tab.id ? 'rgba(255,255,255,0.25)' : 'var(--bg-tertiary)',
                                        color: pagesFilter === tab.id ? '#ffffff' : 'var(--text-secondary)'
                                    }}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search and Status Filter */}
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div style={{
                                position: 'relative',
                                flex: 1,
                                minWidth: 260
                            }}>
                                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input
                                    type="text"
                                    placeholder="Filter by page name or path (e.g. Andheri, AC, Split, Washing)..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px 10px 36px',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        fontSize: 13,
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        style={{
                                            position: 'absolute',
                                            right: 10,
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            border: 'none',
                                            background: 'none',
                                            cursor: 'pointer',
                                            color: 'var(--text-tertiary)',
                                            padding: 4
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            {/* Status Filter */}
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[
                                    { id: 'all', label: 'All' },
                                    { id: 'visible', label: 'Visible Only' },
                                    { id: 'hidden', label: 'Hidden Only' }
                                ].map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => setStatusFilter(s.id)}
                                        style={{
                                            padding: '8px 14px',
                                            borderRadius: 'var(--radius-md)',
                                            fontSize: 12,
                                            fontWeight: statusFilter === s.id ? 600 : 500,
                                            border: '1px solid',
                                            borderColor: statusFilter === s.id ? 'var(--color-primary)' : 'var(--border-primary)',
                                            backgroundColor: statusFilter === s.id ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-elevated)',
                                            color: statusFilter === s.id ? 'var(--color-primary-light, #818cf8)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loadingPages ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60, backgroundColor: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border-primary)' }}>
                            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />
                            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading pages and visibility states...</span>
                        </div>
                    ) : filteredPages.length === 0 ? (
                        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <AlertCircle size={36} style={{ opacity: 0.4, marginBottom: 12 }} />
                            <p style={{ fontSize: 15, margin: 0, fontWeight: 500 }}>No pages match the current filter or search query.</p>
                            <button
                                type="button"
                                onClick={() => { setPagesFilter('all'); setStatusFilter('all'); setSearchQuery(''); }}
                                className="btn btn-secondary"
                                style={{ marginTop: 12, fontSize: 13 }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        /* Pages List */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '4px 8px',
                                fontSize: 12,
                                color: 'var(--text-secondary)'
                            }}>
                                <span>Showing <strong>{filteredPages.length}</strong> of {stats.total} pages</span>
                                <span>Click toggle switch to instantly show/hide Brands section</span>
                            </div>

                            {filteredPages.map(page => {
                                const badge = getTypeBadge(page.type);
                                const isToggling = togglingIds.has(page.id);

                                return (
                                    <div
                                        key={page.id}
                                        className="card"
                                        style={{
                                            padding: '14px 18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 16,
                                            backgroundColor: page.visible ? 'var(--bg-elevated)' : 'var(--bg-secondary)',
                                            border: page.visible ? '1px solid var(--border-primary)' : '1px dashed var(--border-secondary)',
                                            opacity: page.visible ? 1 : 0.75,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {/* Page Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: 6,
                                                    backgroundColor: badge.bg,
                                                    color: badge.color,
                                                    border: `1px solid ${badge.border}`
                                                }}>
                                                    {badge.label}
                                                </span>

                                                <span style={{
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    color: 'var(--text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {page.name}
                                                </span>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                {page.url && page.url !== '#' ? (
                                                    <a
                                                        href={page.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            fontSize: 12,
                                                            color: 'var(--color-primary-light, #818cf8)',
                                                            textDecoration: 'none',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}
                                                        title={`Visit ${page.url} in new tab`}
                                                    >
                                                        <span>{page.url}</span>
                                                        <ExternalLink size={11} />
                                                    </a>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>ID: {page.id}</span>
                                                )}

                                                <span style={{
                                                    fontSize: 11,
                                                    color: page.visible ? '#10b981' : '#ef4444',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    {page.visible ? (
                                                        <>
                                                            <CheckCircle2 size={12} />
                                                            <span>Brands Section Visible</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff size={12} />
                                                            <span>Brands Section Hidden</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Toggle Switch */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: 12,
                                                fontWeight: 600,
                                                color: page.visible ? '#10b981' : 'var(--text-tertiary)'
                                            }}>
                                                {page.visible ? 'Visible' : 'Hidden'}
                                            </span>

                                            <ToggleSwitch
                                                checked={page.visible}
                                                loading={isToggling}
                                                disabled={bulkUpdating}
                                                onChange={() => handleTogglePageVisibility(page.id, page.visible, page.name)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default BrandLogosSettings;
