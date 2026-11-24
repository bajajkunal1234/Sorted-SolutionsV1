'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, X } from 'lucide-react'
import { MUMBAI_LOCALITIES, getPincodeForLocality } from '@/lib/data/mumbaiLocalities'

/**
 * Shared searchable locality combobox.
 *
 * Supports both predefined Mumbai localities and arbitrary custom locality input.
 * Never stores or propagates '__other__'.
 *
 * Props:
 *   value         – current locality name
 *   pincode       – current pincode string (controlled)
 *   onChange(locality, pincode) – called when selection or text changes
 *   inputClassName – optional CSS class for the text input
 *   inputStyle     – optional inline style for the text input
 *   dropdownZIndex – default 999
 *   showPincode    – if true, shows pincode field below when locality selected (default true)
 */
export default function LocalityCombobox({
    value = '',
    pincode = '',
    onChange,
    inputClassName = '',
    inputStyle = {},
    dropdownZIndex = 999,
    showPincode = true,
    theme = 'auto',
}) {
    const cleanValue = (value && value !== '__other__') ? value : ''
    const [query, setQuery] = useState(cleanValue)
    const [open, setOpen] = useState(false)
    const [detectedDark, setDetectedDark] = useState(false)
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    // Detect theme if set to 'auto'
    useEffect(() => {
        if (theme === 'dark') {
            setDetectedDark(true)
            return
        }
        if (theme === 'light') {
            setDetectedDark(false)
            return
        }
        if (typeof window !== 'undefined') {
            const isDarkDoc = document.documentElement.getAttribute('data-theme') === 'dark'
            const el = containerRef.current
            const darkAncestor = el?.closest('[data-theme="dark"]') ||
                el?.closest('.admin-layout') ||
                el?.closest('.admin-root') ||
                el?.closest('.tech-app-container') ||
                el?.closest('.technician-app')
            setDetectedDark(Boolean(isDarkDoc || darkAncestor))
        }
    }, [theme])

    const isDark = theme === 'dark' ? true : (theme === 'light' ? false : detectedDark)

    // Sync display when value changes externally
    useEffect(() => {
        if (!open) {
            setQuery(cleanValue)
        }
    }, [value, open]) // eslint-disable-line react-hooks/exhaustive-deps

    // Close on outside click and commit typed locality
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
                const trimmed = query.trim()
                if (!trimmed || trimmed === '__other__') {
                    if (value && value !== '__other__') {
                        onChange('', pincode)
                    }
                    return
                }
                const match = MUMBAI_LOCALITIES.find(l => l.name.toLowerCase() === trimmed.toLowerCase())
                if (match) {
                    setQuery(match.name)
                    onChange(match.name, match.pincode || pincode)
                } else {
                    onChange(trimmed, pincode)
                }
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [query, pincode, value, onChange])

    const filtered = query.trim().length === 0
        ? MUMBAI_LOCALITIES
        : MUMBAI_LOCALITIES.filter(l => l.name.toLowerCase().includes(query.trim().toLowerCase()))

    const handleSelect = (loc) => {
        setQuery(loc.name)
        setOpen(false)
        onChange(loc.name, loc.pincode || pincode)
    }

    const handleUseCustom = (customText) => {
        const text = (customText || query).trim()
        if (text && text !== '__other__') {
            const match = MUMBAI_LOCALITIES.find(l => l.name.toLowerCase() === text.toLowerCase())
            const finalName = match ? match.name : text
            const finalPin = match?.pincode || pincode || getPincodeForLocality(finalName)
            setQuery(finalName)
            setOpen(false)
            onChange(finalName, finalPin)
        } else {
            setOpen(false)
        }
    }

    const handleInputChange = (e) => {
        const val = e.target.value
        setQuery(val)
        setOpen(true)
        const trimmed = val.trim()
        if (!trimmed) {
            onChange('', pincode)
            return
        }
        const match = MUMBAI_LOCALITIES.find(l => l.name.toLowerCase() === trimmed.toLowerCase())
        if (match) {
            onChange(match.name, match.pincode || pincode)
        } else {
            onChange(trimmed, pincode)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const trimmed = query.trim()
            if (filtered.length > 0 && filtered[0].name.toLowerCase() === trimmed.toLowerCase()) {
                handleSelect(filtered[0])
            } else if (trimmed) {
                handleUseCustom(trimmed)
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    const handleClear = () => {
        setQuery('')
        onChange('', '')
        inputRef.current?.focus()
        setOpen(true)
    }

    const baseInputStyle = {
        width: '100%',
        boxSizing: 'border-box',
        paddingLeft: 36,
        paddingRight: query ? 32 : 12,
        ...(!inputClassName && !inputStyle.border ? {
            background: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
            borderRadius: 10,
            height: 42,
            fontSize: 14,
            color: isDark ? '#f8fafc' : '#0f172a',
            outline: 'none',
        } : {}),
        ...inputStyle,
    }

    const activeLocality = (query && query !== '__other__') ? query : cleanValue

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {/* Text input */}
            <div style={{ position: 'relative' }}>
                <MapPin size={15} style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none',
                }} />
                <input
                    ref={inputRef}
                    type="text"
                    className={inputClassName}
                    style={baseInputStyle}
                    value={query === '__other__' ? '' : query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Search or enter locality..."
                    autoComplete="off"
                    aria-label="Search or enter locality"
                    aria-expanded={open}
                    role="combobox"
                    aria-autocomplete="list"
                />
                {query && (
                    <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); handleClear() }}
                        style={{
                            position: 'absolute', right: 8, top: '50%',
                            transform: 'translateY(-50%)', background: 'none',
                            border: 'none', cursor: 'pointer', color: '#94a3b8',
                            display: 'flex', alignItems: 'center', padding: 2,
                        }}
                        tabIndex={-1}
                        aria-label="Clear"
                    >
                        <X size={13} />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: isDark ? '#1e293b' : '#ffffff',
                    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #e2e8f0',
                    borderRadius: 10,
                    boxShadow: isDark
                        ? '0 12px 32px rgba(0,0,0,0.4)'
                        : '0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 12px -2px rgba(15, 23, 42, 0.08)',
                    maxHeight: 230,
                    overflowY: 'auto',
                    zIndex: dropdownZIndex,
                    scrollbarWidth: 'thin',
                }}>
                    {/* No match option */}
                    {filtered.length === 0 && query.trim() && (
                        <div
                            onMouseDown={e => { e.preventDefault(); handleUseCustom(query) }}
                            style={{
                                padding: '10px 14px',
                                fontSize: 13,
                                color: isDark ? '#38bdf8' : '#6338f5',
                                cursor: 'pointer',
                                background: isDark ? 'rgba(56,189,248,0.08)' : '#f5f3ff',
                                fontWeight: 600,
                            }}
                        >
                            📍 Use &ldquo;{query.trim()}&rdquo; as locality
                        </div>
                    )}

                    {/* Matched options */}
                    {filtered.map(loc => {
                        const isSelected = loc.name === activeLocality;
                        return (
                            <div
                                key={loc.name}
                                onMouseDown={e => { e.preventDefault(); handleSelect(loc) }}
                                style={{
                                    padding: '9px 14px',
                                    fontSize: 13.5,
                                    cursor: 'pointer',
                                    color: isDark
                                        ? (isSelected ? '#38bdf8' : '#e2e8f0')
                                        : (isSelected ? '#6338f5' : '#0f172a'),
                                    borderBottom: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f1f5f9',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: isSelected
                                        ? (isDark ? 'rgba(56,189,248,0.1)' : '#f5f3ff')
                                        : 'transparent',
                                    fontWeight: isSelected ? 600 : 500,
                                    transition: 'background 0.1s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = isSelected
                                        ? (isDark ? 'rgba(56,189,248,0.15)' : '#ede9fe')
                                        : (isDark ? 'rgba(56,189,248,0.08)' : '#f8fafc');
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = isSelected
                                        ? (isDark ? 'rgba(56,189,248,0.1)' : '#f5f3ff')
                                        : 'transparent';
                                }}
                            >
                                <span>{loc.name}</span>
                                <span style={{ fontSize: 11.5, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>
                                    {loc.pincode}
                                </span>
                            </div>
                        );
                    })}

                    {/* Custom area option if user typed something not strictly matching first option */}
                    {filtered.length > 0 && query.trim() && !MUMBAI_LOCALITIES.some(l => l.name.toLowerCase() === query.trim().toLowerCase()) && (
                        <div
                            onMouseDown={e => { e.preventDefault(); handleUseCustom(query) }}
                            style={{
                                padding: '9px 14px',
                                fontSize: 12.5,
                                cursor: 'pointer',
                                color: isDark ? '#38bdf8' : '#6338f5',
                                borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #e2e8f0',
                                fontStyle: 'italic',
                                fontWeight: 600,
                                background: isDark ? 'transparent' : '#faf5ff',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(56,189,248,0.08)' : '#f3e8ff'}
                            onMouseLeave={e => e.currentTarget.style.background = isDark ? 'transparent' : '#faf5ff'}
                        >
                            📍 Use &ldquo;{query.trim()}&rdquo; as custom area
                        </div>
                    )}

                    {/* Enter manually fallback info */}
                    {filtered.length > 0 && !query.trim() && (
                        <div
                            onMouseDown={e => {
                                e.preventDefault()
                                setOpen(false)
                                inputRef.current?.focus()
                            }}
                            style={{
                                padding: '9px 14px',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: isDark ? '#64748b' : '#94a3b8',
                                borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f1f5f9',
                                fontStyle: 'italic',
                                background: isDark ? 'transparent' : '#f8fafc',
                            }}
                        >
                            Type any area / landmark if not listed above
                        </div>
                    )}
                </div>
            )}

            {/* Pincode display below when locality or pincode is present */}
            {showPincode && activeLocality && pincode && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>📮 Pincode:</span>
                    <input
                        type="text"
                        className={inputClassName}
                        style={{ ...inputStyle, width: 100, boxSizing: 'border-box', padding: '6px 10px', fontSize: 13 }}
                        value={pincode}
                        maxLength={6}
                        inputMode="numeric"
                        onChange={e => onChange(activeLocality, e.target.value.replace(/\D/g, '').slice(0, 6))}
                        aria-label="Pincode (editable)"
                    />
                    <span style={{ fontSize: 11, color: '#475569' }}>auto-filled · edit if needed</span>
                </div>
            )}
        </div>
    )
}
