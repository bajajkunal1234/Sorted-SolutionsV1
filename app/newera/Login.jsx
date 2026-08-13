'use client';

import { useState } from 'react';

export default function Login() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/newera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', password })
            });

            const data = await res.json();
            if (data.success) {
                // Reload page to re-trigger server component layout auth checks
                window.location.reload();
            } else {
                setError(data.error || 'Invalid password');
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
                <div style={styles.logoSection}>
                    <div style={styles.logoGlow}></div>
                    <span style={styles.title}>NEW ERA</span>
                    <span style={styles.subtitle}>Secured Liability Tracker</span>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>ENTER SECURITY KEY</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={styles.input}
                            required
                            autoFocus
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            ...styles.button,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'VERIFYING...' : 'DECRYPT SYSTEM'}
                    </button>
                </form>
            </div>
            <div style={styles.footer}>
                SYSTEM ENCRYPTED • NO-INDEX DIRECTIVES ACTIVE
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
        maxWidth: '420px',
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
    logoSection: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '2.5rem',
        position: 'relative'
    },
    logoGlow: {
        position: 'absolute',
        width: '80px',
        height: '80px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)',
        top: '-10px',
        borderRadius: '50%'
    },
    title: {
        fontSize: '2rem',
        fontWeight: '900',
        letterSpacing: '0.2em',
        background: 'linear-gradient(135deg, #a5b4fc 0%, #6366f1 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textAlign: 'center',
        marginBottom: '0.25rem'
    },
    subtitle: {
        fontSize: '0.875rem',
        color: '#94a3b8',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        fontWeight: '500'
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    },
    label: {
        fontSize: '0.75rem',
        fontWeight: '700',
        color: '#6366f1',
        letterSpacing: '0.05em'
    },
    input: {
        background: 'rgba(11, 15, 25, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        padding: '0.875rem 1rem',
        color: '#ffffff',
        fontSize: '1rem',
        outline: 'none',
        transition: 'all 0.2s',
        textAlign: 'center',
        letterSpacing: '0.15em',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
    },
    button: {
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        border: 'none',
        borderRadius: '0.75rem',
        padding: '1rem',
        color: '#ffffff',
        fontWeight: '700',
        fontSize: '0.95rem',
        letterSpacing: '0.05em',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
    },
    error: {
        color: '#f87171',
        fontSize: '0.85rem',
        textAlign: 'center',
        background: 'rgba(239, 68, 68, 0.1)',
        padding: '0.5rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(239, 68, 68, 0.2)'
    },
    footer: {
        marginTop: '2rem',
        fontSize: '0.7rem',
        color: '#475569',
        letterSpacing: '0.15em',
        zIndex: 10
    }
};
