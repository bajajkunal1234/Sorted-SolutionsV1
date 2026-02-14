import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { accountsAPI } from '@/lib/adminAPI';

function AccountSelector({ value, onChange, onCreateNew, accountType = 'all', label = 'Account' }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAccounts = async () => {
            try {
                setLoading(true);
                // Fetch all accounts - filtering will be done locally for better UX (search/type)
                // or we could add type to the API call.
                const data = await accountsAPI.getAll({ type: accountType === 'all' ? null : accountType });
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

    return (
        <div>
            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                {label} * {loading && <Loader2 size={12} className="animate-spin" style={{ display: 'inline', marginLeft: '4px' }} />}
            </label>
            <select
                value={value || ''}
                onChange={(e) => {
                    if (e.target.value === '__create_new__') {
                        onCreateNew && onCreateNew();
                    } else {
                        onChange(e.target.value);
                    }
                }}
                className="form-input"
                style={{ width: '100%' }}
                disabled={loading}
            >
                <option value="">{loading ? 'Loading accounts...' : `Select ${label}...`}</option>
                {!loading && accounts.map(account => {
                    const badge = getAccountTypeBadge(account.type);
                    return (
                        <option key={account.id} value={account.id}>
                            {account.name} ({badge.label})
                        </option>
                    );
                })}
                <option value="__create_new__" style={{ fontWeight: 600, color: '#10b981' }}>
                    + Create New Account
                </option>
            </select>

            {/* Show selected account details */}
            {selectedAccount && !loading && (
                <div style={{
                    marginTop: 'var(--spacing-xs)',
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{selectedAccount.name}</span>
                        <span style={{
                            padding: '2px 6px',
                            backgroundColor: `${getAccountTypeBadge(selectedAccount.type).color}20`,
                            color: getAccountTypeBadge(selectedAccount.type).color,
                            fontSize: 'var(--font-size-xs)',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 600
                        }}>
                            {getAccountTypeBadge(selectedAccount.type).label}
                        </span>
                    </div>
                    {selectedAccount.gstin && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                            GSTIN: {selectedAccount.gstin}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AccountSelector;
