'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Heart, ArrowRight, Pin, Zap, Tag, Newspaper, Sparkles, ChevronLeft, ChevronRight, Wrench, Shield, Package, FileCheck, Activity, RefreshCw, MapPin, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import NotificationBell from '@/components/common/NotificationBell'
import BookServiceModal from '@/components/customer/modals/BookServiceModal'

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
        return null
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
        if (!embedUrl) {
            return (
                <div style={{ width: '100%', padding: '40px 20px', background: '#0a0f1e', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <a href={item.url} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600 }}>
                        View post on Instagram
                    </a>
                </div>
            )
        }

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

// ── Appliance emoji map ─────────────────────────────────────────────────────
function applianceEmoji(type = '') {
    const t = type.toLowerCase()
    if (t.includes('ac') || t.includes('air')) return '❄️'
    if (t.includes('fridge') || t.includes('refrigerator')) return '🧊'
    if (t.includes('wash')) return '🫧'
    if (t.includes('tv') || t.includes('television')) return '📺'
    if (t.includes('micro') || t.includes('oven')) return '⚡'
    if (t.includes('water') || t.includes('ro')) return '💧'
    if (t.includes('geyser') || t.includes('heater')) return '🔥'
    if (t.includes('coffee')) return '☕'
    return '🔧'
}

function healthColor(months) {
    if (months === null || months === undefined) return '#64748b'
    if (months <= 4) return '#10b981'
    if (months <= 8) return '#f59e0b'
    return '#ef4444'
}

