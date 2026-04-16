'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, ChevronRight, ChevronLeft, Clock, BookOpen, X } from 'lucide-react'

// ── Simple markdown renderer (no external library needed) ─────────────────────
function renderMarkdown(text) {
    if (!text) return []
    const lines = text.split('\n')
    const elements = []
    let i = 0

    while (i < lines.length) {
        const line = lines[i]

        // Fenced code block
        if (line.startsWith('```')) {
            const langLine = line.slice(3).trim()
            const codeLines = []
            i++
            while (i < lines.length && !lines[i].startsWith('```')) {
                codeLines.push(lines[i])
                i++
            }
            elements.push(
                <pre key={`code-${i}`} style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '6px',
                    padding: '12px',
                    overflowX: 'auto',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    margin: '8px 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}>
                    {langLine && <div style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginBottom: '4px' }}>{langLine}</div>}
                    <code>{codeLines.join('\n')}</code>
                </pre>
            )
            i++
            continue
        }

        // Headings
        if (line.startsWith('### ')) {
            elements.push(<h3 key={i} style={{ fontSize: '14px', fontWeight: 700, margin: '14px 0 6px', color: 'var(--text-primary)' }}>{inlineFormat(line.slice(4))}</h3>)
            i++; continue
        }
        if (line.startsWith('## ')) {
            elements.push(<h2 key={i} style={{ fontSize: '16px', fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-primary)' }}>{inlineFormat(line.slice(3))}</h2>)
            i++; continue
        }
        if (line.startsWith('# ')) {
            elements.push(<h1 key={i} style={{ fontSize: '18px', fontWeight: 700, margin: '16px 0 8px', color: 'var(--color-primary)' }}>{inlineFormat(line.slice(2))}</h1>)
            i++; continue
        }

        // HR
        if (line.trim() === '---') {
            elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-primary)', margin: '12px 0' }} />)
            i++; continue
        }

        // Blockquote
        if (line.startsWith('> ')) {
            elements.push(
                <blockquote key={i} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '12px', margin: '8px 0', color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                    {inlineFormat(line.slice(2))}
                </blockquote>
            )
            i++; continue
        }

        // Table
        if (line.startsWith('|')) {
            const tableLines = []
            while (i < lines.length && lines[i].startsWith('|')) {
                tableLines.push(lines[i])
                i++
            }
            // Filter out separator rows (---|---)
            const rows = tableLines.filter(r => !r.match(/^\|[\s\-|]+\|$/))
            elements.push(
                <div key={`table-${i}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '12px' }}>
                        <tbody>
                            {rows.map((row, ri) => {
                                const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1)
                                const isHeader = ri === 0
                                return (
                                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: isHeader ? 'var(--bg-secondary)' : 'transparent' }}>
                                        {cells.map((cell, ci) => (
                                            <td key={ci} style={{ padding: '6px 10px', fontWeight: isHeader ? 700 : 400, verticalAlign: 'top', whiteSpace: isHeader ? 'nowrap' : 'normal' }}>
                                                {inlineFormat(cell.trim())}
                                            </td>
                                        ))}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )
            continue
        }

        // Unordered list
        if (line.match(/^[-*] /)) {
            const listItems = []
            while (i < lines.length && lines[i].match(/^[-*] /)) {
                listItems.push(lines[i].replace(/^[-*] /, ''))
                i++
            }
            elements.push(
                <ul key={`ul-${i}`} style={{ margin: '6px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {listItems.map((item, li) => (
                        <li key={li} style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{inlineFormat(item)}</li>
                    ))}
                </ul>
            )
            continue
        }

        // Numbered list
        if (line.match(/^\d+\. /)) {
            const listItems = []
            while (i < lines.length && lines[i].match(/^\d+\. /)) {
                listItems.push(lines[i].replace(/^\d+\. /, ''))
                i++
            }
            elements.push(
                <ol key={`ol-${i}`} style={{ margin: '6px 0', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {listItems.map((item, li) => (
                        <li key={li} style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.5' }}>{inlineFormat(item)}</li>
                    ))}
                </ol>
            )
            continue
        }

        // Blank line
        if (line.trim() === '') {
            elements.push(<div key={i} style={{ height: '6px' }} />)
            i++; continue
        }

        // Paragraph / normal text
        elements.push(
            <p key={i} style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', margin: '4px 0' }}>
                {inlineFormat(line)}
            </p>
        )
        i++
    }
    return elements
}

function inlineFormat(text) {
    if (!text) return text
    const parts = []
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
    let last = 0
    let match
    while ((match = regex.exec(text)) !== null) {
        if (match.index > last) parts.push(text.slice(last, match.index))
        const m = match[0]
        if (m.startsWith('`')) parts.push(<code key={match.index} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '3px', padding: '1px 5px', fontSize: '11px', fontFamily: 'monospace' }}>{m.slice(1, -1)}</code>)
        else if (m.startsWith('**')) parts.push(<strong key={match.index}>{m.slice(2, -2)}</strong>)
        else if (m.startsWith('*')) parts.push(<em key={match.index}>{m.slice(1, -1)}</em>)
        last = match.index + m.length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length > 0 ? parts : text
}

// ── Category Config ────────────────────────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TechSupportTab() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedArticle, setSelectedArticle] = useState(null)

    useEffect(() => {
        fetch('/api/support')
            .then(r => r.json())
            .then(d => {
                if (d.success) setArticles(d.articles || [])
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [])

    const filtered = useMemo(() => {
        let list = articles
        if (selectedCategory !== 'all') {
            list = list.filter(a => a.category === selectedCategory)
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase()
            list = list.filter(a =>
                a.title.toLowerCase().includes(q) ||
                (a.tags || []).some(t => t.toLowerCase().includes(q)) ||
                a.content.toLowerCase().includes(q)
            )
        }
        return list
    }, [articles, selectedCategory, searchTerm])

    if (selectedArticle) {
        return <ArticleReader article={selectedArticle} onBack={() => setSelectedArticle(null)} />
    }

    const catInfo = (catId) => CATEGORIES.find(c => c.id === catId) || { icon: '📄', color: '#6b7280' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Search Bar */}
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                        type="text"
                        placeholder="Search articles, keywords..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', paddingLeft: '36px', paddingRight: searchTerm ? '36px' : '12px', fontSize: '14px', borderRadius: '10px' }}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}>
                            <X size={15} />
                        </button>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '16px' }}>
                {/* Category Scroll */}
                {!searchTerm && (
                    <div style={{ overflowX: 'auto', display: 'flex', gap: '8px', padding: '12px 16px', scrollbarWidth: 'none' }}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', transition: 'all 0.2s',
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

                {/* Article Count */}
                <div style={{ padding: '4px 16px 8px', fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                    {loading ? 'Loading...' : `${filtered.length} article${filtered.length !== 1 ? 's' : ''}`}
                    {searchTerm && <span> for "{searchTerm}"</span>}
                </div>

                {/* Article List */}
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} style={{ height: '72px', backgroundColor: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border-primary)', opacity: 0.5 }} />
                        ))
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-tertiary)' }}>
                            <BookOpen size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>No articles found</div>
                            <div style={{ fontSize: '12px' }}>Try a different search term or category</div>
                        </div>
                    ) : (
                        filtered.map(article => {
                            const cat = catInfo(article.category)
                            return (
                                <button
                                    key={article.id}
                                    onClick={() => setSelectedArticle(article)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 14px', borderRadius: '12px',
                                        backgroundColor: 'var(--bg-elevated)',
                                        border: '1px solid var(--border-primary)',
                                        cursor: 'pointer', textAlign: 'left',
                                        transition: 'all 0.2s', width: '100%',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = cat.color
                                        e.currentTarget.style.backgroundColor = `${cat.color}08`
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'var(--border-primary)'
                                        e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'
                                    }}
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                                        {article.icon || cat.icon}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {article.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            {cat.icon} {cat.label}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                </button>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Article Reader ─────────────────────────────────────────────────────────────
function ArticleReader({ article, onBack }) {
    const cat = CATEGORIES.find(c => c.id === article.category) || { icon: '📄', label: article.category, color: '#6b7280' }
    const lastUpdated = article.updated_at
        ? new Date(article.updated_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                    onClick={onBack}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: cat.color, fontWeight: 600, fontSize: '13px', padding: '4px 8px', borderRadius: '6px', flexShrink: 0 }}
                >
                    <ChevronLeft size={16} /> Back
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: cat.color, fontWeight: 600, textTransform: 'uppercase' }}>{cat.icon} {cat.label}</div>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 40px' }}>
                {/* Article Title */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '32px', lineHeight: 1, flexShrink: 0 }}>{article.icon || cat.icon}</div>
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', lineHeight: 1.3 }}>{article.title}</h1>
                        {lastUpdated && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                                <Clock size={11} /> Updated {lastUpdated}
                            </div>
                        )}
                    </div>
                </div>

                {/* Article Body */}
                <div style={{ lineHeight: 1.6 }}>
                    {renderMarkdown(article.content)}
                </div>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Related Keywords</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {article.tags.map(tag => (
                                <span key={tag} style={{ padding: '3px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
