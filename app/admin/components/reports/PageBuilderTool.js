'use client'

import { useState, useEffect } from 'react';
import {
    Globe, Loader2,
    Search, RefreshCw, Layers,
    Trash2, ExternalLink, Pencil, Eye, Plus, X, Link2
} from 'lucide-react';

export default function PageBuilderTool({ onEditPage, onPageCreated }) {
    const [typeFilter, setTypeFilter] = useState('all');
    const [deletingId, setDeletingId] = useState(null);
    const [groupBy, setGroupBy] = useState('none');

    const [activePages, setActivePages] = useState([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ── Create Page Modal State ─────────────────────────────
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newPageType, setNewPageType] = useState('category');
    const [newPageName, setNewPageName] = useState('');
    const [newPageSlug, setNewPageSlug] = useState('');
    const [newPageParentCat, setNewPageParentCat] = useState('');
    const [newPageParentLoc, setNewPageParentLoc] = useState('');
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    const KNOWN_LOCS_CREATE = [
        { slug: 'andheri', name: 'Andheri' },
        { slug: 'malad', name: 'Malad' },
        { slug: 'jogeshwari', name: 'Jogeshwari' },
        { slug: 'kandivali', name: 'Kandivali' },
        { slug: 'goregaon', name: 'Goregaon' },
        { slug: 'ville-parle', name: 'Ville Parle' },
        { slug: 'santacruz', name: 'Santacruz' },
        { slug: 'bandra', name: 'Bandra' },
        { slug: 'khar', name: 'Khar' },
        { slug: 'mahim', name: 'Mahim' },
        { slug: 'dadar', name: 'Dadar' },
        { slug: 'powai', name: 'Powai' },
        { slug: 'saki-naka', name: 'Saki Naka' },
        { slug: 'ghatkopar', name: 'Ghatkopar' },
        { slug: 'kurla', name: 'Kurla' },
    ];

    useEffect(() => {
        fetchActivePages();
    }, []);


    const fetchActivePages = async () => {
        setLoadingPages(true);
        try {
            const res = await fetch('/api/settings/active-pages');
            const data = await res.json();
            if (data.success) setActivePages(data.data);
        } catch (e) {
            console.error('Failed to fetch active pages:', e);
        } finally {
            setLoadingPages(false);
        }
    };

    // ── Create Page Helpers ────────────────────────────────
    const getNewPageId = () => {
        const s = newPageSlug.trim().toLowerCase().replace(/\s+/g, '-');
        if (newPageType === 'category') return s ? `cat-${s}` : '';
        if (newPageType === 'subcategory') {
            const cat = newPageParentCat.replace(/^cat-/, '');
            return s && cat ? `sub-${cat}-${s}` : '';
        }
        if (newPageType === 'location') return s ? `loc-${s}` : '';
        if (newPageType === 'sublocation') {
            const loc = newPageParentLoc;
            const cat = newPageParentCat.replace(/^cat-/, '');
            return s && loc && cat ? `sloc-${loc}-${cat}-${s}` : '';
        }
        return '';
    };

    const getNewPagePreviewUrl = () => {
        const s = newPageSlug.trim().toLowerCase().replace(/\s+/g, '-');
        const loc = newPageParentLoc;
        const cat = newPageParentCat.replace(/^cat-/, '');
        if (newPageType === 'category') return s ? `/services/${s}` : '';
        if (newPageType === 'subcategory') return s && cat ? `/services/${cat}/${s}` : '';
        if (newPageType === 'location') return s ? `/location/${s}` : '';
        if (newPageType === 'sublocation') return s && loc ? `/location/${loc}/${s}` : '';
        return '';
    };

    const handleCreatePage = async () => {
        setCreateError('');
        setCreateSuccess('');
        const page_id = getNewPageId();
        if (!page_id) { setCreateError('Please fill in all required fields.'); return; }
        setCreating(true);
        try {
            const page_url = getNewPagePreviewUrl();
            const res = await fetch('/api/settings/page/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    page_id,
                    page_type: newPageType,
                    hero_title: newPageName.trim() || undefined,
                })
            });
            const data = await res.json();
            if (data.success) {
                setCreateSuccess(`✅ Page "${page_id}" created! Opening editor...`);
                await fetchActivePages();
                if (onPageCreated) onPageCreated(page_id, newPageType);
                // Auto-jump to Edit Sections immediately
                setTimeout(() => {
                    setShowCreateModal(false);
                    setCreateSuccess('');
                    setNewPageName('');
                    setNewPageSlug('');
                    setNewPageParentCat('');
                    setNewPageParentLoc('');
                    if (onEditPage) {
                        onEditPage({
                            page_id,
                            page_type: newPageType,
                            hero_settings: { title: newPageName.trim() || page_id },
                        });
                    }
                }, 800);
            } else {
                setCreateError(data.error || 'Failed to create page.');
            }
        } catch (e) {
            setCreateError('Network error: ' + e.message);
        } finally {
            setCreating(false);
        }
    };


    const handleDeletePage = async (pageId) => {
        if (!confirm(`Delete page "${pageId}"? This cannot be undone.`)) return;
        setDeletingId(pageId);
        try {
            const res = await fetch(`/api/settings/page/${pageId}/delete`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setActivePages(prev => prev.filter(p => p.page_id !== pageId));
            } else {
                alert('Delete failed: ' + data.error);
            }
        } catch (e) {
            alert('Error: ' + e.message);
        } finally {
            setDeletingId(null);
        }
    };

    const getPageUrl = (pageId) => {
        if (!pageId) return '/';
        const KNOWN_LOCS = ['andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon',
            'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim', 'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'];
        const KNOWN_CATS = [
            'ac-repair', 'washing-machine-repair', 'refrigerator-repair',
            'oven-repair', 'hob-repair', 'water-purifier-repair',
            'dishwasher-repair', 'microwave-repair', 'dryer-repair'
        ];
        if (pageId.startsWith('cat-')) return `/services/${pageId.replace('cat-', '')}`;
        if (pageId.startsWith('sub-')) {
            const rest = pageId.replace('sub-', '');
            const cat = KNOWN_CATS.find(c => rest.startsWith(c + '-'));
            if (cat) return `/services/${cat}/${rest.replace(cat + '-', '')}`;
            // Fallback: split at midpoint
            const parts = rest.split('-');
            if (parts.length >= 2) {
                const mid = Math.ceil(parts.length / 2);
                return `/services/${parts.slice(0, mid).join('-')}/${parts.slice(mid).join('-')}`;
            }
            return `/services/${rest}`;
        }
        if (pageId.startsWith('loc-')) return `/location/${pageId.replace('loc-', '')}`;
        if (pageId.startsWith('sloc-')) {
            const rest = pageId.replace('sloc-', '');
            const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
            if (loc) return `/location/${loc}/${rest.replace(loc + '-', '')}`;
            return `/location/${rest}`;
        }
        return `/${pageId}`;
    };

    const getApplianceFromPageId = (pageId) => {
        const KNOWN_CATS = ['ac-repair', 'washing-machine-repair', 'refrigerator-repair', 'oven-repair', 'water-purifier-repair', 'hob-repair'];
        const KNOWN_LOCS = ['andheri', 'malad', 'jogeshwari', 'kandivali', 'goregaon', 'ville-parle', 'santacruz', 'bandra', 'khar', 'mahim', 'dadar', 'powai', 'saki-naka', 'ghatkopar', 'kurla'];
        if (pageId.startsWith('cat-')) return pageId.replace('cat-', '');
        if (pageId.startsWith('sub-')) {
            for (const cat of KNOWN_CATS) if (pageId.startsWith(`sub-${cat}`)) return cat;
            return pageId.replace('sub-', '').split('-').slice(0, 2).join('-');
        }
        if (pageId.startsWith('sloc-')) {
            const rest = pageId.replace('sloc-', '');
            const loc = KNOWN_LOCS.find(l => rest.startsWith(l + '-'));
            return loc ? rest.replace(loc + '-', '') : rest;
        }
        return pageId;
    };

    // Normalize abbreviated page_type values from old DB entries
    const normalizeType = (rawType) => {
        const map = { loc: 'location', cat: 'category', sub: 'subcategory', 'sub-loc': 'sublocation' };
        return (rawType && map[rawType]) ? map[rawType] : (rawType || 'unknown');
    };


    const filteredPages = activePages.filter(page => {
        const title = page.hero_settings?.title || page.page_id;
        const type = normalizeType(page.page_type);
        const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            type.toLowerCase().includes(searchQuery.toLowerCase()) ||
            page.page_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || type === typeFilter;
        return matchesSearch && matchesType;
    });

    const typeCounts = {
        all: activePages.length,
        category: activePages.filter(p => normalizeType(p.page_type) === 'category').length,
        subcategory: activePages.filter(p => normalizeType(p.page_type) === 'subcategory').length,
        sublocation: activePages.filter(p => normalizeType(p.page_type) === 'sublocation').length,
        location: activePages.filter(p => normalizeType(p.page_type) === 'location').length,
    };

    const getGroupedPages = () => {
        if (groupBy === 'type') {
            const typeOrder = ['category', 'subcategory', 'location', 'sublocation'];
            return typeOrder
                .map(type => ({
                    key: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1) + ' Pages',
                    pages: filteredPages.filter(p => p.page_type === type)
                }))
                .filter(g => g.pages.length > 0);
        }
        if (groupBy === 'appliance') {
            const groups = {};
            filteredPages.forEach(p => {
                const app = getApplianceFromPageId(p.page_id);
                if (!groups[app]) groups[app] = [];
                groups[app].push(p);
            });
            return Object.entries(groups)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, pages]) => ({
                    key,
                    label: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    pages
                }));
        }
        return [{ key: 'all', label: null, pages: filteredPages }];
    };

    const groupedPages = getGroupedPages();

    const typeColors = {
        category: { bg: '#dbeafe', text: '#1e40af' },
        cat: { bg: '#dbeafe', text: '#1e40af' },
        subcategory: { bg: '#d1fae5', text: '#065f46' },
        sub: { bg: '#d1fae5', text: '#065f46' },
        sublocation: { bg: '#ede9fe', text: '#5b21b6' },
        'sub-loc': { bg: '#ede9fe', text: '#5b21b6' },
        location: { bg: '#fef3c7', text: '#92400e' },
        loc: { bg: '#fef3c7', text: '#92400e' },
    };

    const renderPageRow = (page) => {
        const pageUrl = getPageUrl(page.page_id);
        const normType = normalizeType(page.page_type);
        const displayTitle = page.hero_settings?.title ||
            page.page_id?.replace(/^(sloc|cat|sub|loc|page)-/, '')
                .split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const tc = typeColors[page.page_type] || typeColors[normType] || { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)' };
        const isDeleting = deletingId === page.page_id;
        const typeLabel = {
            category: 'Category', cat: 'Category',
            subcategory: 'Sub-Cat', sub: 'Sub-Cat',
            sublocation: 'Sub-Loc', 'sub-loc': 'Sub-Loc',
            location: 'Location', loc: 'Location'
        }[page.page_type] || page.page_type;
        return (
            <tr key={page.page_id} style={{ borderBottom: '1px solid var(--border-primary)' }} className="list-row">
                <td style={tdStyle}>
                    <span style={{
                        display: 'inline-block', fontSize: '10px', fontWeight: 700,
                        textTransform: 'uppercase', padding: '2px 8px', borderRadius: '99px',
                        backgroundColor: tc.bg, color: tc.text, whiteSpace: 'nowrap'
                    }}>
                        {typeLabel}
                    </span>
                </td>
                <td style={tdStyle}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{displayTitle}</div>
                    <code style={{ fontSize: '10px', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: '3px' }}>{page.page_id}</code>
                </td>
                <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {pageUrl}
                        </code>
                        <a href={pageUrl} target="_blank" rel="noopener noreferrer" title="Open live URL" style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
                            <ExternalLink size={12} />
                        </a>
                    </div>
                </td>
                <td style={{ ...tdStyle, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {new Date(page.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                        <button
                            onClick={() => onEditPage && onEditPage(page)}
                            title="Edit sections"
                            style={{
                                ...actionBtnStyle,
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                borderColor: 'var(--color-primary)'
                            }}
                        >
                            <Pencil size={13} strokeWidth={3} /> Edit Sections
                        </button>
                        <a href={pageUrl} target="_blank" rel="noopener noreferrer" title="View live page"
                            style={{ ...actionBtnStyle, textDecoration: 'none', color: 'inherit' }}>
                            <ExternalLink size={13} /> View Live
                        </a>
                        <button
                            onClick={() => handleDeletePage(page.page_id)}
                            title="Delete page"
                            disabled={isDeleting}
                            style={{ ...actionBtnStyle, borderColor: '#fca5a5', color: isDeleting ? '#94a3b8' : '#dc2626' }}
                        >
                            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-sm)' }}>
                    <Globe size={32} style={{ color: 'var(--color-primary)' }} />
                    <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, margin: 0 }}>
                        Website Page Builder &amp; Manager
                    </h2>
                </div>
                <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', margin: 0 }}>
                    Create and manage all active service pages on the website.
                </p>
            </div>

            {/* =================== ACTIVE PAGES VIEW =================== */}
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>

                {/* Toolbar */}
                <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
                    backgroundColor: 'var(--bg-secondary)', padding: 'var(--spacing-md)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-primary)'
                }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '180px', maxWidth: '360px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search pages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 10px 8px 32px',
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)', fontSize: '13px'
                            }}
                        />
                    </div>

                    {/* Filter pills */}
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Filter:</span>
                        {[['all', 'All'], ['category', 'Category'], ['subcategory', 'Sub-cat'], ['location', 'Location'], ['sublocation', 'Sub-Loc']].map(([val, label]) => (
                            <button
                                key={val}
                                onClick={() => setTypeFilter(val)}
                                style={{
                                    padding: '4px 10px', fontSize: '12px', fontWeight: 600,
                                    borderRadius: '99px', cursor: 'pointer',
                                    border: typeFilter === val ? 'none' : '1px solid var(--border-primary)',
                                    background: typeFilter === val ? 'var(--color-primary)' : 'transparent',
                                    color: typeFilter === val ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                {label} <span style={{ opacity: 0.75 }}>({typeCounts[val] || 0})</span>
                            </button>
                        ))}
                    </div>

                    {/* Group By */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Group:</span>
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                            style={{
                                padding: '6px 10px', fontSize: '12px', fontWeight: 500,
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)', cursor: 'pointer'
                            }}
                        >
                            <option value="none">None</option>
                            <option value="type">Page Type</option>
                            <option value="appliance">Appliance</option>
                        </select>
                    </div>

                    {/* Count + Refresh + Create */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            <b>{filteredPages.length}</b> of <b>{activePages.length}</b> pages
                        </span>
                        <button onClick={fetchActivePages} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                            <RefreshCw size={16} />
                        </button>
                        <button
                            onClick={() => { setShowCreateModal(true); setCreateError(''); setCreateSuccess(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '7px 14px', backgroundColor: 'var(--color-primary)',
                                color: 'white', border: 'none', borderRadius: 'var(--radius-md)',
                                fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(99,102,241,0.4)', transition: 'transform 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Plus size={15} strokeWidth={3} /> Create New Page
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loadingPages ? (
                    <div style={{ padding: 'var(--spacing-3xl)', textAlign: 'center' }}>
                        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--text-tertiary)', margin: '0 auto' }} />
                        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Fetching active pages...</p>
                    </div>
                ) : filteredPages.length > 0 ? (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-primary)' }}>
                                    <th style={thStyle}>Page Type</th>
                                    <th style={thStyle}>Page Identity</th>
                                    <th style={thStyle}>URL</th>
                                    <th style={thStyle}>Last Updated</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedPages.map((group, gi) => (
                                    <>
                                        {group.label && (
                                            <tr key={`grp-${group.key}`}>
                                                <td colSpan={5} style={{
                                                    padding: '8px 14px', fontWeight: 700, fontSize: '11px',
                                                    color: 'var(--text-secondary)', textTransform: 'uppercase',
                                                    letterSpacing: '0.06em', backgroundColor: 'var(--bg-tertiary)',
                                                    borderBottom: '1px solid var(--border-primary)', borderTop: '2px solid var(--border-primary)'
                                                }}>
                                                    {group.label}
                                                    <span style={{ marginLeft: '8px', fontWeight: 400, opacity: 0.6 }}>
                                                        ({group.pages.length} pages)
                                                    </span>
                                                </td>
                                            </tr>
                                        )}
                                        {group.pages.map(page => renderPageRow(page))}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="card" style={{ padding: 'var(--spacing-3xl)', textAlign: 'center' }}>
                        <Layers size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
                        <h3 style={{ color: 'var(--text-secondary)' }}>No active pages found</h3>
                        <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                            {searchQuery ? `No pages match "${searchQuery}"` : 'No active pages yet. Click "Create New Page" to get started.'}
                        </p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .list-row:hover { background-color: var(--bg-elevated); }
                .modal-input { color: var(--text-primary) !important; }
            `}</style>

            {/* ── Create New Page Modal ── */}
            {showCreateModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)',
                        padding: '28px', width: '100%', maxWidth: '520px',
                        border: '1px solid var(--border-primary)', boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontWeight: 800, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={20} style={{ color: 'var(--color-primary)' }} /> Create New Page
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Page Type Selector */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Page Type</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                {[['category', '🏷️ Category', '/services/slug'], ['subcategory', '🔀 Subcategory', '/services/cat/slug'], ['location', '📍 Location', '/location/slug'], ['sublocation', '📌 Sub-location', '/location/loc/slug']].map(([val, label, eg]) => (
                                    <button
                                        key={val}
                                        onClick={() => { setNewPageType(val); setNewPageSlug(''); setNewPageParentCat(''); setNewPageParentLoc(''); }}
                                        style={{
                                            padding: '10px 12px', borderRadius: 'var(--radius-md)',
                                            border: newPageType === val ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                            backgroundColor: newPageType === val ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                                            color: newPageType === val ? 'var(--color-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px' }}>{label}</div>
                                        <div style={{ fontSize: '10px', opacity: 0.6, fontFamily: 'monospace' }}>{eg}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Page Name */}
                        <div style={{ marginBottom: '14px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Page Title (optional)</label>
                            <input
                                type="text"
                                value={newPageName}
                                onChange={e => setNewPageName(e.target.value)}
                                placeholder={`e.g. ${newPageType === 'category' ? 'TV Repair Services' : newPageType === 'subcategory' ? 'Window AC Repair' : newPageType === 'location' ? 'Thane Repairs' : 'AC Repair in Thane'}`}
                                style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontSize: '14px', boxSizing: 'border-box', color: 'var(--text-primary)' }}
                            />
                        </div>

                        {/* Parent Category (for Subcategory and Sub-location) */}
                        {(newPageType === 'subcategory' || newPageType === 'sublocation') && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Parent Category Page *</label>
                                <select
                                    value={newPageParentCat}
                                    onChange={e => setNewPageParentCat(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontSize: '14px', color: 'var(--text-primary)' }}
                                >
                                    <option value="">— Select parent category —</option>
                                    {activePages
                                        .filter(p => ['category', 'cat'].includes(p.page_type))
                                        .map(p => (
                                            <option key={p.page_id} value={p.page_id}>
                                                {p.hero_settings?.title || p.page_id} ({p.page_id})
                                            </option>
                                        ))
                                    }
                                    {activePages.filter(p => ['category', 'cat'].includes(p.page_type)).length === 0 && (
                                        <option disabled>⚠️ No category pages found — create one first</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {/* Parent Location (for Sub-location) */}
                        {newPageType === 'sublocation' && (
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>Parent Location Page *</label>
                                <select
                                    value={newPageParentLoc}
                                    onChange={e => setNewPageParentLoc(e.target.value)}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontSize: '14px', color: 'var(--text-primary)' }}
                                >
                                    <option value="">— Select parent location —</option>
                                    {KNOWN_LOCS_CREATE.map(loc => {
                                        const exists = activePages.some(p => p.page_id === `loc-${loc.slug}`);
                                        return (
                                            <option key={loc.slug} value={loc.slug} style={{ color: exists ? 'inherit' : '#f59e0b' }}>
                                                {loc.name}{!exists ? ' ⚠️ (not seeded yet)' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                {newPageParentLoc && !activePages.some(p => p.page_id === `loc-${newPageParentLoc}`) && (
                                    <div style={{ marginTop: '6px', padding: '8px 12px', backgroundColor: 'rgba(245,158,11,0.1)', border: '1px solid #f59e0b', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: '#b45309' }}>
                                        ⚠️ Location page <strong>loc-{newPageParentLoc}</strong> doesn't exist yet. You can still create this sub-location — just make sure to create the parent location page too.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* URL Slug — required for all page types */}
                        {(
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>URL Slug *</label>
                                <input
                                    type="text"
                                    value={newPageSlug}
                                    onChange={e => setNewPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-'))}
                                    placeholder={newPageType === 'category' ? 'e.g. tv-repair' : newPageType === 'subcategory' ? 'e.g. window-ac' : newPageType === 'location' ? 'e.g. thane' : 'e.g. ac-repair'}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box', color: 'var(--text-primary)' }}
                                />
                            </div>
                        )}

                        {/* Live Preview */}
                        {(() => {
                            const previewId = getNewPageId();
                            const previewUrl = getNewPagePreviewUrl();
                            if (!previewId) return null;
                            return (
                                <div style={{ marginBottom: '18px', padding: '12px 14px', backgroundColor: 'rgba(99,102,241,0.07)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Link2 size={12} /> Live Preview
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        <div>ID: <code style={{ backgroundColor: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{previewId}</code></div>
                                        <div style={{ marginTop: '4px' }}>URL: <code style={{ backgroundColor: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px' }}>{previewUrl}</code></div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Error / Success */}
                        {createError && (
                            <div style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#dc2626' }}>
                                ❌ {createError}
                            </div>
                        )}
                        {createSuccess && (
                            <div style={{ marginBottom: '14px', padding: '10px 14px', backgroundColor: 'rgba(16,185,129,0.08)', border: '1px solid #6ee7b7', borderRadius: 'var(--radius-md)', fontSize: '13px', color: '#065f46' }}>
                                {createSuccess}
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowCreateModal(false)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)', background: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePage}
                                disabled={creating || !getNewPageId()}
                                style={{
                                    padding: '10px 22px', borderRadius: 'var(--radius-md)',
                                    border: 'none', backgroundColor: creating || !getNewPageId() ? 'var(--bg-tertiary)' : 'var(--color-primary)',
                                    color: creating || !getNewPageId() ? 'var(--text-tertiary)' : 'white',
                                    cursor: creating || !getNewPageId() ? 'not-allowed' : 'pointer',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                {creating ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><Plus size={15} strokeWidth={3} /> Create Page</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const thStyle = {
    padding: '10px 14px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-tertiary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const tdStyle = {
    padding: '10px 14px',
    verticalAlign: 'middle'
};

const actionBtnStyle = {
    padding: '5px 8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-primary)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease'
};

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
