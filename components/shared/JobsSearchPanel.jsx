'use client'

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Filter, Layers, ArrowUpDown, Plus, Trash2, BookmarkCheck, Star, Check } from 'lucide-react';

// ─── Field definitions ────────────────────────────────────────────────────────
const FILTER_FIELDS = [
    { key: 'status',      label: 'Status',        type: 'select', options: ['pending','assigned','confirmed','in-progress','repair','part-repairing','spare-part-needed','quotation-sent','completed','cancelled','closed','booking_request'] },
    { key: 'priority',    label: 'Priority',      type: 'select', options: ['urgent','high','normal','low'] },
    { key: 'locality',    label: 'Locality',      type: 'text' },
    { key: 'customer',    label: 'Customer',      type: 'text' },
    { key: 'assignee',    label: 'Assignee',      type: 'text' },
    { key: 'dueDate',     label: 'Due Date',      type: 'date' },
    { key: 'createdDate', label: 'Creation Date', type: 'date' },
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
    { value: 'status',      label: 'Status' },
    { value: 'assignee',    label: 'Assignee' },
    { value: 'dueDate',     label: 'Due Date' },
    { value: 'createdDate', label: 'Creation Date' },
    { value: 'locality',    label: 'Locality' },
    { value: 'priority',    label: 'Priority' },
    { value: 'customer',    label: 'Customer' },
    { value: 'warranty',    label: 'Warranty' },
];

const DEFAULT_SORT_BY_OPTIONS = [
    { value: 'dueDate',   label: 'Due Date' },
    { value: 'createdAt', label: 'Creation Date' },
    { value: 'jobName',   label: 'Job Name' },
    { value: 'customer',  label: 'Customer' },
    { value: 'priority',  label: 'Priority' },
    { value: 'locality',  label: 'Locality' },
    { value: 'assignee',  label: 'Assignee' },
];

