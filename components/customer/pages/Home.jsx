'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Heart, ArrowRight, Pin, Zap, Tag, Newspaper, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TYPE_CONFIG = {
    tip:       { label: 'Tip',       color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    offer:     { label: 'Offer',     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    news:      { label: 'News',      color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    highlight: { label: 'Highlight', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

const TYPE_ICONS = { tip: '⚡', offer: '🏷️', news: '📰', highlight: '✨' }

// ── URL conversion helpers ──────────────────────────────────────
function getEmbedUrl(item) {
    const url = item.url || ''
    const type = item.type

    if (type === 'instagram') {
        // Extract shortcode from instagram.com/p/CODE/ or /reel/CODE/
        const m = url.match(/instagram\.com\/(?:p|reel|stories\/[^/]+)\/([A-Za-z0-9_-]+)/)
        if (m) return `https://www.instagram.com/p/${m[1]}/embed/`
        return url
    }
    if (type === 'facebook') {
        return `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&width=500&show_text=true&appId=`
    }
    if (type === 'youtube') {
        const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
        if (m) return `https://www.youtube.com/embed/${m[1]}?rel=0`
        return url
    }
    if (type === 'tiktok') {
        const m = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/)
        if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`
        return url
    }
    if (type === 'twitter') {
        return `https://twitframe.com/show?url=${encodeURIComponent(url)}`
    }
    return url
}

const EMBED_ASPECT = {
    instagram: '9/13',
    facebook:  '16/10',
    youtube:   '16/9',
    tiktok:    '9/16',
    twitter:   '9/7',
    video:     '16/9',
}

function AutoPlayVideo({ src, aspect }) {
    const videoRef = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (videoRef.current) {
                        // Play silently, handling the autoplay promise rejection gracefully
                        videoRef.current.play().catch(e => console.log('Autoplay blocked:', e))
                    }
                } else {
                    if (videoRef.current) {
                        videoRef.current.pause()
                    }
                }
            })
        }, { threshold: 0.5 })

        if (videoRef.current) observer.observe(videoRef.current)
        return () => observer.disconnect()
    }, [])

    return (
        <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            muted
            loop
            style={{ width: '100%', display: 'block', aspectRatio: aspect, background: '#000' }}
        />
    )
}

// ── Single media renderer ───────────────────────────────────────
function MediaRenderer({ item }) {
    const type = item.type || 'image'
    const embedUrl = getEmbedUrl(item)
    const aspect = EMBED_ASPECT[type] || '16/9'

    if (type === 'image' || type === 'gif') {
        return (
            <img
                src={item.url}
                alt=""
                style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }}
            />
        )
    }

    if (type === 'video') {
        return <AutoPlayVideo src={item.url} aspect={aspect} />
    }

    if (type === 'instagram') {
        return (
            <div style={{ width: '100%', height: 480, background: '#0a0f1e', position: 'relative', overflow: 'hidden' }}>
                {/* 
                  Instagram's embed iframe has a forced header (approx 54px) and footer.
                  We shift the iframe up by 54px and increase its height to hide the poster's profile header.
                */}
                <iframe
                    title="Instagram Embed"
                    src={embedUrl}
                    style={{ position: 'absolute', top: -54, left: -2, width: 'calc(100% + 4px)', height: 'calc(100% + 100px)', border: 'none', display: 'block' }}
                    allowFullScreen
                    scrolling="no"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                />

                {/* Custom Sorted Solutions Header Overlay */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(to bottom, rgba(10,15,30,0.85), rgba(10,15,30,0))', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', pointerEvents: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src="/logo-dark.jpg" alt="Sorted" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.2)' }} />
                        <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, letterSpacing: '0.2px', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                            sortedsolutions.in
                        </span>
                    </div>
                    
                    {/* The Follow button pointerEvents is set to auto to be clickable */}
                    <a href="https://instagram.com/sortedsolutions.in" target="_blank" rel="noreferrer" style={{ background: 'var(--color-primary)', color: '#ffffff', padding: '6px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, textDecoration: 'none', pointerEvents: 'auto', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                        Follow
                    </a>
                </div>

                {/* Invisible clickable overlay at the bottom to intercept the original "View more on Instagram" click */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, zIndex: 10, background: 'linear-gradient(to top, rgba(10,15,30,0.95), rgba(10,15,30,0))', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'flex-start' }}>
                    <a href="https://instagram.com/sortedsolutions.in" target="_blank" rel="noreferrer" style={{ color: '#ffffff', textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: '100%' }}>
                        View our profile on Instagram 
                    </a>
                </div>
            </div>
        )
    }

    // Default social embeds — iframe
    return (
        <div style={{ width: '100%', aspectRatio: aspect, background: '#0f172a', position: 'relative', overflow: 'hidden' }}>
            <iframe
                src={embedUrl}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allowFullScreen
                scrolling="yes"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                loading="lazy"
            />
        </div>
    )
}

