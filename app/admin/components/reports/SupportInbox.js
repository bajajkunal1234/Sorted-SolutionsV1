'use client'

import { useState, useEffect, useRef } from 'react';
import { Mail, MailOpen, Inbox, Search, Trash2, Archive, CheckCircle, RefreshCw, User, ExternalLink, ShieldAlert, Clock, ArrowLeft, Check, Loader2 } from 'lucide-react';
import AccountDetailModal from '../AccountDetailModal';

export default function SupportInbox({ subSection, setSubSection, searchTerm: headerSearch, setSearchTerm: setHeaderSearch }) {
    const [emails, setEmails] = useState([]);
    const [mailboxes, setMailboxes] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Filters & Search
    const [statusFilter, setStatusFilter] = useState('unread'); // 'unread', 'read', 'resolved', 'archived', 'all', 'active'
    const [mailboxFilter, setMailboxFilter] = useState('all');
    const [localSearch, setLocalSearch] = useState('');
    
    // Theme state (to match iframe text/bg to dashboard theme)
    const [isDarkTheme, setIsDarkTheme] = useState(true);

    useEffect(() => {
        const checkTheme = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsDarkTheme(theme !== 'light');
        };
        checkTheme();
        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Load emails & mailboxes
    const loadInbox = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            queryParams.append('status', statusFilter);
            queryParams.append('mailbox', mailboxFilter);
            
            const searchVal = localSearch || headerSearch;
            if (searchVal) {
                queryParams.append('search', searchVal);
            }

            const res = await fetch(`/api/admin/support-emails?${queryParams.toString()}`);
            const data = await res.json();
            if (data.success) {
                setEmails(data.data || []);
                setMailboxes(data.mailboxes || []);
                
                // If currently selected email is updated in the list, update its details
                if (selectedEmail) {
                    const updated = (data.data || []).find(e => e.id === selectedEmail.id);
                    if (updated) {
                        setSelectedEmail(updated);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to fetch support emails:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInbox();
    }, [statusFilter, mailboxFilter, localSearch, headerSearch]);

    // Handle single action updates (status changes)
    const updateEmailStatus = async (emailId, newStatus) => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/admin/support-emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: emailId, status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                // If selected email, update locally
                if (selectedEmail && selectedEmail.id === emailId) {
                    setSelectedEmail(prev => ({ ...prev, status: newStatus }));
                }
                
                // Update in emails array
                setEmails(prev => prev.map(e => e.id === emailId ? { ...e, status: newStatus } : e));
                
                // If filter matches, remove it from list or keep it
                if (statusFilter !== 'all' && statusFilter !== 'active') {
                    if (statusFilter !== newStatus) {
                        setEmails(prev => prev.filter(e => e.id !== emailId));
                        if (selectedEmail && selectedEmail.id === emailId) {
                            setSelectedEmail(null);
                        }
                    }
                } else if (statusFilter === 'active') {
                    if (newStatus === 'archived' || newStatus === 'resolved') {
                        setEmails(prev => prev.filter(e => e.id !== emailId));
                        if (selectedEmail && selectedEmail.id === emailId) {
                            setSelectedEmail(null);
                        }
                    }
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert(`Failed to update status: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    // Permanently Delete Email
    const deleteEmail = async (emailId) => {
        if (!window.confirm("Are you sure you want to permanently delete this email? This action cannot be undone.")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/admin/support-emails?id=${emailId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setEmails(prev => prev.filter(e => e.id !== emailId));
                if (selectedEmail && selectedEmail.id === emailId) {
                    setSelectedEmail(null);
                }
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert(`Failed to delete email: ${err.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    // Load full account details to pass to AccountDetailModal
    const handleViewProfile = async (accountId) => {
        try {
            const res = await fetch(`/api/admin/accounts?id=${accountId}`);
            const data = await res.json();
            if (data.success) {
                setSelectedAccount(data.data);
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            alert(`Failed to load customer profile: ${err.message}`);
        }
    };

    // Mark as read when selected
    const handleSelectEmail = (email) => {
        setSelectedEmail(email);
        if (email.status === 'unread') {
            updateEmailStatus(email.id, 'read');
        }
    };

    // Helper to format timestamps
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return d.toLocaleDateString('en-IN', { weekday: 'short' });
        } else {
            return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', backgroundColor: 'var(--bg-primary)', overflow: 'hidden' }}>
            {/* Split Screen Container */}
            <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
                
                {/* LEFT PANEL: Email list & Filters */}
                <div style={{
                    width: '380px',
                    borderRight: '1px solid var(--border-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--bg-elevated)',
                    height: '100%',
                    flexShrink: 0
                }}>
                    {/* Header Controls */}
                    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Inbox size={18} color="var(--color-primary)" />
                                Inbox Dashboard
                            </h3>
                            <button 
                                onClick={loadInbox} 
                                className="btn btn-secondary" 
                                style={{ padding: '6px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Refresh Emails"
                            >
                                <RefreshCw size={14} className={loading ? "spin" : ""} />
                            </button>
                        </div>

                        {/* Mailbox Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 600 }}>Active Mailbox</label>
                            <select 
                                value={mailboxFilter} 
                                onChange={(e) => setMailboxFilter(e.target.value)}
                                className="form-input"
                                style={{
                                    padding: '6px 10px',
                                    fontSize: 'var(--font-size-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderColor: 'var(--border-primary)',
                                    color: 'var(--text-primary)',
                                    width: '100%'
                                }}
                            >
                                <option value="all">All Inboxes (Unified)</option>
                                <option value="support@sortedsolutions.in">support@sortedsolutions.in</option>
                                <option value="kunalbajaj@sortedsolutions.in">kunalbajaj@sortedsolutions.in</option>
                                {mailboxes
                                    .filter(m => m !== 'support@sortedsolutions.in' && m !== 'kunalbajaj@sortedsolutions.in')
                                    .map(mbox => (
                                        <option key={mbox} value={mbox}>{mbox}</option>
                                    ))
                                }
                            </select>
                        </div>

                        {/* Status Pills */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {[
                                { id: 'unread', label: 'Unread' },
                                { id: 'active', label: 'Active' },
                                { id: 'resolved', label: 'Resolved' },
                                { id: 'archived', label: 'Archived' },
                                { id: 'all', label: 'All' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: statusFilter === tab.id ? 700 : 500,
                                        borderRadius: '20px',
                                        backgroundColor: statusFilter === tab.id ? 'var(--color-primary)' : 'var(--bg-secondary)',
                                        color: statusFilter === tab.id ? '#ffffff' : 'var(--text-secondary)',
                                        border: statusFilter === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search sender, subject..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                style={{
                                    paddingLeft: '30px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px',
                                    fontSize: 'var(--font-size-sm)',
                                    borderRadius: 'var(--radius-md)',
                                    width: '100%',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderColor: 'var(--border-primary)'
                                }}
                            />
                        </div>

                    </div>

                    {/* Email List container */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading && emails.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px' }}>
                                <Loader2 size={24} className="spin" style={{ color: 'var(--color-primary)' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Loading inbox...</span>
                            </div>
                        ) : emails.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', padding: 'var(--spacing-lg)', textAlign: 'center', gap: '12px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
                                    <MailOpen size={24} style={{ color: 'var(--text-tertiary)' }} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Your inbox is clean</h4>
                                    <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        No emails found matching the selected filters.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            emails.map(email => {
                                const isSelected = selectedEmail?.id === email.id;
                                const isUnread = email.status === 'unread';
                                
                                return (
                                    <div
                                        key={email.id}
                                        onClick={() => handleSelectEmail(email)}
                                        style={{
                                            padding: '14px var(--spacing-md)',
                                            borderBottom: '1px solid var(--border-primary)',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? 'var(--bg-primary)' : 'transparent',
                                            borderLeft: isSelected ? '4px solid var(--color-primary)' : '4px solid transparent',
                                            transition: 'all 0.15s ease',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {/* Status / Dot indicator */}
                                        {isUnread && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '18px',
                                                left: '6px',
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--color-primary)'
                                            }} />
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <span style={{
                                                fontWeight: isUnread ? 700 : 600,
                                                fontSize: 'var(--font-size-sm)',
                                                color: isUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                maxWidth: '200px'
                                            }}>
                                                {email.sender_name || email.sender_email.split('@')[0]}
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                                                {formatTime(email.received_at)}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontWeight: isUnread ? 700 : 500,
                                            fontSize: '13px',
                                            color: 'var(--text-primary)',
                                            marginBottom: '4px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}>
                                            {email.subject}
                                        </div>

                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-secondary)',
                                            lineHeight: 1.4,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            wordBreak: 'break-all'
                                        }}>
                                            {email.body_text || '(No content text)'}
                                        </div>

                                        {/* Dynamic Mailbox Pill Tag */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                                            <span style={{
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: 'var(--bg-secondary)',
                                                fontSize: '9px',
                                                fontWeight: 600,
                                                color: 'var(--text-tertiary)',
                                                border: '1px solid var(--border-primary)'
                                            }}>
                                                To: {email.recipient_email.split('@')[0]}
                                            </span>
                                            
                                            {email.customer_account && (
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2px',
                                                    color: '#10b981',
                                                    fontSize: '9px',
                                                    fontWeight: 700
                                                }}>
                                                    <Check size={8} strokeWidth={3} /> Linked
                                                </span>
                                            )}
                                        </div>

                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Email Detail view */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {selectedEmail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            
                            {/* Action Header bar */}
                            <div style={{
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                borderBottom: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-elevated)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedEmail.status !== 'unread' && (
                                        <button 
                                            onClick={() => updateEmailStatus(selectedEmail.id, 'unread')}
                                            disabled={actionLoading}
                                            className="btn btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', padding: '6px 10px' }}
                                        >
                                            <Mail size={14} /> Mark Unread
                                        </button>
                                    )}
                                    {selectedEmail.status !== 'resolved' && (
                                        <button 
                                            onClick={() => updateEmailStatus(selectedEmail.id, 'resolved')}
                                            disabled={actionLoading}
                                            className="btn btn-primary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', padding: '6px 10px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                        >
                                            <CheckCircle size={14} /> Resolve
                                        </button>
                                    )}
                                    {selectedEmail.status !== 'archived' && (
                                        <button 
                                            onClick={() => updateEmailStatus(selectedEmail.id, 'archived')}
                                            disabled={actionLoading}
                                            className="btn btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', padding: '6px 10px' }}
                                        >
                                            <Archive size={14} /> Archive
                                        </button>
                                    )}
                                    {selectedEmail.status === 'archived' || selectedEmail.status === 'resolved' ? (
                                        <button 
                                            onClick={() => updateEmailStatus(selectedEmail.id, 'read')}
                                            disabled={actionLoading}
                                            className="btn btn-secondary"
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', padding: '6px 10px' }}
                                        >
                                            <Inbox size={14} /> Move to Inbox
                                        </button>
                                    ) : null}
                                </div>

                                <div>
                                    <button 
                                        onClick={() => deleteEmail(selectedEmail.id)}
                                        disabled={actionLoading}
                                        className="btn btn-secondary"
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', borderColor: 'var(--error)', fontSize: 'var(--font-size-xs)', padding: '6px 10px' }}
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>

                            {/* Email Details body container */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                                
                                {/* Meta Information Header */}
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                                        {selectedEmail.subject}
                                    </h2>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '16px', borderBottom: '1px solid var(--border-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEmail.sender_name || 'No Name'}</span>
                                                <span style={{ marginLeft: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                                    &lt;{selectedEmail.sender_email}&gt;
                                                </span>
                                            </div>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={12} />
                                                {new Date(selectedEmail.received_at).toLocaleString('en-IN', {
                                                    day: '2-digit', month: 'short', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-xs)' }}>
                                            <div>
                                                <span style={{ color: 'var(--text-secondary)' }}>To: </span>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedEmail.recipient_email}</span>
                                            </div>
                                            
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                backgroundColor: selectedEmail.status === 'unread' ? 'rgba(59, 130, 246, 0.15)' : 
                                                                 selectedEmail.status === 'resolved' ? 'rgba(16, 185, 129, 0.15)' :
                                                                 selectedEmail.status === 'archived' ? 'rgba(156, 163, 175, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                                color: selectedEmail.status === 'unread' ? '#3b82f6' : 
                                                       selectedEmail.status === 'resolved' ? '#10b981' :
                                                       selectedEmail.status === 'archived' ? 'var(--text-secondary)' : '#6366f1',
                                            }}>
                                                {selectedEmail.status}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Link Account Card */}
                                {selectedEmail.customer_account ? (
                                    <div className="card" style={{
                                        padding: '16px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.04)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 'var(--spacing-md)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <User size={20} color="#10b981" />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text-primary)' }}>
                                                        {selectedEmail.customer_account.name}
                                                    </span>
                                                    <span style={{ fontSize: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                        {selectedEmail.customer_account.sku || 'No SKU'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                    Matched Account Email: <strong>{selectedEmail.customer_account.email}</strong> • Mobile: <strong>{selectedEmail.customer_account.mobile || 'N/A'}</strong>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleViewProfile(selectedEmail.customer_account.id)}
                                            className="btn btn-secondary" 
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', padding: '6px 12px', borderColor: '#10b981', color: '#10b981', backgroundColor: 'transparent' }}
                                        >
                                            <ExternalLink size={14} /> View Account Profile
                                        </button>
                                    </div>
                                ) : (
                                    <div className="card" style={{
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px dashed var(--border-primary)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        color: 'var(--text-secondary)'
                                    }}>
                                        <ShieldAlert size={20} style={{ color: 'var(--text-tertiary)' }} />
                                        <div style={{ fontSize: 'var(--font-size-xs)' }}>
                                            No registered account matches <strong>{selectedEmail.sender_email}</strong>. 
                                            Incoming emails are still indexed, but customer profile links are unavailable for this sender.
                                        </div>
                                    </div>
                                )}

                                {/* Content Display */}
                                <div className="card" style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden'
                                }}>
                                    {selectedEmail.body_html ? (
                                        <div style={{ width: '100%' }}>
                                            <iframe
                                                title="Safe Email View"
                                                srcDoc={`
                                                    <!DOCTYPE html>
                                                    <html>
                                                    <head>
                                                        <meta charset="utf-8">
                                                        <style>
                                                            body {
                                                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                                                font-size: 14px;
                                                                line-height: 1.6;
                                                                color: ${isDarkTheme ? '#e5e7eb' : '#1f2937'};
                                                                background-color: transparent;
                                                                margin: 0;
                                                                padding: 20px;
                                                                word-wrap: break-word;
                                                            }
                                                            a { color: #3b82f6; text-decoration: underline; }
                                                            blockquote { border-left: 3px solid #d1d5db; padding-left: 12px; color: #6b7280; margin-left: 0; }
                                                        </style>
                                                    </head>
                                                    <body>
                                                        ${selectedEmail.body_html}
                                                    </body>
                                                    </html>
                                                `}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '450px',
                                                    border: 'none',
                                                    display: 'block'
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <pre style={{
                                            margin: 0,
                                            padding: '20px',
                                            fontFamily: 'inherit',
                                            fontSize: '14px',
                                            lineHeight: 1.6,
                                            whiteSpace: 'pre-wrap',
                                            color: 'var(--text-primary)',
                                            wordBreak: 'break-word'
                                        }}>
                                            {selectedEmail.body_text || '(No text content)'}
                                        </pre>
                                    )}
                                </div>

                            </div>
                        </div>
                    ) : (
                        // Placeholder detail screen
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'var(--text-tertiary)',
                            gap: 'var(--spacing-md)'
                        }}>
                            <MailOpen size={64} style={{ opacity: 0.2 }} />
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Select an email</h3>
                                <p style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>Select an email message from the list to view its contents.</p>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Account Detail Modal Portal Linkage */}
            {selectedAccount && (
                <AccountDetailModal 
                    account={selectedAccount} 
                    groups={[]} 
                    onClose={() => setSelectedAccount(null)} 
                    onUpdate={() => {
                        // Reload the current email's account info in case they change details
                        if (selectedEmail && selectedEmail.customer_account) {
                            handleViewProfile(selectedEmail.customer_account.id);
                        }
                    }} 
                />
            )}
        </div>
    );
}
