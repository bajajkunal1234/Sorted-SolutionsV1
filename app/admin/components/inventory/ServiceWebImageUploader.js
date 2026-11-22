'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, Trash2, Image as ImageIcon, Sparkles, RefreshCw } from 'lucide-react';
import { uploadClientMedia } from '@/lib/v2/clientUpload';

export default function ServiceWebImageUploader({
    thumbnailUrl = '',
    heroUrl = '',
    onThumbnailChange,
    onHeroChange,
    disabled = false
}) {
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [uploadingHero, setUploadingHero] = useState(false);
    const [thumbError, setThumbError] = useState('');
    const [heroError, setHeroError] = useState('');

    const thumbInputRef = useRef(null);
    const heroInputRef = useRef(null);

    const handleUpload = async (file, type) => {
        if (!file || disabled) return;
        if (type === 'thumbnail') {
            setUploadingThumb(true);
            setThumbError('');
            try {
                const url = await uploadClientMedia(file, {
                    folder: 'inventory/thumbnails',
                    bucket: 'website-assets',
                    maxSizeMB: 1.5,
                    maxWidthOrHeight: 1200
                });
                if (onThumbnailChange) onThumbnailChange(url);
            } catch (err) {
                console.error('Thumbnail upload error:', err);
                setThumbError(err.message || 'Upload failed');
            } finally {
                setUploadingThumb(false);
            }
        } else if (type === 'hero') {
            setUploadingHero(true);
            setHeroError('');
            try {
                const url = await uploadClientMedia(file, {
                    folder: 'inventory/heroes',
                    bucket: 'website-assets',
                    maxSizeMB: 2.0,
                    maxWidthOrHeight: 1800
                });
                if (onHeroChange) onHeroChange(url);
            } catch (err) {
                console.error('Hero upload error:', err);
                setHeroError(err.message || 'Upload failed');
            } finally {
                setUploadingHero(false);
            }
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* ── 1. Thumbnail Image (1:1 Ratio) ── */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>📸</span>
                        <strong style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>
                            Thumbnail Image
                        </strong>
                    </div>
                    <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 5,
                        backgroundColor: 'rgba(99, 56, 245, 0.14)',
                        color: '#6338f5',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                    }}>
                        1:1 Square Ratio
                    </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                    Displayed on service cards in category & subcategory listings (Recommended: 400×400px).
                </p>

                {thumbnailUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                        <div style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 10,
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            position: 'relative'
                        }}>
                            <img
                                src={thumbnailUrl}
                                alt="Thumbnail Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                color: '#ffffff',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4
                            }}>
                                1:1 Aspect
                            </div>
                        </div>

                        {!disabled && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={() => thumbInputRef.current?.click()}
                                    disabled={uploadingThumb}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        borderRadius: 7,
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5
                                    }}
                                >
                                    {uploadingThumb ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
                                    Change 1:1 Image
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onThumbnailChange && onThumbnailChange('')}
                                    disabled={uploadingThumb}
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 7,
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        color: '#ef4444',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                    title="Remove thumbnail"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => !disabled && !uploadingThumb && thumbInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleUpload(file, 'thumbnail');
                        }}
                        style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 10,
                            border: '2px dashed var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            textAlign: 'center',
                            cursor: disabled ? 'default' : 'pointer',
                            transition: 'border-color 0.15s ease'
                        }}
                    >
                        {uploadingThumb ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <RefreshCw size={24} color="#6338f5" className="spin" />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
                                    Uploading 1:1 Thumbnail...
                                </span>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(99, 56, 245, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6338f5',
                                    marginBottom: 10
                                }}>
                                    <Upload size={20} />
                                </div>
                                <strong style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                                    Upload 1:1 Thumbnail
                                </strong>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                    Click or drag &amp; drop square image
                                </span>
                            </>
                        )}
                    </div>
                )}

                {thumbError && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                        ⚠️ {thumbError}
                    </div>
                )}

                <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, 'thumbnail');
                        e.target.value = '';
                    }}
                />
            </div>

            {/* ── 2. Hero Section Image (2:1 Ratio) ── */}
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>🎬</span>
                        <strong style={{ fontSize: 13.5, color: 'var(--text-primary)' }}>
                            Hero Banner Image
                        </strong>
                    </div>
                    <span style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: 5,
                        backgroundColor: 'rgba(16, 185, 129, 0.14)',
                        color: '#10b981',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                    }}>
                        2:1 Wide Ratio
                    </span>
                </div>
                <p style={{ margin: '0 0 12px 0', fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                    Displayed at the top of the service details modal when opened (Recommended: 800×400px).
                </p>

                {heroUrl ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                        <div style={{
                            width: '100%',
                            aspectRatio: '2 / 1',
                            borderRadius: 10,
                            overflow: 'hidden',
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            position: 'relative'
                        }}>
                            <img
                                src={heroUrl}
                                alt="Hero Preview"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            <div style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                backgroundColor: 'rgba(0,0,0,0.65)',
                                color: '#ffffff',
                                fontSize: 10,
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 4
                            }}>
                                2:1 Aspect
                            </div>
                        </div>

                        {!disabled && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                                <button
                                    type="button"
                                    onClick={() => heroInputRef.current?.click()}
                                    disabled={uploadingHero}
                                    style={{
                                        flex: 1,
                                        padding: '7px 12px',
                                        borderRadius: 7,
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        color: 'var(--text-primary)',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 5
                                    }}
                                >
                                    {uploadingHero ? <RefreshCw size={13} className="spin" /> : <Upload size={13} />}
                                    Change 2:1 Hero
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onHeroChange && onHeroChange('')}
                                    disabled={uploadingHero}
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 7,
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                        color: '#ef4444',
                                        fontSize: 12,
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}
                                    title="Remove hero image"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => !disabled && !uploadingHero && heroInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleUpload(file, 'hero');
                        }}
                        style={{
                            width: '100%',
                            aspectRatio: '2 / 1',
                            borderRadius: 10,
                            border: '2px dashed var(--border-primary)',
                            backgroundColor: 'var(--bg-elevated)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 16,
                            textAlign: 'center',
                            cursor: disabled ? 'default' : 'pointer',
                            transition: 'border-color 0.15s ease'
                        }}
                    >
                        {uploadingHero ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <RefreshCw size={24} color="#10b981" className="spin" />
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
                                    Uploading 2:1 Hero...
                                </span>
                            </div>
                        ) : (
                            <>
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: '50%',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#10b981',
                                    marginBottom: 10
                                }}>
                                    <Upload size={20} />
                                </div>
                                <strong style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4 }}>
                                    Upload 2:1 Hero Image
                                </strong>
                                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                                    Click or drag &amp; drop wide banner
                                </span>
                            </>
                        )}
                    </div>
                )}

                {heroError && (
                    <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>
                        ⚠️ {heroError}
                    </div>
                )}

                <input
                    ref={heroInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, 'hero');
                        e.target.value = '';
                    }}
                />
            </div>
        </div>
    );
}
