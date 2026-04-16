'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Plus, Edit2, ChevronRight, ChevronLeft, Clock, BookOpen, X, Lock, Eye } from 'lucide-react'
import AdminArticleEditor from './AdminArticleEditor'

// ── Category Config (same as TechSupportTab) ──────────────────────────────────
const CATEGORIES = [
    { id: 'all', label: 'All Articles', icon: '📚', color: '#6366f1' },
    { id: 'guides', label: 'App Guides', icon: '📱', color: '#3b82f6' },
    { id: 'jobs', label: 'Jobs', icon: '🔧', color: '#f59e0b' },
    { id: 'amc', label: 'AMC', icon: '🛡️', color: '#8b5cf6' },
    { id: 'rentals', label: 'Rentals', icon: '📦', color: '#06b6d4' },
    { id: 'quotations', label: 'Quotations', icon: '📋', color: '#10b981' },
    { id: 'invoices', label: 'Invoices', icon: '🧾', color: '#f97316' },
    { id: 'vouchers', label: 'Vouchers', icon: '💰', color: '#84cc16' },
    { id: 'inventory', label: 'Inventory', icon: '🏪', color: '#ec4899' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', color: '#eab308' },
    { id: 'incentives', label: 'Incentives', icon: '🏆', color: '#14b8a6' },
    { id: 'price-lists', label: 'Price Lists', icon: '💲', color: '#a855f7' },
]

// ── Markdown Renderer (same lightweight renderer as TechSupportTab) ─────────────
function renderMarkdown(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line.startsWith('```')) {
            const langLine = line.slice(3).trim()
            const codeLines = []; i++
            while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++ }
            elements.push(<pre key={`code-${i}`} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '12px', overflowX: 'auto', fontSize: '12px', fontFamily: 'monospace', margin: '8px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{langLine && <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', mb: 4 }}>{langLine}</div>}<code>{codeLines.join('\n')}</code></pre>); i++; continue
        }
        if (line.startsWith('### ')) { elements.push(<h3 key={i} style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 6px' }}>{fmt(line.slice(4))}</h3>); i++; continue }
        if (line.startsWith('## ')) { elements.push(<h2 key={i} style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-primary)' }}>{fmt(line.slice(3))}</h2>); i++; continue }
        if (line.startsWith('# ')) { elements.push(<h1 key={i} style={{ fontSize: '18px', fontWeight: 700, margin: '16px 0 8px' }}>{fmt(line.slice(2))}</h1>); i++; continue }
        if (line.trim() === '---') { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-primary)', margin: '12px 0' }} />); i++; continue }
        if (line.startsWith('> ')) { elements.push(<blockquote key={i} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '12px', margin: '8px 0', color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>{fmt(line.slice(2))}</blockquote>); i++; continue }
        if (line.startsWith('|')) {
            const tableLines = []; while (i < lines.length && lines[i].startsWith('|')) { tableLines.push(lines[i]); i++ }
            const rows = tableLines.filter(r => !r.match(/^\|[\s\-|]+\|$/))
            elements.push(<div key={`t-${i}`} style={{ overflowX: 'auto', margin: '8px 0' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}><tbody>{rows.map((row, ri) => { const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1); const isH = ri === 0; return <tr key={ri} style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: isH ? 'var(--bg-secondary)' : 'transparent' }}>{cells.map((cell, ci) => <td key={ci} style={{ padding: '6px 10px', fontWeight: isH ? 700 : 400, verticalAlign: 'top' }}>{fmt(cell.trim())}</td>)}</tr> })}</tbody></table></div>)
            continue
        }
        if (line.match(/^[-*] /)) { const items = []; while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(lines[i].replace(/^[-*] /, '')); i++ } elements.push(<ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>{items.map((item, li) => <li key={li} style={{ fontSize: '13px', lineHeight: '1.5' }}>{fmt(item)}</li>)}</ul>); continue }
        if (line.match(/^\d+\. /)) { const items = []; while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, '')); i++ } elements.push(<ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>{items.map((item, li) => <li key={li} style={{ fontSize: '13px', lineHeight: '1.5' }}>{fmt(item)}</li>)}</ol>); continue }
        if (line.trim() === '') { elements.push(<div key={i} style={{ height: '6px' }} />); i++; continue }
        elements.push(<p key={i} style={{ fontSize: '13px', lineHeight: '1.6', margin: '4px 0' }}>{fmt(line)}</p>); i++
    }
    return elements
}

function fmt(text) {
    if (!text) return text
    const parts = []; const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g; let last = 0, match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index))
        const m = match[0]
        if (m.startsWith('`')) parts.push(<code key={match.index} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '3px', padding: '1px 5px', fontSize: '11px', fontFamily: 'monospace' }}>{m.slice(1, -1)}</code>)
        else if (m.startsWith('**')) parts.push(<strong key={match.index}>{m.slice(2, -2)}</strong>)
        else parts.push(<em key={match.index}>{m.slice(1, -1)}</em>)
        last = match.index + m.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length > 0 ? parts : text
}