const PRESET_FILTERS = [
    { id: 'urgent',    label: '🔴 Urgent',      filter: { priority: 'urgent' } },
    { id: 'today',     label: '📅 Due Today',   filter: { _preset: 'dueToday' } },
    { id: 'overdue',   label: '⚠️ Overdue',     filter: { _preset: 'overdue' } },
    { id: 'pending',   label: '⏳ Pending',      filter: { status: 'pending' } },
    { id: 'inprog',    label: '🔧 In Progress', filter: { status: 'in-progress' } },
    { id: 'completed', label: '✅ Completed',   filter: { status: 'completed' } },
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

function CustomFilterRow({ row, onChange, onRemove, showAssignee }) {
    const fields = showAssignee ? FILTER_FIELDS : FILTER_FIELDS.filter(f => f.key !== 'assignee');
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
                    {field.options.map(o => <option key={o} value={o}>{o.replace(/-/g, ' ')}</option>)}
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
/**
 * Odoo-style search panel.
 *
 * Props:
 *   searchTerm / onSearchChange
 *   groupBy / onGroupByChange
 *   sortBy / onSortByChange
 *   sortOrder / onSortOrderChange
 *   activeTags / onAddTag / onRemoveTag
 *   savedViews               – array of { id, name, isDefault, config }
 *   onSaveNamedView(name)    – save current config under a name
 *   onApplyView(view)        – apply a saved view config
 *   onDeleteView(id)         – delete a saved view
 *   onSetDefaultView(id)     – mark a view as default
 *   saveStatus               – null | 'saving' | 'saved' | 'error'
 *   onResetView              – reset to bare defaults
 *   showAssignee             – bool (admin only)
 *   groupByOptions / sortByOptions
 */
export default function JobsSearchPanel({
    searchTerm, onSearchChange,
    groupBy, onGroupByChange,
    sortBy, onSortByChange,
    sortOrder, onSortOrderChange,
    activeTags = [], onAddTag, onRemoveTag,
    savedViews = [], onSaveNamedView, onApplyView, onDeleteView, onSetDefaultView,
    saveStatus, onResetView,
    showAssignee = true,
    groupByOptions = DEFAULT_GROUP_BY_OPTIONS,
    sortByOptions = DEFAULT_SORT_BY_OPTIONS,
}) {
    const [open, setOpen] = useState(false);
    const [showCustomFilter, setShowCustomFilter] = useState(false);
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [viewName, setViewName] = useState('');
    const [customRows, setCustomRows] = useState([{ id: Date.now(), field: 'status', operator: 'is', value: '' }]);
    const panelRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const addCustomRow = () => setCustomRows(prev => [...prev, { id: Date.now(), field: 'status', operator: 'is', value: '' }]);
    const updateRow = (id, upd) => setCustomRows(prev => prev.map(r => r.id === id ? upd : r));
    const removeRow = (id) => setCustomRows(prev => prev.filter(r => r.id !== id));

    const applyCustomFilters = () => {
        const valid = customRows.filter(r => r.value);
        if (!valid.length) return;
        const label = valid.map(r => {
            const fl = FILTER_FIELDS.find(f => f.key === r.field)?.label || r.field;
            const ol = Object.values(OPERATORS_BY_TYPE).flat().find(o => o.key === r.operator)?.label || r.operator;
            return `${fl} ${ol} "${r.value}"`;
        }).join(' & ');
        onAddTag({ id: `custom_${Date.now()}`, label, type: 'custom', conditions: valid });
        setCustomRows([{ id: Date.now(), field: 'status', operator: 'is', value: '' }]);
        setShowCustomFilter(false);
    };

    const handlePreset = (preset) => {
        const existing = activeTags.find(t => t.id === preset.id);
        if (existing) onRemoveTag(preset.id);
        else onAddTag({ id: preset.id, label: preset.label, type: 'preset', filter: preset.filter });
    };

    const handleSaveView = () => {
        const name = viewName.trim();
        if (!name) return;
        onSaveNamedView(name);
        setViewName('');
        setShowSaveInput(false);
    };

    const activeGroupBy = groupByOptions.find(o => o.value === groupBy);
    const activeSortBy = sortByOptions.find(o => o.value === sortBy);

    const optBtn = (active, label, onClick) => (
        <button
            onClick={onClick}
            style={{
                padding: '6px 10px', textAlign: 'left', border: 'none', borderRadius: '6px',
                cursor: 'pointer', fontSize: '13px', width: '100%',
                backgroundColor: active ? undefined : 'transparent',
                color: active ? undefined : '#cbd5e1',
                fontWeight: active ? 600 : 400,
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#334155'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
            {label}
        </button>
    );

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

                {/* Active filter tags */}
                {activeTags.map(tag => (
                    <FilterTag key={tag.id} label={tag.label} onRemove={() => onRemoveTag(tag.id)} />
                ))}

                {/* Group-by tag */}
                {groupBy !== 'status' && (
                    <FilterTag label={`Group: ${activeGroupBy?.label || groupBy}`} onRemove={() => onGroupByChange('status')} />
                )}

                {/* Sort tag */}
                {(sortBy !== 'dueDate' || sortOrder !== 'asc') && (
                    <FilterTag
                        label={`Sort: ${activeSortBy?.label || sortBy} ${sortOrder === 'asc' ? '↑' : '↓'}`}
                        onRemove={() => { onSortByChange('dueDate'); onSortOrderChange('asc'); }}
                    />
                )}

                {/* Search input */}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    placeholder={activeTags.length ? 'Add filter...' : 'Search jobs...'}
                    onFocus={() => setOpen(true)}
                    style={{ flex: 1, minWidth: '100px', background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '13px', padding: '2px 0' }}
                />

                {/* Clear all */}
                {(searchTerm || activeTags.length || groupBy !== 'status' || sortBy !== 'dueDate' || sortOrder !== 'asc') && (
                    <button onClick={() => { onSearchChange(''); activeTags.forEach(t => onRemoveTag(t.id)); onGroupByChange('status'); onSortByChange('dueDate'); onSortOrderChange('asc'); }} title="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b', display: 'flex' }}>
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
                    {/* ── Saved Views ────────────────────────────────── */}
                    {savedViews.length > 0 && (
                        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e3a5f', backgroundColor: 'rgba(99,102,241,0.05)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <BookmarkCheck size={11} /> Saved Views
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {savedViews.map(view => (
                                    <div key={view.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', padding: '4px 6px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                                        {/* Apply view */}
                                        <button
                                            onClick={() => { onApplyView(view); setOpen(false); }}
                                            style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: view.isDefault ? '#818cf8' : '#cbd5e1', fontSize: '13px', fontWeight: view.isDefault ? 600 : 400, padding: '2px 4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            {view.isDefault && <Star size={11} fill="#818cf8" color="#818cf8" />}
                                            {view.name}
                                        </button>
                                        {/* Set default */}
                                        <button
                                            onClick={() => onSetDefaultView(view.id)}
                                            title={view.isDefault ? 'Default view' : 'Set as default'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: view.isDefault ? '#818cf8' : '#475569', display: 'flex' }}
                                        >
                                            <Star size={12} fill={view.isDefault ? '#818cf8' : 'none'} />
                                        </button>
                                        {/* Delete */}
                                        <button
                                            onClick={() => onDeleteView(view.id)}
                                            title="Delete view"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: '#475569', display: 'flex' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Filters ── */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Filter size={11} /> Filters
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '2px' }}>
                            {PRESET_FILTERS.map(preset => {
                                const isActive = activeTags.some(t => t.id === preset.id);
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => handlePreset(preset)}
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
                        <button onClick={() => setShowCustomFilter(v => !v)} style={{ marginTop: '8px', padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Plus size={12} /> Custom Filter...
                        </button>
                        {showCustomFilter && (
                            <div style={{ marginTop: '10px', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #334155' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
                                    {customRows.map(row => (
                                        <CustomFilterRow key={row.id} row={row} onChange={upd => updateRow(row.id, upd)} onRemove={() => removeRow(row.id)} showAssignee={showAssignee} />
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={addCustomRow} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', fontSize: '12px', border: '1px dashed #334155', borderRadius: '6px', backgroundColor: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>
                                        <Plus size={12} /> Add condition
                                    </button>
                                    <button onClick={applyCustomFilters} style={{ padding: '5px 14px', fontSize: '12px', border: 'none', borderRadius: '6px', backgroundColor: '#6366f1', color: 'white', cursor: 'pointer', fontWeight: 500 }}>
                                        Apply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Group By ── */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Layers size={11} /> Group By
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '2px' }}>
                            {groupByOptions.map(opt => {
                                const isActive = groupBy === opt.value;
                                return (
                                    <button key={opt.value} onClick={() => onGroupByChange(isActive ? 'status' : opt.value)}
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

                    {/* ── Sort By ── */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <ArrowUpDown size={11} /> Sort By
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '2px' }}>
                            {sortByOptions.map(opt => {
                                const isActive = sortBy === opt.value;
                                return (
                                    <button key={opt.value}
                                        onClick={() => { if (isActive) onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc'); else { onSortByChange(opt.value); onSortOrderChange('asc'); } }}
                                        style={{ padding: '6px 10px', textAlign: 'left', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', backgroundColor: isActive ? 'rgba(251,146,60,0.15)' : 'transparent', color: isActive ? '#fb923c' : '#cbd5e1', fontWeight: isActive ? 600 : 400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px' }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#334155'; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {isActive && <Check size={11} />}
                                            {opt.label}
                                        </span>
                                        {isActive && <span style={{ fontSize: '12px' }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Footer: Save View ── */}
                    <div style={{ padding: '10px 16px' }}>
                        {!showSaveInput ? (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    onClick={() => setShowSaveInput(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px', fontSize: '12px', fontWeight: 500, border: '1px solid #6366f1', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'rgba(99,102,241,0.1)', color: '#818cf8' }}
                                >
                                    <BookmarkCheck size={13} /> Save View As...
                                </button>
                                <button onClick={() => { onResetView(); setOpen(false); }} style={{ padding: '6px 12px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#94a3b8' }}>
                                    Reset
                                </button>
                                <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', padding: '6px 12px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#64748b' }}>
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
                                    placeholder='View name (e.g. "Urgent First")'
                                    style={{ flex: 1, padding: '6px 10px', fontSize: '13px', border: '1px solid #6366f1', borderRadius: '6px', backgroundColor: '#0f172a', color: '#e2e8f0', outline: 'none' }}
                                />
                                <button
                                    onClick={handleSaveView}
                                    disabled={!viewName.trim() || saveStatus === 'saving'}
                                    style={{ padding: '6px 14px', fontSize: '12px', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: viewName.trim() ? '#6366f1' : '#334155', color: 'white', fontWeight: 500 }}
                                >
                                    {saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓' : 'Save'}
                                </button>
                                <button onClick={() => setShowSaveInput(false)} style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid #334155', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'transparent', color: '#94a3b8' }}>
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
