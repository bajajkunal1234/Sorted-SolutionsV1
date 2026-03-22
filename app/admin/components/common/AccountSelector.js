import { useState, useEffect } from 'react';
import { Plus, Loader2, User } from 'lucide-react';
import { accountsAPI } from '@/lib/adminAPI';
import AutocompleteSearch from '@/components/admin/AutocompleteSearch';

// onChange receives the full account object (not just the id)
function AccountSelector({ value, onChange, onCreateNew, accountType = 'all', label = 'Account' }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Add "Create New" as a special suggestion if onCreateNew is provided
    const displaySuggestions = [...accounts];
    // We don't necessarily want to filter out the Create New option, 
    // but AutocompleteSearch filters its logic. 
    // I'll handle "Create New" differently.

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

            {/* Show selected account details if we have value but search term is different (or context needed) */}
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