// ── Main Admin Support Panel ───────────────────────────────────────────────────
export default function AdminSupportPanel() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedArticle, setSelectedArticle] = useState(null)
    const [editingArticle, setEditingArticle] = useState(null) // null | article | 'new'

    const fetchArticles = () => {
        setLoading(true)
        fetch('/api/support?role=admin')
            .then(r => r.json())
            .then(d => { if (d.success) setArticles(d.articles || []) })
            .catch(console.error)
            .finally(() => setLoading(false))
    }

    useEffect(() => { fetchArticles() }, [])

    const filtered = useMemo(() => {
        let list = articles
        if (selectedCategory !== 'all') list = list.filter(a => a.category === selectedCategory)
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase()
            list = list.filter(a =>
                a.title.toLowerCase().includes(q) ||
                (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
                a.content.toLowerCase().includes(q) ||
                (a.admin_content || '').toLowerCase().includes(q)
            )
        }
        return list
    }, [articles, selectedCategory, searchTerm])

    // Show editor
    if (editingArticle !== null) {
        return (
            <AdminArticleEditor
                article={editingArticle === 'new' ? null : editingArticle}
                onClose={() => setEditingArticle(null)}
                onSaved={() => { setEditingArticle(null); fetchArticles() }}
            />
        )
    }

    // Show article reader
    if (selectedArticle) {
        return (
            <AdminArticleReader
                article={selectedArticle}
                onBack={() => setSelectedArticle(null)}
                onEdit={() => setEditingArticle(selectedArticle)}
            />
        )
    }

    const catInfo = (catId) => CATEGORIES.find(c => c.id === catId) || { icon: '📄', color: '#6b7280', label: catId }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Top Bar */}
            <div style={{ padding: '16px 20px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '200px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                        <input
                            type="text"
                            placeholder="Search all articles..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', paddingLeft: '36px', paddingRight: searchTerm ? '36px' : '12px', fontSize: '14px' }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                                <X size={15} />
                            </button>
                        )}
                    </div>
                </div>
                <button onClick={() => setEditingArticle('new')} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', whiteSpace: 'nowrap' }}>
                    <Plus size={16} /> New Article
                </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
                {/* Category Filter */}
                {!searchTerm && (
                    <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', padding: '12px 20px', scrollbarWidth: 'none' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                    border: selectedCategory === cat.id ? `2px solid ${cat.color}` : '2px solid var(--border-primary)',
                                    backgroundColor: selectedCategory === cat.id ? `${cat.color}15` : 'var(--bg-elevated)',
                                    color: selectedCategory === cat.id ? cat.color : 'var(--text-secondary)',
                                }}
                            >
                                <span>{cat.icon}</span> {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ padding: '0 20px 20px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '12px', paddingTop: '4px' }}>
                        {loading ? 'Loading...' : `${filtered.length} article${filtered.length !== 1 ? 's' : ''}`}
                        {searchTerm && <span> for "{searchTerm}"</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: '72px', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-primary)', opacity: 0.5 }} />)
                        ) : filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
                                <BookOpen size={48} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>No articles found</div>
                                <div style={{ fontSize: '13px', marginBottom: 16 }}>Try a different search term or category</div>
                                <button onClick={() => setEditingArticle('new')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    <Plus size={14} /> Create First Article
                                </button>
                            </div>
                        ) : (
                            filtered.map(article => {
                                const cat = catInfo(article.category)
                                return (
                                    <div
                                        key={article.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', transition: 'all 0.2s' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = cat.color; e.currentTarget.style.boxShadow = `0 0 0 1px ${cat.color}30` }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; e.currentTarget.style.boxShadow = 'none' }}
                                    >
                                        <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                                            {article.icon || cat.icon}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setSelectedArticle(article)}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>{article.title}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase' }}>{cat.icon} {cat.label}</span>
                                                {article.admin_content && <span style={{ fontSize: '10px', color: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', padding: '1px 6px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}><Lock size={9} /> Admin section</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button onClick={() => setSelectedArticle(article)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                <Eye size={13} /> View
                                            </button>
                                            <button onClick={() => setEditingArticle(article)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.3)', backgroundColor: 'rgba(59,130,246,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#3b82f6', fontWeight: 600 }}>
                                                <Edit2 size={13} /> Edit
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Admin Article Reader (shows both sections) ─────────────────────────────────
function AdminArticleReader({ article, onBack, onEdit }) {
    const cat = CATEGORIES.find(c => c.id === article.category) || { icon: '📄', label: article.category, color: '#6b7280' }
    const lastUpdated = article.updated_at
        ? new Date(article.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: cat.color, fontWeight: 600, fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}>
                    <ChevronLeft size={16} /> Back
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={onEdit} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px' }}>
                    <Edit2 size={14} /> Edit Article
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 40px', maxWidth: '760px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '36px', lineHeight: 1 }}>{article.icon || cat.icon}</div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px' }}>{article.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '12px', color: cat.color, fontWeight: 600, textTransform: 'uppercase' }}>{cat.icon} {cat.label}</span>
                            {lastUpdated && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}><Clock size={11} /> {lastUpdated}</span>}
                        </div>
                    </div>
                </div>

                {/* Quick Reference Section */}
                <div style={{ marginBottom: '20px' }}>
                    {renderMarkdown(article.content)}
                </div>

                {/* Admin-Only Section */}
                {article.admin_content && (
                    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                            <Lock size={14} color="#8b5cf6" />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Only — Not visible to technicians</span>
                        </div>
                        {renderMarkdown(article.admin_content)}
                    </div>
                )}

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Tags</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {article.tags.map(tag => (
                                <span key={tag} style={{ padding: '3px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>{tag}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
