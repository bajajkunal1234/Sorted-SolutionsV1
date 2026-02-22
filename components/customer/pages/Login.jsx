'use client'

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LogIn, Mail, Lock } from 'lucide-react'

function Login() {
    const [isSignup, setIsSignup] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (isSignup) {
                // Sign up
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            phone,
                        },
                    },
                })

                if (error) throw error

                // Create customer record
                if (data.user) {
                    const { error: customerError } = await supabase
                        .from('customers')
                        .insert([
                            {
                                user_id: data.user.id,
                                customer_type: 'one_time',
                            },
                        ])

                    if (customerError) console.error('Error creating customer:', customerError)
                }

                alert('Account created! Please check your email to verify.')
            } else {
                // Sign in
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })

                if (error) throw error
            }
        } catch (error) {
            setError(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                padding: 'var(--spacing-lg)',
            }}
        >
            <div
                className="card"
                style={{
                    maxWidth: '400px',
                    width: '100%',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div
                        style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                            borderRadius: 'var(--radius-xl)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto var(--spacing-md)',
                        }}
                    >
                        <LogIn size={32} color="white" />
                    </div>
                    <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>
                        {isSignup ? 'Create Account' : 'Welcome Back'}
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', margin: 0 }}>
                        {isSignup ? 'Sign up for House Doctor' : 'Sign in to your account'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    {isSignup && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    placeholder="Enter your name"
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    placeholder="Enter your phone number"
                                />
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            <Mail size={16} style={{ display: 'inline', marginRight: '4px' }} />
                            Email
                        </label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Lock size={16} style={{ display: 'inline', marginRight: '4px' }} />
                            Password
                        </label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            minLength={6}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                padding: 'var(--spacing-sm)',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: 'var(--color-danger)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                marginBottom: 'var(--spacing-md)',
                            }}
                        >
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <button
                        onClick={() => {
                            setIsSignup(!isSignup)
                            setError('')
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-primary)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-sm)',
                        }}
                    >
                        {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login




