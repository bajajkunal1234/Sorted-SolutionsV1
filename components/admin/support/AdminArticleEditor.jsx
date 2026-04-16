'use client'

import { useState, useEffect } from 'react'
import { Save, X, Eye, Edit2, ChevronDown } from 'lucide-react'

const CATEGORIES = [
    { id: 'guides', label: '📱 App Guides' },
    { id: 'jobs', label: '🔧 Jobs' },
    { id: 'amc', label: '🛡️ AMC' },
    { id: 'rentals', label: '📦 Rentals' },
    { id: 'quotations', label: '📋 Quotations' },
    { id: 'invoices', label: '🧾 Invoices' },
    { id: 'vouchers', label: '💰 Vouchers' },
    { id: 'inventory', label: '🏪 Inventory' },
    { id: 'notifications', label: '🔔 Notifications' },
    { id: 'incentives', label: '🏆 Incentives' },
    { id: 'price-lists', label: '💲 Price Lists' },
]

const COMMON_ICONS = ['📄', '🔧', '🛡️', '📦', '🧾', '💰', '📋', '🏪', '🔔', '🏆', '💲', '📱', '🖥️', '🔄', '▶️', '✅', '❌', '🔩', '💵', '💸', '🛒', '🚪', '🌐', '🆘', '👤', '📅', '🔁', '⭐', '📊', '🗂️']

