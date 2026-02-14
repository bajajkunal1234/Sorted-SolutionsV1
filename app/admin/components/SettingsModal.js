'use client'

import { X, Moon, Sun, User, Lock, Image as ImageIcon } from 'lucide-react';

function SettingsModal({ isOpen, onClose, darkMode, setDarkMode }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                width: '90%',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflow: 'auto',
                boxShadow: 'var(--shadow-xl)'
            }}>
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-md)',
                    borderBottom: '1px solid var(--border-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, margin: 0 }}>
                        Settings
                    </h2>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: 'var(--spacing-md)' }}>
                    {/* Dark Mode */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                        Dark Mode
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                        Toggle dark theme
                                    </div>
                                </div>
                            </div>
                            <button
                                className="btn-icon"
                                onClick={() => setDarkMode(!darkMode)}
                                style={{
                                    backgroundColor: darkMode ? 'var(--color-primary)' : 'var(--bg-tertiary)',
                                    color: darkMode ? 'var(--text-inverse)' : 'var(--text-primary)'
                                }}
                            >
                                {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Admin Profile Image */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                            <User size={20} />
                            <div>
                                <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                    Profile Image
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    Update your profile picture
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-inverse)',
                                fontSize: 'var(--font-size-xl)',
                                fontWeight: 600
                            }}>
                                A
                            </div>
                            <button className="btn btn-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                <ImageIcon size={16} />
                                Change Image
                            </button>
                        </div>
                    </div>

                    {/* Change Password */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--spacing-md)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                            <Lock size={20} />
                            <div>
                                <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                    Change Password
                                </div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                    Update your account password
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Current Password"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                placeholder="New Password"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            <input
                                type="password"
                                className="form-input"
                                placeholder="Confirm New Password"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                            />
                            <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-sm)' }}>
                                Update Password
                            </button>
                        </div>
                    </div>

                    {/* App Info */}
                    <div style={{
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                            Sorted Solutions Admin App
                        </div>
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                            Version 1.0.0
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SettingsModal;
