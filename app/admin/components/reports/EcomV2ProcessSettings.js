'use client';

import { useState, useEffect, useRef } from 'react';
import {
    ArrowLeft,
    Plus,
    Trash2,
    ArrowUp,
    ArrowDown,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Upload,
    Copy,
    ListOrdered,
    Link2,
    Eye,
    Image as ImageIcon,
    Home,
    Layout,
    X
} from 'lucide-react';
import { V2_CATEGORIES } from '@/lib/v2/catalogConfig';

export default function EcomV2ProcessSettings({ onBack }) {
    const [activeView, setActiveView] = useState('templates'); // 'templates' | 'assignments'
    const [templates, setTemplates] = useState([]);
    const [activeTemplateId, setActiveTemplateId] = useState(null);
    const [homepageTemplateId, setHomepageTemplateId] = useState('');
    const [homepageEnabled, setHomepageEnabled] = useState(true);
    const [categoryAssignments, setCategoryAssignments] = useState({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Image upload state
    const [uploadingStepIdx, setUploadingStepIdx] = useState(null);
    const stepFileInputRef = useRef(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/process-templates');
            const json = await res.json();
            if (json.success && json.data) {
                const list = Array.isArray(json.data.templates) ? json.data.templates : [];
                setTemplates(list);
                setActiveTemplateId((prev) =>
                    prev && list.some(t => t.id === prev) ? prev : (list[0]?.id || null)
                );
                setHomepageTemplateId(json.data.homepageTemplateId || list[0]?.id || '');
                setHomepageEnabled(json.data.homepageEnabled !== false);
                setCategoryAssignments(json.categoryAssignments || {});
            } else {
                setErrorMessage(json.error || 'Failed to load process templates');
            }
        } catch (err) {
            setErrorMessage('Network error loading templates: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const activeTemplate = templates.find(t => t.id === activeTemplateId) || templates[0] || null;

    const updateActiveTemplate = (updater) => {
        if (!activeTemplate) return;
        setTemplates(prev =>
            prev.map(t => (t.id === activeTemplate.id ? updater(t) : t))
        );
    };

    const handleCreateTemplate = () => {
        const newId = `tpl-${Date.now()}`;
        const newTemplate = {
            id: newId,
            name: `New Process Template ${templates.length + 1}`,
            title: 'Our process',
            subtitle: '',
            steps: [
                {
                    title: 'Inspection & quote',
                    desc: 'We inspect the appliance & share a repair quote for approval.',
                    imageUrl: ''
                },
                {
                    title: 'Repair & quality check',
                    desc: 'Genuine spare parts, post-service testing & 30-day warranty.',
                    imageUrl: ''
                }
            ]
        };
        setTemplates(prev => [...prev, newTemplate]);
        setActiveTemplateId(newId);
        setActiveView('templates');
    };

    const handleDuplicateTemplate = (tpl, e) => {
        if (e) e.stopPropagation();
        const newId = `tpl-${Date.now()}`;
        const copy = {
            ...tpl,
            id: newId,
            name: `${tpl.name} (Copy)`,
            steps: (tpl.steps || []).map(s => ({ ...s }))
        };
        setTemplates(prev => [...prev, copy]);
        setActiveTemplateId(newId);
    };

    const handleDeleteTemplate = (tplId, e) => {
        if (e) e.stopPropagation();
        if (templates.length <= 1) {
            setErrorMessage('At least one Our Process template must exist.');
            return;
        }
        const tpl = templates.find(t => t.id === tplId);
        if (!window.confirm(`Delete template "${tpl?.name || 'Untitled'}"? Any linked pages will fall back to the first available template.`)) {
            return;
        }

        const remaining = templates.filter(t => t.id !== tplId);
        const fallbackId = remaining[0]?.id || '';
        setTemplates(remaining);
        if (activeTemplateId === tplId) {
            setActiveTemplateId(fallbackId);
        }
        if (homepageTemplateId === tplId) {
            setHomepageTemplateId(fallbackId);
        }
        setCategoryAssignments(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(slug => {
                if (next[slug]?.templateId === tplId) {
                    next[slug] = { ...next[slug], templateId: fallbackId };
                }
            });
            return next;
        });
    };

    const handleAddStep = () => {
        updateActiveTemplate(tpl => ({
            ...tpl,
            steps: [
                ...(tpl.steps || []),
                {
                    title: `Step ${(tpl.steps?.length || 0) + 1}`,
                    desc: '',
                    imageUrl: ''
                }
            ]
        }));
    };

    const handleUpdateStep = (idx, field, value) => {
        updateActiveTemplate(tpl => {
            const nextSteps = [...(tpl.steps || [])];
            nextSteps[idx] = { ...nextSteps[idx], [field]: value };
            return { ...tpl, steps: nextSteps };
        });
    };

    const handleMoveStep = (idx, direction) => {
        updateActiveTemplate(tpl => {
            const nextSteps = [...(tpl.steps || [])];
            const targetIdx = idx + direction;
            if (targetIdx < 0 || targetIdx >= nextSteps.length) return tpl;
            const temp = nextSteps[idx];
            nextSteps[idx] = nextSteps[targetIdx];
            nextSteps[targetIdx] = temp;
            return { ...tpl, steps: nextSteps };
        });
    };

    const handleDeleteStep = (idx) => {
        updateActiveTemplate(tpl => ({
            ...tpl,
            steps: (tpl.steps || []).filter((_, i) => i !== idx)
        }));
    };

    const handleStepImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || uploadingStepIdx === null) return;

        const targetIdx = uploadingStepIdx;
        setErrorMessage('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'website-assets');
            formData.append('folder', 'ecom-v2/process');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            if (!json.success || !json.url) {
                throw new Error(json.error || 'Image upload failed');
            }
            handleUpdateStep(targetIdx, 'imageUrl', json.url);
        } catch (err) {
            setErrorMessage('Upload failed: ' + err.message);
        } finally {
            setUploadingStepIdx(null);
            if (stepFileInputRef.current) stepFileInputRef.current.value = '';
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        setSaveSuccess(false);
        setErrorMessage('');
        try {
            const res = await fetch('/api/v2/process-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templates,
                    homepageTemplateId,
                    homepageEnabled,
                    categoryAssignments
                })
            });
            const json = await res.json();
            if (json.success) {
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3500);
            } else {
                setErrorMessage(json.error || 'Failed to save templates');
            }
        } catch (err) {
            setErrorMessage('Network error saving templates: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getLinkedPagesCount = (tplId) => {
        let count = 0;
        if (homepageEnabled && homepageTemplateId === tplId) count += 1;
        Object.values(categoryAssignments).forEach(a => {
            if (a?.enabled !== false && a?.templateId === tplId) count += 1;
        });
        return count;
    };

    return (
        <div style={{ padding: 'var(--spacing-lg)', maxWidth: 1280, margin: '0 auto' }}>
            {/* Hidden file input for step images */}
            <input
                ref={stepFileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: 'none' }}
                onChange={handleStepImageUpload}
            />

            {/* Top Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '8px 14px',
                                border: '1px solid var(--border-primary)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)'
                            }}
                        >
                            <ArrowLeft size={15} /> Back
                        </button>
                    )}
                    <div>
                        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ListOrdered size={22} color="#10b981" /> Our Process Templates
                        </h1>
                        <p style={{ margin: '2px 0 0 0', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                            Create reusable step-by-step process templates and link them to Category Pages &amp; Homepage.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        onClick={handleCreateTemplate}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 14px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid #10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={15} /> New Template
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveAll}
                        disabled={saving || loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '9px 18px',
                            borderRadius: 'var(--radius-md)',
                            border: 'none',
                            backgroundColor: '#6338f5',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: saving ? 'wait' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            boxShadow: '0 4px 14px rgba(99,56,245,0.35)'
                        }}
                    >
                        {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                        {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            {/* Status Alerts */}
            {errorMessage && (
                <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 13
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={16} /> {errorMessage}
                    </span>
                    <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                        <X size={15} />
                    </button>
                </div>
            )}

            {saveSuccess && (
                <div style={{
                    marginBottom: 16,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.14)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600
                }}>
                    <CheckCircle2 size={16} /> Templates &amp; page assignments saved! All linked Category Pages &amp; Homepage are now updated live.
                </div>
            )}

            {/* Sub-Navigation Tabs */}
            <div style={{
                display: 'flex',
                gap: 8,
                borderBottom: '1px solid var(--border-primary)',
                marginBottom: 20,
                overflowX: 'auto'
            }}>
                <button
                    type="button"
                    onClick={() => setActiveView('templates')}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeView === 'templates' ? '3px solid #6338f5' : '3px solid transparent',
                        background: 'transparent',
                        color: activeView === 'templates' ? '#818cf8' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap'
                    }}
                >
                    <ListOrdered size={15} /> Process Templates ({templates.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveView('assignments')}
                    style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: activeView === 'assignments' ? '3px solid #6338f5' : '3px solid transparent',
                        background: 'transparent',
                        color: activeView === 'assignments' ? '#818cf8' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: 13.5,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        whiteSpace: 'nowrap'
                    }}
                >
                    <Link2 size={15} /> Link to Pages (Homepage &amp; 6 Categories)
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-secondary)' }}>
                    Loading Our Process templates...
                </div>
            ) : activeView === 'templates' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
                    {/* LEFT / TOP: Templates Selector List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Your Templates ({templates.length})
                        </div>

                        {templates.map(tpl => {
                            const isSelected = activeTemplate?.id === tpl.id;
                            const linkedCount = getLinkedPagesCount(tpl.id);
                            return (
                                <div
                                    key={tpl.id}
                                    onClick={() => setActiveTemplateId(tpl.id)}
                                    style={{
                                        padding: 14,
                                        borderRadius: 12,
                                        border: isSelected ? '2px solid #6338f5' : '1px solid var(--border-primary)',
                                        backgroundColor: isSelected ? 'rgba(99,56,245,0.10)' : 'var(--bg-elevated)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                                {tpl.name || 'Untitled Template'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                                <span style={{ padding: '2px 7px', borderRadius: 6, backgroundColor: 'var(--bg-secondary)', fontWeight: 600 }}>
                                                    {(tpl.steps || []).length} steps
                                                </span>
                                                <span style={{
                                                    padding: '2px 7px',
                                                    borderRadius: 6,
                                                    backgroundColor: linkedCount > 0 ? 'rgba(16,185,129,0.15)' : 'var(--bg-secondary)',
                                                    color: linkedCount > 0 ? '#10b981' : 'var(--text-tertiary)',
                                                    fontWeight: 600
                                                }}>
                                                    {linkedCount} {linkedCount === 1 ? 'page' : 'pages'} linked
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                title="Duplicate template"
                                                onClick={(e) => handleDuplicateTemplate(tpl, e)}
                                                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                            >
                                                <Copy size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                title="Delete template"
                                                onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                                                style={{ padding: 6, borderRadius: 6, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Live Storefront Preview Box */}
                        {activeTemplate && (
                            <div style={{
                                marginTop: 10,
                                padding: 18,
                                borderRadius: 14,
                                backgroundColor: '#ffffff',
                                border: '1px solid #e2e8f0',
                                color: '#0f172a'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: '#6338f5',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                    marginBottom: 12
                                }}>
                                    <Eye size={13} /> Live Storefront Preview
                                </div>

                                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                                    {activeTemplate.title || 'Our process'}
                                </h3>
                                {activeTemplate.subtitle && (
                                    <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px 0' }}>
                                        {activeTemplate.subtitle}
                                    </p>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                                    {(activeTemplate.steps || []).map((step, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                            <div style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                backgroundColor: '#f1f5f9',
                                                border: '1px solid #cbd5e1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 11,
                                                fontWeight: 800,
                                                color: '#0f172a',
                                                flexShrink: 0
                                            }}>
                                                {i + 1}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                                                    {step.title || `Step ${i + 1}`}
                                                </div>
                                                {step.desc && (
                                                    <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4, marginTop: 2 }}>
                                                        {step.desc}
                                                    </div>
                                                )}
                                            </div>
                                            {step.imageUrl && (
                                                <img
                                                    src={step.imageUrl}
                                                    alt={step.title}
                                                    style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid #e2e8f0' }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Active Template Editor */}
                    {activeTemplate && (
                        <div className="card" style={{
                            gridColumn: 'span 2',
                            padding: 20,
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-primary)'
                        }}>
                            <div style={{ marginBottom: 18 }}>
                                <h2 style={{ margin: '0 0 4px 0', fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                                    Edit Template Details
                                </h2>
                                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Changes here automatically apply to every Category Page &amp; Homepage linked to this template.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 22 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                        Template Name (Admin label) *
                                    </label>
                                    <input
                                        type="text"
                                        value={activeTemplate.name || ''}
                                        onChange={(e) => updateActiveTemplate(tpl => ({ ...tpl, name: e.target.value }))}
                                        placeholder="e.g. AC Foam-Jet Process"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 13,
                                            fontWeight: 600
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                        Section Heading (Shown on website)
                                    </label>
                                    <input
                                        type="text"
                                        value={activeTemplate.title || ''}
                                        onChange={(e) => updateActiveTemplate(tpl => ({ ...tpl, title: e.target.value }))}
                                        placeholder="Our process"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 13
                                        }}
                                    />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                        Subtitle / Description (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={activeTemplate.subtitle || ''}
                                        onChange={(e) => updateActiveTemplate(tpl => ({ ...tpl, subtitle: e.target.value }))}
                                        placeholder="e.g. Transparent doorstep inspection, upfront quote & 30-day warranty"
                                        style={{
                                            width: '100%',
                                            padding: '9px 12px',
                                            borderRadius: 8,
                                            border: '1px solid var(--border-primary)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            color: 'var(--text-primary)',
                                            fontSize: 13
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Steps Header */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 14,
                                paddingTop: 14,
                                borderTop: '1px solid var(--border-primary)'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        Steps ({(activeTemplate.steps || []).length})
                                    </h3>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Add, reorder, or edit each step in the customer service flow.
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleAddStep}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '7px 14px',
                                        borderRadius: 8,
                                        backgroundColor: '#6338f5',
                                        color: '#ffffff',
                                        border: 'none',
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={14} /> Add Step
                                </button>
                            </div>

                            {/* Steps List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {(activeTemplate.steps || []).length === 0 ? (
                                    <div style={{
                                        padding: 28,
                                        textAlign: 'center',
                                        borderRadius: 10,
                                        border: '1px dashed var(--border-primary)',
                                        color: 'var(--text-secondary)',
                                        fontSize: 13
                                    }}>
                                        No steps added yet. Click <strong>+ Add Step</strong> to add your first process step.
                                    </div>
                                ) : (
                                    (activeTemplate.steps || []).map((step, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: 14,
                                                borderRadius: 12,
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 10
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: '50%',
                                                    backgroundColor: '#6338f5',
                                                    color: '#fff',
                                                    fontSize: 12,
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    {idx + 1}
                                                </span>

                                                <input
                                                    type="text"
                                                    value={step.title || ''}
                                                    onChange={(e) => handleUpdateStep(idx, 'title', e.target.value)}
                                                    placeholder={`Step ${idx + 1} title (e.g. Inspection & quote)`}
                                                    style={{
                                                        flex: 1,
                                                        padding: '8px 10px',
                                                        borderRadius: 7,
                                                        border: '1px solid var(--border-primary)',
                                                        backgroundColor: 'var(--bg-elevated)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 13,
                                                        fontWeight: 700
                                                    }}
                                                />

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                    <button
                                                        type="button"
                                                        disabled={idx === 0}
                                                        onClick={() => handleMoveStep(idx, -1)}
                                                        title="Move up"
                                                        style={{
                                                            padding: 5,
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: idx === 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                            cursor: idx === 0 ? 'default' : 'pointer',
                                                            opacity: idx === 0 ? 0.35 : 1
                                                        }}
                                                    >
                                                        <ArrowUp size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={idx === activeTemplate.steps.length - 1}
                                                        onClick={() => handleMoveStep(idx, 1)}
                                                        title="Move down"
                                                        style={{
                                                            padding: 5,
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: idx === activeTemplate.steps.length - 1 ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                                                            cursor: idx === activeTemplate.steps.length - 1 ? 'default' : 'pointer',
                                                            opacity: idx === activeTemplate.steps.length - 1 ? 0.35 : 1
                                                        }}
                                                    >
                                                        <ArrowDown size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteStep(idx)}
                                                        title="Delete step"
                                                        style={{
                                                            padding: 5,
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#ef4444',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>

                                            <textarea
                                                rows={2}
                                                value={step.desc || ''}
                                                onChange={(e) => handleUpdateStep(idx, 'desc', e.target.value)}
                                                placeholder="Explain what happens during this step..."
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 10px',
                                                    borderRadius: 7,
                                                    border: '1px solid var(--border-primary)',
                                                    backgroundColor: 'var(--bg-elevated)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 12.5,
                                                    resize: 'vertical'
                                                }}
                                            />

                                            {/* Optional Step Image Row */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <ImageIcon size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                                <input
                                                    type="text"
                                                    value={step.imageUrl || ''}
                                                    onChange={(e) => handleUpdateStep(idx, 'imageUrl', e.target.value)}
                                                    placeholder="Optional step image URL (leave blank if text-only)"
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 160,
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        border: '1px solid var(--border-primary)',
                                                        backgroundColor: 'var(--bg-elevated)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: 12
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUploadingStepIdx(idx);
                                                        stepFileInputRef.current?.click();
                                                    }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 6,
                                                        border: '1px solid var(--border-primary)',
                                                        backgroundColor: 'var(--bg-elevated)',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        fontSize: 11.5,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    <Upload size={12} /> {uploadingStepIdx === idx ? 'Uploading...' : 'Upload'}
                                                </button>
                                                {step.imageUrl && (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                        <img
                                                            src={step.imageUrl}
                                                            alt="step"
                                                            style={{ width: 28, height: 28, borderRadius: 5, objectFit: 'cover', border: '1px solid var(--border-primary)' }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateStep(idx, 'imageUrl', '')}
                                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 2 }}
                                                            title="Remove image"
                                                        >
                                                            <X size={13} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* TAB 2: PAGE ASSIGNMENTS (HOMEPAGE & 6 CATEGORIES) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Homepage Assignment Card */}
                    <div className="card" style={{
                        padding: 20,
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                                    <Home size={20} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                                        Homepage (/v2)
                                    </h2>
                                    <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Choose whether to display an "Our Process" section on the main storefront homepage.
                                    </p>
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={homepageEnabled}
                                    onChange={(e) => setHomepageEnabled(e.target.checked)}
                                />
                                Show on Homepage
                            </label>
                        </div>

                        {homepageEnabled && (
                            <div style={{ maxWidth: 420 }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text-secondary)' }}>
                                    Linked Template for Homepage
                                </label>
                                <select
                                    value={homepageTemplateId || ''}
                                    onChange={(e) => setHomepageTemplateId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: 8,
                                        border: '1px solid var(--border-primary)',
                                        backgroundColor: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)',
                                        fontSize: 13,
                                        fontWeight: 600
                                    }}
                                >
                                    {templates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name} ({(tpl.steps || []).length} steps)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* 6 Category Pages Assignment Card */}
                    <div className="card" style={{
                        padding: 20,
                        backgroundColor: 'var(--bg-elevated)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-primary)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                                <Layout size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                                    Category Pages Assignments (6 Categories)
                                </h2>
                                <p style={{ margin: '2px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                                    Assign an Our Process template to each category page. You can also change this inside each Category Page Designer.
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
                            {V2_CATEGORIES.map(cat => {
                                const assign = categoryAssignments[cat.slug] || {
                                    enabled: true,
                                    templateId: templates[0]?.id || ''
                                };
                                return (
                                    <div
                                        key={cat.slug}
                                        style={{
                                            padding: 14,
                                            borderRadius: 12,
                                            backgroundColor: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-primary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <img
                                                    src={cat.icon}
                                                    alt={cat.name}
                                                    style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6, background: cat.accent, padding: 3 }}
                                                />
                                                <div>
                                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        {cat.name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                                                        /{cat.slug}
                                                    </div>
                                                </div>
                                            </div>

                                            <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={assign.enabled !== false}
                                                    onChange={(e) => setCategoryAssignments(prev => ({
                                                        ...prev,
                                                        [cat.slug]: {
                                                            ...assign,
                                                            enabled: e.target.checked
                                                        }
                                                    }))}
                                                />
                                                Visible
                                            </label>
                                        </div>

                                        <select
                                            disabled={assign.enabled === false}
                                            value={assign.templateId || ''}
                                            onChange={(e) => setCategoryAssignments(prev => ({
                                                ...prev,
                                                [cat.slug]: {
                                                    ...assign,
                                                    templateId: e.target.value
                                                }
                                            }))}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: 7,
                                                border: '1px solid var(--border-primary)',
                                                backgroundColor: 'var(--bg-elevated)',
                                                color: 'var(--text-primary)',
                                                fontSize: 12.5,
                                                fontWeight: 600,
                                                opacity: assign.enabled === false ? 0.5 : 1
                                            }}
                                        >
                                            {templates.map(tpl => (
                                                <option key={tpl.id} value={tpl.id}>
                                                    {tpl.name} ({(tpl.steps || []).length} steps)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
