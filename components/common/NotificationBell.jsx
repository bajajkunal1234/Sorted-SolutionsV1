'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ recipientId, recipientType, theme = 'light' }) {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [showInboxModal, setShowInboxModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const dropdownRef = useRef(null);

    const isDark = theme === 'dark';

    useEffect(() => { setMounted(true); }, []);

    const fetchInbox = async () => {
        if (!recipientId || !recipientType) return;
        try {
            const res = await fetch(`/api/notifications/inbox?recipient_id=${recipientId}&recipient_type=${recipientType}`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (err) {
            console.error('Failed to fetch inbox:', err);
        }
    };

    useEffect(() => {
        fetchInbox();
        const interval = setInterval(fetchInbox, 30000);
        return () => clearInterval(interval);
    }, [recipientId, recipientType]);

    // Refresh on open
    useEffect(() => { if (isOpen) fetchInbox(); }, [isOpen]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const markRead = async (notifId) => {
        await fetch('/api/notifications/inbox', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_id: recipientId, recipient_type: recipientType, notification_id: notifId })
        }).catch(() => {});
    };

    const handleNotificationClick = async (notif) => {
        setIsOpen(false);
        setShowInboxModal(false);
        if (!notif.is_read) { await markRead(notif.id); fetchInbox(); }
        if (notif.link) router.push(notif.link);
    };

    const handleMarkAllRead = async () => {
        setLoading(true);
        try {
            await fetch('/api/notifications/inbox', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipient_id: recipientId, recipient_type: recipientType, mark_all_read: true })
            });
            await fetchInbox();
        } finally { setLoading(false); }
    };

    const fmtTime = (ts) => {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const m = Math.floor(diff / 60000);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (m < 1) return 'Just now';
        if (m < 60) return `${m}m ago`;
        if (h < 24) return `${h}h ago`;
        if (d === 1) return 'Yesterday';
        return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const fmtFull = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
            + ' · ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // ── Color tokens based on theme
    const tok = isDark ? {
        dropBg:    '#13192b',
        dropBorder: '#1e2d4a',
        headerBg:  '#0d1321',
        listBg:    '#13192b',
        itemRead:  '#13192b',
        itemUnread:'#0f1e38',
        itemHoverRead: '#1a2340',
        itemHoverUnread: '#0d2452',
        itemBorderRead: '#1e2d4a',
        itemBorderUnread: '#1d3a7a',
        dotRead:   'transparent',
        dotUnread: '#6366f1',
        titleColor: '#f0f4ff',
        bodyColor:  '#94a3b8',
        timeColor:  '#64748b',
        footerBg:  '#0d1321',
        modalBg:   '#0d1321',
        modalCard: '#13192b',
        modalCardUnread: '#0f1e38',
        modalBorder: '#1e2d4a',
        shadow: '0 20px 60px rgba(0,0,0,0.7)',
    } : {
        dropBg:    '#ffffff',
        dropBorder: '#e5e7eb',
        headerBg:  '#f9fafb',
        listBg:    '#f3f4f6',
        itemRead:  '#ffffff',
        itemUnread:'#f0f7ff',
        itemHoverRead: '#f9fafb',
        itemHoverUnread: '#e8f2ff',
        itemBorderRead: '#f0f0f0',
        itemBorderUnread: '#bfdbfe',
        dotRead:   'transparent',
        dotUnread: '#3b82f6',
        titleColor: '#111827',
        bodyColor:  '#4b5563',
        timeColor:  '#9ca3af',
        footerBg:  '#f9fafb',
        modalBg:   '#f3f4f6',
        modalCard: '#ffffff',
        modalCardUnread: '#f0f7ff',
        modalBorder: '#e5e7eb',
        shadow: '0 20px 60px rgba(0,0,0,0.18)',
    };

    const NotifItem = ({ n, compact = true }) => (
        <div
            onClick={() => handleNotificationClick(n)}
            style={{
                padding: compact ? '12px 14px' : '16px 20px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                cursor: 'pointer',
                borderLeft: n.is_read ? 'none' : `3px solid ${tok.dotUnread}`,
                backgroundColor: n.is_read ? tok.itemRead : tok.itemUnread,
                borderBottom: `1px solid ${n.is_read ? tok.itemBorderRead : tok.itemBorderUnread}`,
                transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = n.is_read ? tok.itemHoverRead : tok.itemHoverUnread}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = n.is_read ? tok.itemRead : tok.itemUnread}
        >
            {/* Unread dot */}
            <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                marginTop: '5px',
                backgroundColor: n.is_read ? 'transparent' : tok.dotUnread,
                boxShadow: n.is_read ? 'none' : `0 0 6px ${tok.dotUnread}`,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '8px', marginBottom: '4px'
                }}>
                    <div style={{
                        fontWeight: n.is_read ? 500 : 700,
                        fontSize: compact ? '13px' : '14px',
                        color: tok.titleColor,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {n.title}
                    </div>
                    <div style={{ fontSize: '11px', color: tok.timeColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {compact ? fmtTime(n.created_at) : fmtFull(n.created_at)}
                    </div>
                </div>
                <div style={{
                    fontSize: compact ? '12px' : '13px',
                    color: tok.bodyColor,
                    lineHeight: 1.5,
                    overflow: compact ? 'hidden' : 'visible',
                    display: compact ? '-webkit-box' : 'block',
                    WebkitLineClamp: compact ? 2 : undefined,
                    WebkitBoxOrient: compact ? 'vertical' : undefined,
                }}>
                    {n.message}
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>

            {/* ── Bell Button ── */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                style={{
                    position: 'relative', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: '10px',
                    transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
                <Bell size={22} style={{ color: isDark ? '#cbd5e1' : '#4b5563' }} />
                {unreadCount > 0 && (
                    <div style={{
                        position: 'absolute', top: '3px', right: '3px',
                        backgroundColor: '#ef4444',
                        color: '#fff', fontSize: '10px', fontWeight: 700,
                        height: '17px', minWidth: '17px', padding: '0 4px',
                        borderRadius: '99px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        border: `2px solid ${isDark ? '#0d1321' : '#ffffff'}`,
                        boxShadow: '0 1px 4px rgba(239,68,68,0.5)',
                        lineHeight: 1,
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </button>

            {/* ── Dropdown ── */}
            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: '340px', maxHeight: '480px',
                    backgroundColor: tok.dropBg,
                    border: `1px solid ${tok.dropBorder}`,
                    borderRadius: '14px',
                    boxShadow: tok.shadow,
                    overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    zIndex: 99999,
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${tok.dropBorder}`,
                        backgroundColor: tok.headerBg,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={14} style={{ color: tok.dotUnread }} />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: tok.titleColor }}>
                                Notifications
                            </span>
                            {unreadCount > 0 && (
                                <span style={{
                                    fontSize: '11px', fontWeight: 700, padding: '1px 7px',
                                    borderRadius: '99px', backgroundColor: tok.dotUnread + '25',
                                    color: tok.dotUnread,
                                }}>
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllRead} disabled={loading} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px',
                                fontSize: '11px', fontWeight: 600,
                                color: tok.dotUnread, padding: '4px 6px',
                                borderRadius: '6px', opacity: loading ? 0.5 : 1,
                            }}>
                                <CheckCheck size={13} />
                                {loading ? 'Marking...' : 'Mark all read'}
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', flex: 1, backgroundColor: tok.listBg }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                <Bell size={36} style={{ color: tok.timeColor, opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                                <div style={{ fontSize: '13px', color: tok.timeColor }}>No notifications yet</div>
                            </div>
                        ) : (
                            notifications.slice(0, 8).map(n => <NotifItem key={n.id} n={n} compact />)
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div style={{
                            borderTop: `1px solid ${tok.dropBorder}`,
                            backgroundColor: tok.footerBg,
                            padding: '10px 14px',
                            display: 'flex', justifyContent: 'center',
                        }}>
                            <button
                                onClick={() => { setIsOpen(false); setShowInboxModal(true); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '12px', fontWeight: 700,
                                    color: tok.dotUnread, padding: '6px 14px',
                                    borderRadius: '8px',
                                    backgroundColor: tok.dotUnread + '14',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = tok.dotUnread + '25'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = tok.dotUnread + '14'}
                            >
                                <Inbox size={13} />
                                Open Inbox
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Full Inbox Modal ── */}
            {mounted && showInboxModal && createPortal(
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowInboxModal(false); }}
                >
                    <div style={{
                        backgroundColor: tok.modalBg,
                        border: `1px solid ${tok.modalBorder}`,
                        borderRadius: '16px',
                        width: '100%', maxWidth: '560px',
                        maxHeight: '85vh',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: tok.shadow,
                        overflow: 'hidden',
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: `1px solid ${tok.modalBorder}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            backgroundColor: isDark ? '#0d1321' : '#ffffff',
                            flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    backgroundColor: tok.dotUnread + '20',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Bell size={18} style={{ color: tok.dotUnread }} />
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '16px', color: tok.titleColor }}>Notifications Inbox</div>
                                    <div style={{ fontSize: '12px', color: tok.timeColor }}>
                                        {notifications.length} notifications · {unreadCount} unread
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} disabled={loading} style={{
                                        background: tok.dotUnread + '15', border: `1px solid ${tok.dotUnread}40`,
                                        color: tok.dotUnread, cursor: 'pointer',
                                        fontSize: '12px', fontWeight: 600,
                                        padding: '6px 12px', borderRadius: '8px',
                                        display: 'flex', alignItems: 'center', gap: '5px',
                                    }}>
                                        <CheckCheck size={13} />
                                        {loading ? '...' : 'Mark all read'}
                                    </button>
                                )}
                                <button onClick={() => setShowInboxModal(false)} style={{
                                    background: isDark ? '#1e2d4a' : '#f3f4f6',
                                    border: 'none', borderRadius: '8px',
                                    width: '32px', height: '32px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', color: tok.bodyColor,
                                }}>
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: tok.modalBg }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                                    <Inbox size={48} style={{ color: tok.timeColor, opacity: 0.25, display: 'block', margin: '0 auto 16px' }} />
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: tok.bodyColor, marginBottom: '8px' }}>Your inbox is empty</div>
                                    <div style={{ fontSize: '13px', color: tok.timeColor }}>Notifications will appear here when events happen.</div>
                                </div>
                            ) : (
                                <div>
                                    {notifications.map(n => <NotifItem key={n.id} n={n} compact={false} />)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
