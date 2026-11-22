'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    ArrowLeft,
    RefreshCw,
    Loader2,
    Star,
    ExternalLink,
    Eye,
    EyeOff,
    Plus,
    Trash2,
    Check,
    Search,
    Clock,
    UploadCloud,
    SlidersHorizontal,
    FileText,
    CheckCircle2,
    AlertCircle,
    Copy,
    ListPlus,
    X,
    Filter
} from 'lucide-react';

export default function EcomV2TestimonialsSettings({ onBack }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    // Google API connection settings
    const [googleSettings, setGoogleSettings] = useState({
        placeId: 'ChIJAQAAQ0235zsRnXnmEKAFp7Y',
        apiKey: '',
        googleBusinessUrl: 'https://share.google/oa0YVSufYchdbSxwd',
        autoSync: true,
        autoSyncTime: '03:00'
    });
    const [lastAutoSync, setLastAutoSync] = useState(null);
    const [showKey, setShowKey] = useState(false);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'google' | 'manual' | 'visible' | 'hidden'
    const [ratingFilter, setRatingFilter] = useState('all'); // 'all' | '5' | '4' | '3'

    // Bulk Add Modal state
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkSource, setBulkSource] = useState('Google Reviews');
    const [bulkDefaultRating, setBulkDefaultRating] = useState(5);
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkImportProgress, setBulkImportProgress] = useState(0);

    // Single Add Modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [singleReview, setSingleReview] = useState({
        customerName: '',
        location: 'Mumbai',
        rating: 5,
        review: '',
        service: '',
        source: 'Google Reviews'
    });

    // Load data from Supabase
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resReviews, resV2Config, resLegacyConfig] = await Promise.all([
                fetch('/api/settings/testimonials'),
                fetch('/api/settings/section-configs?id=ecom-v2-testimonials'),
                fetch('/api/settings/section-configs?id=testimonials')
            ]);

            const dataReviews = await resReviews.json();
            const dataV2 = await resV2Config.json();
            const dataLegacy = await resLegacyConfig.json();

            if (dataReviews.success && Array.isArray(dataReviews.data)) {
                setReviews(dataReviews.data.map(normaliseRow));
            }

            // Prefer ecom-v2-testimonials config, fallback to legacy testimonials
            const v2Config = dataV2.data?.extra_config;
            const legacyConfig = dataLegacy.data?.extra_config;
            const activeConfig = v2Config?.googleSync?.placeId ? v2Config : legacyConfig;

            if (activeConfig?.googleSync) {
                setGoogleSettings(prev => ({
                    ...prev,
                    ...activeConfig.googleSync,
                    placeId: activeConfig.googleSync.placeId || prev.placeId,
                    googleBusinessUrl: activeConfig.googleSync.googleBusinessUrl || prev.googleBusinessUrl
                }));
            }
            if (activeConfig?.lastAutoSync) {
                setLastAutoSync(activeConfig.lastAutoSync);
            }
        } catch (err) {
            console.error('Failed to load testimonials:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const normaliseRow = (t) => ({
        id: t.id,
        customerName: t.customer_name || 'Customer',
        location: t.location || 'Mumbai',
        rating: Number(t.rating) || 5,
        review: t.review_text || '',
        date: t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        rawDate: t.date || '',
        service: t.service_type || '',
        verified: t.is_verified ?? true,
        featured: t.is_featured ?? false,
        source: t.source || 'Manual Entry',
        showOnWebsite: t.show_on_website ?? true,
    });

    // ── Save Google Connection Settings ─────────────────────────────────────
    const handleSaveConnection = async () => {
        setSaving(true);
        try {
            const payload = {
                section_id: 'ecom-v2-testimonials',
                extra_config: {
                    googleSync: googleSettings,
                    lastAutoSync
                }
            };

            await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Also mirror to legacy testimonials for system-wide consistency
            await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section_id: 'testimonials',
                    extra_config: { googleSync: googleSettings, lastAutoSync }
                })
            });

            alert('Google Reviews connection settings saved successfully!');
        } catch (e) {
            alert('Save failed: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ── Trigger Manual Sync from Google ─────────────────────────────────────
    const handleSyncNow = async () => {
        if (!googleSettings.placeId || !googleSettings.apiKey) {
            alert('Please enter both your Google Place ID and Google Places API Key first.');
            return;
        }

        setSyncing(true);
        setSyncResult(null);

        try {
            // Save first to ensure latest credentials are used
            await handleSaveConnection();

            const res = await fetch('/api/admin/google-reviews/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    placeId: googleSettings.placeId,
                    apiKey: googleSettings.apiKey
                })
            });

            const data = await res.json();
            if (data.success) {
                const nowIso = new Date().toISOString();
                setLastAutoSync({
                    last_auto_sync_at: nowIso,
                    last_auto_sync_status: 'success',
                    new_reviews_synced: data.synced,
                    total_in_database: data.totalInDb || reviews.length + data.synced
                });

                setSyncResult({
                    ok: true,
                    message: `✓ Sync complete: Added ${data.synced} new review${data.synced === 1 ? '' : 's'} from Google Places.`
                });
                await fetchData();
            } else {
                setSyncResult({
                    ok: false,
                    message: `Sync failed: ${data.error || 'Check Place ID and API key.'}`
                });
            }
        } catch (err) {
            setSyncResult({
                ok: false,
                message: `Network error: ${err.message}`
            });
        } finally {
            setSyncing(false);
        }
    };

    // ── Toggle Visibility (Show on Website) ────────────────────────────────
    const handleToggleVisibility = async (review) => {
        const nextVal = !review.showOnWebsite;
        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, showOnWebsite: nextVal } : r));
        setTogglingId(review.id);

        try {
            await fetch('/api/settings/testimonials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: review.id, show_on_website: nextVal })
            });
        } catch (e) {
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, showOnWebsite: !nextVal } : r));
            alert('Failed to update review visibility.');
        } finally {
            setTogglingId(null);
        }
    };

    // ── Toggle Featured ─────────────────────────────────────────────────────
    const handleToggleFeatured = async (review) => {
        const nextVal = !review.featured;
        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, featured: nextVal } : r));
        try {
            await fetch('/api/settings/testimonials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: review.id, is_featured: nextVal })
            });
        } catch (e) {
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, featured: !nextVal } : r));
        }
    };

    // ── Delete Review ───────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this review?')) return;
        setReviews(prev => prev.filter(r => r.id !== id));
        try {
            await fetch(`/api/settings/testimonials?id=${id}`, { method: 'DELETE' });
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    // ── Parse Bulk Reviews Text ─────────────────────────────────────────────
    const parsedBulkReviews = useMemo(() => {
        if (!bulkText.trim()) return [];
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        const result = [];

        for (const line of lines) {
            let name = '';
            let rating = bulkDefaultRating;
            let text = '';
            let location = 'Mumbai';
            let service = '';

            // Format 1: Pipe separated (Name | Rating | Text | Location | Service)
            if (line.includes('|')) {
                const parts = line.split('|').map(p => p.trim());
                if (parts.length >= 3) {
                    name = parts[0];
                    const parsedRating = parseInt(parts[1], 10);
                    if (parsedRating >= 1 && parsedRating <= 5) {
                        rating = parsedRating;
                        text = parts[2];
                        location = parts[3] || 'Mumbai';
                        service = parts[4] || '';
                    } else {
                        // Rating omitted: Name | Text | Location
                        text = parts[1];
                        location = parts[2] || 'Mumbai';
                    }
                } else if (parts.length === 2) {
                    name = parts[0];
                    text = parts[1];
                }
            }
            // Format 2: " - " separated (Name - Text)
            else if (line.includes(' - ')) {
                const parts = line.split(' - ').map(p => p.trim());
                name = parts[0];
                text = parts.slice(1).join(' - ');
            }
            // Format 3: Comma separated CSV with quotes
            else if (line.includes(',') && (line.includes('"') || line.split(',').length >= 2)) {
                const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
                if (matches && matches.length >= 2) {
                    name = matches[0].replace(/^"|"$/g, '').trim();
                    const second = matches[1].replace(/^"|"$/g, '').trim();
                    const parsedRating = parseInt(second, 10);
                    if (parsedRating >= 1 && parsedRating <= 5 && matches.length >= 3) {
                        rating = parsedRating;
                        text = matches[2].replace(/^"|"$/g, '').trim();
                    } else {
                        text = second;
                    }
                }
            } else {
                // Raw line fallback
                name = 'Verified Customer';
                text = line;
            }

            if (name && text) {
                result.push({
                    customer_name: name,
                    rating: rating >= 1 && rating <= 5 ? rating : 5,
                    review_text: text,
                    location: location || 'Mumbai',
                    service_type: service || null,
                    date: new Date().toISOString().split('T')[0],
                    source: bulkSource,
                    show_on_website: true,
                    is_verified: true,
                    is_featured: false
                });
            }
        }
        return result;
    }, [bulkText, bulkDefaultRating, bulkSource]);

    // ── Handle Bulk Import ──────────────────────────────────────────────────
    const handleExecuteBulkImport = async () => {
        if (parsedBulkReviews.length === 0) return;
        setBulkImporting(true);
        setBulkImportProgress(0);

        try {
            let count = 0;
            for (const item of parsedBulkReviews) {
                await fetch('/api/settings/testimonials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                count++;
                setBulkImportProgress(Math.round((count / parsedBulkReviews.length) * 100));
            }

            setBulkText('');
            setShowBulkModal(false);
            await fetchData();
            alert(`✓ Successfully imported ${count} reviews!`);
        } catch (err) {
            alert('Import partially failed: ' + err.message);
        } finally {
            setBulkImporting(false);
            setBulkImportProgress(0);
        }
    };

    // ── Handle Single Add ───────────────────────────────────────────────────
    const handleAddSingleReview = async (e) => {
        e.preventDefault();
        if (!singleReview.customerName || !singleReview.review) {
            alert('Please fill in Customer Name and Review Text.');
            return;
        }

        try {
            await fetch('/api/settings/testimonials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: singleReview.customerName,
                    location: singleReview.location || 'Mumbai',
                    rating: singleReview.rating || 5,
                    review_text: singleReview.review,
                    service_type: singleReview.service || null,
                    date: new Date().toISOString().split('T')[0],
                    is_verified: true,
                    is_featured: false,
                    source: singleReview.source || 'Google Reviews',
                    show_on_website: true
                })
            });

            setShowAddModal(false);
            setSingleReview({
                customerName: '',
                location: 'Mumbai',
                rating: 5,
                review: '',
                service: '',
                source: 'Google Reviews'
            });
            await fetchData();
        } catch (err) {
            alert('Failed to add review: ' + err.message);
        }
    };

    // ── Filtered Reviews ────────────────────────────────────────────────────
    const filteredReviews = useMemo(() => {
        return reviews.filter(r => {
            // Tab filter
            if (activeTab === 'google' && r.source !== 'Google Reviews') return false;
            if (activeTab === 'manual' && r.source === 'Google Reviews') return false;
            if (activeTab === 'visible' && !r.showOnWebsite) return false;
            if (activeTab === 'hidden' && r.showOnWebsite) return false;

            // Rating filter
            if (ratingFilter !== 'all') {
                const targetRating = parseInt(ratingFilter, 10);
                if (targetRating === 3 && r.rating > 3) return false;
                if (targetRating === 4 && r.rating !== 4) return false;
                if (targetRating === 5 && r.rating !== 5) return false;
            }

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = r.customerName.toLowerCase().includes(q);
                const matchText = r.review.toLowerCase().includes(q);
                const matchLoc = r.location.toLowerCase().includes(q);
                const matchService = (r.service || '').toLowerCase().includes(q);
                return matchName || matchText || matchLoc || matchService;
            }

            return true;
        });
    }, [reviews, activeTab, ratingFilter, searchQuery]);

    const counts = useMemo(() => ({
        total: reviews.length,
        google: reviews.filter(r => r.source === 'Google Reviews').length,
        manual: reviews.filter(r => r.source !== 'Google Reviews').length,
        visible: reviews.filter(r => r.showOnWebsite).length,
        hidden: reviews.filter(r => !r.showOnWebsite).length
    }), [reviews]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* ── Top Bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <ArrowLeft size={16} /> Back to Ecom V2 Settings
                        </button>
                    )}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                Customer Testimonials &amp; Google Reviews
                            </h2>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: 6,
                                backgroundColor: 'rgba(99, 56, 245, 0.15)',
                                color: '#6338f5',
                                textTransform: 'uppercase'
                            }}>
                                Ecom V2 Storefront
                            </span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
                            Manage customer reviews, configure Google Places connection, and monitor daily automated midnight sync.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={fetchData}
                    disabled={loading}
                    className="btn btn-secondary"
                    style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    title="Refresh reviews"
                >
                    <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
                </button>
            </div>

            {/* ── Auto-Sync Banner & Google Connection Card ── */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '2px solid #4285f4',
                borderRadius: 14,
                padding: 20,
                marginBottom: 24,
                boxShadow: '0 4px 20px rgba(66, 133, 244, 0.08)'
            }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(66, 133, 244, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#4285f4'
                        }}>
                            <Star size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <strong style={{ fontSize: 15, color: 'var(--text-primary)' }}>Google Reviews Connection</strong>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: '#10b981'
                                }}>
                                    <Clock size={12} /> Auto-Syncs Daily at 3:00 AM IST
                                </span>
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                                New incoming Google reviews are automatically pulled every night without manual intervention.
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="button"
                            onClick={handleSyncNow}
                            disabled={syncing}
                            className="btn btn-primary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#4285f4',
                                borderColor: '#4285f4',
                                padding: '8px 16px',
                                fontWeight: 700
                            }}
                        >
                            <RefreshCw size={14} className={syncing ? 'spin' : ''} />
                            {syncing ? 'Syncing Google Reviews...' : 'Sync from Google Now'}
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveConnection}
                            disabled={saving}
                            className="btn btn-secondary"
                            style={{ padding: '8px 14px' }}
                        >
                            {saving ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>

                {/* Sync status message */}
                {syncResult && (
                    <div style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 16,
                        fontSize: 13,
                        backgroundColor: syncResult.ok ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                        color: syncResult.ok ? '#10b981' : '#ef4444',
                        border: `1px solid ${syncResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                        {syncResult.message}
                    </div>
                )}

                {/* Credentials Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                    {/* Place ID */}
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            Google Place ID
                        </label>
                        <input
                            type="text"
                            value={googleSettings.placeId}
                            onChange={(e) => setGoogleSettings(prev => ({ ...prev, placeId: e.target.value }))}
                            placeholder="ChIJAQAAQ0235zsRnXnmEKAFp7Y"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontFamily: 'monospace'
                            }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Target ID for Sorted Solutions on Google Maps.{' '}
                            <a
                                href="https://developers.google.com/maps/documentation/places/web-service/place-id"
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#4285f4', textDecoration: 'underline' }}
                            >
                                Place ID Lookup <ExternalLink size={10} style={{ display: 'inline' }} />
                            </a>
                        </div>
                    </div>

                    {/* Places API Key */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                Google Places API Key
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowKey(!showKey)}
                                style={{ fontSize: 11, color: '#4285f4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                                {showKey ? 'Hide Key' : 'Reveal Key'}
                            </button>
                        </div>
                        <input
                            type={showKey ? 'text' : 'password'}
                            value={googleSettings.apiKey}
                            onChange={(e) => setGoogleSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Enter Google Places API key"
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                fontFamily: 'monospace'
                            }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Used by server-side cron and manual sync to communicate with Google Cloud.
                        </div>
                    </div>

                    {/* Business Profile URL */}
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                            Google Business Profile URL (Front-facing)
                        </label>
                        <input
                            type="text"
                            value={googleSettings.googleBusinessUrl}
                            onChange={(e) => setGoogleSettings(prev => ({ ...prev, googleBusinessUrl: e.target.value }))}
                            placeholder="https://share.google/..."
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: 8,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 13
                            }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                            Opens when customers click &ldquo;View us on Google&rdquo; on the website.
                        </div>
                    </div>
                </div>

                {lastAutoSync && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-tertiary)' }}>
                        <span>
                            🕒 <strong>Last Synced:</strong> {new Date(lastAutoSync.last_auto_sync_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                        </span>
                        <span>•</span>
                        <span>
                            📦 <strong>Status:</strong> {lastAutoSync.last_auto_sync_status === 'success' ? '✓ Healthy' : '⚠️ Checked'}
                        </span>
                    </div>
                )}
            </div>

            {/* ── Review Curation Header & Actions ── */}
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 14,
                padding: 20,
                marginBottom: 20
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                            Review Curation &amp; Storefront Visibility
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                            <strong style={{ color: '#10b981' }}>{counts.visible} of {counts.total}</strong> reviews currently active on your website storefront.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button
                            type="button"
                            onClick={() => setShowBulkModal(true)}
                            className="btn btn-primary"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                backgroundColor: '#6338f5',
                                borderColor: '#6338f5',
                                padding: '8px 16px',
                                fontWeight: 700
                            }}
                        >
                            <ListPlus size={16} /> Bulk Add Reviews (70+)
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-secondary"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
                        >
                            <Plus size={15} /> Add Single Review
                        </button>
                    </div>
                </div>

                {/* Filter Tabs & Search */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-primary)' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                            { id: 'all', label: `All (${counts.total})` },
                            { id: 'google', label: `Google Reviews (${counts.google})` },
                            { id: 'manual', label: `Manual Entry (${counts.manual})` },
                            { id: 'visible', label: `Visible (${counts.visible})` },
                            { id: 'hidden', label: `Hidden (${counts.hidden})` },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    border: '1px solid',
                                    borderColor: activeTab === tab.id ? '#6338f5' : 'var(--border-primary)',
                                    backgroundColor: activeTab === tab.id ? 'rgba(99, 56, 245, 0.12)' : 'var(--bg-primary)',
                                    color: activeTab === tab.id ? '#6338f5' : 'var(--text-secondary)',
                                    fontSize: 12,
                                    fontWeight: activeTab === tab.id ? 700 : 500,
                                    cursor: 'pointer'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search & Star filter */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: '1 1 320px', maxWidth: 420 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, review text, or location..."
                                style={{
                                    width: '100%',
                                    padding: '6px 12px 6px 30px',
                                    borderRadius: 6,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 12
                                }}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        <select
                            value={ratingFilter}
                            onChange={(e) => setRatingFilter(e.target.value)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: 6,
                                border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                fontSize: 12
                            }}
                        >
                            <option value="all">All Stars</option>
                            <option value="5">★ 5 Stars Only</option>
                            <option value="4">★ 4 Stars Only</option>
                            <option value="3">★ 3 Stars &amp; below</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Reviews Cards List ── */}
            {loading ? (
                <div style={{ padding: 60, textAlign: 'center' }}>
                    <Loader2 className="spin" size={40} style={{ margin: '0 auto 12px', color: '#6338f5' }} />
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Loading reviews...</p>
                </div>
            ) : filteredReviews.length === 0 ? (
                <div style={{
                    padding: 48,
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 14,
                    border: '1px dashed var(--border-primary)'
                }}>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                        No reviews found matching your filter.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowBulkModal(true)}
                        className="btn btn-primary"
                        style={{ padding: '8px 16px', backgroundColor: '#6338f5', borderColor: '#6338f5' }}
                    >
                        <ListPlus size={15} style={{ marginRight: 6 }} /> Bulk Add 70+ Reviews
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredReviews.map(review => {
                        const isHidden = !review.showOnWebsite;
                        const isGoogle = review.source === 'Google Reviews';

                        return (
                            <div
                                key={review.id}
                                style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    border: isHidden ? '1px dashed var(--border-primary)' : '1px solid var(--border-primary)',
                                    borderRadius: 12,
                                    padding: '16px 20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 16,
                                    opacity: isHidden ? 0.65 : 1,
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Left: Reviewer details & content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                                        {/* Avatar initials */}
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            backgroundColor: isGoogle ? '#4285f4' : '#10b981',
                                            color: '#ffffff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 800,
                                            fontSize: 13
                                        }}>
                                            {review.customerName.charAt(0).toUpperCase()}
                                        </div>

                                        <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                                            {review.customerName}
                                        </strong>

                                        {/* Stars */}
                                        <div style={{ color: '#f59e0b', fontSize: 13, letterSpacing: '1px' }}>
                                            {'★'.repeat(review.rating)}{'☆'.repeat(Math.max(0, 5 - review.rating))}
                                        </div>

                                        {/* Source Badge */}
                                        <span style={{
                                            fontSize: 10.5,
                                            fontWeight: 700,
                                            padding: '2px 7px',
                                            borderRadius: 4,
                                            backgroundColor: isGoogle ? 'rgba(66, 133, 244, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                            color: isGoogle ? '#4285f4' : '#10b981'
                                        }}>
                                            {isGoogle ? 'G Google' : '✓ Verified'}
                                        </span>

                                        {review.featured && (
                                            <span style={{
                                                fontSize: 10.5,
                                                fontWeight: 800,
                                                padding: '2px 7px',
                                                borderRadius: 4,
                                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                                color: '#f59e0b'
                                            }}>
                                                ★ Featured
                                            </span>
                                        )}
                                    </div>

                                    {/* Review quote */}
                                    <p style={{
                                        margin: '0 0 8px 0',
                                        fontSize: 13.5,
                                        color: 'var(--text-primary)',
                                        lineHeight: 1.5,
                                        fontStyle: 'italic'
                                    }}>
                                        &ldquo;{review.review}&rdquo;
                                    </p>

                                    {/* Meta line */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                                        {review.date && <span>{review.date}</span>}
                                        {review.location && <span>• {review.location}</span>}
                                        {review.service && <span>• Service: {review.service}</span>}
                                    </div>
                                </div>

                                {/* Right: Quick Curation Buttons */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                    {/* Visibility Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleVisibility(review)}
                                        disabled={togglingId === review.id}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '6px 12px',
                                            borderRadius: 7,
                                            border: '1px solid',
                                            borderColor: isHidden ? 'var(--border-primary)' : 'rgba(16, 185, 129, 0.4)',
                                            backgroundColor: isHidden ? 'var(--bg-primary)' : 'rgba(16, 185, 129, 0.12)',
                                            color: isHidden ? 'var(--text-tertiary)' : '#10b981',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                        title={isHidden ? 'Click to show on website' : 'Click to hide from website'}
                                    >
                                        {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                        {isHidden ? 'Hidden' : 'Visible'}
                                    </button>

                                    {/* Featured Toggle Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleFeatured(review)}
                                        style={{
                                            padding: '6px 8px',
                                            borderRadius: 7,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: review.featured ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-primary)',
                                            color: review.featured ? '#f59e0b' : 'var(--text-tertiary)',
                                            cursor: 'pointer'
                                        }}
                                        title={review.featured ? 'Unfeature' : 'Feature on top'}
                                    >
                                        <Star size={14} fill={review.featured ? '#f59e0b' : 'none'} />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(review.id)}
                                        style={{
                                            padding: '6px 8px',
                                            borderRadius: 7,
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                            color: '#ef4444',
                                            cursor: 'pointer'
                                        }}
                                        title="Delete review"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: BULK ADD 70+ REVIEWS
               ══════════════════════════════════════════════════════════════════ */}
            {showBulkModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 16,
                        maxWidth: 720,
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                    📋 Bulk Import Customer Reviews
                                </h3>
                                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-tertiary)' }}>
                                    Copy and paste all 70+ reviews directly from Google Business Profile or a spreadsheet.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !bulkImporting && setShowBulkModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
                            {/* Format Guide Box */}
                            <div style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 10,
                                padding: 14,
                                marginBottom: 16,
                                fontSize: 12,
                                color: 'var(--text-secondary)',
                                lineHeight: 1.5
                            }}>
                                <strong>Accepted Formats (paste one review per line):</strong>
                                <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                                    <li><code>Customer Name | 5 | Great AC repair service! Very fast. | Mumbai</code></li>
                                    <li><code>Customer Name | Outstanding work done on refrigerator!</code> (Defaults to 5 stars)</li>
                                    <li><code>Customer Name - Very punctual and honest technicians</code></li>
                                </ul>
                            </div>

                            {/* Options Row */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                        Source Label
                                    </label>
                                    <select
                                        value={bulkSource}
                                        onChange={(e) => setBulkSource(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 12.5
                                        }}
                                    >
                                        <option value="Google Reviews">Google Reviews (Displays Google badge)</option>
                                        <option value="Manual Entry">Manual / Verified Customer</option>
                                    </select>
                                </div>

                                <div style={{ flex: 1, minWidth: 180 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                        Default Rating (if not specified)
                                    </label>
                                    <select
                                        value={bulkDefaultRating}
                                        onChange={(e) => setBulkDefaultRating(parseInt(e.target.value, 10))}
                                        style={{
                                            width: '100%',
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 12.5
                                        }}
                                    >
                                        <option value={5}>★ ★ ★ ★ ★ (5 Stars)</option>
                                        <option value={4}>★ ★ ★ ★ ☆ (4 Stars)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Textarea */}
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                Paste Reviews Here
                            </label>
                            <textarea
                                value={bulkText}
                                onChange={(e) => setBulkText(e.target.value)}
                                placeholder="Example:&#10;Rajesh Sharma | 5 | Excellent cooling fix for our split AC.&#10;Anita Deshmukh | 5 | Fixed washing machine drum vibration on the same day!&#10;Sunil Mehta | Very polite technician and upfront billing."
                                rows={10}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    borderRadius: 8,
                                    border: '1px solid var(--border-primary)',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    fontSize: 12.5,
                                    lineHeight: 1.5,
                                    fontFamily: 'monospace'
                                }}
                            />

                            {/* Parsing Status Feedback */}
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: parsedBulkReviews.length > 0 ? '#10b981' : 'var(--text-tertiary)'
                                }}>
                                    {parsedBulkReviews.length > 0
                                        ? `✨ Ready to import ${parsedBulkReviews.length} review${parsedBulkReviews.length === 1 ? '' : 's'}`
                                        : '0 reviews detected'}
                                </span>

                                {bulkImporting && (
                                    <span style={{ fontSize: 12, color: '#6338f5', fontWeight: 700 }}>
                                        Importing... {bulkImportProgress}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '14px 20px',
                            borderTop: '1px solid var(--border-primary)',
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 10,
                            backgroundColor: 'var(--bg-secondary)'
                        }}>
                            <button
                                type="button"
                                onClick={() => setShowBulkModal(false)}
                                disabled={bulkImporting}
                                className="btn btn-secondary"
                                style={{ padding: '8px 16px' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteBulkImport}
                                disabled={bulkImporting || parsedBulkReviews.length === 0}
                                className="btn btn-primary"
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#6338f5',
                                    borderColor: '#6338f5',
                                    fontWeight: 700
                                }}
                            >
                                {bulkImporting ? 'Importing...' : `Import ${parsedBulkReviews.length} Reviews`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                MODAL: ADD SINGLE REVIEW
               ══════════════════════════════════════════════════════════════════ */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16
                }}>
                    <form
                        onSubmit={handleAddSingleReview}
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 16,
                            maxWidth: 520,
                            width: '100%',
                            overflow: 'hidden',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                            border: '1px solid var(--border-primary)'
                        }}
                    >
                        <div style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                                + Add Customer Review
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Customer Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={singleReview.customerName}
                                    onChange={(e) => setSingleReview({ ...singleReview, customerName: e.target.value })}
                                    placeholder="e.g. Ramesh Patel"
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Rating</label>
                                    <select
                                        value={singleReview.rating}
                                        onChange={(e) => setSingleReview({ ...singleReview, rating: parseInt(e.target.value, 10) })}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    >
                                        <option value={5}>★ ★ ★ ★ ★ (5 Stars)</option>
                                        <option value={4}>★ ★ ★ ★ ☆ (4 Stars)</option>
                                        <option value={3}>★ ★ ★ ☆ ☆ (3 Stars)</option>
                                    </select>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Source</label>
                                    <select
                                        value={singleReview.source}
                                        onChange={(e) => setSingleReview({ ...singleReview, source: e.target.value })}
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    >
                                        <option value="Google Reviews">Google Reviews</option>
                                        <option value="Manual Entry">Manual / Website Review</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Review Text *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={singleReview.review}
                                    onChange={(e) => setSingleReview({ ...singleReview, review: e.target.value })}
                                    placeholder="Customer feedback details..."
                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13, lineHeight: 1.5 }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Location</label>
                                    <input
                                        type="text"
                                        value={singleReview.location}
                                        onChange={(e) => setSingleReview({ ...singleReview, location: e.target.value })}
                                        placeholder="e.g. Andheri West, Mumbai"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Service (optional)</label>
                                    <input
                                        type="text"
                                        value={singleReview.service}
                                        onChange={(e) => setSingleReview({ ...singleReview, service: e.target.value })}
                                        placeholder="e.g. AC Foam Jet Service"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 13 }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'flex-end', gap: 10, backgroundColor: 'var(--bg-secondary)' }}>
                            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', fontWeight: 700 }}>
                                Save Review
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
