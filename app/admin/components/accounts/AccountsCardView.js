'use client'

import { User, Phone, Mail, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, getGroupPath } from '@/lib/utils/accountingHelpers';
import { accountGroups } from '@/lib/data/accountingData';

function AccountsCardView({ accounts, onAccountClick }) {
    return (
        <div style={{
            padding: 'var(--spacing-md)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--spacing-md)'
        }}>
            {accounts.map(account => {
                const groupPath = getGroupPath(account.under, accountGroups);
                const isPositive = (account.closingBalance || 0) >= 0;

                return (
                    <div
                        key={account.id}
                        onClick={() => onAccountClick?.(account)}
                        style={{
                            backgroundColor: 'var(--bg-elevated)',
                            border: '1px solid var(--border-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-md)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-sm)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = 'var(--border-primary)';
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <User size={24} style={{ color: 'var(--text-inverse)' }} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <h3 style={{
                                    fontSize: 'var(--font-size-base)',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    marginBottom: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {account.name}
                                </h3>
                                <div style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-tertiary)',
                                    fontFamily: 'monospace'
                                }}>
                                    {account.sku}
                                </div>
                            </div>
                        </div>

                        {/* Type Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignSelf: 'flex-start',
                            padding: '2px 8px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            textTransform: 'capitalize'
                        }}>
                            {account.type}
                        </div>

                        {/* Details */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-xs)',
                            padding: 'var(--spacing-sm)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                {groupPath}
                            </div>

                            {account.phone && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Phone size={12} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {account.phone}
                                    </span>
                                </div>
                            )}

                            {account.email && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Mail size={12} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {account.email}
                                    </span>
                                </div>
                            )}

                            {account.jobsDone > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                    <Briefcase size={12} style={{ color: 'var(--text-tertiary)' }} />
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        {account.jobsDone} jobs completed
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Balance */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                                    {isPositive ? 'To Receive' : 'To Pay'}
                                </div>
                                <div style={{
                                    fontSize: 'var(--font-size-xl)',
                                    fontWeight: 700,
                                    color: isPositive ? 'var(--color-success)' : 'var(--color-danger)'
                                }}>
                                    {formatCurrency(Math.abs(account.closingBalance))}
                                </div>
                            </div>
                            {isPositive ? (
                                <TrendingUp size={32} style={{ color: 'var(--color-success)', opacity: 0.5 }} />
                            ) : (
                                <TrendingDown size={32} style={{ color: 'var(--color-danger)', opacity: 0.5 }} />
                            )}
                        </div>
                    </div>
                );
            })}

            {accounts.length === 0 && (
                <div style={{
                    gridColumn: '1 / -1',
                    padding: 'var(--spacing-2xl)',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)'
                }}>
                    No accounts found. Try adjusting your filters.
                </div>
            )}
        </div>
    );
}

export default AccountsCardView;
