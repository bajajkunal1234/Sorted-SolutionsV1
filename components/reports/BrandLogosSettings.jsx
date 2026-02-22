'use client'

import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Plus, Trash2, Edit2, Save, X, Upload, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

function BrandLogosSettings() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBrand, setNewBrand] = useState({ name: '', logo_url: '', website_url: '' });
    const [toast, setToast] = useState(null);

    const addFileRef = useRef(null);
    const editFileRef = useRef(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    };

    // ── Load brands ──
    useEffect(() => { fetchBrands(); }, []);

    const fetchBrands = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/settings/brand-logos');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to load');
            setBrands(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
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
            // If upload API doesn't exist, allow pasting URL instead
            showToast('Upload failed — paste a URL instead: ' + err.message, 'error');
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
            if (!data.success) {
                console.error('[ST-DEBUG] Brand Add Error:', data.error, data.details);
                throw new Error(data.error || 'Failed to add brand');
            }
            setBrands(prev => [...prev, data.data]);
            setNewBrand({ name: '', logo_url: '', website_url: '' });
            setShowAddForm(false);
            showToast('Brand added!');
        } catch (err) {
            console.error('[ST-DEBUG] Brand Add Catch:', err);
            alert(`FAILED TO ADD BRAND:\n\nError: ${err.message}\n\nPlease check server console for details.`);
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

    // ── Delete Brand ──
    const handleDelete = async (id) => {
        if (!confirm('Delete this brand?')) return;
        try {
            const res = await fetch(`/api/settings/brand-logos?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Failed to delete');
            setBrands(brands.filter(b => b.id !== id));
            showToast('Brand deleted.');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 40 }}>
            <Loader2 className="animate-spin" size={24} style={{ color: 'var(--color-primary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Loading brands...</span>
        </div>
    );

    if (error) return (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
            <AlertCircle size={36} color="#ef4444" />
            <p style={{ color: '#ef4444', marginTop: 12 }}>Error: {error}</p>
            <button className="btn btn-secondary" onClick={fetchBrands} style={{ marginTop: 12 }}>Retry</button>
        </div>
    );

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
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}
                </div>
            )}

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>
                    Global Brand Logos Library
                </h3>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                    {brands.length} brand{brands.length !== 1 ? 's' : ''} · Changes save immediately to Supabase
                </p>
            </div>

            {/* Add New Brand Button */}
            {!showAddForm && (
                <button
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
                            <label className="field-label">Brand Name *</label>
                            <input type="text" className="form-control" placeholder="e.g., Panasonic" value={newBrand.name} onChange={e => setNewBrand({ ...newBrand, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="field-label">Logo *</label>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => addFileRef.current?.click()}
                                    disabled={uploading}
                                    style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, border: '1px dashed var(--border-primary)' }}
                                >
                                    {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                    <span style={{ fontWeight: 600 }}>{uploading ? 'Uploading...' : 'Choose Logo File'}</span>
                                </button>

                                {newBrand.logo_url && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ padding: 4, backgroundColor: 'var(--bg-secondary)', borderRadius: 6, display: 'flex', alignItems: 'center', height: 40, width: 40 }}>
                                            <img src={newBrand.logo_url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        </div>
                                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>✅ Ready!</span>
                                    </div>
                                )}
                            </div>
                            {newBrand.logo_url && (
                                <div style={{ marginTop: 8, padding: 8, backgroundColor: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 60 }}>
                                    <img src={newBrand.logo_url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                                </div>
                            )}
                            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>Recommended: PNG transparent background, 200×80px</p>
                        </div>
                        <div>
                            <label className="field-label">Website URL (Optional)</label>
                            <input type="text" className="form-control" placeholder="https://www.panasonic.com" value={newBrand.website_url} onChange={e => setNewBrand({ ...newBrand, website_url: e.target.value })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={handleAddBrand} className="btn btn-primary" disabled={!newBrand.name.trim() || !newBrand.logo_url.trim() || saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            {saving ? 'Saving...' : 'Add Brand'}
                        </button>
                        <button onClick={() => { setShowAddForm(false); setNewBrand({ name: '', logo_url: '', website_url: '' }); }} className="btn btn-secondary">
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
                                        <label className="field-label">Brand Name</label>
                                        <input type="text" className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="field-label">Logo</label>
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => editFileRef.current?.click()}
                                                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
                                            >
                                                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                                                <span style={{ fontWeight: 600 }}>{uploading ? 'Change Logo' : 'Choose New File'}</span>
                                            </button>

                                            <div style={{ padding: 4, backgroundColor: 'var(--bg-secondary)', borderRadius: 6, display: 'flex', alignItems: 'center', height: 40, width: 40, border: '1px solid var(--border-primary)' }}>
                                                <img src={editForm.logo_url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="field-label">Website URL</label>
                                        <input type="text" className="form-control" value={editForm.website_url || ''} onChange={e => setEditForm({ ...editForm, website_url: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                    <button onClick={handleSaveEdit} className="btn btn-primary" disabled={saving} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Save
                                    </button>
                                    <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary"><X size={16} /></button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Logo Preview */}
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
                                    <button onClick={() => { setEditingId(brand.id); setEditForm({ ...brand }); }} className="btn btn-secondary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 12px' }}>
                                        <Edit2 size={15} /> Edit
                                    </button>
                                    <button onClick={() => handleDelete(brand.id)} className="btn btn-danger" style={{ padding: '6px 12px' }}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
                .field-label {
                    display: block;
                    font-size: var(--font-size-sm);
                    font-weight: 500;
                    margin-bottom: 4px;
                    color: var(--text-primary);
                }
                .form-control {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid var(--border-primary);
                    border-radius: var(--radius-md);
                    font-size: var(--font-size-sm);
                    background-color: var(--bg-elevated);
                    color: var(--text-primary);
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .form-control:focus { outline: none; border-color: var(--color-primary); }
                .btn-danger {
                    background-color: #ef444415;
                    color: #ef4444;
                    border: 1px solid #ef444430;
                    padding: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }
                .btn-danger:hover { background-color: #ef444425; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

export default BrandLogosSettings;