// ── Media Carousel ──────────────────────────────────────────────
function MediaCarousel({ media }) {
    const [idx, setIdx] = useState(0)
    if (!media || media.length === 0) return null

    const valid = media.filter(m => m.url)
    if (valid.length === 0) return null

    return (
        <div style={{ position: 'relative', borderRadius: '20px 20px 0 0', overflow: 'hidden', background: '#0a0f1e' }}>
            <MediaRenderer item={valid[idx]} />

            {valid.length > 1 && (
                <>
                    <button
                        onClick={() => setIdx(i => Math.max(0, i - 1))}
                        style={{
                            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer', opacity: idx === 0 ? 0.3 : 1,
                        }}
                        disabled={idx === 0}
                    ><ChevronLeft size={18} /></button>

                    <button
                        onClick={() => setIdx(i => Math.min(valid.length - 1, i + 1))}
                        style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer', opacity: idx === valid.length - 1 ? 0.3 : 1,
                        }}
                        disabled={idx === valid.length - 1}
                    ><ChevronRight size={18} /></button>

                    {/* Dots */}
                    <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
                        {valid.map((_, i) => (
                            <div key={i} onClick={() => setIdx(i)} style={{ width: i === idx ? 16 : 6, height: 6, borderRadius: 10, background: i === idx ? '#fff' : 'rgba(255,255,255,0.5)', cursor: 'pointer', transition: 'all 0.3s' }} />
                        ))}
                    </div>

                    {/* Count badge */}
                    <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12 }}>
                        {idx + 1} / {valid.length}
                    </div>
                </>
            )}
        </div>
    )
}

