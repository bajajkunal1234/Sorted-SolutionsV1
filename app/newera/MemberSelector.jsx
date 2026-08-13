'use client';

import { useState } from 'react';

export default function MemberSelector({ members }) {
    const [selected, setSelected] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSelect = async (name) => {
        setSelected(name);
    };

    const handleConfirm = async () => {
        if (!selected) {
            setError('Please select your profile to proceed.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'select_member', name: selected })
            });

            if (res.status === 401) {
                // Session expired or path scope issue - reload to force password entry
                window.location.reload();
                return;
            }

            const data = await res.json();
            if (data.success) {
                window.location.reload();
            } else {
                setError(data.error || 'Failed to select member');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.glassCard}>
                <div style={styles.header}>
                    <span style={styles.title}>IDENTIFY USER</span>
                    <span style={styles.subtitle}>Select your profile to initialize dashboard</span>
                </div>

                <div style={styles.grid}>
                    {members.map((member) => {
                        const isSelected = selected === member.name;
                        return (
                            <button
                                key={member.id}
                                onClick={() => handleSelect(member.name)}
                                style={{
                                    ...styles.memberCard,
                                    borderColor: isSelected ? '#6366f1' : 'rgba(255,255,255,0.08)',
                                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.4)',
                                    boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none'
                                }}
                            >
                                <div style={{
                                    ...styles.avatar,
                                    background: isSelected ? '#6366f1' : '#334155',
                                    color: isSelected ? '#ffffff' : '#cbd5e1'
                                }}>
                                    {member.name[0]}
                                </div>
                                <span style={{
                                    ...styles.memberName,
                                    color: isSelected ? '#ffffff' : '#cbd5e1',
                                    fontWeight: isSelected ? '700' : '500'
                                }}>
                                    {member.name}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {error && <div style={styles.error}>{error}</div>}

                <button
                    onClick={handleConfirm}
                    disabled={!selected || loading}
                    style={{
                        ...styles.confirmButton,
                        background: selected ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : '#1e293b',
                        color: selected ? '#ffffff' : '#64748b',
                        cursor: (!selected || loading) ? 'not-allowed' : 'pointer',
                        boxShadow: selected ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                >
                    {loading ? 'INITIALIZING...' : 'CONFIRM & ENTER'}
                </button>
            </div>
            <div style={styles.footer}>
                SECURE CONSOLE CONNECTION • MULTI-MEMBER PRIVACY
            </div>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'var(--font-family, sans-serif)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
    },
    glassCard: {
        width: '100%',
        maxWidth: '500px',
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '1.25rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        zIndex: 10,
        position: 'relative'
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '2rem',
        textAlign: 'center'
    },
    title: {
        fontSize: '1.5rem',
        fontWeight: '900',
        letterSpacing: '0.15em',
        color: '#ffffff',
        marginBottom: '0.5rem'
    },
    subtitle: {
        fontSize: '0.85rem',
        color: '#94a3b8',
        lineHeight: '1.4'
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        marginBottom: '2rem'
    },
    memberCard: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        borderRadius: '1rem',
        border: '1px solid',
        outline: 'none',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
    },
    avatar: {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.25rem',
        fontWeight: '700',
        marginBottom: '0.75rem',
        transition: 'all 0.2s'
    },
    memberName: {
        fontSize: '0.95rem',
        letterSpacing: '0.02em',
        transition: 'all 0.2s'
    },
    error: {
        color: '#f87171',
        fontSize: '0.85rem',
        textAlign: 'center',
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        marginBottom: '1.5rem'
    },
    confirmButton: {
        width: '100%',
        border: 'none',
        borderRadius: '0.75rem',
        padding: '1rem',
        fontWeight: '700',
        fontSize: '0.95rem',
        letterSpacing: '0.05em',
        transition: 'all 0.2s'
    },
    footer: {
        marginTop: '2rem',
        fontSize: '0.7rem',
        color: '#475569',
        letterSpacing: '0.15em',
        zIndex: 10
    }
};
