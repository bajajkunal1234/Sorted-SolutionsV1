'use client'

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Filter, Layers, ArrowUpDown, Plus, Trash2, BookmarkCheck, Star, Check } from 'lucide-react';
import { interactionTypes, interactionCategories } from '@/lib/data/interactionTypes';

// ─── Field definitions ────────────────────────────────────────────────────────
const FILTER_FIELDS = [
    { key: 'customer',     label: 'Customer Name',  type: 'text' },
    { key: 'performedBy',  label: 'Performed By',   type: 'text' },
    { key: 'jobId',        label: 'Job ID',         type: 'text' },
    { key: 'invoiceId',    label: 'Invoice ID',     type: 'text' },
    { key: 'type',         label: 'Interaction Type', type: 'select', options: Object.keys(interactionTypes) },
    { key: 'category',     label: 'Category',       type: 'select', options: interactionCategories.map(c => c.id) },
    { key: 'description',  label: 'Description',    type: 'text' },
    { key: 'timestamp',    label: 'Date',           type: 'date' },
];

const OPERATORS_BY_TYPE = {
    select: [
        { key: 'is',     label: 'is' },
        { key: 'is_not', label: 'is not' },
    ],
    text: [
        { key: 'contains',     label: 'contains' },
        { key: 'not_contains', label: 'does not contain' },
        { key: 'is',           label: 'is exactly' },
    ],
    date: [
        { key: 'is',     label: 'is' },
        { key: 'before', label: 'before' },
        { key: 'after',  label: 'after' },
    ],
};

const DEFAULT_GROUP_BY_OPTIONS = [
    { value: 'none',        label: 'None' },
    { value: 'customer',    label: 'Customer' },
    { value: 'date',        label: 'Date' },
    { value: 'type',        label: 'Interaction Type' },
    { value: 'category',    label: 'Category' },
    { value: 'performedBy', label: 'User' },
];

const DEFAULT_SORT_BY_OPTIONS = [
    { value: 'timestamp_desc', label: 'Date (Newest)' },
    { value: 'timestamp_asc',  label: 'Date (Oldest)' },
    { value: 'customer_asc',   label: 'Customer A → Z' },
    { value: 'customer_desc',  label: 'Customer Z → A' },
    { value: 'type_asc',       label: 'Type A → Z' },
];

const PRESET_FILTERS = [
    { id: 'acquisition',   label: '🎯 Customer Acquisition', filter: { category: 'acquisition' } },
    { id: 'account',       label: '👤 Account Management',   filter: { category: 'account' } },
    { id: 'job',           label: '🔧 Jobs & Bookings',       filter: { category: 'job' } },
    { id: 'sales',          label: '💰 Sales & Billing',       filter: { category: 'sales' } },
    { id: 'communication',  label: '📧 Communications',       filter: { category: 'communication' } },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function FilterTag({ label, onRemove }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            backgroundColor: 'rgba(99,102,241,0.15)', color: '#818cf8',
            border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px',
            padding: '2px 8px', fontSize: '11px', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
        }}>
            {label}
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 1px', color: '#818cf8', display: 'flex', lineHeight: 1 }}>
                <X size={10} />
            </button>
        </span>
    );
}

