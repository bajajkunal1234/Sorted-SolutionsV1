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
            
            // Create default high-importance notification channels for Android so that alerts play sound and display heads-up banners.
            // We first delete the channels to reset any previous silent configuration, and then create them with max importance.
            try {
                await PushNotifications.deleteChannel({ id: 'default' });
            } catch (e) {
                console.warn('[Native Push] Failed to delete default channel:', e);
            }
            try {
                await PushNotifications.deleteChannel({ id: 'jobs' });
            } catch (e) {
                console.warn('[Native Push] Failed to delete jobs channel:', e);
            }

            await PushNotifications.createChannel({
                id: 'default',
                name: 'Default Channel',
                description: 'General notifications',
                importance: 5, // Max importance (heads-up banner with sound)
                visibility: 1, // Public visibility
                vibration: true,
            });

            await PushNotifications.createChannel({
                id: 'jobs',
                name: 'Jobs & Alerts',
                description: 'Notifications for jobs, bookings, and updates',
                importance: 5, // Max importance (heads-up banner with sound)
                visibility: 1, // Public visibility
                vibration: true,
            });

            // Register channels for each of the 5 custom sounds
            const customSounds = [
                { id: 'alerta_breaking_bad', name: 'Alerta Breaking Bad', file: 'alerta_breaking_bad' },
                { id: 'complete', name: 'Complete Chime', file: 'complete' },
                { id: 'lg_woodpecker', name: 'Woodpecker Alert', file: 'lg_woodpecker' },
                { id: 'milomilo', name: 'Milo Milo Ring', file: 'milomilo' },
                { id: 'money', name: 'Cash Register Money', file: 'money' }
            ];

            for (const sound of customSounds) {
                try {
                    await PushNotifications.deleteChannel({ id: sound.id });
                } catch (e) {}
                try {
                    await PushNotifications.createChannel({
                        id: sound.id,
                        name: sound.name,
                        description: `Custom notification channel playing ${sound.name}`,
                        sound: sound.file, // references the embedded file in res/raw (no extension needed)
                        importance: 5,     // Max importance (heads-up banner with sound)
                        visibility: 1,
                        vibration: true
                    });
                } catch (err) {
                    console.warn(`[Native Push] Failed to create channel for ${sound.id}:`, err);
                }
            }
            
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
