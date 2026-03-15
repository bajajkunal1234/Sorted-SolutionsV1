'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, Loader2, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon, Edit2, X, Check, Film, Link as LinkIcon } from 'lucide-react';

const POST_TYPES = [
    { value: 'tip',       label: 'Tip',       icon: '⚡' },
    { value: 'offer',     label: 'Offer',     icon: '🏷️' },
    { value: 'news',      label: 'News',      icon: '📰' },
    { value: 'highlight', label: 'Highlight', icon: '✨' },
];

// Detect media type from URL
function detectMediaType(url) {
    if (!url) return 'image';
    const u = url.toLowerCase();
    if (u.includes('instagram.com/p/') || u.includes('instagram.com/reel/') || u.includes('instagram.com/stories/')) return 'instagram';
    if (u.includes('facebook.com') && (u.includes('/posts/') || u.includes('/photos/') || u.includes('/videos/'))) return 'facebook';
    if (u.includes('youtube.com/watch') || u.includes('youtu.be/')) return 'youtube';
    if (u.includes('tiktok.com')) return 'tiktok';
    if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
    if (u.match(/\.(mp4|webm|mov|avi)(\?|$)/)) return 'video';
    if (u.match(/\.(gif)(\?|$)/)) return 'gif';
    return 'image';
}

const MEDIA_TYPE_LABELS = {
    image: '🖼️ Image',
    gif: '🎞️ GIF',
    video: '🎬 Video',
    instagram: '📸 Instagram',
    facebook: '📘 Facebook',
    youtube: '▶️ YouTube',
    tiktok: '🎵 TikTok',
    twitter: '🐦 X / Twitter',
};

const BLANK_POST = {
    title: '',
    body: '',
    media: [],
    post_type: 'tip',
    cta_text: '',
    cta_url: '',
    is_active: true,
    is_pinned: false,
};

// ── Media Item Editor ────────────────────────────────────────────
function MediaItem({ item, onChange, onRemove }) {
    const inputStyle = {
        flex: 1, padding: '7px 10px',
        border: '1px solid var(--border-primary)', borderRadius: 6,
        fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)',
    };
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-primary)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border-primary)' }}>
            <select
                value={item.type}
                onChange={e => onChange({ ...item, type: e.target.value })}
                style={{ ...inputStyle, flex: '0 0 130px', padding: '7px 8px' }}
            >
                {Object.entries(MEDIA_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
                style={inputStyle}
                value={item.url}
                onChange={e => {
                    const url = e.target.value;
                    const autoType = detectMediaType(url);
                    onChange({ ...item, url, type: autoType });
                }}
                placeholder="Paste URL — auto-detects Instagram, YouTube, etc."
            />
            <button type="button" onClick={onRemove} style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}>
                <Trash2 size={14} />
            </button>
        </div>
    );
}

