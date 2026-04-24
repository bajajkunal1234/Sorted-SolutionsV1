'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { MUMBAI_LOCALITIES, getPincodeForLocality } from '@/lib/data/mumbaiLocalities'

/**
 * Shared searchable locality combobox.
 *
 * Props:
 *   value         – current locality name (or '__other__')
 *   pincode       – current pincode string (controlled)
 *   onChange(locality, pincode) – called when selection changes
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
}) {
    // query = what user types in the search box
    const [query, setQuery] = useState(value === '__other__' ? '' : (value || ''))
    const [open, setOpen] = useState(false)
    const containerRef = useRef(null)
    const inputRef = useRef(null)

    // Sync display when value changes externally (e.g. URL pre-fill)
    useEffect(() => {
        if (!open) {
            setQuery(value === '__other__' ? '' : (value || ''))
        }
    }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false)
                // If user typed something not in list, treat as Other
                if (query.trim() && !MUMBAI_LOCALITIES.find(l => l.name.toLowerCase() === query.trim().toLowerCase())) {
                    onChange('__other__', pincode)
                }
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [query, pincode, onChange])

    const filtered = query.trim().length === 0
        ? MUMBAI_LOCALITIES
        : MUMBAI_LOCALITIES.filter(l => l.name.toLowerCase().includes(query.trim().toLowerCase()))

    const handleSelect = (loc) => {
        setQuery(loc.name)
        setOpen(false)
        onChange(loc.name, loc.pincode)
    }

    const handleOther = () => {
        setOpen(false)
        onChange('__other__', pincode)
    }

    const handleInputChange = (e) => {
        setQuery(e.target.value)
        setOpen(true)
        // Clear selection while typing
        if (value && value !== '__other__') {
            onChange('', '')
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
        ...inputStyle,
    }

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
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    placeholder="Search your area / locality..."
                    autoComplete="off"
                    aria-label="Search locality"
                    aria-expanded={open}
                    role="combobox"
                    aria-autocomplete="list"
                />
                {query && (
                    <button
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
                    background: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10,
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                    maxHeight: 220,
                    overflowY: 'auto',
                    zIndex: dropdownZIndex,
                    scrollbarWidth: 'thin',
                }}>
                    {/* No match */}
                    {filtered.length === 0 && (
                        <div style={{ padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>
                            No match —{' '}
                            <span
                                onMouseDown={e => { e.preventDefault(); handleOther() }}
                                style={{ color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                use &ldquo;{query}&rdquo; as your area
                            </span>
                        </div>
                    )}

                    {/* Matched options */}
                    {filtered.map(loc => (
                        <div
                            key={loc.name}
                            onMouseDown={e => { e.preventDefault(); handleSelect(loc) }}
                            style={{
                                padding: '9px 14px',
                                fontSize: 13,
                                cursor: 'pointer',
                                color: loc.name === value ? '#38bdf8' : '#e2e8f0',
                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: loc.name === value ? 'rgba(56,189,248,0.1)' : 'transparent',
                                transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = loc.name === value ? 'rgba(56,189,248,0.1)' : 'transparent'}
                        >
                            <span>{loc.name}</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{loc.pincode}</span>
                        </div>
                    ))}

                    {/* "Other" footer option */}
                    {filtered.length > 0 && (
                        <div
                            onMouseDown={e => { e.preventDefault(); handleOther() }}
                            style={{
                                padding: '9px 14px',
                                fontSize: 12,
                                cursor: 'pointer',
                                color: '#64748b',
                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                fontStyle: 'italic',
                                background: value === '__other__' ? 'rgba(56,189,248,0.06)' : 'transparent',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = value === '__other__' ? 'rgba(56,189,248,0.06)' : 'transparent'}
                        >
                            My area is not listed — enter manually
                        </div>
                    )}
                </div>
            )}

            {/* Manual "Other" input + pincode */}
            {value === '__other__' && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    <input
                        type="text"
                        className={inputClassName}
                        style={{ ...inputStyle, flex: 1, boxSizing: 'border-box' }}
                        placeholder="Type your area / locality name"
                        value={query}
                        onChange={e => { setQuery(e.target.value); onChange('__other__', pincode) }}
                        aria-label="Custom locality name"
                    />
                    {showPincode && (
                        <input
                            type="text"
                            className={inputClassName}
                            style={{ ...inputStyle, width: 100, boxSizing: 'border-box' }}
                            placeholder="Pincode"
                            value={pincode}
                            maxLength={6}
                            inputMode="numeric"
                            onChange={e => onChange('__other__', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            aria-label="Pincode"
                        />
                    )}
                </div>
            )}

            {/* Pincode display when a known locality is selected */}
            {showPincode && value && value !== '__other__' && pincode && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>📮 Pincode:</span>
                    <input
                        type="text"
                        className={inputClassName}
                        style={{ ...inputStyle, width: 100, boxSizing: 'border-box', padding: '6px 10px', fontSize: 13 }}
                        value={pincode}
                        maxLength={6}
                        inputMode="numeric"
                        onChange={e => onChange(value, e.target.value.replace(/\D/g, '').slice(0, 6))}
                        aria-label="Pincode (editable)"
                    />
                    <span style={{ fontSize: 11, color: '#475569' }}>edit if incorrect</span>
                </div>
            )}
        </div>
    )
}
