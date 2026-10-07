'use client'

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X, Plus } from 'lucide-react';

/**
 * Mobile-first, iOS-optimized SearchableSelect combobox component for Admin forms.
 *
 * Designed to prevent iOS Safari auto-zoom (16px base font size on touch devices),
 * provide thumb-friendly touch targets (min 44px on mobile), and smooth native-like scrolling.
 *
 * @param {Array} options - List of { value, label, sublabel, isOperational } or strings
 * @param {string|number|object} value - Current selected value
 * @param {function} onChange - Callback (value, option)
 * @param {string} placeholder - Input placeholder
 * @param {boolean} disabled - Disable input
 * @param {boolean|string} error - Display error border
 * @param {function} onBlur - On blur handler
 * @param {boolean} allowCustom - Allow typing custom value not in list
 * @param {object} style - Extra styles for container
 */
export default function SearchableSelect({
    id,
    options = [],
    value = '',
    onChange,
    placeholder = 'Select...',
    disabled = false,
    error = false,
    onBlur,
    allowCustom = false,
    renderOption,
    style = {}
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    // Normalize options
    const normalizedOptions = options.map(opt => {
        if (typeof opt === 'string') return { value: opt, label: opt };
        return opt;
    });

    // Find currently selected option
    const selectedOption = normalizedOptions.find(o => 
        String(o.value) === String(value) || 
        (typeof value === 'object' && value && String(o.value) === String(value.id)) ||
        (typeof value === 'string' && value && o.label?.toLowerCase() === value.toLowerCase())
    );

    // Keep display query in sync with selected value when dropdown is closed
    useEffect(() => {
        if (!isOpen) {
            if (selectedOption) {
                setQuery(selectedOption.label);
            } else if (value && typeof value === 'string') {
                setQuery(value);
            } else if (value && typeof value === 'object' && value.name) {
                setQuery(value.name);
            } else {
                setQuery('');
            }
        }
    }, [value, selectedOption, isOpen]);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setHighlightedIndex(-1);
                if (selectedOption) {
                    setQuery(selectedOption.label);
                } else if (!value) {
                    setQuery('');
                }
                if (onBlur) onBlur();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedOption, value, onBlur]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current && highlightedIndex >= 0) {
            const listEl = listRef.current;
            const items = listEl.children;
            if (items[highlightedIndex]) {
                items[highlightedIndex].scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex, isOpen]);

    // Filter logic:
    // If query matches the selected option's label or query is empty, show all options!
    const isQueryMatchingSelection = selectedOption && query.trim().toLowerCase() === selectedOption.label.trim().toLowerCase();
    const filteredOptions = (!query.trim() || isQueryMatchingSelection)
        ? normalizedOptions
        : normalizedOptions.filter(opt => (opt.label || '').toLowerCase().includes(query.trim().toLowerCase()));

    const exactMatch = normalizedOptions.some(opt => (opt.label || '').toLowerCase() === query.trim().toLowerCase());
    const showCustomOption = allowCustom && query.trim().length > 0 && !exactMatch;

    const selectOption = (opt) => {
        onChange(opt.value, opt);
        setQuery(opt.label);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const selectCustom = (customText) => {
        onChange(customText, { value: customText, label: customText, isCustom: true });
        setQuery(customText);
        setIsOpen(false);
        setHighlightedIndex(-1);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('', null);
        setQuery('');
        setIsOpen(false);
        setHighlightedIndex(-1);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleKeyDown = (e) => {
        if (disabled) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
                setHighlightedIndex(0);
            } else {
                const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);
                if (totalItems > 0) {
                    setHighlightedIndex(prev => (prev + 1) % totalItems);
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);
                if (totalItems > 0) {
                    setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
                }
            }
        } else if (e.key === 'Enter') {
            if (isOpen) {
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    selectOption(filteredOptions[highlightedIndex]);
                } else if (showCustomOption && (highlightedIndex === filteredOptions.length || highlightedIndex === -1)) {
                    selectCustom(query.trim());
                } else if (filteredOptions.length === 1) {
                    selectOption(filteredOptions[0]);
                }
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            setHighlightedIndex(-1);
            if (selectedOption) setQuery(selectedOption.label);
        } else if (e.key === 'Tab') {
            if (isOpen) {
                setIsOpen(false);
            }
        }
    };

    return (
        <div ref={containerRef} className="searchable-select-root" style={{ position: 'relative', width: '100%', ...style }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    disabled={disabled}
                    placeholder={placeholder}
                    value={query}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck="false"
                    className="searchable-select-input"
                    onClick={() => {
                        if (!disabled) {
                            setIsOpen(true);
                        }
                    }}
                    onFocus={() => {
                        if (!disabled) {
                            setIsOpen(true);
                        }
                    }}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                        setHighlightedIndex(0);
                    }}
                    onKeyDown={handleKeyDown}
                    style={{
                        color: disabled ? 'var(--text-tertiary, #94a3b8)' : 'var(--text-primary, #f8fafc)',
                        backgroundColor: disabled ? 'var(--bg-tertiary, rgba(255,255,255,0.03))' : 'var(--bg-elevated, #1e293b)',
                        border: error 
                            ? '1.5px solid var(--color-danger, #ef4444)' 
                            : isOpen 
                                ? '1.5px solid var(--color-primary, #38bdf8)' 
                                : '1px solid var(--border-primary, rgba(255,255,255,0.15))',
                        boxShadow: isOpen ? '0 0 0 2px rgba(56, 189, 248, 0.2)' : 'none',
                        cursor: disabled ? 'not-allowed' : 'text'
                    }}
                />

                {/* Right Actions: Clear + Chevron */}
                <div className="searchable-select-actions" style={{
                    pointerEvents: disabled ? 'none' : 'auto'
                }}>
                    {(query || value) && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="searchable-select-action-btn"
                            title="Clear selection"
                            aria-label="Clear selection"
                        >
                            <X size={15} />
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!disabled) {
                                setIsOpen(!isOpen);
                                if (!isOpen && inputRef.current) inputRef.current.focus();
                            }
                        }}
                        className="searchable-select-action-btn"
                        title="Toggle dropdown"
                        aria-label="Toggle dropdown"
                    >
                        <ChevronDown
                            size={16}
                            style={{
                                transform: isOpen ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.2s ease'
                            }}
                        />
                    </button>
                </div>
            </div>

            {/* Dropdown Options List */}
            {isOpen && !disabled && (
                <div
                    ref={listRef}
                    className="searchable-select-menu"
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, idx) => {
                            const isSelected = String(opt.value) === String(value) || 
                                (selectedOption && String(opt.value) === String(selectedOption.value));
                            const isHighlighted = highlightedIndex === idx;

                            if (renderOption) {
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => selectOption(opt)}
                                        onMouseEnter={() => setHighlightedIndex(idx)}
                                    >
                                        {renderOption(opt, { isSelected, isHighlighted })}
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={opt.value}
                                    onClick={() => selectOption(opt)}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className="searchable-select-option"
                                    style={{
                                        backgroundColor: isHighlighted 
                                            ? 'var(--bg-secondary, rgba(255,255,255,0.08))' 
                                            : isSelected 
                                                ? 'rgba(56, 189, 248, 0.12)' 
                                                : 'transparent',
                                        color: isSelected 
                                            ? 'var(--color-primary, #38bdf8)' 
                                            : 'var(--text-primary, #f8fafc)',
                                        fontWeight: isSelected ? 600 : 400
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {opt.isOperational && <span title="Operational Product">📦</span>}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                                        {opt.sublabel && (
                                            <span style={{ fontSize: '12px', color: 'var(--text-tertiary, #94a3b8)', marginLeft: '4px', flexShrink: 0 }}>
                                                ({opt.sublabel})
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && <Check size={16} style={{ color: 'var(--color-primary, #38bdf8)', flexShrink: 0, marginLeft: '8px' }} />}
                                </div>
                            );
                        })
                    ) : !showCustomOption ? (
                        <div style={{
                            padding: '14px',
                            textAlign: 'center',
                            fontSize: '13px',
                            color: 'var(--text-tertiary, #94a3b8)'
                        }}>
                            No options found
                        </div>
                    ) : null}

                    {/* Custom Entry Option */}
                    {showCustomOption && (
                        <div
                            onClick={() => selectCustom(query.trim())}
                            onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                            className="searchable-select-option searchable-select-custom-option"
                            style={{
                                backgroundColor: highlightedIndex === filteredOptions.length 
                                    ? 'var(--bg-secondary, rgba(255,255,255,0.08))' 
                                    : 'transparent',
                                color: 'var(--color-primary, #38bdf8)',
                                borderTop: filteredOptions.length > 0 ? '1px solid var(--border-secondary, rgba(255,255,255,0.1))' : 'none',
                                marginTop: filteredOptions.length > 0 ? '4px' : '0'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={16} />
                                <span>Use &ldquo;<strong>{query.trim()}</strong>&rdquo;</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style jsx>{`
                .searchable-select-input {
                    width: 100%;
                    height: 38px;
                    padding-left: 12px;
                    padding-right: 68px;
                    font-size: 14px;
                    box-sizing: border-box;
                    border-radius: var(--radius-md, 8px);
                    outline: none;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    transition: border-color 0.15s ease, box-shadow 0.15s ease;
                }
                .searchable-select-actions {
                    position: absolute;
                    right: 6px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }
                .searchable-select-action-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-tertiary, #94a3b8);
                    cursor: pointer;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    transition: color 0.15s ease;
                }
                .searchable-select-action-btn:active {
                    color: var(--text-primary, #f8fafc);
                }
                .searchable-select-menu {
                    position: absolute;
                    top: calc(100% + 4px);
                    left: 0;
                    right: 0;
                    background-color: var(--bg-elevated, #1e293b);
                    border: 1px solid var(--border-primary, rgba(255,255,255,0.15));
                    border-radius: var(--radius-md, 8px);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
                    z-index: 10050;
                    max-height: 240px;
                    overflow-y: auto;
                    -webkit-overflow-scrolling: touch;
                    overscroll-behavior: contain;
                    padding: 5px;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .searchable-select-option {
                    padding: 8px 12px;
                    font-size: 13.5px;
                    border-radius: var(--radius-sm, 6px);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    user-select: none;
                    transition: background-color 0.1s ease;
                    min-height: 36px;
                }
                .searchable-select-option:active {
                    background-color: rgba(56, 189, 248, 0.2) !important;
                }

                /* Mobile First & iOS Overrides (iPhone, iPad, Android Phones & WebViews) */
                @media (max-width: 768px) {
                    .searchable-select-input {
                        font-size: 16px !important; /* CRITICAL FOR IOS: 16px eliminates Safari auto-zoom */
                        height: 44px !important;   /* Apple HIG standard touch target */
                        padding-left: 14px !important;
                        padding-right: 76px !important;
                        border-radius: 10px !important;
                    }
                    .searchable-select-actions {
                        right: 8px !important;
                        gap: 4px !important;
                    }
                    .searchable-select-action-btn {
                        width: 36px !important;
                        height: 36px !important;
                        border-radius: 8px !important;
                    }
                    .searchable-select-menu {
                        max-height: min(280px, 45dvh) !important;
                        border-radius: 12px !important;
                        padding: 6px !important;
                        box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6) !important;
                    }
                    .searchable-select-option {
                        padding: 11px 14px !important;
                        font-size: 15px !important;
                        min-height: 44px !important; /* Apple HIG standard 44pt touch area */
                        border-radius: 8px !important;
                    }
                }
            `}</style>
        </div>
    );
}
