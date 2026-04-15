'use client';
/**
 * components/common/PWAPrompt.jsx
 *
 * Bottom-sheet prompt shown to Technician and Customer users asking them to:
 *   1. Allow push notifications
 *   2. Install the app to their home screen
 *
 * Design: slides up from bottom, dark glass-effect card, logo + text + action buttons.
 * Auto-dismissed after both actions are taken or the user explicitly dismisses.
 *
 * Props:
 *   appName       – displayed name, e.g. "Sorted Technician" / "Sorted App"
 *   appColor      – accent colour for the card, e.g. '#f59e0b' / '#3b82f6'
 *   iconUrl       – URL of the app icon (defaults to /icons/icon-192x192.png)
 *   userType      – 'technician' | 'customer'
 *   userId        – the logged-in user's ID (required for FCM token save)
 *   onDismiss     – callback when the user closes the prompt
 */

import { useState, useEffect, useCallback } from 'react';
import { Bell, Download, X, CheckCircle, Smartphone, Share } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client';

const STORAGE_KEY_DISMISSED = 'pwa_prompt_dismissed_v2'; // bump suffix to re-show after updates
const DISMISS_COOLDOWN_MS   = 7 * 24 * 60 * 60 * 1000;  // re-show after 7 days

export default function PWAPrompt({
    appName   = 'Sorted Solutions',
    appColor  = '#6366f1',
    iconUrl   = '/icons/icon-192x192.png',
    userType,
    userId,
    onDismiss,
}) {
    const [visible, setVisible]             = useState(false);
    const [step, setStep]                   = useState('main');   // 'main' | 'ios-install' | 'done'
    const [notifStatus, setNotifStatus]     = useState('idle');   // 'idle' | 'loading' | 'granted' | 'denied'
    const [installStatus, setInstallStatus] = useState('idle');   // 'idle' | 'loading' | 'installed' | 'dismissed'
    const [mounted, setMounted]             = useState(false);

    const { canInstall, triggerInstall, isInstalled, isIOS, hasNativePrompt } = usePWAInstall();

    // ── Decide whether to show ───────────────────────────────────────────────
    useEffect(() => {
        setMounted(true);
        if (typeof window === 'undefined') return;

        // Don't show if already dismissed recently
        const dismissedAt = parseInt(localStorage.getItem(STORAGE_KEY_DISMISSED) || '0', 10);
        if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

        // Don't show if already installed as PWA
        const standalone = window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches;

        // Show if notification permission isn't granted OR app isn't installed
        const notifAlreadyGranted = 'Notification' in window && Notification.permission === 'granted';
        const needToShow = !notifAlreadyGranted || (!standalone && canInstall);

        if (needToShow) {
            // Small delay so the app UI loads first
            const t = setTimeout(() => setVisible(true), 2500);
            return () => clearTimeout(t);
        }

        // Auto-mark notif as already granted
        if (notifAlreadyGranted) setNotifStatus('granted');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-evaluate when canInstall resolves
    useEffect(() => {
        if (!mounted) return;
        const dismissedAt = parseInt(localStorage.getItem(STORAGE_KEY_DISMISSED) || '0', 10);
        if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) return;

        const notifAlreadyGranted = typeof Notification !== 'undefined' && Notification.permission === 'granted';
        if (notifAlreadyGranted) setNotifStatus('granted');

        if (canInstall && !isInstalled && !visible) {
            const t = setTimeout(() => setVisible(true), 2500);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canInstall, mounted]);

    const dismiss = useCallback((permanent = false) => {
        setVisible(false);
        if (permanent) {
            localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now()));
        }
        onDismiss?.();
    }, [onDismiss]);

    // ── Actions ──────────────────────────────────────────────────────────────
    const handleEnableNotifications = useCallback(async () => {
        if (!('Notification' in window)) {
            setNotifStatus('denied');
            return;
        }
        setNotifStatus('loading');
        try {
            const token = await requestNotificationPermission();
            if (token && userType && userId) {
                await saveFCMTokenToServer(token, userType, userId);
                setNotifStatus('granted');
            } else if (Notification.permission === 'denied') {
                setNotifStatus('denied');
            } else {
                setNotifStatus('granted'); // permission granted, no token (safari limited)
            }
        } catch {
            setNotifStatus('denied');
        }
    }, [userType, userId]);

    const handleInstall = useCallback(async () => {
        if (isIOS && !hasNativePrompt) {
            setStep('ios-install');
            return;
        }
        setInstallStatus('loading');
        const accepted = await triggerInstall();
        setInstallStatus(accepted ? 'installed' : 'dismissed');
    }, [isIOS, hasNativePrompt, triggerInstall]);

    // Auto-close when both done
    useEffect(() => {
        const notifDone  = notifStatus === 'granted' || notifStatus === 'denied';
        const installDone = installStatus === 'installed' || installStatus === 'dismissed' || isInstalled;
        const canInstallRelevant = canInstall && !isInstalled;

        if (notifDone && (!canInstallRelevant || installDone)) {
            const t = setTimeout(() => { setStep('done'); setTimeout(() => dismiss(true), 1200); }, 700);
            return () => clearTimeout(t);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [notifStatus, installStatus, isInstalled, canInstall]);

    if (!mounted || !visible) return null;

    const notifGranted  = notifStatus === 'granted';
    const notifDenied   = notifStatus === 'denied';
    const installDone   = installStatus === 'installed' || isInstalled;

    // ── iOS manual install instructions ─────────────────────────────────────
    if (step === 'ios-install') {
        return (
            <BottomSheet appColor={appColor} onClose={() => { setStep('main'); dismiss(false); }}>
                <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
                    <Share size={36} style={{ color: appColor, marginBottom: '12px' }} />
                    <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 700 }}>
                        Add to Home Screen
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        To install this app on your iPhone:
                    </p>
                    <ol style={{ textAlign: 'left', padding: '0 8px', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            { num: '1', text: 'Tap the Share button', icon: '⎙', sub: 'at the bottom of Safari' },
                            { num: '2', text: 'Scroll down and tap', icon: '➕', sub: '"Add to Home Screen"' },
                            { num: '3', text: 'Tap "Add"', icon: '✓',  sub: 'in the top-right corner' },
                        ].map(item => (
                            <li key={item.num} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                <span style={{ fontSize: '22px', width: '32px', textAlign: 'center' }}>{item.icon}</span>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.text}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.sub}</div>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <button
                        onClick={() => { setStep('main'); dismiss(false); }}
                        style={{ marginTop: '20px', width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: appColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        Got it!
                    </button>
                </div>
            </BottomSheet>
        );
    }

    // ── Done animation ───────────────────────────────────────────────────────
    if (step === 'done') {
        return (
            <BottomSheet appColor={appColor} onClose={() => dismiss(true)}>
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '12px' }} />
                    <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>You're all set!</h3>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                        You'll receive updates directly on your device.
                    </p>
                </div>
            </BottomSheet>
        );
    }

    // ── Main prompt ──────────────────────────────────────────────────────────
    return (
        <BottomSheet appColor={appColor} onClose={() => dismiss(false)}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <img
                    src={iconUrl}
                    alt={appName}
                    style={{ width: '56px', height: '56px', borderRadius: '14px', boxShadow: `0 4px 16px ${appColor}40` }}
                    onError={e => { e.target.style.display = 'none'; }}
                />
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: appColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                        Setup Required
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>
                        {appName}
                    </h3>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Enable to receive real-time updates
                    </p>
                </div>
            </div>

            {/* Action cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>

                {/* Notification permission */}
                <ActionCard
                    icon={<Bell size={20} />}
                    color={notifGranted ? '#10b981' : appColor}
                    title="Push Notifications"
                    subtitle={
                        notifGranted  ? 'Notifications enabled ✓' :
                        notifDenied   ? 'Blocked — enable in browser settings' :
                        'Get job updates, alerts and reminders'
                    }
                    isDone={notifGranted}
                    isDenied={notifDenied}
                    loading={notifStatus === 'loading'}
                    buttonLabel={notifGranted ? 'Enabled' : notifDenied ? 'Blocked' : 'Enable'}
                    onAction={notifGranted || notifDenied ? null : handleEnableNotifications}
                />

                {/* Install to home screen */}
                {(canInstall && !isInstalled) && (
                    <ActionCard
                        icon={isIOS ? <Share size={20} /> : <Download size={20} />}
                        color={installDone ? '#10b981' : appColor}
                        title="Add to Home Screen"
                        subtitle={
                            installDone ? 'App installed ✓' :
                            isIOS ? 'Tap Share → "Add to Home Screen"' :
                            'Install for faster access without the browser'
                        }
                        isDone={installDone}
                        isDenied={false}
                        loading={installStatus === 'loading'}
                        buttonLabel={installDone ? 'Installed' : isIOS ? 'Instructions' : 'Install'}
                        onAction={installDone ? null : handleInstall}
                    />
                )}
            </div>

            {/* Footer */}
            <button
                onClick={() => dismiss(true)}
                style={{
                    width: '100%', padding: '13px', borderRadius: '12px', border: '1px solid var(--border-primary)',
                    backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '14px',
                    cursor: 'pointer', fontWeight: 500,
                }}
            >
                Maybe later
            </button>
        </BottomSheet>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BottomSheet({ children, appColor, onClose }) {
    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
                    zIndex: 9998, backdropFilter: 'blur(4px)',
                    animation: 'fadeIn 0.25s ease',
                }}
            />

            {/* Sheet */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: '20px 20px 0 0',
                padding: '8px 20px 28px',
                zIndex: 9999,
                boxShadow: `0 -8px 40px rgba(0,0,0,0.35), 0 0 0 1px var(--border-primary)`,
                animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                maxWidth: '480px',
                margin: '0 auto',
            }}>
                {/* Drag handle */}
                <div style={{
                    width: '40px', height: '4px', borderRadius: '2px',
                    backgroundColor: 'var(--border-primary)',
                    margin: '8px auto 20px', flexShrink: 0,
                }} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '16px', right: '16px',
                        width: '30px', height: '30px', borderRadius: '50%',
                        border: 'none', backgroundColor: 'var(--bg-secondary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                    }}
                >
                    <X size={16} />
                </button>

                {children}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>
        </>
    );
}

