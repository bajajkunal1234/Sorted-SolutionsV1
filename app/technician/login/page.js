'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, AlertCircle } from 'lucide-react'

export default function TechnicianLogin() {
    const router = useRouter()
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const response = await fetch('/api/technician/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Login failed')
                setLoading(false)
                return
            }

            // Store session data in localStorage
            localStorage.setItem('technicianSession', JSON.stringify(data.session))
            localStorage.setItem('technicianData', JSON.stringify(data.technician))

            // Redirect to technician dashboard
            router.push('/technician/dashboard')

        } catch (err) {
            console.error('Login error:', err)
            setError('Network error. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-primary)',
            padding: 'var(--spacing-md)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--spacing-xl)',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border-primary)'
            }}>
                {/* Logo/Header */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{
                        fontSize: '3rem',
                        marginBottom: 'var(--spacing-sm)'
                    }}>
                        🔧
                    </div>
                    <h1 style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 700,
                        marginBottom: 'var(--spacing-xs)',
                        color: 'var(--text-primary)'
                    }}>
                        Technician Portal
                    </h1>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)'
                    }}>
                        Sign in to access your jobs
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-sm)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        color: '#ef4444'
                    }}>
                        <AlertCircle size={18} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <label style={{
                            display: 'block',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            marginBottom: 'var(--spacing-xs)',
                            color: 'var(--text-primary)'
                        }}>
                            Username
                        </label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{
                                position: 'absolute',
                                left: 'var(--spacing-sm)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)'
                            }} />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="form-input"
                                placeholder="Enter your username"
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.5rem'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                        <label style={{
                            display: 'block',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            marginBottom: 'var(--spacing-xs)',
                            color: 'var(--text-primary)'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{
                                position: 'absolute',
                                left: 'var(--spacing-sm)',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-tertiary)'
                            }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                                placeholder="Enter your password"
                                required
                                style={{
                                    width: '100%',
                                    paddingLeft: '2.5rem'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-sm)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 600
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-tertiary)'
                }}>
                    <p>Contact your administrator if you need help</p>
                </div>
            </div>
        </div>
    )
}