// ── Feed Card ───────────────────────────────────────────────────
function FeedCard({ post, onLike, initialLiked }) {
    const router = useRouter()
    const [liked, setLiked] = useState(initialLiked || false)
    const [likes, setLikes] = useState(post.likes_count || 0)
    const [pop, setPop] = useState(false)
    const type = TYPE_CONFIG[post.post_type] || TYPE_CONFIG.tip
    const hasMedia = (post.media || []).filter(m => m.url).length > 0

    const handleLike = () => {
        if (liked) return
        setLiked(true); setLikes(l => l + 1); setPop(true)
        setTimeout(() => setPop(false), 400)
        onLike(post.id)
    }

    return (
        <div style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 22,
            overflow: 'hidden',
            marginBottom: 16,
        }}>
            {/* Media carousel */}
            {hasMedia && <MediaCarousel media={post.media} />}

            {/* Content area */}
            <div style={{ padding: '12px 16px 16px' }}>
                {/* Tag row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: type.color, background: type.bg, padding: '3px 10px', borderRadius: 20 }}>
                        {TYPE_ICONS[post.post_type] || '✨'} {type.label}
                    </span>
                    {post.is_pinned && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Pin size={11} /> Pinned
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0', lineHeight: 1.3 }}>{post.title}</h3>

                {/* Body */}
                {post.body && (
                    <p style={{ fontSize: 14, color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.6 }}>{post.body}</p>
                )}

                {/* Action row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: liked ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                            border: '1px solid ' + (liked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'),
                            borderRadius: 20, padding: '7px 14px',
                            color: liked ? '#f87171' : '#64748b',
                            fontSize: 13, fontWeight: 600, cursor: liked ? 'default' : 'pointer',
                            transform: pop ? 'scale(1.18)' : 'scale(1)', transition: 'all 0.2s',
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
                                border: 'none', borderRadius: 20, padding: '8px 18px',
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

// ── Home Page ───────────────────────────────────────────────────
export default function HomePage() {
    const router = useRouter()
    const [customerName, setCustomerName] = useState('there')
    const [greeting, setGreeting] = useState('Good Morning')
    const [banners, setBanners] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)
    const bannerTimer = useRef(null)
    const [posts, setPosts] = useState([])
    const [feedLoading, setFeedLoading] = useState(true)
    const [likedPosts, setLikedPosts] = useState(new Set())
    const [isBannerHovered, setIsBannerHovered] = useState(false)

    useEffect(() => {
        const hour = new Date().getHours()
        setGreeting(hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening')

        try {
            const cachedLikes = JSON.parse(localStorage.getItem('customer_liked_posts') || '[]')
            setLikedPosts(new Set(cachedLikes))
            
            const cData = localStorage.getItem('customerData')
            if (cData) setCustomerName(JSON.parse(cData).name?.split(' ')[0] || 'there')
        } catch {}

        const customerId = localStorage.getItem('customerId')
        if (!customerId) { router.push('/customer/login'); return }

        fetch('/api/settings/section-configs?id=customer-app-banners')
            .then(r => r.json())
            .then(d => { if (d.success && d.data?.extra_config?.banners) setBanners(d.data.extra_config.banners.filter(b => b.active)) })
            .catch(() => {})

        fetch('/api/customer/feed')
            .then(r => r.json())
            .then(d => setPosts(d.posts || []))
            .catch(() => {})
            .finally(() => setFeedLoading(false))
    }, [])

    useEffect(() => {
        if (banners.length <= 1) return
        if (isBannerHovered) return

        bannerTimer.current = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 5000)
        return () => clearInterval(bannerTimer.current)
    }, [banners.length, isBannerHovered])

    const handleLike = async (postId) => {
        try {
            const newLiked = new Set(likedPosts)
            newLiked.add(postId)
            setLikedPosts(newLiked)
            localStorage.setItem('customer_liked_posts', JSON.stringify(Array.from(newLiked)))

            await fetch('/api/customer/feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId })
            })
        } catch {}
    }

    return (
        <div style={{ minHeight: '100%', background: '#0a0f1e' }}>
            {/* Greeting */}
            <div style={{ padding: '28px 20px 12px' }}>
                <div style={{ fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{greeting}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px' }}>{customerName} 👋</div>
            </div>

            {/* Banner Carousel */}
            {banners.length > 0 && (
                <div style={{ padding: '0 20px 20px' }}>
                    <div 
                        onMouseEnter={() => setIsBannerHovered(true)}
                        onMouseLeave={() => setIsBannerHovered(false)}
                        onTouchStart={() => setIsBannerHovered(true)}
                        onTouchEnd={() => setIsBannerHovered(false)}
                        style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', width: '100%', aspectRatio: '16/6' }}
                    >
                        <div style={{ display: 'flex', width: `${banners.length * 100}%`, height: '100%', transition: 'transform 0.5s ease-in-out', transform: `translateX(-${bannerIndex * (100 / banners.length)}%)` }}>
                            {banners.map(banner => (
                                <div key={banner.id} onClick={() => banner.targetUrl && router.push(banner.targetUrl)}
                                    style={{ width: `${100 / banners.length}%`, height: '100%', flexShrink: 0, cursor: banner.targetUrl ? 'pointer' : 'default', background: '#0f1629' }}>
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

            {/* Feed */}
            <div style={{ padding: '0 16px 100px' }}>
                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase' }}>From Sorted</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>

                {feedLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 22, height: 280, animation: 'pulse 1.5s ease-in-out infinite' }} />
                        ))}
                        <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.8} }`}</style>
                    </div>
                ) : posts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
                        <div style={{ fontSize: 52, marginBottom: 14 }}>📡</div>
                        <div style={{ fontSize: 17, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Nothing here yet</div>
                        <div style={{ fontSize: 14, color: '#475569' }}>Tips, offers & highlights will appear here.</div>
                    </div>
                ) : (
                    posts.map(post => <FeedCard key={post.id} post={post} onLike={handleLike} initialLiked={likedPosts.has(post.id)} />)
                )}
            </div>
        </div>
    )
}
