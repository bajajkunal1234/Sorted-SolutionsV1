'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';

export default function SubcategoryModal({ category = null, onClose = () => {} }) {
    const router = useRouter();
    const [activeCat, setActiveCat] = useState(category);

    useEffect(() => {
        if (category) {
            setActiveCat(category);
        }
    }, [category]);

    // Close on Escape key and lock background scroll
    useEffect(() => {
        if (!category) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [category, onClose]);

    if (!category || !activeCat) return null;

    const subcategories = activeCat.subcategories || [];

    const handleSelectSub = (sub) => {
        onClose();
        router.push(`/v2/services/${activeCat.slug}/${sub.slug}`);
    };

    return (
        <div
            className="v2-submodal-backdrop"
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                animation: 'v2BackdropFade 0.2s ease-out'
            }}
        >
            {/* Sheet / Modal Container */}
            <div
                className="v2-submodal-sheet"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 520,
                    backgroundColor: '#ffffff',
                    borderRadius: '24px 24px 0 0',
                    padding: '22px 20px 32px 20px',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
                    animation: 'v2SheetSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Floating Circular Close Button (X) - Urban Company Style */}
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close dialog"
                    className="v2-submodal-close-btn"
                    style={{
                        position: 'absolute',
                        top: -50,
                        right: 16,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'transform 0.15s ease'
                    }}
                >
                    <X size={19} color="#0f172a" strokeWidth={2.5} />
                </button>

                {/* Mobile Top Drag Indicator Pill */}
                <div style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#e2e8f0',
                    margin: '-6px auto 16px auto',
                    display: 'block'
                }} />

                {/* Header Title */}
                <div style={{ marginBottom: 18 }}>
                    <h2 style={{
                        fontSize: 20,
                        fontWeight: 800,
                        color: '#0f172a',
                        margin: '0 0 4px 0',
                        letterSpacing: '-0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <span>{activeCat.name}</span>
                    </h2>
                    <p style={{
                        fontSize: 12.5,
                        color: '#64748b',
                        margin: 0,
                        lineHeight: 1.4
                    }}>
                        Select your appliance type for fixed pricing & 90-min arrival
                    </p>
                </div>

                {/* Subcategories 3-Column Grid (Urban Company Layout) */}
                <div style={{ marginBottom: 22 }}>
                    <div style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#334155',
                        marginBottom: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <span>Subcategories</span>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 12
                    }}>
                        {subcategories.map(sub => (
                            <button
                                key={sub.slug}
                                type="button"
                                onClick={() => handleSelectSub(sub)}
                                className="v2-submodal-card"
                                style={{
                                    border: '1px solid #f1f5f9',
                                    borderRadius: 16,
                                    backgroundColor: '#f8fafc',
                                    padding: '14px 8px 12px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    position: 'relative',
                                    transition: 'all 0.18s ease',
                                    outline: 'none'
                                }}
                            >
                                <div style={{
                                    width: 56,
                                    height: 56,
                                    marginBottom: 8,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative'
                                }}>
                                    <img
                                        src={sub.icon || activeCat.icon}
                                        alt={sub.name}
                                        style={{
                                            maxWidth: '85%',
                                            maxHeight: '85%',
                                            objectFit: 'contain',
                                            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.12))'
                                        }}
                                    />
                                </div>
                                <strong style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    lineHeight: 1.25,
                                    minHeight: 28,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {sub.name}
                                </strong>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Switch to Other Appliances Strip */}
                <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 16
                }}>
                    <div style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: 10
                    }}>
                        Other Appliances
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: 8,
                        overflowX: 'auto',
                        paddingBottom: 4,
                        scrollbarWidth: 'none'
                    }}>
                        {V2_CATEGORIES.filter(c => c.slug !== activeCat.slug).map(otherCat => (
                            <button
                                key={otherCat.slug}
                                type="button"
                                onClick={() => setActiveCat(otherCat)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 999,
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    color: '#334155',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer'
                                }}
                            >
                                <img
                                    src={otherCat.icon}
                                    alt={otherCat.name}
                                    style={{ width: 16, height: 16, objectFit: 'contain' }}
                                />
                                <span>{otherCat.mobileLabel}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
