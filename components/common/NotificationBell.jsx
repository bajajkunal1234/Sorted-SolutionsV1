'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';
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

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchInbox = async () => {
        if (!recipientId || !recipientType) return;
        try {
            const res = await fetch(`/api/notifications/inbox?recipient_id=${recipientId}&recipient_type=${recipientType}`);
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch inbox:', error);
        }
    };

    useEffect(() => {
        fetchInbox();
        const interval = setInterval(fetchInbox, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [recipientId, recipientType]);

    // Also refresh when bell is opened
    useEffect(() => {
        if (isOpen) fetchInbox();
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleNotificationClick = async (notif) => {
        setIsOpen(false);
        try {
            // Mark as read
            if (!notif.is_read) {
                await fetch('/api/notifications/inbox', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient_id: recipientId,
                        recipient_type: recipientType,
                        notification_id: notif.id
                    })
                });
                fetchInbox(); // Refresh state inline
            }
            
            // Navigate
            if (notif.link) {
                router.push(notif.link);
            }
        } catch (e) { console.error(e); }
    };

    const handleMarkAllRead = async () => {
        setLoading(true);
        try {
            await fetch('/api/notifications/inbox', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient_id: recipientId,
                    recipient_type: recipientType,
                    mark_all_read: true
                })
            });
            await fetchInbox();
        } finally {
            setLoading(false);
            setIsOpen(false);
        }
    };

    const fmtTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 60) return `${diffMins || 1}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
    };

    const fmtFullDateTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme === 'dark' ? 'white' : 'inherit'
                }}
            >
                <Bell size={24} style={{ color: theme === 'dark' ? '#fff' : 'var(--text-secondary)' }} />
                
                {unreadCount > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        height: '18px',
                        minWidth: '18px',
                        padding: '0 4px',
                        borderRadius: '99px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: theme === 'dark' ? '2px solid #1f2937' : '2px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </div>
                )}
            </button>

            {/* Dropdown Inbox */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 5px)',
                    right: 0,
                    width: '320px',
                    maxHeight: '400px',
                    backgroundColor: theme === 'dark' ? '#1e293b' : 'var(--bg-elevated, white)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 99999
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid var(--border-primary, #e5e7eb)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: theme === 'dark' ? '#0f172a' : 'var(--bg-primary, white)'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme === 'dark' ? '#f8fafc' : 'var(--text-primary, #111827)' }}>
                            Notifications
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                disabled={loading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--color-primary, #3b82f6)',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}
                            >
                                {loading ? 'Marking...' : 'Mark all read'}
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div style={{ overflowY: 'auto', flex: 1, backgroundColor: theme === 'dark' ? '#1e293b' : 'var(--bg-secondary, #f9fafb)' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: theme === 'dark' ? '#94a3b8' : 'var(--text-tertiary, #9ca3af)' }}>
                                <Bell size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                                <div style={{ fontSize: '14px' }}>No notifications yet</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        style={{
                                            padding: '14px 16px',
                                            borderBottom: theme === 'dark' ? '1px solid #334155' : '1px solid var(--border-primary, #e5e7eb)',
                                            backgroundColor: n.is_read ? (theme === 'dark' ? '#0f172a' : 'var(--bg-primary, white)') : (theme === 'dark' ? '#1e3a8a' : 'var(--color-primary-subtle, #f0f9ff)'),
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            display: 'flex',
                                            gap: '12px'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = n.is_read ? (theme === 'dark' ? '#1e293b' : 'var(--bg-secondary, #f9fafb)') : (theme === 'dark' ? '#1d4ed8' : '#e0f2fe') }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = n.is_read ? (theme === 'dark' ? '#0f172a' : 'var(--bg-primary, white)') : (theme === 'dark' ? '#1e3a8a' : 'var(--color-primary-subtle, #f0f9ff)') }}
                                    >
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: n.is_read ? 'transparent' : 'var(--color-primary, #3b82f6)',
                                            marginTop: '6px',
                                            flexShrink: 0
                                        }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '13px', color: theme === 'dark' ? '#f8fafc' : 'var(--text-primary, #111827)', marginBottom: '4px' }}>
                                                {n.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: theme === 'dark' ? '#cbd5e1' : 'var(--text-secondary, #4b5563)', lineHeight: 1.4 }}>
                                                {n.message}
                                            </div>
                                            <div style={{ fontSize: '11px', color: theme === 'dark' ? '#94a3b8' : 'var(--text-tertiary, #9ca3af)', marginTop: '6px', fontWeight: 500 }}>
                                                {fmtTime(n.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div style={{
                        padding: '12px',
                        borderTop: theme === 'dark' ? '1px solid #334155' : '1px solid var(--border-primary, #e5e7eb)',
                        textAlign: 'center',
                        backgroundColor: theme === 'dark' ? '#0f172a' : 'var(--bg-primary, white)'
                    }}>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setShowInboxModal(true); }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary, #3b82f6)',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '4px 12px'
                            }}
                        >
                            Open Inbox
                        </button>
                    </div>
                </div>
            )}

            {/* Full Screen Inbox Modal */}
            {mounted && showInboxModal && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    zIndex: 100000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-primary, white)',
                        borderRadius: 'var(--radius-lg, 12px)',
                        width: '100%',
                        maxWidth: '600px',
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border-primary, #e5e7eb)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-elevated, white)'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary, #111827)' }}>
                                Notifications Inbox
                            </h2>
                            <button
                                onClick={() => setShowInboxModal(false)}
                                style={{
                                    background: 'var(--bg-secondary, #f3f4f6)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary, #4b5563)'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-secondary, #f9fafb)', padding: '12px' }}>
                            {notifications.length === 0 ? (
                                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-tertiary, #9ca3af)' }}>
                                    <Bell size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                                    <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-secondary, #4b5563)', marginBottom: '8px' }}>Your inbox is empty</div>
                                    <div style={{ fontSize: '14px' }}>When you receive notifications, they will appear here.</div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            onClick={() => { setShowInboxModal(false); handleNotificationClick(n); }}
                                            style={{
                                                padding: '16px 20px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-primary, #e5e7eb)',
                                                backgroundColor: n.is_read ? 'var(--bg-primary, white)' : 'var(--color-primary-subtle, #f0f9ff)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                gap: '16px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'; }}
                                        >
                                            <div style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                backgroundColor: n.is_read ? 'transparent' : 'var(--color-primary, #3b82f6)',
                                                marginTop: '6px',
                                                flexShrink: 0
                                            }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary, #111827)' }}>
                                                        {n.title}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary, #9ca3af)', fontWeight: 500, whiteSpace: 'nowrap', marginLeft: '12px' }}>
                                                        {fmtFullDateTime(n.created_at)}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '14px', color: 'var(--text-secondary, #4b5563)', lineHeight: 1.5 }}>
                                                    {n.message}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