function ApplianceHealthSection({ jobs, onBook }) {
    // Group jobs by appliance type, take most recent per appliance
    const applianceMap = {}
    for (const job of (jobs || [])) {
        const type = job.appliance_type || job.product_type || job.issue_category || 'General'
        if (!applianceMap[type] || new Date(job.created_at) > new Date(applianceMap[type].created_at)) {
            applianceMap[type] = job
        }
    }
    const appliances = Object.entries(applianceMap).slice(0, 6)
    if (appliances.length === 0) return null

    return (
        <div style={{ padding: '0 20px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#475569', letterSpacing: 1.2, textTransform: 'uppercase' }}>Your Appliances</span>
                <span style={{ fontSize: 11, color: '#334155' }}>Health Status</span>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                {appliances.map(([type, job]) => {
                    const lastDate = new Date(job.created_at)
                    const monthsAgo = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
                    const color = healthColor(monthsAgo)
                    const pct = Math.max(10, 100 - (monthsAgo * 10))
                    const label = monthsAgo === 0 ? 'This month' : monthsAgo === 1 ? '1 month ago' : `${monthsAgo}m ago`
                    return (
                        <button
                            key={type}
                            onClick={() => onBook(type)}
                            style={{
                                minWidth: 100, flexShrink: 0,
                                background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                                border: `1px solid ${color}30`,
                                borderRadius: 18, padding: '14px 12px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                                cursor: 'pointer', textAlign: 'center',
                                boxShadow: `0 0 16px ${color}10`,
                                transition: 'transform 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                        >
                            <div style={{ fontSize: 28, filter: `drop-shadow(0 2px 4px ${color}60)` }}>{applianceEmoji(type)}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1', lineHeight: 1.2, maxWidth: 80 }}>{type}</div>
                            {/* Health bar */}
                            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
                            </div>
                            <div style={{ fontSize: 9, color: color, fontWeight: 700 }}>{label}</div>
                        </button>
                    )
                })}
            </div>
            <style>{`div::-webkit-scrollbar{display:none}`}</style>
        </div>
    )
}

// ── Shimmer skeleton ─────────────────────────────────────────────────────────
function Shimmer({ w = '100%', h = 20, r = 8, mb = 0 }) {
    return <div style={{ width: w, height: h, borderRadius: r, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 100%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease infinite', marginBottom: mb }} />
}

// ── Home Page ───────────────────────────────────────────────────
export default function HomePage({ setActiveTab }) {
    const router = useRouter()
    const [requestModal, setRequestModal] = useState({ show: false, coverage: null })
    const [customerName, setCustomerName] = useState('there')
    const [customerId, setCustomerId] = useState(null)
    const [greeting, setGreeting] = useState('Good Morning')
    const [greetingEmoji, setGreetingEmoji] = useState('☀️')
    const [mounted, setMounted] = useState(false)
    const [banners, setBanners] = useState([])
    const [bannerIndex, setBannerIndex] = useState(0)
    const bannerTimer = useRef(null)
    const [posts, setPosts] = useState([])
    const [feedLoading, setFeedLoading] = useState(true)
    const [likedPosts, setLikedPosts] = useState(new Set())
    const [isBannerHovered, setIsBannerHovered] = useState(false)
    const [jobs, setJobs] = useState([])
    const [jobsLoading, setJobsLoading] = useState(true)
    // Pull-to-refresh
    const [pullY, setPullY] = useState(0)
    const [refreshing, setRefreshing] = useState(false)
    const touchStartY = useRef(0)
    const containerRef = useRef(null)

    const fetchJobs = useCallback(async (cId) => {
        try {
            const res = await fetch(`/api/customer/jobs?customerId=${cId}`)
            const data = await res.json()
            setJobs(data.jobs || [])
        } catch { setJobs([]) }
        finally { setJobsLoading(false) }
    }, [])

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 5)  { setGreeting('Good Night');    setGreetingEmoji('🌑') }
        else if (hour < 12) { setGreeting('Good Morning'); setGreetingEmoji('🌅') }
        else if (hour < 17) { setGreeting('Good Afternoon'); setGreetingEmoji('☀️') }
        else if (hour < 21) { setGreeting('Good Evening'); setGreetingEmoji('🌆') }
        else              { setGreeting('Good Night');   setGreetingEmoji('🌙') }

        setTimeout(() => setMounted(true), 60)

        try {
            const cachedLikes = JSON.parse(localStorage.getItem('customer_liked_posts') || '[]')
            setLikedPosts(new Set(cachedLikes))
            
            const cData = localStorage.getItem('customerData')
            if (cData) setCustomerName(JSON.parse(cData).name?.split(' ')[0] || 'there')
        } catch {}

        const cId = localStorage.getItem('customerId')
        if (!cId) return
        setCustomerId(cId)
        fetchJobs(cId)

        fetch('/api/settings/section-configs?id=customer-app-banners')
            .then(r => r.json())
            .then(d => { if (d.success && d.data?.extra_config?.banners) setBanners(d.data.extra_config.banners.filter(b => b.active)) })
            .catch(() => {})

        fetch('/api/customer/feed')
            .then(r => r.json())
            .then(d => setPosts(d.posts || []))
            .catch(() => {})
            .finally(() => setFeedLoading(false))
    }, [fetchJobs])

    useEffect(() => {
        if (banners.length <= 1) return
        if (isBannerHovered) return

        bannerTimer.current = setInterval(() => setBannerIndex(i => (i + 1) % banners.length), 5000)
        return () => clearInterval(bannerTimer.current)
    }, [banners.length, isBannerHovered])

    // Pull-to-refresh handlers
    const handleTouchStart = (e) => {
        if (containerRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY
        }
    }
    const handleTouchMove = (e) => {
        if (containerRef.current?.scrollTop > 0 || refreshing) return
        const delta = e.touches[0].clientY - touchStartY.current
        if (delta > 0) setPullY(Math.min(delta * 0.4, 72))
    }
    const handleTouchEnd = async () => {
        if (pullY > 50 && customerId) {
            setRefreshing(true)
            setPullY(0)
            await fetchJobs(customerId)
            setTimeout(() => setRefreshing(false), 600)
        } else {
            setPullY(0)
        }
    }

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

    // Active job for live banner
    const activeJob = jobs.find(j => ['work_in_progress', 'scheduled', 'assigned', 'diagnosing_quoting'].includes(j.status))
    const inProgressJob = jobs.find(j => j.status === 'work_in_progress')

    return (
        <div
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ minHeight: '100%', background: '#0a0f1e', overflowY: 'auto' }}
        >
            <style>{`
                @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
                @keyframes slideDown { from{opacity:0;transform:translateY(-16px)} to{opacity:1;transform:translateY(0)} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
                @keyframes pulseLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.75)} }
                @keyframes spin360 { from{transform:rotate(0)} to{transform:rotate(360deg)} }
                @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
            `}</style>

            {/* Pull-to-refresh indicator */}
            {(pullY > 0 || refreshing) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: Math.max(pullY, refreshing ? 44 : 0), overflow: 'hidden', transition: 'height 0.2s' }}>
                    <RefreshCw size={18} color="#38bdf8" style={{ animation: refreshing ? 'spin360 0.8s linear infinite' : 'none', opacity: pullY > 20 || refreshing ? 1 : 0.3 }} />
                </div>
            )}
            {/* Live Job Status Banner */}
            {activeJob && (
                <div
                    onClick={() => setActiveTab?.('services')}
                    style={{
                        margin: '0 16px 8px', padding: '10px 14px',
                        background: inProgressJob
                            ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.06))'
                            : 'linear-gradient(135deg, rgba(56,189,248,0.1), rgba(59,130,246,0.05))',
                        border: `1px solid ${inProgressJob ? 'rgba(16,185,129,0.25)' : 'rgba(56,189,248,0.2)'}`,
                        borderRadius: 14, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        animation: 'slideDown 0.4s ease',
                    }}
                >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: inProgressJob ? '#10b981' : '#38bdf8', boxShadow: `0 0 8px ${inProgressJob ? '#10b981' : '#38bdf8'}`, animation: 'pulseLive 1.5s ease-in-out infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: inProgressJob ? '#6ee7b7' : '#7dd3fc' }}>
                            {inProgressJob ? '🛠️ Technician is on the way' : '📅 Service scheduled'}
                        </div>
                        <div style={{ fontSize: 11, color: '#475569' }}>
                            {activeJob.appliance_type || activeJob.issue_category || 'Repair'} • Tap to track
                        </div>
                    </div>
                    <ArrowRight size={14} color="#475569" />
                </div>
            )}

            {/* Greeting */}
            <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 9999 }}>
                <div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 500, marginBottom: 2, opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(8px)', transition: 'all 0.4s ease 0.05s' }}>
                        {greetingEmoji} {greeting}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(10px)', transition: 'all 0.4s ease 0.12s' }}>
                        {customerName} 👋
                    </div>
                </div>
                {customerId && (
                    <div style={{ transform: 'scale(1.1)', marginBottom: '4px', opacity: mounted ? 1 : 0, transition: 'opacity 0.4s ease 0.2s' }}>
                        <NotificationBell recipientId={customerId} recipientType="customer" theme="dark" />
                    </div>
                )}
            </div>

            {/* Quick Actions Grid */}
            <div style={{ padding: '0 20px 20px' }}>
                <style>{`
                    .qa-card {
                        display: flex; flex-direction: column; align-items: flex-start;
                        padding: 16px; border-radius: 22px; cursor: pointer;
                        transition: transform 0.18s ease, box-shadow 0.18s ease;
                        position: relative; overflow: hidden; text-align: left;
                        border: none; width: 100%;
                        -webkit-tap-highlight-color: transparent;
                    }
                    .qa-card:active { transform: scale(0.96) !important; }
                    .qa-card:hover { transform: translateY(-3px); }
                    .qa-icon-3d {
                        width: 54px; height: 54px; border-radius: 16px;
                        display: flex; align-items: center; justify-content: center;
                        margin-bottom: 14px; font-size: 26px;
                        position: relative; flex-shrink: 0;
                    }
                    .qa-icon-3d::after {
                        content: ''; position: absolute;
                        bottom: -3px; left: 8px; right: 8px; height: 8px;
                        border-radius: 50%; filter: blur(5px); opacity: 0.55;
                    }
                    .qa-shimmer {
                        position: absolute; top: -40%; left: -40%;
                        width: 60%; height: 140%;
                        background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%);
                        transform: skewX(-15deg); pointer-events: none;
                        transition: left 0.5s ease;
                    }
                    .qa-card:hover .qa-shimmer { left: 100%; }
                `}</style>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                    {/* Book Repair */}
                    <button
                        className="qa-card"
                        onClick={() => setRequestModal({ show: true, coverage: { type: 'standard' } })}
                        style={{
                            background: 'linear-gradient(145deg, #0d2137 0%, #0a1828 100%)',
                            border: '1px solid rgba(56,189,248,0.25)',
                            boxShadow: '0 4px 20px rgba(56,189,248,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        <div className="qa-shimmer" />
                        <div className="qa-icon-3d" style={{
                            background: 'linear-gradient(145deg, #1e4d6b, #0e2d42)',
                            boxShadow: '0 6px 18px rgba(56,189,248,0.25), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{ filter: 'drop-shadow(0 3px 5px rgba(56,189,248,0.5))' }}>🔧</span>
                            <div style={{ position: 'absolute', bottom: -4, left: 10, right: 10, height: 8, background: 'rgba(56,189,248,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#f0f9ff', marginBottom: 3, letterSpacing: '-0.2px' }}>Book Repair</span>
                        <span style={{ fontSize: 11, color: '#4e7a96', fontWeight: 500 }}>Expert tech at your door</span>
                        <div style={{ position: 'absolute', top: 10, right: 12, width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', animation: 'pulseDot 2s ease-in-out infinite' }} />
                    </button>

                    {/* AMC Plans */}
                    <button
                        className="qa-card"
                        onClick={() => { sessionStorage.setItem('targetPlanSection', 'amc'); setActiveTab?.('plans') }}
                        style={{
                            background: 'linear-gradient(145deg, #170d2e, #0f0920)',
                            border: '1px solid rgba(139,92,246,0.25)',
                            boxShadow: '0 4px 20px rgba(139,92,246,0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                    >
                        <div className="qa-shimmer" />
                        <div className="qa-icon-3d" style={{
                            background: 'linear-gradient(145deg, #3b1f6b, #210f40)',
                            boxShadow: '0 6px 18px rgba(139,92,246,0.3), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{ filter: 'drop-shadow(0 3px 5px rgba(139,92,246,0.6))' }}>🛡️</span>
                            <div style={{ position: 'absolute', bottom: -4, left: 10, right: 10, height: 8, background: 'rgba(139,92,246,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#f5f3ff', marginBottom: 3, letterSpacing: '-0.2px' }}>AMC Plans</span>
                        <span style={{ fontSize: 11, color: '#6b4fa0', fontWeight: 500 }}>Protect your appliances</span>
                        <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 800, color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', padding: '2px 6px', borderRadius: 8 }}>POPULAR</div>
                    </button>

                    {/* Rentals */}
                    <button
                        className="qa-card"
                        onClick={() => { sessionStorage.setItem('targetPlanSection', 'rentals'); setActiveTab?.('plans') }}
                        style={{
                            background: 'linear-gradient(145deg, #0b201a, #071510)',
                            border: '1px solid rgba(16,185,129,0.22)',
                            boxShadow: '0 4px 20px rgba(16,185,129,0.07), inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}
                    >
                        <div className="qa-shimmer" />
                        <div className="qa-icon-3d" style={{
                            background: 'linear-gradient(145deg, #0f4232, #072a20)',
                            boxShadow: '0 6px 18px rgba(16,185,129,0.25), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -2px 4px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{ filter: 'drop-shadow(0 3px 5px rgba(16,185,129,0.5))' }}>📦</span>
                            <div style={{ position: 'absolute', bottom: -4, left: 10, right: 10, height: 8, background: 'rgba(16,185,129,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#f0fdf4', marginBottom: 3, letterSpacing: '-0.2px' }}>Rentals</span>
                        <span style={{ fontSize: 11, color: '#1c6048', fontWeight: 500 }}>Premium appliances</span>
                    </button>

                    {/* Claim Warranty */}
                    <button
                        className="qa-card"
                        onClick={() => setRequestModal({ show: true, coverage: { type: 'warranty' } })}
                        style={{
                            background: 'linear-gradient(145deg, #201600, #150e00)',
                            border: '1px solid rgba(245,158,11,0.22)',
                            boxShadow: '0 4px 20px rgba(245,158,11,0.07), inset 0 1px 0 rgba(255,255,255,0.04)',
                        }}
                    >
                        <div className="qa-shimmer" />
                        <div className="qa-icon-3d" style={{
                            background: 'linear-gradient(145deg, #5a3800, #3a2400)',
                            boxShadow: '0 6px 18px rgba(245,158,11,0.28), inset 0 1px 1px rgba(255,255,255,0.12), inset 0 -2px 4px rgba(0,0,0,0.3)',
                        }}>
                            <span style={{ filter: 'drop-shadow(0 3px 5px rgba(245,158,11,0.5))' }}>📋</span>
                            <div style={{ position: 'absolute', bottom: -4, left: 10, right: 10, height: 8, background: 'rgba(245,158,11,0.3)', borderRadius: '50%', filter: 'blur(5px)' }} />
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#fffbeb', marginBottom: 3, letterSpacing: '-0.2px' }}>Claim Warranty</span>
                        <span style={{ fontSize: 11, color: '#775a00', fontWeight: 500 }}>Zero cost inspection</span>
                        <div style={{ position: 'absolute', top: 10, right: 12, fontSize: 9, fontWeight: 800, color: '#fbbf24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 6px', borderRadius: 8 }}>FREE</div>
                    </button>
                </div>
                <style>{`@keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }`}</style>
            </div>


            {/* Appliance Health Cards */}
            {!jobsLoading && jobs.length > 0 && (
                <ApplianceHealthSection
                    jobs={jobs}
                    onBook={(type) => setRequestModal({ show: true, coverage: { type: 'standard' }, prefill: { applianceType: type } })}
                />
            )}
            {jobsLoading && (
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10 }}>
                    {[1,2,3].map(i => <Shimmer key={i} w="100px" h={120} r={18} />)}
                </div>
            )}

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
                        {[1, 2].map(i => (
                            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 22, overflow: 'hidden', padding: '0 0 16px' }}>
                                <Shimmer w="100%" h={180} r={0} mb={12} />
                                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <Shimmer w="60px" h={18} r={20} />
                                    <Shimmer w="80%" h={22} r={6} />
                                    <Shimmer w="100%" h={14} r={4} />
                                    <Shimmer w="70%" h={14} r={4} />
                                </div>
                            </div>
                        ))}
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

            {/* Book Service Modal */}
            {requestModal.show && (
                <BookServiceModal
                    isOpen={true}
                    onClose={() => setRequestModal({ show: false, coverage: null })}
                    preSelectedCoverage={requestModal.coverage}
                    onBook={(job) => {
                        setActiveTab?.('services')
                    }}
                />
            )}
        </div>
    )
}
