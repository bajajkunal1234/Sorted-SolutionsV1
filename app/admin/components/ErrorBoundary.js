'use client'

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary caught error]:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.handleReset);
            }
            return (
                <div style={{
                    padding: '24px',
                    margin: '16px auto',
                    maxWidth: '540px',
                    borderRadius: '14px',
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    color: '#f8fafc',
                    textAlign: 'center',
                    zIndex: 10001,
                    position: 'relative'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 14px'
                    }}>
                        <AlertTriangle size={26} color="#ef4444" />
                    </div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700, color: '#f8fafc' }}>
                        Notice: Component Error
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 18px', lineHeight: '1.5' }}>
                        {this.state.error?.message || 'An unexpected client error occurred.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            type="button"
                            onClick={this.handleReset}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '9px 18px',
                                backgroundColor: '#6366f1',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 600,
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            <RefreshCw size={14} />
                            <span>Dismiss / Retry</span>
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}