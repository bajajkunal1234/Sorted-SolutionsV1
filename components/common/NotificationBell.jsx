'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationBell({ recipientId, recipientType, theme = 'light' }) {
    const router = useRouter();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

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
        const interval = setInterval(fetchInbox, 60000); // Poll every minute
        return () => clearInterval(interval);
    }, [recipientId, recipientType]);

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
                    backgroundColor: 'var(--bg-elevated, white)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15), 0 0 0 1px var(--border-primary, #e5e7eb)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 9999
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        borderBottom: '1px solid var(--border-primary, #e5e7eb)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'var(--bg-primary, white)'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #111827)' }}>
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
                    <div style={{ overflowY: 'auto', flex: 1, backgroundColor: 'var(--bg-secondary, #f9fafb)' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-tertiary, #9ca3af)' }}>
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
                                            borderBottom: '1px solid var(--border-primary, #e5e7eb)',
                                            backgroundColor: n.is_read ? 'var(--bg-primary, white)' : 'var(--color-primary-subtle, #f0f9ff)',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            display: 'flex',
                                            gap: '12px'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = n.is_read ? 'var(--bg-secondary, #f9fafb)' : '#e0f2fe' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = n.is_read ? 'var(--bg-primary, white)' : 'var(--color-primary-subtle, #f0f9ff)' }}
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
                                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary, #111827)', marginBottom: '4px' }}>
                                                {n.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary, #4b5563)', lineHeight: 1.4 }}>
                                                {n.message}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary, #9ca3af)', marginTop: '6px', fontWeight: 500 }}>
                                                {fmtTime(n.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