export default function AdminArticleEditor({ article, onClose, onSaved }) {
    const isNew = !article

    const [form, setForm] = useState({
        slug: article?.slug || '',
        title: article?.title || '',
        icon: article?.icon || '📄',
        category: article?.category || 'guides',
        tags: (article?.tags || []).join(', '),
        content: article?.content || '',
        admin_content: article?.admin_content || '',
        audience: article?.audience || 'all',
        is_published: article?.is_published !== false,
        order_index: article?.order_index || 0,
    })

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [previewSection, setPreviewSection] = useState('both') // 'tech' | 'admin' | 'both'
    const [activeEditor, setActiveEditor] = useState('quick') // 'quick' | 'admin'
    const [showIconPicker, setShowIconPicker] = useState(false)

    // Auto-generate slug from title (new articles only)
    useEffect(() => {
        if (isNew && form.title) {
            const slug = form.title
                .toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .slice(0, 60)
            setForm(f => ({ ...f, slug }))
        }
    }, [form.title, isNew])

    const handleSave = async () => {
        setSaving(true)
        setSaveError('')
        setSaveSuccess(false)

        const payload = {
            ...form,
            tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }

        try {
            let res
            if (isNew) {
                res = await fetch('/api/support', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            } else {
                res = await fetch(`/api/support/${article.slug}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
            }

            const data = await res.json()
            if (!data.success) throw new Error(data.error || 'Save failed')

            setSaveSuccess(true)
            setTimeout(() => {
                onSaved && onSaved(data.article)
            }, 800)
        } catch (err) {
            setSaveError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const fld = (key, val) => setForm(f => ({ ...f, [key]: val }))

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-primary)' }}>
            {/* Editor Toolbar */}
            <div style={{ padding: '12px 20px', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px' }}>
                        <X size={15} /> Cancel
                    </button>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>—</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isNew ? '✨ New Article' : `✏️ Editing: ${article.title}`}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {saveSuccess && <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>✓ Saved!</span>}
                    {saveError && <span style={{ fontSize: '12px', color: '#ef4444' }}>{saveError}</span>}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.is_published} onChange={e => fld('is_published', e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        Published
                    </label>
                    <button onClick={handleSave} disabled={saving || !form.title || !form.slug} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px' }}>
                        <Save size={14} /> {saving ? 'Saving...' : 'Save Article'}
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
                {/* Left: Form & Editors */}
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-primary)', overflowY: 'auto' }}>
                    {/* Metadata Section */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Title + Icon */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowIconPicker(!showIconPicker)}
                                    style={{ width: '44px', height: '44px', fontSize: '22px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    {form.icon}
                                </button>
                                {showIconPicker && (
                                    <div style={{ position: 'absolute', top: '48px', left: 0, zIndex: 100, backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', borderRadius: '10px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px', width: '200px', boxShadow: 'var(--shadow-xl)' }}>
                                        {COMMON_ICONS.map(ic => (
                                            <button key={ic} onClick={() => { fld('icon', ic); setShowIconPicker(false) }}
                                                style={{ fontSize: '18px', padding: '4px', borderRadius: '6px', border: 'none', cursor: 'pointer', backgroundColor: form.icon === ic ? 'var(--bg-secondary)' : 'transparent' }}>
                                                {ic}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div style={{ flex: 1 }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Article Title *"
                                    value={form.title}
                                    onChange={e => fld('title', e.target.value)}
                                    style={{ width: '100%', fontSize: '15px', fontWeight: 600 }}
                                />
                            </div>
                        </div>

                        {/* Slug */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>SLUG</span>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="article-slug"
                                value={form.slug}
                                onChange={e => fld('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace' }}
                            />
                        </div>

                        {/* Category + Order */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                                <select className="form-input" value={form.category} onChange={e => fld('category', e.target.value)} style={{ width: '100%', fontSize: '13px' }}>
                                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                </select>
                            </div>
                            <div style={{ width: '90px' }}>
                                <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>ORDER</label>
                                <input type="number" className="form-input" value={form.order_index} onChange={e => fld('order_index', parseInt(e.target.value) || 0)} style={{ width: '100%', fontSize: '13px' }} />
                            </div>
                        </div>

                        {/* Audience toggle */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                            <button
                                onClick={() => fld('audience', 'all')}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                                    border: form.audience === 'all' ? '2px solid #3b82f6' : '2px solid var(--border-primary)',
                                    backgroundColor: form.audience === 'all' ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)',
                                    color: form.audience === 'all' ? '#3b82f6' : 'var(--text-secondary)',
                                }}
                            >
                                🌐 Visible to All<br/>
                                <span style={{ fontSize: '10px', fontWeight: 400 }}>Technicians + Admin</span>
                            </button>
                            <button
                                onClick={() => fld('audience', 'admin')}
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                                    border: form.audience === 'admin' ? '2px solid #8b5cf6' : '2px solid var(--border-primary)',
                                    backgroundColor: form.audience === 'admin' ? 'rgba(139,92,246,0.1)' : 'var(--bg-secondary)',
                                    color: form.audience === 'admin' ? '#8b5cf6' : 'var(--text-secondary)',
                                }}
                            >
                                🔒 Admin Only<br/>
                                <span style={{ fontSize: '10px', fontWeight: 400 }}>Hidden from technicians</span>
                            </button>
                        </div>

                        {/* Tags */}
                        <div>
                            <label style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>TAGS (comma-separated)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="job, booking, assign, technician..."
                                value={form.tags}
                                onChange={e => fld('tags', e.target.value)}
                                style={{ width: '100%', fontSize: '13px' }}
                            />
                        </div>
                    </div>

                    {/* Editor Tab Switcher */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)' }}>
                        <button
                            onClick={() => setActiveEditor('quick')}
                            style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeEditor === 'quick' ? 'var(--bg-elevated)' : 'transparent', color: activeEditor === 'quick' ? '#3b82f6' : 'var(--text-secondary)', borderBottom: activeEditor === 'quick' ? '2px solid #3b82f6' : '2px solid transparent' }}
                        >
                            📝 Quick Reference
                        </button>
                        <button
                            onClick={() => setActiveEditor('admin')}
                            style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', backgroundColor: activeEditor === 'admin' ? 'var(--bg-elevated)' : 'transparent', color: activeEditor === 'admin' ? '#8b5cf6' : 'var(--text-secondary)', borderBottom: activeEditor === 'admin' ? '2px solid #8b5cf6' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                        >
                            🔒 Admin Only
                        </button>
                    </div>

                    {/* Markdown Editors */}
                    {activeEditor === 'quick' ? (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                            <div style={{ padding: '8px 12px', fontSize: '11px', color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)' }}>
                                Markdown supported — visible to all (technicians + admin)
                            </div>
                            <textarea
                                value={form.content}
                                onChange={e => fld('content', e.target.value)}
                                placeholder={`## Quick Reference\n\n**What is this?**\nA brief description...\n\n### Steps\n- Step 1\n- Step 2\n\n### ⚠️ Rules\n- Rule 1`}
                                style={{ flex: 1, padding: '16px', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6', resize: 'none', border: 'none', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', minHeight: '400px' }}
                            />
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                            <div style={{ padding: '8px 12px', fontSize: '11px', color: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.05)', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                                🔒 Admin-only section — hidden from technicians
                            </div>
                            <textarea
                                value={form.admin_content}
                                onChange={e => fld('admin_content', e.target.value)}
                                placeholder={`## Behind the Scenes\n\n### API Routes\n- \`POST /api/...\` — what it does\n\n### Database Changes\n- Table: \`jobs\` — fields updated\n\n### Notifications Fired\n- \`job_completed\` → customer`}
                                style={{ flex: 1, padding: '16px', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6', resize: 'none', border: 'none', backgroundColor: 'rgba(139,92,246,0.02)', color: 'var(--text-primary)', outline: 'none', minHeight: '400px' }}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Preview */}
                <div style={{ width: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Preview Header */}
                    <div style={{ padding: '10px 16px', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Eye size={14} color="var(--text-tertiary)" />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>LIVE PREVIEW</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                            {['both', 'tech', 'admin'].map(mode => (
                                <button key={mode} onClick={() => setPreviewSection(mode)}
                                    style={{ padding: '3px 10px', borderRadius: '12px', border: '1px solid var(--border-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', backgroundColor: previewSection === mode ? 'var(--color-primary)' : 'transparent', color: previewSection === mode ? 'white' : 'var(--text-secondary)' }}>
                                    {mode === 'both' ? 'Both' : mode === 'tech' ? 'Tech View' : 'Admin View'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 40px' }}>
                        {/* Article Header Preview */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ fontSize: '32px', lineHeight: 1 }}>{form.icon}</div>
                            <div>
                                <h1 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{form.title || 'Article Title'}</h1>
                                <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textTransform: 'uppercase' }}>
                                    {CATEGORIES.find(c => c.id === form.category)?.label || form.category}
                                </span>
                            </div>
                        </div>

                        {/* Quick Reference Preview */}
                        {(previewSection === 'both' || previewSection === 'tech') && (
                            <div style={{ marginBottom: '20px' }}>
                                {form.content ? renderPreviewMarkdown(form.content) : (
                                    <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', fontSize: '13px' }}>Start typing Quick Reference content...</div>
                                )}
                            </div>
                        )}

                        {/* Admin Content Preview */}
                        {(previewSection === 'both' || previewSection === 'admin') && form.admin_content && (
                            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase' }}>🔒 Admin Only — Not visible to technicians</span>
                                </div>
                                {renderPreviewMarkdown(form.admin_content)}
                            </div>
                        )}

                        {/* Tags Preview */}
                        {form.tags && (
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-primary)' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>Tags</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                        <span key={tag} style={{ padding: '3px 10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)' }}>{tag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Simplified preview renderer (same logic, less overhead)
function renderPreviewMarkdown(text) {
    if (!text) return null
    const lines = text.split('\n')
    const elements = []
    let i = 0
    while (i < lines.length) {
        const line = lines[i]
        if (line.startsWith('```')) { const cc = []; i++; while (i < lines.length && !lines[i].startsWith('```')) { cc.push(lines[i]); i++ } elements.push(<pre key={i} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '6px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', margin: '6px 0', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{cc.join('\n')}</pre>); i++; continue }
        if (line.startsWith('### ')) { elements.push(<h3 key={i} style={{ fontSize: '13px', fontWeight: 700, margin: '12px 0 4px' }}>{line.slice(4)}</h3>); i++; continue }
        if (line.startsWith('## ')) { elements.push(<h2 key={i} style={{ fontSize: '15px', fontWeight: 700, margin: '14px 0 6px', color: 'var(--color-primary)' }}>{line.slice(3)}</h2>); i++; continue }
        if (line.startsWith('# ')) { elements.push(<h1 key={i} style={{ fontSize: '17px', fontWeight: 700, margin: '14px 0 6px' }}>{line.slice(2)}</h1>); i++; continue }
        if (line.trim() === '---') { elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border-primary)', margin: '10px 0' }} />); i++; continue }
        if (line.startsWith('> ')) { elements.push(<blockquote key={i} style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: '10px', margin: '6px 0', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic' }}>{line.slice(2)}</blockquote>); i++; continue }
        if (line.startsWith('|')) { const tl = []; while (i < lines.length && lines[i].startsWith('|')) { tl.push(lines[i]); i++ } const rows = tl.filter(r => !r.match(/^\|[\s\-|]+\|$/)); elements.push(<div key={`t-${i}`} style={{ overflowX: 'auto', margin: '6px 0' }}><table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '11px' }}><tbody>{rows.map((row, ri) => { const cells = row.split('|').filter((_, ci) => ci > 0 && ci < row.split('|').length - 1); const isH = ri === 0; return <tr key={ri} style={{ borderBottom: '1px solid var(--border-primary)', backgroundColor: isH ? 'var(--bg-secondary)' : 'transparent' }}>{cells.map((cell, ci) => <td key={ci} style={{ padding: '4px 8px', fontWeight: isH ? 700 : 400, verticalAlign: 'top' }}>{cell.trim()}</td>)}</tr> })}</tbody></table></div>); continue }
        if (line.match(/^[-*] /)) { const items = []; while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(lines[i].replace(/^[-*] /, '')); i++ } elements.push(<ul key={`ul-${i}`} style={{ margin: '4px 0', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>{items.map((item, li) => <li key={li} style={{ fontSize: '12px', lineHeight: '1.5' }}>{item}</li>)}</ul>); continue }
        if (line.match(/^\d+\. /)) { const items = []; while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(lines[i].replace(/^\d+\. /, '')); i++ } elements.push(<ol key={`ol-${i}`} style={{ margin: '4px 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>{items.map((item, li) => <li key={li} style={{ fontSize: '12px', lineHeight: '1.5' }}>{item}</li>)}</ol>); continue }
        if (line.trim() === '') { elements.push(<div key={i} style={{ height: '4px' }} />); i++; continue }
        elements.push(<p key={i} style={{ fontSize: '12px', lineHeight: '1.6', margin: '3px 0' }}>{line}</p>); i++
    }
    return elements
}