// ── FeedPostForm ────────────────────────────────────────────────
function FeedPostForm({ post, onSave, onCancel, saving }) {
    const [form, setForm] = useState(post || BLANK_POST);
    const up = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

    const addMedia = () => setForm(f => ({ ...f, media: [...(f.media || []), { type: 'image', url: '' }] }));
    const updateMedia = (idx, item) => setForm(f => { const m = [...(f.media || [])]; m[idx] = item; return { ...f, media: m }; });
    const removeMedia = (idx) => setForm(f => ({ ...f, media: (f.media || []).filter((_, i) => i !== idx) }));

    const inputStyle = {
        width: '100%', padding: '8px 12px',
        border: '1px solid var(--border-primary)', borderRadius: 6,
        fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)',
        boxSizing: 'border-box',
    };
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' };

    return (
        <div style={{ border: '1px solid var(--border-primary)', borderRadius: 12, padding: 20, background: 'var(--bg-secondary)', marginBottom: 16 }}>
            {/* Title + Type row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>Title *</label>
                    <input style={inputStyle} value={form.title} onChange={up('title')} placeholder="e.g. Clean your AC filter every 3 months" />
                </div>
                <div>
                    <label style={labelStyle}>Type</label>
                    <select style={{ ...inputStyle, width: 140 }} value={form.post_type} onChange={up('post_type')}>
                        {POST_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Body */}
            <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Caption / Body (Optional)</label>
                <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={form.body} onChange={up('body')} placeholder="Write a caption, tip detail, or promo description..." />
            </div>

            {/* Media */}
            <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ ...labelStyle, margin: 0 }}>Media — Images, Videos, GIFs, Social Posts</label>
                    <button type="button" onClick={addMedia} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', fontSize: 12 }}>
                        <Plus size={13} /> Add
                    </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(form.media || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', border: '1px dashed var(--border-primary)', borderRadius: 8, color: 'var(--text-tertiary)', fontSize: 12 }}>
                            No media yet — click <strong>Add</strong> to attach images, videos, GIFs, or paste an Instagram / YouTube / Facebook link
                        </div>
                    ) : (
                        (form.media || []).map((item, idx) => (
                            <MediaItem key={idx} item={item} onChange={v => updateMedia(idx, v)} onRemove={() => removeMedia(idx)} />
                        ))
                    )}
                </div>
            </div>

            {/* CTA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                    <label style={labelStyle}>CTA Button Text (Optional)</label>
                    <input style={inputStyle} value={form.cta_text} onChange={up('cta_text')} placeholder="e.g. Book Now" />
                </div>
                <div>
                    <label style={labelStyle}>CTA Button Link</label>
                    <input style={inputStyle} value={form.cta_url} onChange={up('cta_url')} placeholder="e.g. /services" />
                </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_active} onChange={up('is_active')} /> Active (visible to customers)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={form.is_pinned} onChange={up('is_pinned')} /> 📌 Pin to top of feed
                </label>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <X size={14} /> Cancel
                </button>
                <button type="button" onClick={() => onSave(form)} disabled={saving || !form.title.trim()} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {saving ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
                    {post?.id ? 'Update Post' : 'Create Post'}
                </button>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────
export default function CustomerAppSettings() {
    const [activeTab, setActiveTab] = useState('banners');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [config, setConfig] = useState({ banners: [] });
    const [posts, setPosts] = useState([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const [showPostForm, setShowPostForm] = useState(false);
    const [editingPost, setEditingPost] = useState(null);
    const [postSaving, setPostSaving] = useState(false);

    useEffect(() => { fetchBanners(); fetchFeed(); }, []);

    const flashMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 3500);
    };

    // ── Banners ──
    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/section-configs?id=customer-app-banners');
            if (res.ok) { const d = await res.json(); if (d.success && d.data?.extra_config) setConfig({ banners: d.data.extra_config.banners || [] }); }
        } finally { setLoading(false); }
    };

    const handleSaveBanners = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/section-configs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section_id: 'customer-app-banners', extra_config: config }) });
            const d = await res.json();
            if (d.success) flashMessage('success', 'Banners saved!'); else throw new Error(d.message);
        } catch (e) { flashMessage('error', e.message || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const addBanner = () => setConfig(c => ({ ...c, banners: [...c.banners, { id: Date.now().toString(), title: 'New Banner', imageUrl: '', targetUrl: '', active: true }] }));
    const removeBanner = (id) => setConfig(c => ({ ...c, banners: c.banners.filter(b => b.id !== id) }));
    const updateBanner = (id, field, val) => setConfig(c => ({ ...c, banners: c.banners.map(b => b.id === id ? { ...b, [field]: val } : b) }));
    const moveBanner = (idx, dir) => {
        if ((dir === -1 && idx === 0) || (dir === 1 && idx === config.banners.length - 1)) return;
        const arr = [...config.banners]; [arr[idx], arr[idx + dir]] = [arr[idx + dir], arr[idx]];
        setConfig(c => ({ ...c, banners: arr }));
    };

    // ── Feed ──
    const fetchFeed = async () => {
        setFeedLoading(true);
        try { const res = await fetch('/api/admin/feed'); const d = await res.json(); if (d.success) setPosts(d.posts || []); }
        finally { setFeedLoading(false); }
    };

    const handleCreatePost = async (form) => {
        setPostSaving(true);
        try {
            const res = await fetch('/api/admin/feed', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const d = await res.json();
            if (d.success) { await fetchFeed(); setShowPostForm(false); flashMessage('success', 'Post created!'); }
            else throw new Error(d.error);
        } catch (e) { flashMessage('error', e.message || 'Failed'); }
        finally { setPostSaving(false); }
    };

    const handleUpdatePost = async (form) => {
        setPostSaving(true);
        try {
            const res = await fetch('/api/admin/feed', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingPost.id, ...form }) });
            const d = await res.json();
            if (d.success) { await fetchFeed(); setEditingPost(null); flashMessage('success', 'Post updated!'); }
            else throw new Error(d.error);
        } catch (e) { flashMessage('error', e.message || 'Failed'); }
        finally { setPostSaving(false); }
    };

    const handleDeletePost = async (id) => {
        if (!window.confirm('Delete this post?')) return;
        try { await fetch(`/api/admin/feed?id=${id}`, { method: 'DELETE' }); await fetchFeed(); flashMessage('success', 'Deleted.'); }
        catch { flashMessage('error', 'Failed to delete'); }
    };

    const handleToggleActive = async (post) => {
        try {
            await fetch('/api/admin/feed', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, is_active: !post.is_active }) });
            await fetchFeed();
        } catch { flashMessage('error', 'Failed'); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 className="spin" size={28} /></div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 4 }}>Customer App</h3>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>Manage banners and the feed shown in the customer app.</p>
                </div>
                {activeTab === 'banners' && (
                    <button type="button" onClick={handleSaveBanners} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {saving ? <Loader2 size={15} className="spin" /> : <Save size={15} />} Save Banners
                    </button>
                )}
            </div>

            {message.text && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, background: message.type === 'error' ? '#ef444415' : '#10b98115', color: message.type === 'error' ? '#ef4444' : '#10b981', border: `1px solid ${message.type === 'error' ? '#ef444430' : '#10b98130'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} /> {message.text}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', marginBottom: 24 }}>
                {[{ id: 'banners', label: '🖼️  Banners' }, { id: 'feed', label: '📋  Feed Posts' }].map(tab => (
                    <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', background: 'none', border: 'none', borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent', color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--text-secondary)', fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 14, cursor: 'pointer' }}>{tab.label}</button>
                ))}
            </div>

            {/* ── BANNERS ── */}
            {activeTab === 'banners' && (
                <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                        <h4 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, margin: 0 }}>Active Banners ({config.banners.length})</h4>
                        <button onClick={addBanner} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={15} /> Add Banner</button>
                    </div>
                    {config.banners.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                            <ImageIcon size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
                            <p style={{ margin: 0 }}>No banners yet. Click <strong>Add Banner</strong>.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {config.banners.map((banner, index) => (
                                <div key={banner.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-primary)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center', paddingRight: 16, borderRight: '1px solid var(--border-primary)' }}>
                                        <button onClick={() => moveBanner(index, -1)} disabled={index === 0} style={{ padding: 4, background: 'transparent', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}><ArrowUp size={15} /></button>
                                        <button onClick={() => moveBanner(index, 1)} disabled={index === config.banners.length - 1} style={{ padding: 4, background: 'transparent', border: 'none', cursor: index === config.banners.length - 1 ? 'not-allowed' : 'pointer', opacity: index === config.banners.length - 1 ? 0.3 : 1 }}><ArrowDown size={15} /></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 220px) 1fr', gap: 16 }}>
                                        <div style={{ borderRadius: 8, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border-primary)', aspectRatio: '16/7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {banner.imageUrl ? <img src={banner.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} style={{ opacity: 0.2 }} />}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {['title', 'imageUrl', 'targetUrl'].map(f => (
                                                <div key={f}>
                                                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 3 }}>{f === 'title' ? 'Title' : f === 'imageUrl' ? 'Image URL' : 'Target Link'}</label>
                                                    <input type="text" value={banner[f]} onChange={e => updateBanner(banner.id, f, e.target.value)} placeholder={f === 'targetUrl' ? '/services' : ''} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border-primary)', borderRadius: 6, fontSize: 13, background: 'var(--bg-primary)', color: 'var(--text-primary)', boxSizing: 'border-box' }} />
                                                </div>
                                            ))}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={banner.active} onChange={e => updateBanner(banner.id, 'active', e.target.checked)} /> Active
                                                </label>
                                                <button onClick={() => removeBanner(banner.id)} style={{ padding: 6, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={15} /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── FEED POSTS ── */}
            {activeTab === 'feed' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 600 }}>Feed Posts ({posts.length})</h4>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>Newest posts appear first. Pinned posts stay at the top.</p>
                        </div>
                        <button type="button" onClick={() => { setShowPostForm(true); setEditingPost(null); }} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={15} /> New Post
                        </button>
                    </div>

                    {showPostForm && !editingPost && <FeedPostForm onSave={handleCreatePost} onCancel={() => setShowPostForm(false)} saving={postSaving} />}

                    {feedLoading ? (
                        <div style={{ textAlign: 'center', padding: 40 }}><Loader2 className="spin" size={24} /></div>
                    ) : posts.length === 0 && !showPostForm ? (
                        <div style={{ textAlign: 'center', padding: 56, background: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', borderRadius: 12, color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📡</div>
                            <p style={{ margin: 0 }}>No posts yet. Create your first!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {posts.map(post => {
                                const typeInfo = POST_TYPES.find(t => t.value === post.post_type) || POST_TYPES[0];
                                const mediaCount = (post.media || []).length;
                                return (
                                    <div key={post.id}>
                                        {editingPost?.id === post.id ? (
                                            <FeedPostForm post={editingPost} onSave={handleUpdatePost} onCancel={() => setEditingPost(null)} saving={postSaving} />
                                        ) : (
                                            <div style={{ display: 'flex', gap: 14, padding: 14, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 10, opacity: post.is_active ? 1 : 0.55 }}>
                                                {/* Thumbnail */}
                                                <div style={{ width: 80, height: 60, borderRadius: 8, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: mediaCount > 0 ? 22 : 28, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                                                    {mediaCount > 0 && (post.media[0].type === 'image' || post.media[0].type === 'gif')
                                                        ? <img src={post.media[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                                                        : <span>{mediaCount > 0 ? MEDIA_TYPE_LABELS[post.media[0].type]?.split(' ')[0] || '🖼️' : typeInfo.icon}</span>}
                                                </div>

                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{typeInfo.icon} {typeInfo.label}</span>
                                                        {post.is_pinned && <span style={{ fontSize: 11, color: '#f59e0b' }}>📌</span>}
                                                        {!post.is_active && <span style={{ fontSize: 11, color: '#64748b' }}>Hidden</span>}
                                                        {mediaCount > 0 && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{mediaCount} media</span>}
                                                    </div>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</div>
                                                    {post.body && <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{post.body}</div>}
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>❤️ {post.likes_count || 0}</div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                                                    <button type="button" onClick={() => setEditingPost(post)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><Edit2 size={12} /> Edit</button>
                                                    <button type="button" onClick={() => handleToggleActive(post)} className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: 12 }}>{post.is_active ? 'Hide' : 'Show'}</button>
                                                    <button type="button" onClick={() => handleDeletePost(post.id)} style={{ padding: '5px 10px', fontSize: 12, background: 'transparent', border: '1px solid #ef444440', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

