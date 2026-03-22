'use client'

import { useState, useEffect, useRef } from 'react';
import { Plus, Loader2, User, ChevronDown, X } from 'lucide-react';
import { accountsAPI } from '@/lib/adminAPI';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';

// onChange receives the full account object (not just the id)
function AccountSelector({ value, onChange, onCreateNew, accountType = 'all', label = 'Account' }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [dropdownSearch, setDropdownSearch] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setLoading(true);
                // accountsAPI.getAll() expects a plain string, not an object
                const typeParam = accountType === 'all' ? '' : accountType;
                const data = await accountsAPI.getAll(typeParam);
                setAccounts(data || []);
            } catch (err) {
                console.error('Error fetching accounts for selector:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAccounts();
    }, [accountType]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
                setDropdownSearch('');
            }
        };
        if (showDropdown) document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showDropdown]);

    const selectedAccount = accounts.find(acc => acc.id === value);

    // Sync search term with selected account name initially or on prop change
    useEffect(() => {
        if (selectedAccount) {
            setSearchTerm(selectedAccount.name);
        } else if (!value) {
            setSearchTerm('');
        }
    }, [value, selectedAccount]);

    const getAccountTypeBadge = (type) => {
        const badges = {
            customer: { label: 'Customer', color: '#10b981' },
            vendor: { label: 'Vendor', color: '#8b5cf6' },
            bank: { label: 'Bank', color: '#3b82f6' },
            cash: { label: 'Cash', color: '#f59e0b' },
            expense: { label: 'Expense', color: '#ef4444' },
            income: { label: 'Income', color: '#10b981' }
        };
        return badges[type] || { label: type, color: '#6b7280' };
    };

    const handleSelect = (account) => {
        if (account === '__create_new__') {
            onCreateNew && onCreateNew();
        } else {
            onChange(account); // pass full account object
            setSearchTerm(account.name);
        }
    };

    const handleDropdownSelect = (account) => {
        onChange(account);
        setSearchTerm(account.name);
        setShowDropdown(false);
        setDropdownSearch('');
    };

    const filteredDropdownAccounts = accounts.filter(acc =>
        acc.name?.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
        acc.group?.toLowerCase().includes(dropdownSearch.toLowerCase())
    );

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                    {label} * {loading && <Loader2 size={12} className="animate-spin" style={{ display: 'inline', marginLeft: '4px' }} />}
                </label>
                {onCreateNew && (
                    <button
                        onClick={(e) => { e.preventDefault(); onCreateNew(); }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <Plus size={12} /> New Account
                    </button>
                )}
            </div>

            {/* Search input + dropdown toggle button */}
            <div style={{ display: 'flex', gap: '0', position: 'relative' }}>
                <div style={{ flex: 1 }}>
                    <AutocompleteSearch
                        placeholder={`Search ${label}...`}
                        value={searchTerm}
                        onChange={setSearchTerm}
                        suggestions={accounts}
                        onSelect={handleSelect}
                        searchKey="name"
                        loading={loading}
                        renderSuggestion={(acc) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        padding: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: `${getAccountTypeBadge(acc.type).color}15`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <User size={14} style={{ color: getAccountTypeBadge(acc.type).color }} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{acc.name}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{acc.group}</span>
                                            {acc.current_balance !== undefined && (
                                                <span style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    fontWeight: 600,
                                                    color: acc.current_balance >= 0 ? '#10b981' : '#ef4444'
                                                }}>
                                                    ₹{Math.abs(acc.current_balance).toLocaleString()} {acc.current_balance >= 0 ? 'Dr' : 'Cr'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    padding: '2px 8px',
                                    backgroundColor: `${getAccountTypeBadge(acc.type).color}15`,
                                    color: getAccountTypeBadge(acc.type).color,
                                    fontSize: '10px',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                }}>
                                    {getAccountTypeBadge(acc.type).label}
                                </span>
                            </div>
                        )}
                    />
                </div>
                {/* Dropdown toggle button */}
                <button
                    type="button"
                    title="Browse all accounts"
                    onClick={() => { setShowDropdown(v => !v); setDropdownSearch(''); }}
                    style={{
                        flexShrink: 0,
                        height: '38px',
                        width: '36px',
                        border: '1px solid var(--border-primary)',
                        borderLeft: 'none',
                        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                        backgroundColor: showDropdown ? 'var(--color-primary)' : 'var(--bg-secondary)',
                        color: showDropdown ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s',
                        marginTop: '0',
                        alignSelf: 'flex-start'
                    }}
                >
                    <ChevronDown size={15} style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>

                {/* Dropdown popover */}
                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 4px)',
                            left: 0,
                            right: 0,
                            zIndex: 300,
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                            maxHeight: '320px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Search inside dropdown */}
                        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-primary)', flexShrink: 0 }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Filter accounts…"
                                value={dropdownSearch}
                                onChange={e => setDropdownSearch(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    border: '1px solid var(--border-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Account list */}
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {filteredDropdownAccounts.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                    No accounts found
                                </div>
                            ) : filteredDropdownAccounts.map(acc => {
                                const badge = getAccountTypeBadge(acc.type);
                                const isSelected = acc.id === value;
                                return (
                                    <div
                                        key={acc.id}
                                        onClick={() => handleDropdownSelect(acc)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '9px 12px',
                                            cursor: 'pointer',
                                            backgroundColor: isSelected ? `${badge.color}15` : 'transparent',
                                            borderLeft: isSelected ? `3px solid ${badge.color}` : '3px solid transparent',
                                            transition: 'background-color 0.1s'
                                        }}
                                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        <div style={{
                                            width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                                            backgroundColor: `${badge.color}20`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <User size={14} style={{ color: badge.color }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{acc.group || badge.label}</div>
                                        </div>
                                        <span style={{
                                            padding: '2px 7px', borderRadius: '10px', fontSize: '10px',
                                            fontWeight: 700, textTransform: 'uppercase', flexShrink: 0,
                                            backgroundColor: `${badge.color}15`, color: badge.color
                                        }}>
                                            {badge.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer */}
                        {onCreateNew && (
                            <div style={{ padding: '8px', borderTop: '1px solid var(--border-primary)', flexShrink: 0 }}>
                                <button
                                    onClick={() => { setShowDropdown(false); onCreateNew(); }}
                                    style={{
                                        width: '100%', padding: '7px', border: '1px dashed var(--border-primary)',
                                        borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent',
                                        color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                    }}
                                >
                                    <Plus size={14} /> New Account
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Show selected account details */}
            {selectedAccount && (
                <div style={{
                    marginTop: 'var(--spacing-xs)',
                    padding: '8px 12px',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>Selected: {selectedAccount.name}</span>
                        {selectedAccount.gstin && <span>GSTIN: {selectedAccount.gstin}</span>}
                    </div>
                    {selectedAccount.current_balance !== undefined && (
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-secondary)' }}>Balance</div>
                            <div style={{ fontWeight: 700 }}>₹{selectedAccount.current_balance.toLocaleString()}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AccountSelector;