function ActionCard({ icon, color, title, subtitle, isDone, isDenied, loading, buttonLabel, onAction }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px',
            backgroundColor: isDone ? 'rgba(16,185,129,0.06)' : 'var(--bg-secondary)',
            borderRadius: '14px',
            border: `1px solid ${isDone ? '#10b98130' : isDenied ? '#ef444430' : 'var(--border-primary)'}`,
            transition: 'all 0.2s ease',
        }}>
            {/* Icon */}
            <div style={{
                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: isDone ? '#10b98115' : `${color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isDone ? '#10b981' : isDenied ? '#ef4444' : color,
            }}>
                {isDone ? <CheckCircle size={20} /> : icon}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{title}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{subtitle}</div>
            </div>

            {/* CTA */}
            {onAction && (
                <button
                    onClick={onAction}
                    disabled={loading}
                    style={{
                        padding: '8px 16px', borderRadius: '10px', border: 'none',
                        backgroundColor: color, color: 'white',
                        fontSize: '13px', fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                        flexShrink: 0, opacity: loading ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {loading ? '...' : buttonLabel}
                </button>
            )}

            {!onAction && (
                <div style={{
                    padding: '6px 12px', borderRadius: '10px',
                    backgroundColor: isDone ? '#10b98120' : isDenied ? '#ef444420' : 'var(--bg-tertiary)',
                    color: isDone ? '#10b981' : isDenied ? '#ef4444' : 'var(--text-tertiary)',
                    fontSize: '12px', fontWeight: 600, flexShrink: 0,
                }}>
                    {buttonLabel}
                </div>
            )}
        </div>
    );
}
