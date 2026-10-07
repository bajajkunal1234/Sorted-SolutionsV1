'use client'

import React, { Component } from 'react'
import TechnicianApp from '@/components/technician/TechnicianApp'
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react'

class DashboardErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[Dashboard Error Boundary Caught]:', error, errorInfo)
    }

    handleClearAndLogin = () => {
        try {
            localStorage.removeItem('technicianSession')
            localStorage.removeItem('technicianData')
            sessionStorage.removeItem('technicianSession')
            sessionStorage.removeItem('technicianData')
            if (localStorage.getItem('isAdmin') !== 'true') {
                localStorage.removeItem('user_session')
                sessionStorage.removeItem('user_session')
            }
        } catch (e) {}
        window.location.href = '/login'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    padding: '24px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <AlertCircle size={36} color="#ef4444" />
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
                        Technician Portal Error
                    </h2>

                    <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 20px', maxWidth: '320px', lineHeight: 1.5 }}>
                        An unexpected issue occurred while rendering the dashboard.
                    </p>

                    {this.state.error?.message && (
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            padding: '12px 14px',
                            fontSize: '12px',
                            color: '#fca5a5',
                            maxWidth: '360px',
                            wordBreak: 'break-word',
                            marginBottom: '24px',
                            fontFamily: 'monospace',
                            textAlign: 'left'
                        }}>
                            {this.state.error.message}
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '10px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '14px',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <RefreshCw size={16} /> Reload App
                        </button>

                        <button
                            onClick={this.handleClearAndLogin}
                            style={{
                                padding: '12px 20px',
                                borderRadius: '10px',
                                backgroundColor: 'transparent',
                                color: '#94a3b8',
                                fontWeight: 500,
                                fontSize: '13px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <LogOut size={16} /> Clear Session & Re-login
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default function TechnicianDashboard() {
    return (
        <DashboardErrorBoundary>
            <TechnicianApp />
        </DashboardErrorBoundary>
    )
}
