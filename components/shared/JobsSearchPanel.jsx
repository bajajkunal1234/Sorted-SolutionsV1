'use client'

import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X, Filter, Layers, ArrowUpDown, Plus, Trash2, BookmarkCheck, Star, Check } from 'lucide-react';

// ─── Field definitions ────────────────────────────────────────────────────────
const FILTER_FIELDS = [
    { key: 'status',      label: 'Status',        type: 'select', options: ['new_job_request','scheduled','diagnosing_quoting','quotation_sent','parts_ordered','work_in_progress','cx_reschedule','cancelled','closed'] },
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
    { value: 'none',        label: 'None' },
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
    { value: 'dueDate',       label: 'Due Date' },
    { value: 'createdAt',     label: 'Creation Date' },
    { value: 'jobName',       label: 'Job Name' },
    { value: 'customer',      label: 'Customer' },
    { value: 'priority',      label: 'Priority' },
    { value: 'locality',      label: 'Locality' },
    { value: 'assignee',      label: 'Assignee' },
    { value: 'brand',         label: 'Brand' },
    { value: 'appliance',     label: 'Appliance' },
    { value: 'applianceType', label: 'Appliance Type' },
    { value: 'status',        label: 'Status' },
    { value: 'visited',       label: 'Visited' },
    { value: 'quotation',     label: 'Quotation' },
    { value: 'invoice',       label: 'Invoice' },
];