function CustomFilterRow({ row, onChange, onRemove }) {
    const fields = FILTER_FIELDS;
    const field = fields.find(f => f.key === row.field) || fields[0];
    const operators = OPERATORS_BY_TYPE[field.type] || OPERATORS_BY_TYPE.text;
    const sel = { padding: '5px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #334155', backgroundColor: '#0f172a', color: '#e2e8f0', outline: 'none' };
    return (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select value={row.field} onChange={e => onChange({ ...row, field: e.target.value, operator: 'is', value: '' })} style={{ ...sel, flex: '1 1 110px' }}>
                {fields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <select value={row.operator} onChange={e => onChange({ ...row, operator: e.target.value })} style={{ ...sel, flex: '1 1 100px' }}>
                {operators.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            {field.type === 'select' ? (
                <select value={row.value} onChange={e => onChange({ ...row, value: e.target.value })} style={{ ...sel, flex: '1 1 110px' }}>
                    <option value="">— pick —</option>
                    {field.key === 'type' ? (
                        field.options.map(o => <option key={o} value={o}>{interactionTypes[o]?.label || o}</option>)
                    ) : field.key === 'category' ? (
                        field.options.map(o => <option key={o} value={o}>{interactionCategories.find(c => c.id === o)?.label || o}</option>)
                    ) : (
                        field.options.map(o => <option key={o} value={o}>{o}</option>)
                    )}
                </select>
            ) : field.type === 'date' ? (
                <input type="date" value={row.value} onChange={e => onChange({ ...row, value: e.target.value })} style={{ ...sel, flex: '1 1 130px', colorScheme: 'dark' }} />
            ) : (
                <input type="text" value={row.value} placeholder="value..." onChange={e => onChange({ ...row, value: e.target.value })} style={{ ...sel, flex: '1 1 110px' }} />
            )}
            <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px', display: 'flex' }}>
                <Trash2 size={13} />
            </button>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InteractionsSearchPanel({
    searchTerm, onSearchChange,
    groupBy, onGroupByChange,
    sortBy, onSortByChange,
    activeTags = [], onAddTag, onRemoveTag,
    savedViews = [], onSaveNamedView, onApplyView, onDeleteView, onSetDefaultView,
    saveStatus, onResetView,
    groupByOptions = DEFAULT_GROUP_BY_OPTIONS,
    sortByOptions = DEFAULT_SORT_BY_OPTIONS,
}) {
    const [open, setOpen] = useState(false);
    const [showCustomFilter, setShowCustomFilter] = useState(false);
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [viewName, setViewName] = useState('');
    const [customRows, setCustomRows] = useState([{ id: Date.now(), field: 'customer', operator: 'contains', value: '' }]);
    const panelRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const addCustomRow = () => {
        setCustomRows(prev => [...prev, { id: Date.now(), field: 'customer', operator: 'contains', value: '' }]);
    };

    const updateRow = (id, updated) => {
        setCustomRows(prev => prev.map(r => r.id === id ? updated : r));
    };

    const removeRow = (id) => {
        setCustomRows(prev => prev.filter(r => r.id !== id));
    };

    const applyCustomFilters = () => {
        const valid = customRows.filter(r => r.value.trim());
        if (valid.length === 0) return;

        const label = valid.map(r => {
            const fieldLabel = FILTER_FIELDS.find(f => f.key === r.field)?.label || r.field;
            const opLabel = OPERATORS_BY_TYPE[FILTER_FIELDS.find(f => f.key === r.field)?.type || 'text'].find(o => o.key === r.operator)?.label || r.operator;
            let displayVal = r.value;
            if (r.field === 'type') {
                displayVal = interactionTypes[r.value]?.label || r.value;
            } else if (r.field === 'category') {
                displayVal = interactionCategories.find(c => c.id === r.value)?.label || r.value;
            }
            return `${fieldLabel} ${opLabel} "${displayVal}"`;
        }).join(' & ');

        onAddTag({
            id: `custom_${Date.now()}`,
            label,
            type: 'custom',
            conditions: valid
        });

        setCustomRows([{ id: Date.now(), field: 'customer', operator: 'contains', value: '' }]);
        setShowCustomFilter(false);
    };

    const handlePreset = (preset) => {
        const exists = activeTags.some(t => t.id === preset.id);
        if (exists) {
            onRemoveTag(preset.id);
        } else {
            onAddTag({
                id: preset.id,
                label: preset.label,
                type: 'preset',
                filter: preset.filter
            });
        }
    };

    const handleSaveView = () => {
        const name = viewName.trim();
        if (!name) return;
        onSaveNamedView(name);
        setViewName('');
        setShowSaveInput(false);
    };

    const activeGroupByLabel = groupByOptions.find(o => o.value === groupBy)?.label;
    const activeSortByLabel = sortByOptions.find(o => o.value === sortBy)?.label;
    const defaultGroupBy = 'none';
    const defaultSortBy = 'timestamp_desc';

    const hasActiveState = searchTerm || activeTags.length > 0 || groupBy !== defaultGroupBy || sortBy !== defaultSortBy;

    return (
        <div ref={panelRef} style={{ position: 'relative', flex: 1 }}>
            {/* ── Search Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                border: open ? '1px solid #6366f1' : '1px solid #334155',
                borderRadius: open ? '8px 8px 0 0' : '8px',
                backgroundColor: '#0f172a', padding: '4px 8px',
                transition: 'border-color 0.15s', flexWrap: 'wrap', minHeight: '36px',
            }}>
                <Search size={14} color="#64748b" style={{ flexShrink: 0 }} />

                {/* Active tags */}
                {activeTags.map(tag => (
                    <FilterTag key={tag.id} label={tag.label} onRemove={() => onRemoveTag(tag.id)} />
                ))}

                {/* Group By Tag */}
                {groupBy !== defaultGroupBy && (
                    <FilterTag label={`Group: ${activeGroupByLabel}`} onRemove={() => onGroupByChange(defaultGroupBy)} />
                )}

                {/* Sort By Tag */}
                {sortBy !== defaultSortBy && (
                    <FilterTag label={`Sort: ${activeSortByLabel}`} onRemove={() => onSortByChange(defaultSortBy)} />
                )}

                {/* Input element */}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                        onSearchChange(e.target.value);
                        if (e.target.value.trim()) {
                            setOpen(false);
                        }
                    }}
                    placeholder="Search interactions..."
                    onFocus={() => setOpen(true)}
                    style={{ flex: 1, minWidth: '100px', background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '13px', padding: '2px 0' }}
                />

                {/* Reset button */}
                {hasActiveState && (
                    <button
                        onClick={() => {
                            onSearchChange('');
                            activeTags.forEach(t => onRemoveTag(t.id));
                            onGroupByChange(defaultGroupBy);
                            onSortByChange(defaultSortBy);
                        }}
                        title="Clear all filters"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b', display: 'flex' }}
                    >
                        <X size={13} />
                    </button>
                )}

                <button onClick={() => setOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                    <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
            </div>

            {/* ── Dropdown Panel ── */}
            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    backgroundColor: '#1e293b', border: '1px solid #6366f1', borderTop: 'none',
                    borderRadius: '0 0 10px 10px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    maxHeight: '75vh', overflowY: 'auto',
                }}>
                    {/* Saved Views */}
                    {savedViews.length > 0 && (
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e3a5f', backgroundColor: 'rgba(99,102,241,0.05)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <BookmarkCheck size={11} /> Saved Views
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {savedViews.map(view => (
                                    <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', padding: '4px 6px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        <button
                                            onClick={() => { onApplyView(view); setOpen(false); }}
                                            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: view.isDefault ? '#818cf8' : '#cbd5e1', fontSize: '13px', fontWeight: view.isDefault ? 600 : 400, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {view.isDefault && <Star size={11} fill="#818cf8" color="#818cf8" />}
                                            {view.name}
                                        </button>
                                        {onSetDefaultView && (
                                            <button onClick={() => onSetDefaultView(view.id)} title={view.isDefault ? 'Default' : 'Set as default'}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: view.isDefault ? '#818cf8' : '#475569', display: 'flex' }}>
                                                <Star size={12} fill={view.isDefault ? '#818cf8' : 'none'} />
                                            </button>
                                        )}
                                        <button onClick={() => onDeleteView(view.id)} title="Delete view"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#475569', display: 'flex' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Presets */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Filter size={11} /> Filters
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '2px' }}>
                            {PRESET_FILTERS.map(preset => {
                                const isActive = activeTags.some(t => t.id === preset.id);
                                return (
                                    <button key={preset.id} onClick={() => handlePreset(preset)}
                                        style={{ padding: '6px 10px', textAlign: 'left', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: isActive ? 'rgba(99,102,241,0.2)' : 'transparent', color: isActive ? '#818cf8' : '#cbd5e1', fontWeight: isActive ? 600 : 400, display: 'flex', alignItems: 'center', gap: '5px' }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#334155'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        {isActive && <Check size={11} />}
                                        {preset.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom filter builder */}
                        <button onClick={() => setShowCustomFilter(v => !v)}
                            style={{ marginTop: '8px', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Plus size={12} /> Custom Filter...
                        </button>
                        {showCustomFilter && (
                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                    {customRows.map(row => (
                                        <CustomFilterRow key={row.id} row={row} onChange={upd => updateRow(row.id, upd)} onRemove={() => removeRow(row.id)} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={addCustomRow}
                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', border: '1px dashed #334155', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                                        <Plus size={12} /> Add condition
                                    </button>
                                    <button onClick={applyCustomFilters}
                                        style={{ padding: '5px 14px', fontSize: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Group By */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Layers size={11} /> Group By
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '2px' }}>
                            {groupByOptions.map(opt => {
                                const isActive = groupBy === opt.value;
                                return (
                                    <button key={opt.value} onClick={() => onGroupByChange(isActive ? defaultGroupBy : opt.value)}
                                        style={{ padding: '6px 10px', textAlign: 'left', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: isActive ? 'rgba(52,211,153,0.15)' : 'transparent', color: isActive ? '#34d399' : '#cbd5e1', fontWeight: isActive ? 600 : 400, display: 'flex', alignItems: 'center', gap: '5px' }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#334155'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        {isActive && <Check size={11} />}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sort By */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ArrowUpDown size={11} /> Sort By
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '2px' }}>
                            {sortByOptions.map(opt => {
                                const isActive = sortBy === opt.value;
                                return (
                                    <button key={opt.value} onClick={() => onSortByChange(opt.value)}
                                        style={{ padding: '6px 10px', textAlign: 'left', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: isActive ? 'rgba(251,146,60,0.15)' : 'transparent', color: isActive ? '#fb923c' : '#cbd5e1', fontWeight: isActive ? 600 : 400, display: 'flex', alignItems: 'center', gap: '5px' }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#334155'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        {isActive && <Check size={11} />}
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer / Reset / Save View */}
                    <div style={{ padding: '10px 16px' }}>
                        {!showSaveInput ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button onClick={() => setShowSaveInput(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                                    <BookmarkCheck size={13} /> Save View As...
                                </button>
                                <button onClick={() => { onResetView?.(); setOpen(false); }}
                                    style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#94a3b8' }}>
                                    Reset
                                </button>
                                <button onClick={() => setOpen(false)}
                                    style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#64748b' }}>
                                    Close
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input
                                    autoFocus
                                    type="text"
                                    value={viewName}
                                    onChange={e => setViewName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveView(); if (e.key === 'Escape') setShowSaveInput(false); }}
                                    placeholder='View name (e.g. "Acquisitions Only")'
                                    style={{ flex: 1, padding: '6px 10px', fontSize: '13px', border: '1px solid #6366f1', borderRadius: '6px', backgroundColor: '#0f172a', color: '#e2e8f0', outline: 'none' }}
                                />
                                <button onClick={handleSaveView} disabled={!viewName.trim() || saveStatus === 'saving'}
                                    style={{ padding: '6px 14px', fontSize: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: viewName.trim() ? '#6366f1' : '#334155', color: 'white', fontWeight: 500 }}>
                                    {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓' : 'Save'}
                                </button>
                                <button onClick={() => setShowSaveInput(false)}
                                    style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#94a3b8' }}>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
