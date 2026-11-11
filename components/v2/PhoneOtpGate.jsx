'use client';

import { useState, useRef, useEffect } from 'react';
import { Phone, ShieldCheck, Loader2, CheckCircle2, RotateCcw } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

/**
 * Shared Firebase Phone OTP verification component used by /v2/checkout and /v2/customer.
 */
export default function PhoneOtpGate({
    phone = '',
    onPhoneChange,
    verifiedPhone = '',
    onVerified,
    onResetVerification,
    containerId = 'v2-recaptcha-box',
    autoCreateIfNew = false,
}) {
    const [step, setStep] = useState('phone'); // phone -> otp
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const verifierRef = useRef(null);

    const rawPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    const isVerified = verifiedPhone && rawPhone.length === 10 && verifiedPhone === rawPhone;

    useEffect(() => {
        return () => {
            try {
                verifierRef.current?.clear?.();
            } catch (_) {}
            verifierRef.current = null;
        };
    }, []);

    const setupRecaptcha = async () => {
        if (verifierRef.current) return verifierRef.current;
        const container = document.getElementById(containerId);
        if (!container) return null;
        container.innerHTML = '';
        const verifier = new RecaptchaVerifier(auth, containerId, {
            size: 'invisible',
            callback: () => setError(''),
            'expired-callback': () => {
                verifierRef.current = null;
                setError('Security check expired. Please tap Send OTP again.');
            },
        });
        await verifier.render();
        verifierRef.current = verifier;
        return verifier;
    };

    const handleSendOtp = async () => {
        setError('');
        if (rawPhone.length !== 10) {
            setError('Enter a valid 10-digit Indian mobile number.');
            return;
        }
        setLoading(true);
        try {
            let verifier = await setupRecaptcha();
            if (!verifier) throw new Error('Security verification could not initialize. Please retry.');
            const result = await signInWithPhoneNumber(auth, `+91${rawPhone}`, verifier);
            setConfirmationResult(result);
            setOtp(['', '', '', '', '', '']);
            setStep('otp');
        } catch (err) {
            try {
                verifierRef.current?.clear?.();
            } catch (_) {}
            verifierRef.current = null;
            if (err.code === 'auth/too-many-requests') {
                setError('Too many OTP attempts. Please wait a few minutes.');
            } else {
                setError(err.message || 'Unable to send OTP right now.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        if (value.length > 1) {
            const digits = value.replace(/\D/g, '').slice(0, 6).split('');
            const filled = ['', '', '', '', '', ''];
            digits.forEach((d, idx) => {
                filled[idx] = d;
            });
            setOtp(filled);
            return;
        }
        const next = [...otp];
        next[index] = value;
        setOtp(next);
        if (value && index < 5) {
            document.getElementById(`${containerId}-otp-${index + 1}`)?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`${containerId}-otp-${index - 1}`)?.focus();
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Enter all 6 digits of the SMS code.');
            return;
        }
        if (!confirmationResult) {
            setError('OTP session expired. Please request a new code.');
            setStep('phone');
            return;
        }

        setLoading(true);
        try {
            await confirmationResult.confirm(code);

            let lookup = null;
            try {
                const res = await fetch(`/api/auth/customer/lookup?phone=${encodeURIComponent(rawPhone)}`);
                const json = await res.json();
                if (json.success && json.customerId) {
                    lookup = {
                        id: json.customerId,
                        phone: rawPhone,
                        name: json.name || `Customer ${rawPhone.slice(-4)}`,
                        profile_complete: json.profile_complete ?? true,
                    };
                }
            } catch (_) {}

            if (!lookup && autoCreateIfNew) {
                try {
                    const simpleRes = await fetch('/api/customer/auth/simple', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phoneNumber: rawPhone }),
                    });
                    const simpleJson = await simpleRes.json();
                    if (simpleJson.success && simpleJson.customer?.id) {
                        lookup = {
                            id: simpleJson.customer.id,
                            phone: rawPhone,
                            name: simpleJson.customer.name || `Customer ${rawPhone.slice(-4)}`,
                            profile_complete: simpleJson.customer.profile_complete ?? false,
                        };
                    }
                } catch (_) {}
            }

            setStep('phone');
            onVerified?.(rawPhone, lookup);
        } catch (err) {
            if (err.code === 'auth/invalid-verification-code') {
                setError('Incorrect OTP code. Please check your SMS and try again.');
            } else {
                setError(err.message || 'Verification failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (isVerified) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#065f46' }}>
                    <CheckCircle2 size={17} />
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>
                        Verified: +91 {rawPhone}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        onResetVerification?.();
                        setStep('phone');
                    }}
                    style={{
                        border: 'none',
                        background: 'transparent',
                        color: '#065f46',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                    }}
                >
                    Change
                </button>
            </div>
        );
    }

    return (
        <div>
            <div id={containerId} />

            {step === 'phone' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <span
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                fontSize: 13.5,
                                fontWeight: 700,
                                color: '#64748b',
                            }}
                        >
                            +91
                        </span>
                        <input
                            type="tel"
                            inputMode="numeric"
                            className="v2-input"
                            style={{ paddingLeft: 44 }}
                            maxLength={10}
                            value={rawPhone}
                            onChange={(e) => {
                                setError('');
                                onPhoneChange?.(e.target.value.replace(/\D/g, '').slice(0, 10));
                            }}
                            placeholder="9876543210"
                        />
                    </div>
                    <button
                        type="button"
                        className="v2-secondary-btn"
                        disabled={loading || rawPhone.length !== 10}
                        onClick={handleSendOtp}
                        style={{
                            height: 42,
                            background: rawPhone.length === 10 ? '#6338f5' : '#f1f5f9',
                            color: rawPhone.length === 10 ? '#fff' : '#94a3b8',
                            borderColor: 'transparent',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {loading ? <Loader2 size={15} /> : <Phone size={14} />}
                        <span>{loading ? 'Sending...' : 'Verify OTP'}</span>
                    </button>
                </div>
            ) : (
                <div
                    style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                        <span style={{ color: '#334155', fontWeight: 600 }}>
                            Enter 6-digit OTP sent to +91 {rawPhone}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setStep('phone');
                                setError('');
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#6338f5',
                                fontWeight: 700,
                                cursor: 'pointer',
                                fontSize: 12,
                            }}
                        >
                            Edit
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        {otp.map((digit, idx) => (
                            <input
                                key={idx}
                                id={`${containerId}-otp-${idx}`}
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={digit}
                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                style={{
                                    width: 40,
                                    height: 44,
                                    textAlign: 'center',
                                    fontSize: 17,
                                    fontWeight: 700,
                                    borderRadius: 9,
                                    border: '1px solid #cbd5e1',
                                    background: '#fff',
                                    color: '#0f172a',
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            className="v2-primary-btn"
                            style={{ height: 40 }}
                            disabled={loading || otp.join('').length !== 6}
                            onClick={handleVerifyOtp}
                        >
                            {loading ? <Loader2 size={15} /> : <ShieldCheck size={15} />}
                            <span>{loading ? 'Verifying...' : 'Confirm OTP'}</span>
                        </button>
                        <button
                            type="button"
                            className="v2-secondary-btn"
                            disabled={loading}
                            onClick={handleSendOtp}
                            title="Resend OTP"
                        >
                            <RotateCcw size={14} />
                        </button>
                    </div>
                </div>
            )}

            {error && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: '#dc2626', fontWeight: 600 }}>
                    {error}
                </div>
            )}
        </div>
    );
}
