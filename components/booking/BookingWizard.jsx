'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, Phone, MapPin, Building, User, AlertCircle, CheckCircle } from 'lucide-react';
import BookingSteps from './BookingSteps';
import LocalityCombobox from '@/components/common/LocalityCombobox';
import { getPincodeForLocality, getLocalityForPincode } from '@/lib/data/mumbaiLocalities';
import { auth } from '@/lib/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import './BookingWizard.css';

// ─── OtpBoxes Component ────────────────────────────────────────────────────────
function OtpBoxes({ otp, onChange, onKeyDown }) {
    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {otp.map((digit, idx) => (
                <input
                    key={idx}
                    id={`wizard-otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={e => onChange(idx, e.target.value)}
                    onKeyDown={e => onKeyDown(idx, e)}
                    style={{
                        width: '45px', height: '52px', textAlign: 'center', fontSize: '20px',
                        fontWeight: 700, backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-primary)', borderRadius: '10px',
                        color: 'var(--text-primary)', outline: 'none'
                    }}
                    autoFocus={idx === 0}
                />
            ))}
        </div>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function saveSession(user) {
    // Save session similar to login page so they are logged in seamlessly
    const session = JSON.stringify({ ...user, token: 'sorted-auth-v2' });
    localStorage.setItem('user_session', session);
    localStorage.setItem('customerData', session);
    localStorage.setItem('customerId', user.id);
}

export default function BookingWizard() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState('location'); // location -> logistics -> otp
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const wizardRef = useRef(null);

    const [metadata, setMetadata] = useState({ categories: [], subcategories: [], issues: [] });
    const [brands, setBrands] = useState([]);
    const [availableSlots, setAvailableSlots] = useState({});
    const [slotTab, setSlotTab] = useState('');

    const [formData, setFormData] = useState({
        category: '', subcategory: '', issue: '',
        brand: '', brandName: '',
        pincode: '', locality: '', city: 'Mumbai', state: 'Maharashtra',
        name: '', phone: '', email: '',
        flat_number: '', building_name: '', address: '',
        slotDate: '', slotTime: ''
    });

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [confirmationResult, setConfirmationResult] = useState(null);
    const recaptchaInitRef = useRef(false);
    const recaptchaVerifierRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const [bookingRes, brandsRes, slotsRes] = await Promise.all([
                    fetch('/api/settings/quick-booking'),
                    fetch('/api/settings/booking-brands'),
                    fetch('/api/booking/available-slots?days=3')
                ]);
                const [bookingData, brandsData, slotsData] = await Promise.all([
                    bookingRes.json(), brandsRes.json(), slotsRes.json()
                ]);

                if (slotsData.success) {
                    setAvailableSlots(slotsData.data);
                    const dates = Object.keys(slotsData.data);
                    if (dates.length > 0) setSlotTab(dates[0]);
                }

                if (bookingData.success) {
                    const cats = bookingData.data.categories || [];
                    const subs = cats.flatMap(c => c.subcategories || []);
                    const issues = subs.flatMap(s => s.issues || []);
                    setMetadata({ categories: cats, subcategories: subs, issues });
                }
                if (brandsData.success) setBrands((brandsData.data || []).filter(b => b.is_active));

                // Pre-fill from URL params
                const categoryId = searchParams.get('category');
                const subcategoryId = searchParams.get('subcategory');
                const issueId = searchParams.get('issue');
                const urlLocality = searchParams.get('locality') || '';
                const urlPincode = searchParams.get('pincode') || getPincodeForLocality(urlLocality);
                const brandId = searchParams.get('brand');
                const brandName = searchParams.get('brandName');
                
                if (categoryId) {
                    setFormData(prev => ({
                        ...prev,
                        category: categoryId,
                        subcategory: subcategoryId || '',
                        issue: issueId || '',
                        locality: urlLocality,
                        pincode: urlPincode,
                        brand: brandId || '',
                        brandName: brandName || '',
                    }));
                } else {
                    router.push('/');
                    return;
                }
            } catch (err) {
                console.error('Failed to initialize booking wizard', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [searchParams, router]);

    const getName = (type, id) => {
        if (!id) return '—';
        const list = type === 'appliance' ? metadata.categories
            : type === 'type' ? metadata.subcategories
                : metadata.issues;
        const found = list.find(item => item.id?.toString() === id?.toString());
        return found ? found.name : 'Selected';
    };

    const scrollTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const initRecaptcha = async () => {
        if (recaptchaInitRef.current && window.recaptchaVerifier) return window.recaptchaVerifier;
        try {
            recaptchaInitRef.current = true;
            const container = document.getElementById('wizard-recaptcha-container');
            if (!container) { recaptchaInitRef.current = false; return null; }
            container.innerHTML = '';
            const verifier = new RecaptchaVerifier(auth, 'wizard-recaptcha-container', {
                size: 'invisible',
                callback: () => setError(''),
                'expired-callback': () => { setError('Security check expired. Please try again.'); recaptchaInitRef.current = false; }
            });
            await verifier.render();
            window.recaptchaVerifier = verifier;
            recaptchaVerifierRef.current = verifier;
            return verifier;
        } catch (e) {
            recaptchaInitRef.current = false;
            return null;
        }
    };

    const sendOtp = async () => {
        setError('');
        if (!formData.phone || formData.phone.replace(/\D/g, '').length !== 10) {
            setError('Enter a valid 10-digit mobile number.');
            return false;
        }
        setSubmitting(true);
        try {
            let verifier = recaptchaVerifierRef.current || window.recaptchaVerifier;
            if (!verifier) verifier = await initRecaptcha();
            if (!verifier) throw new Error('Security check failed. Please refresh.');
            
            const rawPhone = formData.phone.replace(/\D/g, '').slice(-10);
            const result = await signInWithPhoneNumber(auth, `+91${rawPhone}`, verifier);
            setConfirmationResult(result);
            setOtp(['', '', '', '', '', '']);
            return true;
        } catch (err) {
            if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please wait a while.');
            else setError(err.message || 'Failed to send OTP. Please try again.');
            recaptchaInitRef.current = false;
            return false;
        } finally {
            setSubmitting(false);
        }
    };

    // ── Navigation Logic ──
    const handleLocationNext = async () => {
        if (!formData.phone || formData.phone.replace(/\D/g, '').length !== 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }
        if (!formData.locality) {
            setError('Please enter your locality or pincode.');
            return;
        }
        setError('');

        // NEW: Capture Enquiry in background
        if (!formData.enquiryId) {
            try {
                const categoryName = getName('appliance', formData.category);
                const subcategoryName = getName('type', formData.subcategory);
                const issueName = Array.isArray(formData.issue) ? formData.issue.join(', ') : getName('issue', formData.issue);
                const resolvedBrandName = formData.brandName || brands.find(b => String(b.id) === String(formData.brand))?.name || '';
                
                const payload = {
                    categoryId: formData.category, categoryName,
                    subcategoryId: formData.subcategory, subcategoryName,
                    issueId: formData.issue, issueName,
                    brand: formData.brand, brandName: resolvedBrandName,
                    pincode: formData.pincode,
                    locality: formData.locality,
                    phone: formData.phone.replace(/\D/g, '').slice(-10)
                };
                
                // Do not await to avoid blocking the UI
                fetch('/api/booking/enquiry', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                }).then(res => res.json()).then(data => {
                    if (data.success && data.enquiryId) {
                        setFormData(prev => ({ ...prev, enquiryId: data.enquiryId }));
                    }
                }).catch(e => console.error('Enquiry capture failed:', e));
            } catch (e) {
                console.error('Failed to prepare enquiry payload:', e);
            }
        }

        scrollTop();
        setCurrentStep('logistics');
    };

    const handleLogisticsNext = async () => {
        if (!formData.slotDate || !formData.slotTime) { setError('Please select an available time slot.'); return; }
        if (!formData.name?.trim()) { setError('Please enter your full name.'); return; }
        if (!formData.building_name?.trim()) { setError('Please enter your building name.'); return; }
        if (!formData.address?.trim()) { setError('Please enter your street/landmark address.'); return; }
        
        setError('');
        const sent = await sendOtp();
        if (sent) {
            scrollTop();
            setCurrentStep('otp');
        }
    };

    // ── OTP Handling ──
    const handleOtpChange = (idx, val) => {
        if (!/^\d*$/.test(val)) return;
        const updated = [...otp]; updated[idx] = val.slice(-1); setOtp(updated);
        if (val && idx < 5) document.getElementById(`wizard-otp-${idx + 1}`)?.focus();
    };

    const handleOtpKeyDown = (idx, e) => {
        if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`wizard-otp-${idx - 1}`)?.focus();
    };

    const handleConfirmBooking = async () => {
        setError('');
        if (!confirmationResult) { setError('Session expired. Please request OTP again.'); return; }
        
        const code = otp.join('');
        if (code.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
        
        setSubmitting(true);
        try {
            // 1. Verify OTP with Firebase
            await confirmationResult.confirm(code);
            
            // 2. We need to grab or create the customer. We can securely let our own API handle it via phone lookup.
            // Our /api/booking expects customer details and will auto-create the account/customer rows!
            const categoryName = getName('appliance', formData.category);
            const subcategoryName = getName('type', formData.subcategory);
            const issueName = Array.isArray(formData.issue) ? formData.issue.join(', ') : getName('issue', formData.issue);
            const resolvedBrandName = formData.brandName || brands.find(b => String(b.id) === String(formData.brand))?.name || '';
            const nameParts = (formData.name || '').trim().split(' ');
            const rawPhone = formData.phone.replace(/\D/g, '').slice(-10);

            const payload = {
                enquiryId: formData.enquiryId,
                categoryId: formData.category, categoryName,
                subcategoryId: formData.subcategory, subcategoryName,
                issueId: formData.issue, issueName,
                brand: formData.brand, brandName: resolvedBrandName,
                pincode: formData.pincode,
                customer: {
                    firstName: nameParts[0] || '',
                    lastName: nameParts.slice(1).join(' ') || '',
                    name: formData.name,
                    phone: rawPhone,
                    address: {
                        flat_number: formData.flat_number,
                        building_name: formData.building_name,
                        street: formData.address,
                        locality: formData.locality,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                    }
                },
                schedule: {
                    date: formData.slotDate,
                    slot: formData.slotTime
                }
            };

            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to complete booking');

            // 3. Log user into customer app natively so they bypass login screen next time
            // The /api/booking endpoint returns the newly created or found customerAuthId
            if (result.customerAuthId || result.customerId) {
                saveSession({
                    id: result.customerAuthId || result.customerId,
                    role: 'customer',
                    phone: rawPhone,
                    name: formData.name,
                    // profile_complete: false tells the OnboardingWizard to prompt
                    // the customer to set a password on their first dashboard visit.
                    profile_complete: false,
                });
            }

            // 4. GTM tracking
            if (typeof window !== 'undefined') {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: 'form_submit_success' });
            }

            // Redirect to customer dashboard with the booking success flash!
            router.push(`/customer/dashboard?newBooking=${result.bookingId || result.bookingNumber || 'success'}`);

        } catch (err) {
            console.error('Booking failed:', err);
            setError(err.message || 'Incorrect OTP or failed to submit booking. Please try again.');
            setSubmitting(false); // only reset on error
        }
    };


    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader2 className="animate-spin" color="var(--color-primary)" size={40} />
            </div>
        );
    }

    return (
        <div ref={wizardRef} className="booking-wizard-container animate-slide-in">
            <div id="wizard-recaptcha-container"></div>
            
            <div className="booking-card">
                <div className="booking-header">
                    <BookingSteps currentStep={currentStep} />
                </div>

                <div className="booking-body">
                    {error && (
                        <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {/* ── STAGE 1: LEAD CAPTURE ── */}
                    {currentStep === 'location' && (
                        <div className="step-content">
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ marginBottom: '8px' }}>Let's check Technician Availability</h2>
                                <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xl)' }}>
                                    Enter your area details to lock in a same-day slot.
                                </p>
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <label className="form-label">Mobile Number *</label>
                                <div style={{ position: 'relative' }}>
                                    <Phone size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <span style={{ position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', fontSize: 15 }}>+91</span>
                                    <input
                                        type="tel"
                                        placeholder="Enter your 10-digit number"
                                        className="form-input"
                                        value={formData.phone}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setFormData(prev => ({ ...prev, phone: val }));
                                        }}
                                        onBlur={() => {
                                            const raw = formData.phone || '';
                                            let digits = raw.replace(/\D/g, '');
                                            if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
                                            else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
                                            
                                            if (digits.length === 10) {
                                                setFormData(prev => ({ ...prev, phone: `${digits.slice(0, 5)} ${digits.slice(5)}` }));
                                            }
                                        }}
                                        style={{ paddingLeft: '74px', fontSize: '16px', fontWeight: 600 }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 'var(--spacing-xl)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label className="form-label">Pincode</label>
                                        <div style={{ position: 'relative' }}>
                                            <MapPin size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', zIndex: 10 }} />
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. 400053"
                                                value={formData.pincode}
                                            onChange={(e) => {
                                                const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setFormData(prev => {
                                                    const newState = { ...prev, pincode: pin };
                                                    if (pin.length === 6 && !prev.locality) {
                                                        const matchedLocality = getLocalityForPincode(pin);
                                                        if (matchedLocality) {
                                                            newState.locality = matchedLocality;
                                                        }
                                                    }
                                                    return newState;
                                                });
                                            }}
                                            style={{ paddingLeft: '44px' }}
                                        />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '14px', fontWeight: 600 }}>OR</div>
                                    <div>
                                        <label className="form-label">Locality</label>
                                        <div style={{ position: 'relative' }}>
                                            <LocalityCombobox
                                            value={formData.locality}
                                            pincode={formData.pincode}
                                            showPincode={false}
                                            onChange={(loc, pin) => setFormData(prev => ({
                                                ...prev,
                                                locality: loc,
                                                pincode: pin || prev.pincode,
                                            }))}
                                            inputClassName="form-input"
                                            dropdownZIndex={1100}
                                        />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── STAGE 2: LOGISTICS ── */}
                    {currentStep === 'logistics' && (
                        <div className="step-content">
                            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                                <h2 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    Technician Available Today! <span className="animate-tick" style={{ display: 'flex' }}><CheckCircle size={28} /></span>
                                </h2>

                                {/* Slot Selector UI */}
                                <div style={{ margin: '20px 0' }}>
                                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                                        {Object.keys(availableSlots).map(dateStr => {
                                            const d = new Date(dateStr);
                                            const today = new Date();
                                            const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                                            const isToday = d.toDateString() === today.toDateString();
                                            const isTomorrow = d.toDateString() === tomorrow.toDateString();
                                            const label = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                            
                                            return (
                                                <button
                                                    key={dateStr}
                                                    onClick={() => { setSlotTab(dateStr); setFormData({ ...formData, slotDate: dateStr, slotTime: '' }); }}
                                                    style={{
                                                        padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                                                        border: slotTab === dateStr ? '1px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                        backgroundColor: slotTab === dateStr ? 'var(--color-primary)' : 'transparent',
                                                        color: slotTab === dateStr ? 'white' : 'var(--text-secondary)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '12px' }}>
                                        {(availableSlots[slotTab] || []).map(slot => (
                                            <button
                                                key={slot.id}
                                                onClick={() => setFormData({ ...formData, slotDate: slotTab, slotTime: slot.label })}
                                                style={{
                                                    padding: '10px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                    border: formData.slotTime === slot.label ? '2px solid var(--color-primary)' : '1px solid var(--border-primary)',
                                                    backgroundColor: formData.slotTime === slot.label ? 'rgba(99,102,241,0.05)' : 'var(--bg-secondary)',
                                                    color: formData.slotTime === slot.label ? 'var(--color-primary)' : 'var(--text-secondary)',
                                                    cursor: 'pointer', textAlign: 'center'
                                                }}
                                            >
                                                {slot.label}
                                            </button>
                                        ))}
                                        {(!availableSlots[slotTab] || availableSlots[slotTab].length === 0) && (
                                            <div style={{ gridColumn: '1 / -1', padding: '20px', color: 'var(--text-tertiary)', fontSize: '13px' }}>
                                                No slots available for this date.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p style={{ color: 'var(--color-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 600 }}>
                                    We will call you within 15 mins to confirm your exact time slot.
                                </p>
                            </div>

                            {formData.slotTime && (
                                <div style={{ marginTop: '32px', animation: 'fadeIn 0.3s ease-out' }}>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px', fontWeight: 600, marginBottom: '16px', textAlign: 'center' }}>
                                        Where should our Sorted Solutions expert arrive?
                                    </p>

                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <label className="form-label">Full Name *</label>
                                        <div style={{ position: 'relative' }}>
                                            <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                            <input type="text" className="form-input" placeholder="Your name" style={{ paddingLeft: '44px' }}
                                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-grid" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <div className="form-group">
                                            <label className="form-label">Flat / Wing <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.85em' }}>(optional)</span></label>
                                            <input type="text" className="form-input" placeholder="e.g. A-42"
                                                value={formData.flat_number} onChange={e => setFormData({ ...formData, flat_number: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Building Name *</label>
                                            <input type="text" className="form-input" placeholder="e.g. Sunrise Residency"
                                                value={formData.building_name} onChange={e => setFormData({ ...formData, building_name: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                                        <label className="form-label">Street, Landmark etc. *</label>
                                        <div style={{ position: 'relative' }}>
                                            <Building size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                            <input type="text" className="form-input" placeholder="e.g. Near Reliance Fresh" style={{ paddingLeft: '44px' }}
                                                value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                        </div>
                                    </div>

                                    {formData.address.trim().length > 0 && (
                                        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)', animation: 'slideDown 0.3s ease-out' }}>
                                            <label className="form-label">Locality / Area</label>
                                            <div style={{ position: 'relative' }}>
                                                <LocalityCombobox
                                                    value={formData.locality}
                                                    pincode={formData.pincode}
                                                    showPincode={false}
                                                    onChange={(loc, pin) => setFormData(prev => ({
                                                        ...prev,
                                                        locality: loc,
                                                        pincode: pin || prev.pincode,
                                                    }))}
                                                    inputClassName="form-input"
                                                    dropdownZIndex={1100}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── STAGE 3: OTP VERIFICATION ── */}
                    {currentStep === 'otp' && (
                        <div className="step-content" style={{ textAlign: 'center' }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <Phone size={24} color="var(--color-primary)" />
                            </div>
                            <h2 style={{ marginBottom: '8px' }}>Secure Your Booking</h2>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-xl)' }}>
                                Enter the 6-digit code sent to <strong>+91 {formData.phone}</strong> via SMS/WhatsApp.
                            </p>

                            <div style={{ marginBottom: '24px' }}>
                                <OtpBoxes otp={otp} onChange={handleOtpChange} onKeyDown={handleOtpKeyDown} />
                            </div>
                            
                            <button onClick={sendOtp} disabled={submitting} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer', marginTop: '8px' }}>
                                Didn't receive it? Resend OTP
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Footer / Buttons ── */}
                <div className="booking-footer">
                    {currentStep === 'location' ? <div /> : (
                        <button onClick={() => {
                            if (currentStep === 'otp') setCurrentStep('logistics');
                            else setCurrentStep('location');
                        }} className="btn btn-secondary" disabled={submitting}>
                            <ChevronLeft size={18} /> Back
                        </button>
                    )}

                    {currentStep === 'location' && (
                        <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                            <button onClick={handleLocationNext} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                                Check Availability
                            </button>
                        </div>
                    )}
                    
                    {currentStep === 'logistics' && (
                        <button onClick={handleLogisticsNext} disabled={submitting} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                            {submitting ? 'Sending...' : 'Send OTP & Confirm Booking'}
                        </button>
                    )}

                    {currentStep === 'otp' && (
                        <button onClick={handleConfirmBooking} disabled={submitting} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                            {submitting ? 'Verifying...' : 'Confirm Booking'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