const PRESET_FILTERS = [
    { id: 'urgent',    label: '🔴 Urgent',      filter: { priority: 'urgent' } },
    { id: 'today',     label: '📅 Due Today',   filter: { _preset: 'dueToday' } },
    { id: 'overdue',   label: '⚠️ Overdue',     filter: { _preset: 'overdue' } },
    { id: 'new_job_request',    label: '🔵 New Job Request',      filter: { status: 'new_job_request' } },
    { id: 'scheduled',          label: '📅 Scheduled',            filter: { status: 'scheduled' } },
    { id: 'diagnosing_quoting', label: '🔍 Diagnosing & Quoting', filter: { status: 'diagnosing_quoting' } },
    { id: 'quotation_sent',     label: '📋 Quotation Sent',       filter: { status: 'quotation_sent' } },
    { id: 'parts_ordered',      label: '🔩 Parts Ordered',        filter: { status: 'parts_ordered' } },
    { id: 'work_in_progress',   label: '🔧 Work In Progress',     filter: { status: 'work_in_progress' } },
    { id: 'cx_reschedule',      label: '📆 Cx Reschedule',        filter: { status: 'cx_reschedule' } },
    { id: 'cancelled',          label: '❌ Cancelled',            filter: { status: 'cancelled' } },
    { id: 'closed',             label: '✅ Closed',               filter: { status: 'closed' } },
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
    const [openFilter, setOpenFilter] = useState(false);
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

    // Find if current filters, grouping, and sorting match an existing saved view config
    const activeSavedView = (() => {
        if (!savedViews || savedViews.length === 0) return null;
        return savedViews.find(view => {
            const cfg = view.config;
            if (!cfg) return false;
            
            // Compare groupBy (treating 'none', null, undefined, false as equivalent)
            const vGroupBy = cfg.groupBy || 'none';
            const cGroupBy = groupBy || 'none';
            if (vGroupBy !== cGroupBy) return false;
            
            // Compare sortBy (treating null/undefined as 'dueDate')
            const vSortBy = cfg.sortBy || 'dueDate';
            const cSortBy = sortBy || 'dueDate';
            if (vSortBy !== cSortBy) return false;
            
            // Compare sortOrder (treating null/undefined as 'asc')
            const vSortOrder = cfg.sortOrder || 'asc';
            const cSortOrder = sortOrder || 'asc';
            if (vSortOrder !== cSortOrder) return false;
            
            // Compare activeTags
            const vTags = cfg.activeTags || [];
            const cTags = activeTags || [];
            if (vTags.length !== cTags.length) return false;
            
            // Compare every tag's id
            const vTagIds = vTags.map(t => t.id).filter(Boolean).sort();
            const cTagIds = cTags.map(t => t.id).filter(Boolean).sort();
            if (vTagIds.length !== cTagIds.length) return false;
            for (let i = 0; i < vTagIds.length; i++) {
                if (vTagIds[i] !== cTagIds[i]) return false;
            }
            
            return true;
        });
    })();

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

                {/* Active saved view tag OR individual filter/group/sort tags */}
                {activeSavedView ? (
                    <FilterTag
                        label={activeSavedView.name.startsWith('★') ? activeSavedView.name : `★ ${activeSavedView.name}`}
                        onRemove={() => {
                            if (onResetView) {
                                onResetView();
                            } else {
                                activeTags.forEach(t => onRemoveTag(t.id));
                                onGroupByChange('none');
                                onSortByChange('dueDate');
                                onSortOrderChange('asc');
                            }
                        }}
                    />
                ) : (
                    <>
                        {/* Active filter tags */}
                        {activeTags.map(tag => (
                            <FilterTag key={tag.id} label={tag.label} onRemove={() => onRemoveTag(tag.id)} />
                        ))}

                        {/* Group-by tag */}
                        {groupBy && groupBy !== 'none' && (
                            <FilterTag label={`Group: ${activeGroupBy?.label || groupBy}`} onRemove={() => onGroupByChange('none')} />
                        )}

                        {/* Sort tag */}
                        {(sortBy !== 'dueDate' || sortOrder !== 'asc') && (
                            <FilterTag
                                label={`Sort: ${activeSortBy?.label || sortBy} ${sortOrder === 'asc' ? '↑' : '↓'}`}
                                onRemove={() => { onSortByChange('dueDate'); onSortOrderChange('asc'); }}
                            />
                        )}
                    </>
                )}

                {/* Search input */}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => {
                        onSearchChange(e.target.value);
                        if (e.target.value.trim()) {
                            setOpen(false);
                        }
                    }}
                    placeholder={(activeTags.length || activeSavedView) ? 'Add filter...' : 'Search by name, phone, job#, address...'}
                    onFocus={() => setOpen(true)}
                    style={{ flex: 1, minWidth: '100px', background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '13px', padding: '2px 0' }}
                />

                {/* Clear all */}
                {(searchTerm || activeTags.length || (groupBy && groupBy !== 'none') || sortBy !== 'dueDate' || sortOrder !== 'asc') && (
                    <button onClick={() => { onSearchChange(''); activeTags.forEach(t => onRemoveTag(t.id)); onGroupByChange('none'); onSortByChange('dueDate'); onSortOrderChange('asc'); }} title="Clear" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#64748b', display: 'flex' }}>
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

                    {/* ── Filters (Collapsible Accordion) ── */}
                    <div style={{ borderBottom: '1px solid #334155' }}>
                        <button
                            onClick={() => setOpenFilter(v => !v)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                color: '#818cf8', fontWeight: 600, fontSize: '13px', outline: 'none'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Filter size={14} /> Filters {activeTags.length > 0 && `(${activeTags.length} active)`}
                            </span>
                            <ChevronDown size={14} style={{ transform: openFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>
                        {openFilter && (
                            <div style={{ padding: '0 16px 12px 16px' }}>
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
                        )}
                    </div>

                    {/* ── Group By Dropdown ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34d399', fontSize: '13px', fontWeight: 600, width: '100px', flexShrink: 0 }}>
                            <Layers size={14} /> Group By:
                        </div>
                        <select
                            value={groupBy}
                            onChange={e => onGroupByChange(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#0f172a',
                                color: '#e2e8f0',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {groupByOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* ── Sort By Dropdown ── */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb923c', fontSize: '13px', fontWeight: 600, width: '100px', flexShrink: 0 }}>
                            <ArrowUpDown size={14} /> Sort By:
                        </div>
                        <select
                            value={sortBy}
                            onChange={e => {
                                onSortByChange(e.target.value);
                                if (e.target.value === 'dueDate' && sortBy !== 'dueDate') {
                                    onSortOrderChange('asc');
                                }
                            }}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#0f172a',
                                color: '#e2e8f0',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            {sortByOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                            style={{
                                padding: '6px 12px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1px solid #334155',
                                backgroundColor: '#0f172a',
                                color: '#fb923c',
                                cursor: 'pointer',
                                fontWeight: 600,
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f172a'}
                        >
                            {sortOrder === 'asc' ? 'Asc ↑' : 'Desc ↓'}
                        </button>
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
