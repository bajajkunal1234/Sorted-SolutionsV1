'use client'

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, ExternalLink, Eye, EyeOff, Star, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

function CustomerTestimonialsSettings() {
    const [reviews, setReviews] = useState([]);        // All reviews (Google + manual)
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [togglingId, setTogglingId] = useState(null); // which row is currently being toggled

    const [googleSettings, setGoogleSettings] = useState({
        placeId: '',
        apiKey: '',
        googleBusinessUrl: '',
        autoSync: false,
        syncInterval: 24,
    });

    const [displaySettings, setDisplaySettings] = useState({
        showOnHomepage: true,
        showOnServicePages: true,
        autoRotate: true,
        rotationInterval: 5,
        showRating: true,
        showLocation: true,
        showDate: true,
        showVerifiedBadge: true,
        minRating: 4,
    });

    // ─── Manual Add form ───────────────────────────────────────────────
    const [showAddForm, setShowAddForm] = useState(false);
    const [newReview, setNewReview] = useState({ customerName: '', location: '', rating: 5, review: '', service: '' });

    // ─── Load ─────────────────────────────────────────────────────────
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resT, resConfig] = await Promise.all([
                fetch('/api/settings/testimonials'),
                fetch('/api/settings/section-configs?id=testimonials'),
            ]);
            const dataT = await resT.json();
            const dataConfig = await resConfig.json();

            if (dataT.success) {
                setReviews(dataT.data.map(normaliseRow));
            }
            if (dataConfig.success && dataConfig.data?.extra_config) {
                const ec = dataConfig.data.extra_config;
                if (ec.googleSync) setGoogleSettings(g => ({ ...g, ...ec.googleSync }));
                if (ec.display) setDisplaySettings(d => ({ ...d, ...ec.display }));
            }
        } catch (e) {
            console.error('Error loading:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ─── Helpers ──────────────────────────────────────────────────────
    const normaliseRow = (t) => ({
        id: t.id,
        customerName: t.customer_name,
        location: t.location,
        rating: t.rating,
        review: t.review_text,
        date: t.date ? new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
        service: t.service_type,
        verified: t.is_verified,
        featured: t.is_featured,
        source: t.source || 'Manual Entry',
        showOnWebsite: t.show_on_website ?? false,
        profilePhoto: t.google_profile_photo || null,
    });

    const renderStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    // ─── Toggle show_on_website ───────────────────────────────────────
    const handleToggleVisibility = async (review) => {
        const newVal = !review.showOnWebsite;
        // Optimistic update
        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, showOnWebsite: newVal } : r));
        setTogglingId(review.id);
        try {
            await fetch('/api/settings/testimonials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: review.id, show_on_website: newVal }),
            });
        } catch (e) {
            // Revert on error
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, showOnWebsite: !newVal } : r));
            alert('Failed to update visibility.');
        } finally {
            setTogglingId(null);
        }
    };

    // ─── Toggle featured ─────────────────────────────────────────────
    const handleToggleFeatured = async (review) => {
        const newVal = !review.featured;
        setReviews(prev => prev.map(r => r.id === review.id ? { ...r, featured: newVal } : r));
        try {
            await fetch('/api/settings/testimonials', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: review.id, is_featured: newVal }),
            });
        } catch (e) {
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, featured: !newVal } : r));
        }
    };

    // ─── Delete ───────────────────────────────────────────────────────
    const handleDelete = async (id) => {
        if (!confirm('Delete this review?')) return;
        setReviews(prev => prev.filter(r => r.id !== id));
        try {
            if (typeof id === 'string' && id.length > 20) {
                await fetch(`/api/settings/testimonials?id=${id}`, { method: 'DELETE' });
            }
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    // ─── Sync from Google (auto-saves credentials first) ────────────
    const handleSync = async () => {
        if (!googleSettings.placeId || !googleSettings.apiKey) {
            alert('Please enter your Google Place ID and API Key first.');
            return;
        }
        setSyncing(true);
        setSyncResult(null);
        try {
            // Auto-save credentials so user never has to click Save separately
            await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section_id: 'testimonials',
                    extra_config: { googleSync: googleSettings, display: displaySettings },
                }),
            });

            const res = await fetch('/api/admin/google-reviews/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ placeId: googleSettings.placeId, apiKey: googleSettings.apiKey }),
            });
            const data = await res.json();
            if (data.success) {
                setSyncResult({ ok: true, message: `✓ Synced ${data.synced} review${data.synced !== 1 ? 's' : ''} from Google.${data.overallRating ? ` Overall rating: ${data.overallRating}★ (${data.totalRatings} total)` : ''}` });
                await fetchData(); // refresh the list
            } else {
                setSyncResult({ ok: false, message: `Sync failed: ${data.error}` });
            }
        } catch (e) {
            setSyncResult({ ok: false, message: `Network error: ${e.message}` });
        } finally {
            setSyncing(false);
        }
    };

    // ─── Add manual review ────────────────────────────────────────────
    const handleAddManual = async () => {
        if (!newReview.customerName || !newReview.review) return;
        try {
            const res = await fetch('/api/settings/testimonials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: newReview.customerName,
                    location: newReview.location,
                    rating: newReview.rating,
                    review_text: newReview.review,
                    service_type: newReview.service,
                    date: new Date().toISOString().split('T')[0],
                    is_verified: false,
                    is_featured: false,
                    source: 'Manual Entry',
                    show_on_website: true, // manual reviews shown immediately
                }),
            });
            const data = await res.json();
            if (data.success) {
                setReviews(prev => [normaliseRow(data.data), ...prev]);
                setNewReview({ customerName: '', location: '', rating: 5, review: '', service: '' });
                setShowAddForm(false);
            }
        } catch (e) {
            alert('Failed to add review.');
        }
    };

    // ─── Save connection settings ─────────────────────────────────────
    const handleSaveSettings = async () => {
        setSaving(true);
        try {
            await fetch('/api/settings/section-configs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    section_id: 'testimonials',
                    extra_config: { googleSync: googleSettings, display: displaySettings },
                }),
            });
            alert('Settings saved!');
        } catch (e) {
            alert('Save failed: ' + e.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Derived data ─────────────────────────────────────────────────
    const googleReviews = reviews.filter(r => r.source === 'Google Reviews');
    const manualReviews = reviews.filter(r => r.source !== 'Google Reviews');
    const visibleCount = reviews.filter(r => r.showOnWebsite).length;

    // ─── Render ───────────────────────────────────────────────────────
    return (
        <div>

            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                        Google Reviews Connection Settings
                    </h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                        Connect your Google Business account and manage reviews displayed on your website
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={fetchData} disabled={loading} style={{ padding: '6px 12px' }}>
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
                    <Loader2 className="spin" size={48} style={{ margin: '0 auto var(--spacing-md)', display: 'block' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
                </div>
            ) : (<>

                {/* ── Connection Settings ── */}
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)', border: '2px solid #4285f4' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#4285f415', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Star size={20} style={{ color: '#4285f4' }} />
                            </div>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Google Reviews Connection</h4>
                        </div>
                        <button
                            onClick={handleSync}
                            className="btn btn-primary"
                            disabled={syncing}
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                        >
                            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
                            {syncing ? 'Syncing…' : 'Sync from Google'}
                        </button>
                    </div>

                    {/* Sync result banner */}
                    {syncResult && (
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-md)',
                            fontSize: 'var(--font-size-sm)',
                            background: syncResult.ok ? '#10b98115' : '#ef444415',
                            color: syncResult.ok ? '#10b981' : '#ef4444',
                            border: `1px solid ${syncResult.ok ? '#10b98130' : '#ef444430'}`,
                        }}>
                            {syncResult.message}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        {/* Place ID */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Google Place ID
                            </label>
                            <input
                                type="text"
                                value={googleSettings.placeId}
                                onChange={e => setGoogleSettings(g => ({ ...g, placeId: e.target.value }))}
                                placeholder="ChIJXXXXXXXXXXXXXXXXXXXX"
                                style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}
                            />
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 'var(--spacing-xs) 0 0' }}>
                                Find yours at{' '}
                                <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" rel="noopener noreferrer" style={{ color: '#4285f4' }}>
                                    Google Place ID Finder <ExternalLink size={10} style={{ display: 'inline' }} />
                                </a>
                            </p>
                        </div>

                        {/* API Key */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Google Places API Key
                            </label>
                            <input
                                type="password"
                                value={googleSettings.apiKey}
                                onChange={e => setGoogleSettings(g => ({ ...g, apiKey: e.target.value }))}
                                placeholder="Enter your Google Places API key"
                                style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}
                            />
                        </div>

                        {/* Business Profile URL */}
                        <div>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Google Business Profile URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(for "View us on Google" button)</span>
                            </label>
                            <input
                                type="text"
                                value={googleSettings.googleBusinessUrl}
                                onChange={e => setGoogleSettings(g => ({ ...g, googleBusinessUrl: e.target.value }))}
                                placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
                                style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', fontFamily: 'monospace' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                        <button onClick={handleSaveSettings} className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                            {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                            Save Settings
                        </button>
                    </div>
                </div>

                {/* ── Reviews Curation Board ── */}
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
                        <div>
                            <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: '0 0 2px' }}>
                                Review Curation
                            </h4>
                            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                                {visibleCount} of {reviews.length} review{reviews.length !== 1 ? 's' : ''} visible on website
                            </p>
                        </div>
                        <button
                            onClick={() => setShowAddForm(v => !v)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                        >
                            <Plus size={16} />
                            Add Manually
                        </button>
                    </div>

                    {/* Manual add form */}
                    {showAddForm && (
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', border: '1px solid var(--border-primary)' }}>
                            <h5 style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Add Review Manually</h5>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                <input type="text" placeholder="Customer Name *" value={newReview.customerName} onChange={e => setNewReview(r => ({ ...r, customerName: e.target.value }))}
                                    style={{ padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                <input type="text" placeholder="Location (e.g. Mumbai)" value={newReview.location} onChange={e => setNewReview(r => ({ ...r, location: e.target.value }))}
                                    style={{ padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                <input type="text" placeholder="Service (e.g. AC Repair)" value={newReview.service} onChange={e => setNewReview(r => ({ ...r, service: e.target.value }))}
                                    style={{ padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }} />
                                <select value={newReview.rating} onChange={e => setNewReview(r => ({ ...r, rating: parseInt(e.target.value) }))}
                                    style={{ padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)' }}>
                                    {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
                                </select>
                            </div>
                            <textarea placeholder="Review text *" value={newReview.review} onChange={e => setNewReview(r => ({ ...r, review: e.target.value }))} rows={3}
                                style={{ width: '100%', padding: 'var(--spacing-sm)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-sm)', resize: 'vertical', marginBottom: 'var(--spacing-sm)' }}
                            />
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                <button onClick={handleAddManual} className="btn btn-primary" disabled={!newReview.customerName || !newReview.review}>
                                    <Plus size={14} /> Add
                                </button>
                                <button onClick={() => setShowAddForm(false)} className="btn btn-secondary"><X size={14} /> Cancel</button>
                            </div>
                        </div>
                    )}

                    {reviews.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--text-secondary)' }}>
                            <Star size={40} style={{ opacity: 0.3, marginBottom: 'var(--spacing-sm)', display: 'block', margin: '0 auto var(--spacing-sm)' }} />
                            <p style={{ margin: 0 }}>No reviews yet. Click <strong>"Sync from Google"</strong> above to fetch your Google reviews, or add one manually.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>

                            {/* Group header: Google Reviews */}
                            {googleReviews.length > 0 && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', margin: 'var(--spacing-xs) 0' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: '#4285f4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            From Google ({googleReviews.length})
                                        </span>
                                        <div style={{ flex: 1, height: 1, background: '#4285f430' }} />
                                    </div>
                                    {googleReviews.map(r => (
                                        <ReviewCard key={r.id} review={r} onToggle={handleToggleVisibility} onFeatured={handleToggleFeatured} onDelete={handleDelete} toggling={togglingId === r.id} renderStars={renderStars} />
                                    ))}
                                </>
                            )}

                            {/* Group header: Manual */}
                            {manualReviews.length > 0 && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', margin: 'var(--spacing-xs) 0' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Added Manually ({manualReviews.length})
                                        </span>
                                        <div style={{ flex: 1, height: 1, background: 'var(--border-primary)' }} />
                                    </div>
                                    {manualReviews.map(r => (
                                        <ReviewCard key={r.id} review={r} onToggle={handleToggleVisibility} onFeatured={handleToggleFeatured} onDelete={handleDelete} toggling={togglingId === r.id} renderStars={renderStars} />
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Display Settings ── */}
                <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-md)' }}>
                    <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>Display Settings</h4>
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-sm)' }}>
                            {[
                                ['showOnHomepage', 'Show on Homepage'],
                                ['showOnServicePages', 'Show on Service Pages'],
                                ['showRating', 'Show star rating'],
                                ['showLocation', 'Show location'],
                                ['showDate', 'Show date'],
                                ['showVerifiedBadge', 'Show verified badge'],
                                ['autoRotate', 'Auto-rotate'],
                            ].map(([key, label]) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={displaySettings[key]} onChange={e => setDisplaySettings(d => ({ ...d, [key]: e.target.checked }))} style={{ width: 18, height: 18 }} />
                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

            </>)}
        </div>
    );
}

// ── ReviewCard sub-component ─────────────────────────────────────────────────
function ReviewCard({ review, onToggle, onFeatured, onDelete, toggling, renderStars }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 'var(--spacing-md)',
            alignItems: 'center',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${review.showOnWebsite ? 'var(--color-primary)' : 'var(--border-primary)'}`,
            background: review.showOnWebsite ? 'var(--color-primary-bg, #f0f7ff)' : 'var(--bg-secondary)',
            transition: 'all 0.2s ease',
        }}>
            {/* Left: info */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: '4px' }}>
                    {/* Avatar */}
                    {review.profilePhoto ? (
                        <img src={review.profilePhoto} alt={review.customerName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#4285f420', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 600, color: '#4285f4', flexShrink: 0 }}>
                            {review.customerName?.charAt(0) || '?'}
                        </div>
                    )}
                    <div>
                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{review.customerName}</span>
                        {review.location && <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginLeft: 6 }}>📍 {review.location}</span>}
                    </div>
                    <span style={{ color: '#fbbf24', fontSize: 13 }}>{renderStars(review.rating)}</span>
                    {review.source === 'Google Reviews' && (
                        <span style={{ padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#4285f415', color: '#4285f4', border: '1px solid #4285f430' }}>G</span>
                    )}
                    {review.featured && (
                        <span style={{ padding: '2px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}>⭐ Featured</span>
                    )}
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: '0 0 2px', lineHeight: 1.5 }}>
                    "{review.review?.length > 120 ? review.review.slice(0, 120) + '…' : review.review}"
                </p>
                {review.date && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{review.date}</span>}
            </div>

            {/* Right: controls */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                {/* Main toggle: Show on Website */}
                <button
                    onClick={() => onToggle(review)}
                    disabled={toggling}
                    title={review.showOnWebsite ? 'Click to hide from website' : 'Click to show on website'}
                    style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: `2px solid ${review.showOnWebsite ? 'var(--color-primary)' : 'var(--border-primary)'}`,
                        background: review.showOnWebsite ? 'var(--color-primary)' : 'transparent',
                        color: review.showOnWebsite ? '#fff' : 'var(--text-secondary)',
                        cursor: toggling ? 'wait' : 'pointer',
                        transition: 'all 0.2s',
                        minWidth: 80,
                    }}
                >
                    {toggling ? <Loader2 size={16} className="spin" /> : (
                        review.showOnWebsite ? <Eye size={16} /> : <EyeOff size={16} />
                    )}
                    <span style={{ fontSize: 10, fontWeight: 600, marginTop: 2 }}>
                        {review.showOnWebsite ? 'Visible' : 'Hidden'}
                    </span>
                </button>

                {/* Feature + Delete */}
                <div style={{ display: 'flex', gap: 4 }}>
                    <button
                        onClick={() => onFeatured(review)}
                        title={review.featured ? 'Unpin from top' : 'Pin to top'}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'transparent', cursor: 'pointer', fontSize: 14 }}
                    >
                        {review.featured ? '⭐' : '☆'}
                    </button>
                    <button
                        onClick={() => onDelete(review.id)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border-primary)', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CustomerTestimonialsSettings;
