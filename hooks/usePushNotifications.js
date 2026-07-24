/**
 * hooks/usePushNotifications.js
 *
 * Requests notification permission and registers FCM token.
 * Handles both Native (Android/iOS Capacitor) and Web (Browser/PWA) platforms.
 */

import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, saveFCMTokenToServer } from '@/lib/firebase-client';

function playNotificationChime() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Osc 1 (Higher chime)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
        
        // Osc 2 (Lower bell tone, delayed)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, audioCtx.currentTime + 0.08); // E6
        gain2.gain.setValueAtTime(0, audioCtx.currentTime);
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
        
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.4);
        
        osc2.start(audioCtx.currentTime + 0.08);
        osc2.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
        console.warn('Notification chime failed to play:', e);
    }
}

export function usePushNotifications({ userType, userId }) {
    const [needsPrompt, setNeedsPrompt] = useState(false);
    const [prompted, setPrompted] = useState(false);

    // Detect if we're in standalone (PWA home-screen) mode on iOS
    const isIOSStandalone =
        typeof window !== 'undefined' &&
        (window.navigator.standalone === true ||
            window.matchMedia('(display-mode: standalone)').matches);

    const isIOS =
        typeof navigator !== 'undefined' &&
        /iphone|ipad|ipod/i.test(navigator.userAgent);

    const isNative =
        typeof window !== 'undefined' &&
        !!window.Capacitor;

    const registerWebPush = useCallback(async () => {
        if (typeof window === 'undefined') return;
        if (!('Notification' in window)) {
            console.warn('[Push] Notification API not supported (Chrome on iOS?)');
            return;
        }
        if (!userType || !userId) return;

        try {
            setPrompted(true);
            const token = await requestNotificationPermission();
            if (token) {
                await saveFCMTokenToServer(token, userType, userId);
                console.log(`[Push] Web Token registered for ${userType}:${userId}`);
                setNeedsPrompt(false);
            }
        } catch (err) {
            console.warn('[Push] Web Token registration failed:', err.message);
        }
    }, [userType, userId]);

    const registerNativePush = useCallback(async () => {
        if (!userType || !userId) return;
        try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            // Check current native permissions
            let permStatus = await PushNotifications.checkPermissions();
            
            if (permStatus.receive === 'prompt') {
                permStatus = await PushNotifications.requestPermissions();
            }
            
            if (permStatus.receive !== 'granted') {
                console.warn('[Native Push] Permission denied by user');
                return;
            }
            
            // Notification channels (default & custom sounds) are now fully managed in Android native Java (MainActivity.java)
            // on app launch to ensure proper raw resource linking and prevent channel-muting bugs.
            
            // Listen for native registration success
            await PushNotifications.addListener('registration', async (token) => {
                console.log('[Native Push] Registration token obtained:', token.value.substring(0, 20) + '...');
                if (token.value) {
                    await saveFCMTokenToServer(token.value, userType, userId);
                }
            });
            
            // Listen for native registration error
            await PushNotifications.addListener('registrationError', (error) => {
                console.error('[Native Push] Registration error:', error);
            });
            
            // Listen for received notification (foreground)
            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('[Native Push] Notification received in foreground:', notification);
                playNotificationChime();
            });
            
            // Register app with FCM natively
            await PushNotifications.register();
            
        } catch (err) {
            console.error('[Native Push] Setup failed:', err);
        }
    }, [userType, userId]);

    const handlePrompt = useCallback(() => {
        if (isNative) {
            registerNativePush();
        } else {
            registerWebPush();
        }
    }, [isNative, registerNativePush, registerWebPush]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!userType || !userId) return;

        if (isNative) {
            // Native platform (Android/iOS APK) - always safe to initialize native push flow
            registerNativePush();
        } else {
            // Web platform (Desktop/Mobile Web browser)
            if (!('Notification' in window)) return;
            const permission = Notification.permission;

            if (permission === 'granted') {
                registerWebPush();
            } else if (permission === 'denied') {
                console.warn('[Push] Web permission previously denied by user');
            } else {
                if (isIOS) {
                    setNeedsPrompt(true);
                } else {
                    registerWebPush();
                }
            }
        }
    }, [userType, userId, isNative, registerNativePush, registerWebPush, isIOS]);

    return {
        needsPrompt: needsPrompt && !prompted,
        promptNow: handlePrompt,
        isIOSStandalone,
        isIOS,
    };
}
