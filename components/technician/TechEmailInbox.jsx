'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
    Mail, Send, ChevronLeft, ChevronRight, Search, 
    Clock, CornerUpLeft, Plus, X, ArrowLeft, 
    CheckCircle2, AlertCircle, RefreshCw, Archive, Eye
} from 'lucide-react'

export default function TechEmailInbox({ technicianData, onBack }) {
    const technicianEmail = technicianData?.email || '';
    const [emails, setEmails] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedEmail, setSelectedEmail] = useState(null)
    const [isReplying, setIsReplying] = useState(false)
    const [replyBody, setReplyBody] = useState('')
    const [replySubject, setReplySubject] = useState('')
    const [sendingReply, setSendingReply] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [isComposing, setIsComposing] = useState(false)
    
    // Compose Form fields
    const [composeTo, setComposeTo] = useState('')
    const [composeSubject, setComposeSubject] = useState('')
    const [composeBody, setComposeBody] = useState('')
    const [sendingCompose, setSendingCompose] = useState(false)

    // Filter type: 'all', 'unread', 'read'
    const [filterTab, setFilterTab] = useState('all')

    const replyTextareaRef = useRef(null)

    // Fetch emails
    const fetchEmails = async () => {
        if (!technicianEmail) {
            setLoading(false)
            return
        }
        setLoading(true)
        setError(null)
        try {
            // Using the existing endpoint with mailbox parameter
            const res = await fetch(`/api/admin/support-emails?mailbox=${encodeURIComponent(technicianEmail)}&limit=100`)
            const data = await res.json()
            if (res.ok && data.success) {
                setEmails(data.data || [])
            } else {
                setError(data.error || 'Failed to load emails')
            }
        } catch (err) {
            setError(err.message || 'Network error loading emails')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchEmails()
    }, [technicianEmail])

    // Mark email as read
    const markAsRead = async (email) => {
        if (email.status === 'read') return
        
        try {
            const res = await fetch('/api/admin/support-emails', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: email.id, status: 'read' })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                // Update local state
                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, status: 'read' } : e))
                if (selectedEmail && selectedEmail.id === email.id) {
                    setSelectedEmail(prev => ({ ...prev, status: 'read' }))
                }
            }
        } catch (err) {
            console.error('Failed to mark email as read:', err)
        }
    }

    // Handle email selection
    const handleSelectEmail = (email) => {
        setSelectedEmail(email)
        markAsRead(email)
    }

    // Send Reply
    const handleSendReply = async () => {
        if (!replyBody.trim()) return
        setSendingReply(true)
        try {
            const res = await fetch('/api/admin/support-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: technicianEmail,
                    to: selectedEmail.sender_email,
                    subject: replySubject || selectedEmail.subject,
                    body_text: replyBody,
                    body_html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #1e293b;">
                        <p>${replyBody.replace(/\n/g, '<br>')}</p>
                        <br>
                        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <div style="font-size: 12px; color: #64748b; background-color: #f8fafc; padding: 12px; border-radius: 6px;">
                            <strong>From:</strong> ${selectedEmail.sender_name} &lt;${selectedEmail.sender_email}&gt;<br>
                            <strong>Sent:</strong> ${new Date(selectedEmail.received_at || selectedEmail.created_at).toLocaleString()}<br>
                            <strong>Subject:</strong> ${selectedEmail.subject}<br><br>
                            ${selectedEmail.body_html || selectedEmail.body_text}
                        </div>
                    </div>`
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setReplyBody('')
                setIsReplying(false)
                setSuccessMessage('Reply sent successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
                
                // Add the sent email to local list immediately
                if (data.data) {
                    setEmails(prev => [data.data, ...prev])
                } else {
                    fetchEmails() // fallback
                }
            } else {
                alert(data.error || 'Failed to send reply')
            }
        } catch (err) {
            alert('Error sending reply: ' + err.message)
        } finally {
            setSendingReply(false)
        }
    }

    // Send New Compose Email
    const handleSendCompose = async () => {
        if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
            alert('Please fill out all fields')
            return
        }
        setSendingCompose(true)
        try {
            const res = await fetch('/api/admin/support-emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: technicianEmail,
                    to: composeTo.trim(),
                    subject: composeSubject.trim(),
                    body_text: composeBody,
                    body_html: `<div style="font-family: sans-serif; font-size: 14px; line-height: 1.5; color: #1e293b;">
                        <p>${composeBody.replace(/\n/g, '<br>')}</p>
                    </div>`
                })
            })
            const data = await res.json()
            if (res.ok && data.success) {
                setComposeTo('')
                setComposeSubject('')
                setComposeBody('')
                setIsComposing(false)
                setSuccessMessage('Email sent successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
                
                if (data.data) {
                    setEmails(prev => [data.data, ...prev])
                } else {
                    fetchEmails()
                }
            } else {
                alert(data.error || 'Failed to send email')
            }
        } catch (err) {
            alert('Error sending email: ' + err.message)
        } finally {
            setSendingCompose(false)
        }
    }

    // Filter and Search logic
    const filteredEmails = useMemo(() => {
        return emails.filter(email => {
            // Apply filter tab
            const isOutbound = email.metadata?.direction === 'outbound'
            if (filterTab === 'unread' && (email.status !== 'unread' || isOutbound)) return false
            if (filterTab === 'read' && (email.status !== 'read' || isOutbound)) return false
            if (filterTab === 'sent' && !isOutbound) return false
            if (filterTab !== 'sent' && isOutbound && filterTab !== 'all') return false // exclude sent from unread/read tabs

            // Apply search query
            if (!searchTerm.trim()) return true
            const query = searchTerm.toLowerCase().trim()
            return (
                email.subject?.toLowerCase().includes(query) ||
                email.sender_name?.toLowerCase().includes(query) ||
                email.sender_email?.toLowerCase().includes(query) ||
                email.recipient_email?.toLowerCase().includes(query) ||
                email.body_text?.toLowerCase().includes(query)
            )
        })
    }, [emails, searchTerm, filterTab])

    const relativeTime = (dateStr) => {
        if (!dateStr) return ''
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }

    // Render email listing
    const renderList = () => {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Search Bar */}
                <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ 
                        flex: 1, display: 'flex', alignItems: 'center', gap: '8px', 
                        padding: '8px 12px', backgroundColor: 'var(--bg-secondary)', 
                        borderRadius: '20px', border: '1px solid var(--border-primary)'
                    }}>
                        <Search size={16} color="var(--text-tertiary)" />
                        <input
                            type="text"
                            placeholder="Search emails..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                flex: 1, backgroundColor: 'transparent', border: 'none', 
                                outline: 'none', fontSize: '13px', color: 'var(--text-primary)' 
                            }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}>
                                <X size={14} color="var(--text-tertiary)" />
                            </button>
                        )}
                    </div>
                    
                    <button 
                        onClick={fetchEmails} 
                        style={{
                            padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)', cursor: 'pointer', display: 'flex', 
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <RefreshCw size={14} className={loading ? 'spin-anim' : ''} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', padding: '0 16px', gap: '16px' }}>
                    {['all', 'unread', 'sent'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            style={{
                                padding: '10px 4px', fontSize: '13px', fontWeight: 600,
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: filterTab === tab ? '#3b82f6' : 'var(--text-tertiary)',
                                borderBottom: filterTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                                transition: 'all 0.2s', textTransform: 'capitalize'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* List Container */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px calc(80px + env(safe-area-inset-bottom))' }}>
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ 
                                height: '88px', backgroundColor: 'var(--bg-elevated)', 
                                borderRadius: '12px', border: '1px solid var(--border-primary)', 
                                marginBottom: '10px', opacity: 0.5 
                            }} />
                        ))
                    ) : filteredEmails.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                            <Mail size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#3b82f6' }} />
                            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>No emails found</div>
                            <div style={{ fontSize: '12px' }}>Your inbox is clean!</div>
                        </div>
                    ) : (
                        filteredEmails.map(email => {
                            const isOutbound = email.metadata?.direction === 'outbound'
                            const isUnread = email.status === 'unread' && !isOutbound
                            
                            return (
                                <div
                                    key={email.id}
                                    onClick={() => handleSelectEmail(email)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', gap: '6px',
                                        padding: '14px 16px', borderRadius: '12px',
                                        backgroundColor: isUnread ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-elevated)',
                                        border: isUnread ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-primary)',
                                        cursor: 'pointer', position: 'relative', marginBottom: '10px',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    {isUnread && (
                                        <div style={{ 
                                            position: 'absolute', top: '16px', left: '6px', 
                                            width: '6px', height: '6px', borderRadius: '50%', 
                                            backgroundColor: '#3b82f6' 
                                        }} />
                                    )}

                                    {/* Header: Sender & Date */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ 
                                            fontSize: '13px', 
                                            fontWeight: isUnread ? 700 : 600, 
                                            color: isUnread ? '#3b82f6' : 'var(--text-primary)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                            maxWidth: '70%'
                                        }}>
                                            {isOutbound ? `To: ${email.recipient_email}` : (email.sender_name || email.sender_email)}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', flexShrink: 0 }}>
                                            {relativeTime(email.received_at || email.created_at)}
                                        </span>
                                    </div>

                                    {/* Subject */}
                                    <div style={{ 
                                        fontSize: '13px', 
                                        fontWeight: isUnread ? 600 : 500, 
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }}>
                                        {email.subject || 'No Subject'}
                                    </div>

                                    {/* Snippet */}
                                    <div style={{ 
                                        fontSize: '11px', color: 'var(--text-tertiary)', 
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4'
                                    }}>
                                        {email.body_text || '(Empty Body)'}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Floating Compose Button */}
                <button
                    onClick={() => setIsComposing(true)}
                    style={{
                        position: 'fixed', bottom: '90px', right: '20px',
                        width: '56px', height: '56px', borderRadius: '28px',
                        backgroundColor: '#3b82f6', color: '#ffffff',
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)', cursor: 'pointer',
                        zIndex: 99
                    }}
                >
                    <Plus size={24} />
                </button>
            </div>
        )
    }

    // Render detailed email reader
    const renderReader = () => {
        const email = selectedEmail
        const isOutbound = email.metadata?.direction === 'outbound'
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
                {/* Detail Header */}
                <div style={{ 
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)'
                }}>
                    <button 
                        onClick={() => {
                            setSelectedEmail(null)
                            setIsReplying(false)
                        }} 
                        style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', 
                            color: 'var(--text-secondary)', display: 'flex', padding: 0 
                        }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Support Email</span>
                </div>

                {/* Reader Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: 'calc(100px + env(safe-area-inset-bottom))' }}>
                    
                    {/* Subject */}
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0', lineHeight: 1.3 }}>
                        {email.subject || 'No Subject'}
                    </h2>

                    {/* Sender Box */}
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '10px', 
                        padding: '12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)', marginBottom: '20px'
                    }}>
                        <div style={{ 
                            width: '36px', height: '36px', borderRadius: '50%', 
                            backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700
                        }}>
                            {(isOutbound ? email.recipient_email : (email.sender_name || email.sender_email)).substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, fontSize: '12px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                                {isOutbound ? `To: ${email.recipient_email}` : (email.sender_name || 'Customer')}
                            </div>
                            <div style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {isOutbound ? `From: ${email.sender_email}` : `From: ${email.sender_email}`}
                            </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {new Date(email.received_at || email.created_at).toLocaleString('en-GB', { 
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                            })}
                        </div>
                    </div>

                    {/* Email Body Container (Iframe for style isolation and white background) */}
                    <div style={{ 
                        borderRadius: '8px', 
                        overflow: 'hidden', 
                        border: '1px solid var(--border-primary)',
                        backgroundColor: '#ffffff',
                        marginBottom: '20px'
                    }}>
                        <iframe
                            title="Email Content"
                            srcDoc={`
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta charset="utf-8">
                                    <base target="_blank">
                                    <style>
                                        body {
                                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                                            font-size: 14px;
                                            line-height: 1.6;
                                            color: #1e293b;
                                            background-color: #ffffff;
                                            margin: 0;
                                            padding: 16px;
                                            word-wrap: break-word;
                                        }
                                        a { color: #3b82f6; text-decoration: underline; }
                                        blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; color: #64748b; margin-left: 0; }
                                    </style>
                                </head>
                                <body>
                                    ${email.body_html || email.body_text?.replace(/\n/g, '<br>')}
                                </body>
                                </html>
                            `}
                            style={{
                                width: '100%',
                                height: '250px',
                                border: 'none',
                                display: 'block'
                            }}
                            onLoad={(e) => {
                                try {
                                    const doc = e.target.contentWindow?.document || e.target.contentDocument;
                                    if (doc && doc.body) {
                                        e.target.style.height = `${doc.body.scrollHeight + 20}px`;
                                    }
                                } catch (err) {
                                    console.error("Iframe resize failed:", err);
                                }
                            }}
                        />
                    </div>

                    {/* Reply Section */}
                    {isReplying ? (
                        <div style={{ 
                            marginTop: '30px', padding: '16px', borderRadius: '12px',
                            backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
                            display: 'flex', flexDirection: 'column', gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <CornerUpLeft size={12} /> Replying to {email.sender_email}
                                </span>
                                <button 
                                    onClick={() => setIsReplying(false)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Subject Field */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Subject</label>
                                <input
                                    type="text"
                                    value={replySubject}
                                    onChange={(e) => setReplySubject(e.target.value)}
                                    style={{
                                        padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                        fontSize: '13px', outline: 'none'
                                    }}
                                />
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Message</label>
                                <textarea
                                    ref={replyTextareaRef}
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    placeholder="Type your reply here..."
                                    style={{
                                        width: '100%', minHeight: '120px', padding: '10px',
                                        borderRadius: '8px', border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                                        outline: 'none', fontSize: '13px', fontFamily: 'sans-serif',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                    onClick={() => setIsReplying(false)}
                                    style={{
                                        padding: '8px 14px', borderRadius: '6px', fontSize: '13px',
                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-primary)', cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSendReply}
                                    disabled={sendingReply || !replyBody.trim()}
                                    style={{
                                        padding: '8px 16px', borderRadius: '6px', fontSize: '13px',
                                        backgroundColor: '#3b82f6', color: '#ffffff', border: 'none',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                        opacity: (sendingReply || !replyBody.trim()) ? 0.6 : 1
                                    }}
                                >
                                    {sendingReply ? 'Sending...' : 'Send Reply'} <Send size={12} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        !isOutbound && (
                            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={() => {
                                        setIsReplying(true)
                                        setReplySubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`)
                                        setTimeout(() => replyTextareaRef.current?.focus(), 100)
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 24px', borderRadius: '20px',
                                        backgroundColor: '#3b82f6', color: '#ffffff',
                                        border: 'none', fontWeight: 600, fontSize: '13px',
                                        cursor: 'pointer', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)'
                                    }}
                                >
                                    <CornerUpLeft size={14} /> Reply
                                </button>
                            </div>
                        )
                    )}
                </div>
            </div>
        )
    }

    // Render Compose Email overlay
    const renderCompose = () => {
        return (
            <div style={{ 
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                backgroundColor: 'var(--bg-primary)', zIndex: 1000,
                display: 'flex', flexDirection: 'column', height: '100%' 
            }}>
                {/* Compose Header */}
                <div style={{ 
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button 
                            onClick={() => setIsComposing(false)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Compose Email</span>
                    </div>
                    
                    <button
                        onClick={handleSendCompose}
                        disabled={sendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()}
                        style={{
                            padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            backgroundColor: '#3b82f6', color: '#ffffff', border: 'none',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            opacity: (sendingCompose || !composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) ? 0.6 : 1
                        }}
                    >
                        {sendingCompose ? 'Sending...' : 'Send'} <Send size={12} />
                    </button>
                </div>

                {/* Form fields */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* From (read-only) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>From</label>
                        <input
                            type="text"
                            value={technicianEmail}
                            readOnly
                            style={{
                                padding: '10px', borderRadius: '8px', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                fontSize: '13px', outline: 'none'
                            }}
                        />
                    </div>

                    {/* To */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>To</label>
                        <input
                            type="email"
                            placeholder="recipient@example.com"
                            value={composeTo}
                            onChange={(e) => setComposeTo(e.target.value)}
                            style={{
                                padding: '10px', borderRadius: '8px', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
                                fontSize: '13px', outline: 'none'
                            }}
                        />
                    </div>

                    {/* Subject */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Subject</label>
                        <input
                            type="text"
                            placeholder="Email subject"
                            value={composeSubject}
                            onChange={(e) => setComposeSubject(e.target.value)}
                            style={{
                                padding: '10px', borderRadius: '8px', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
                                fontSize: '13px', outline: 'none'
                            }}
                        />
                    </div>

                    {/* Body */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)' }}>Message</label>
                        <textarea
                            placeholder="Type your message here..."
                            value={composeBody}
                            onChange={(e) => setComposeBody(e.target.value)}
                            style={{
                                width: '100%', flex: 1, minHeight: '200px', padding: '10px',
                                borderRadius: '8px', border: '1px solid var(--border-primary)',
                                backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)',
                                outline: 'none', fontSize: '13px', fontFamily: 'sans-serif',
                                resize: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>
        )
    }

    // Unassigned email state view
    if (!technicianEmail) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--bg-primary)' }}>
                <div style={{ 
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                    borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-elevated)'
                }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 0 }}>
                        <ArrowLeft size={20} />
                    </button>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Email Inbox</span>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', textAlign: 'center' }}>
                    <AlertCircle size={48} color="#f59e0b" style={{ marginBottom: '16px' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Email Address Missing</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: '280px', margin: 0 }}>
                        Your technician profile does not have an email address configured. Please contact the administrator to assign your email address in the database (e.g. <code>vinodgupta@sortedsolutions.in</code>).
                    </p>
                    <button 
                        onClick={onBack}
                        style={{
                            marginTop: '20px', padding: '8px 20px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        Go Back
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{ 
            display: 'flex', flexDirection: 'column', height: '100%', 
            backgroundColor: 'var(--bg-primary)', position: 'relative' 
        }}>
            {/* Success toast message */}
            {successMessage && (
                <div style={{
                    position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#10b981', color: '#ffffff', padding: '10px 20px', borderRadius: '24px',
                    fontSize: '13px', fontWeight: 600, zIndex: 1100, display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}>
                    <CheckCircle2 size={16} /> {successMessage}
                </div>
            )}

            {selectedEmail ? renderReader() : renderList()}
            {isComposing && renderCompose()}
        </div>
    )
}
