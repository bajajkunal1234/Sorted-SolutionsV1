'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Heart, Bookmark, ArrowRight, Pin, Zap, Tag, Megaphone, Newspaper, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TYPE_CONFIG = {
    tip:       { label: 'Tip',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  icon: Zap },
    offer:     { label: 'Offer',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Tag },
    news:      { label: 'News',      color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: Newspaper },
    highlight: { label: 'Highlight', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: Sparkles },
}

function FeedCard({ post, onLike }) {
    const router = useRouter()
    const [liked, setLiked] = useState(false)
    const [likes, setLikes] = useState(post.likes_count || 0)
    const [popping, setPopping] = useState(false)
    const type = TYPE_CONFIG[post.post_type] || TYPE_CONFIG.tip
    const TypeIcon = type.icon

    const handleLike = () => {
        if (liked) return
        setLiked(true)
        setLikes(l => l + 1)
        setPopping(true)
        setTimeout(() => setPopping(false), 400)
        onLike(post.id)
    }

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: 16,
        }}>
            {/* Image */}
            {post.image_url && (
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img
                        src={post.image_url}
                        alt={post.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Gradient overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 60%)',
                    }} />
                    {/* Pin badge */}
                    {post.is_pinned && (
                        <div style={{
                            position: 'absolute', top: 12, right: 12,
                            background: 'rgba(245,158,11,0.9)', borderRadius: 20,
                            padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 700, color: '#fff',
                        }}>
                            <Pin size={10} /> Pinned
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div style={{ padding: '14px 16px 16px' }}>
                {/* Type tag + pin (no-image variant) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: type.bg, color: type.color,
                        borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                        <TypeIcon size={11} /> {type.label}
                    </div>
                    {!post.image_url && post.is_pinned && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>
                            <Pin size={11} /> Pinned
                        </div>
                    )}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                    {post.title}
                </h3>

                {/* Body */}
                {post.body && (
                    <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 14px 0', lineHeight: 1.6 }}>
                        {post.body}
                    </p>
                )}

                {/* Footer: Like + CTA */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: liked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid ' + (liked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'),
                            borderRadius: 20, padding: '7px 14px', cursor: liked ? 'default' : 'pointer',
                            color: liked ? '#f87171' : '#64748b',
                            fontSize: 13, fontWeight: 600,
                            transform: popping ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <Heart size={15} fill={liked ? '#f87171' : 'none'} /> {likes}
                    </button>

                    {post.cta_text && (
                        <button
                            onClick={() => post.cta_url && router.push(post.cta_url)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                border: 'none', borderRadius: 20, padding: '8px 16px',
                                color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            {post.cta_text} <ArrowRight size={13} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function HomePage() {
    const router = useRouter()
    const [customerName, setCustomerName] = useState('there')
    const [greeting, setGreeting] = useState('Good Morning')
    const [banners, setBanners] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)
    const bannerTimer = useRef(null)
    const [posts, setPosts] = useState([])
    const [feedLoading, setFeedLoading] = useState(true)

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good Morning')
        else if (hour < 18) setGreeting('Good Afternoon')
        else setGreeting('Good Evening')

        const cData = localStorage.getItem('customerData')
        if (cData) {
            try { setCustomerName(JSON.parse(cData).name?.split(' ')[0] || 'there') } catch {}
        }

        const customerId = localStorage.getItem('customerId')
        if (!customerId) { router.push('/customer/login'); return }

        // Fetch banners
        fetch('/api/settings/section-configs?id=customer-app-banners')
            .then(r => r.json())
            .then(d => {
                if (d.success && d.data?.extra_config?.banners) {
                    setBanners(d.data.extra_config.banners.filter(b => b.active))
                }
            }).catch(() => {})

        // Fetch feed
        fetch('/api/customer/feed')
            .then(r => r.json())
            .then(d => { setPosts(d.posts || []) })
            .catch(() => {})
            .finally(() => setFeedLoading(false))
    }, [])

    // Auto-advance banners
    useEffect(() => {
        if (banners.length <= 1) return
        bannerTimer.current = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 5000)
        return () => clearInterval(bannerTimer.current)
    }, [banners.length])

    const handleLike = async (postId) => {
        try {
            await fetch('/api/customer/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            })
        } catch {}
    }

    return (
        <div style={{ minHeight: '100%', background: '#0a0f1e' }}>
            {/* ── GREETING HEADER ── */}
            <div style={{ padding: '28px 20px 12px' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{greeting}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                    {customerName} 👋
                </div>
            </div>

            {/* ── BANNER CAROUSEL ── */}
            {banners.length > 0 && (
                <div style={{ padding: '0 20px 20px' }}>
                    <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', width: '100%', aspectRatio: '16/6' }}>
                        <div style={{
                            display: 'flex',
                            width: `${banners.length * 100}%`,
                            height: '100%',
                            transition: 'transform 0.5s ease-in-out',
                            transform: `translateX(-${bannerIndex * (100 / banners.length)}%)`
                        }}>
                            {banners.map((banner, i) => (
                                <div key={banner.id}
                                    onClick={() => banner.targetUrl && router.push(banner.targetUrl)}
                                    style={{ width: `${100 / banners.length}%`, height: '100%', flexShrink: 0, cursor: banner.targetUrl ? 'pointer' : 'default', background: '#0f1629' }}
                                >
                                    <img src={banner.imageUrl} alt={banner.title} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                                </div>
                            ))}
                        </div>
                        {banners.length > 1 && (
                            <div style={{ position: 'absolute', bottom: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                {banners.map((_, i) => (
                                    <div key={i} onClick={() => setBannerIndex(i)}
                                        style={{ width: i === bannerIndex ? 16 : 6, height: 6, borderRadius: 10, background: i === bannerIndex ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s', cursor: 'pointer' }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── FEED ── */}
            <div style={{ padding: '0 16px 100px' }}>
                {/* Feed header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        From Sorted
                    </span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {feedLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[1,2,3].map(i => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 24, height: 200, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        ))}
                        <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📡</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Nothing here yet</div>
                        <div style={{ fontSize: 14, color: '#475569' }}>Sorted will post tips, offers & highlights here.</div>
                    </div>
                ) : (
                    posts.map(post => (
                        <FeedCard key={post.id} post={post} onLike={handleLike} />
                    ))
                )}
            </div>
        </div>
    )
}
