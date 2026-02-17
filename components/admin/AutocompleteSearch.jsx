'use client'

import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

/**
 * A reusable autocomplete search component that provides suggestions as the user types.
 * 
 * @param {string} placeholder - Input placeholder text
 * @param {string} value - Current search value
 * @param {function} onChange - Callback when input value changes
 * @param {Array} suggestions - List of objects to show as suggestions
 * @param {function} onSelect - Callback when a suggestion is selected
 * @param {function} renderSuggestion - Optional custom renderer for suggestion items
 * @param {string} searchKey - The key to use for basic filtering if no custom logic provided
 */
function AutocompleteSearch({
    placeholder = "Search...",
    value = "",
    onChange,
    suggestions = [],
    onSelect,
    renderSuggestion,
    searchKey = "name",
    loading = false
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const containerRef = useRef(null);

    // Filter suggestions based on input value
    const filteredSuggestions = suggestions.filter(item => {
        if (!value) return false;
        const val = typeof item === 'string' ? item : (item[searchKey] || '');
        return val.toLowerCase().includes(value.toLowerCase());
    }).slice(0, 10); // Limit to 10 suggestions

    // Handle outside clicks to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
                handleSelect(filteredSuggestions[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (item) => {
        onSelect(item);
        setIsOpen(false);
        setActiveIndex(-1);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <Search
                    size={16}
                    style={{
                        position: 'absolute',
                        left: 'var(--spacing-sm)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-tertiary)',
                        pointerEvents: 'none'
                    }}
                />
                <input
                    type="text"
                    className="form-input"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setIsOpen(true);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    style={{
                        paddingLeft: '2.5rem',
                        paddingRight: value ? '2.5rem' : '1rem',
                        width: '100%',
                        fontSize: 'var(--font-size-sm)',
                        height: '36px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-primary)',
                        backgroundColor: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        transition: 'border-color 0.2s ease'
                    }}
                />
                {loading ? (
                    <Loader2
                        size={16}
                        className="animate-spin"
                        style={{
                            position: 'absolute',
                            right: 'var(--spacing-sm)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-tertiary)'
                        }}
                    />
                ) : value && (
                    <button
                        onClick={() => {
                            onChange('');
                            setIsOpen(false);
                        }}
                        style={{
                            position: 'absolute',
                            right: 'var(--spacing-sm)',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-tertiary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px',
                            borderRadius: '50%'
                        }}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Dropdown Suggestions */}
            {isOpen && filteredSuggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-elevated)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: '4px'
                }}>
                    {filteredSuggestions.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: activeIndex === index ? 'var(--bg-secondary)' : 'transparent',
                                transition: 'background-color 0.1s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}
                        >
                            {renderSuggestion ? renderSuggestion(item) : (
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
                                    {typeof item === 'string' ? item : item[searchKey]}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .form-input:focus {
                    border-color: var(--color-primary) !important;
                    box-shadow: 0 0 0 2px var(--color-primary)15;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default AutocompleteSearch;
