'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Clock, Loader2, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import BookingSteps from './BookingSteps';
import './BookingWizard.css';

// ─── Mumbai locality → pincode mapping ─────────────────────────────────────
const MUMBAI_LOCALITIES = [
    { name: 'Aarey Colony', pincode: '400065' },
    { name: 'Airoli', pincode: '400708' },
    { name: 'Andheri East', pincode: '400069' },
    { name: 'Andheri West', pincode: '400058' },
    { name: 'Antop Hill', pincode: '400037' },
    { name: 'Bandra East', pincode: '400051' },
    { name: 'Bandra West', pincode: '400050' },
    { name: 'BKC / Bandra Kurla Complex', pincode: '400051' },
    { name: 'Borivali East', pincode: '400066' },
    { name: 'Borivali West', pincode: '400092' },
    { name: 'Breach Candy', pincode: '400026' },
    { name: 'Bhandup East', pincode: '400042' },
    { name: 'Bhandup West', pincode: '400078' },
    { name: 'Bhendi Bazar', pincode: '400003' },
    { name: 'Byculla', pincode: '400027' },
    { name: 'Chakala', pincode: '400059' },
    { name: 'Chandivali', pincode: '400072' },
    { name: 'Charni Road', pincode: '400004' },
    { name: 'Chembur', pincode: '400071' },
    { name: 'Chembur Colony', pincode: '400074' },
    { name: 'Chinchpokli', pincode: '400012' },
    { name: 'Churchgate', pincode: '400020' },
    { name: 'Chunabhatti', pincode: '400022' },
    { name: 'Colaba', pincode: '400005' },
    { name: 'Cotton Green', pincode: '400033' },
    { name: 'Crawford Market', pincode: '400001' },
    { name: 'CST / Fort', pincode: '400001' },
    { name: 'Cuffe Parade', pincode: '400005' },
    { name: 'Cumballa Hill', pincode: '400026' },
    { name: 'Currey Road', pincode: '400012' },
    { name: 'Dahisar East', pincode: '400068' },
    { name: 'Dahisar West', pincode: '400068' },
    { name: 'Dadar East', pincode: '400014' },
    { name: 'Dadar West', pincode: '400028' },
    { name: 'Dharavi', pincode: '400017' },
    { name: 'Diva', pincode: '400612' },
    { name: 'Dockyard Road', pincode: '400010' },
    { name: 'Dongri', pincode: '400009' },
    { name: 'Film City', pincode: '400065' },
    { name: 'Ghansoli', pincode: '400701' },
    { name: 'Ghatkopar East', pincode: '400077' },
    { name: 'Ghatkopar West', pincode: '400086' },
    { name: 'Goregaon East', pincode: '400063' },
    { name: 'Goregaon West', pincode: '400062' },
    { name: 'Govandi', pincode: '400043' },
    { name: 'Grant Road', pincode: '400007' },
    { name: 'GTB Nagar', pincode: '400037' },
    { name: 'Hiranandani Gardens', pincode: '400076' },
    { name: 'Infinity Mall Malad', pincode: '400064' },
    { name: 'Jogeshwari East', pincode: '400060' },
    { name: 'Jogeshwari West', pincode: '400102' },
    { name: 'Juhu', pincode: '400049' },
    { name: 'Kalina', pincode: '400098' },
    { name: 'Kalwa', pincode: '400605' },
    { name: 'Kandivali East', pincode: '400101' },
    { name: 'Kandivali West', pincode: '400067' },
    { name: 'Kanjurmarg East', pincode: '400042' },
    { name: 'Kanjurmarg West', pincode: '400078' },
    { name: 'Kemps Corner', pincode: '400036' },
    { name: 'Khar East', pincode: '400052' },
    { name: 'Khar West', pincode: '400052' },
    { name: 'King Circle / Matunga', pincode: '400019' },
    { name: 'Koparkhairane', pincode: '400709' },
    { name: 'Kopri', pincode: '400603' },
    { name: 'Kurla East', pincode: '400024' },
    { name: 'Kurla West', pincode: '400070' },
    { name: 'Lalbaug', pincode: '400012' },
    { name: 'Lokhandwala', pincode: '400053' },
    { name: 'Lower Parel', pincode: '400013' },
    { name: 'Mahim', pincode: '400016' },
    { name: 'Mahalaxmi', pincode: '400011' },
    { name: 'Malabar Hill', pincode: '400006' },
    { name: 'Malad East', pincode: '400097' },
    { name: 'Malad West', pincode: '400064' },
    { name: 'Mankhurd', pincode: '400088' },
    { name: 'Marine Lines', pincode: '400002' },
    { name: 'Marol', pincode: '400059' },
    { name: 'Masjid', pincode: '400009' },
    { name: 'Matunga', pincode: '400019' },
    { name: 'Matunga Road', pincode: '400016' },
    { name: 'Mazgaon', pincode: '400010' },
    { name: 'MIDC Andheri', pincode: '400093' },
    { name: 'Mira Road', pincode: '401107' },
    { name: 'Mulund East', pincode: '400081' },
    { name: 'Mulund West', pincode: '400080' },
    { name: 'Mumbai Central', pincode: '400008' },
    { name: 'Mumbra', pincode: '400612' },
    { name: 'Nagpada', pincode: '400008' },
    { name: 'Nana Chowk', pincode: '400007' },
    { name: 'Nariman Point', pincode: '400021' },
    { name: 'Nahur', pincode: '400078' },
    { name: 'Naupada', pincode: '400602' },
    { name: 'Oshiwara', pincode: '400102' },
    { name: 'Parel', pincode: '400012' },
    { name: 'Powai', pincode: '400076' },
    { name: 'Prabhadevi', pincode: '400025' },
    { name: 'Prabhadevi East', pincode: '400025' },
    { name: 'Rabale', pincode: '400701' },
    { name: 'Reay Road', pincode: '400010' },
    { name: 'Sakinaka', pincode: '400072' },
    { name: 'Sandhurst Road', pincode: '400009' },
    { name: 'Sanpada', pincode: '400705' },
    { name: 'Santacruz East', pincode: '400055' },
    { name: 'Santacruz West', pincode: '400054' },
    { name: 'SEEPZ', pincode: '400096' },
    { name: 'Sewri', pincode: '400015' },
    { name: 'Sion', pincode: '400022' },
    { name: 'Sion Koliwada', pincode: '400037' },
    { name: 'Tardeo', pincode: '400034' },
    { name: 'Thane East', pincode: '400603' },
    { name: 'Thane West', pincode: '400601' },
    { name: 'Tilak Nagar', pincode: '400089' },
    { name: 'Turbhe', pincode: '400705' },
    { name: 'Vakola', pincode: '400055' },
    { name: 'Vashi', pincode: '400703' },
    { name: 'Versova', pincode: '400061' },
    { name: 'Vidyavihar', pincode: '400077' },
    { name: 'Vikhroli East', pincode: '400079' },
    { name: 'Vikhroli West', pincode: '400083' },
    { name: 'Vile Parle East', pincode: '400057' },
    { name: 'Vile Parle West', pincode: '400056' },
    { name: 'Wadala', pincode: '400037' },
    { name: 'Wadi Bunder', pincode: '400009' },
    { name: 'Wagle Estate', pincode: '400604' },
    { name: 'Walkeshwar', pincode: '400006' },
    { name: 'Worli', pincode: '400018' },
    { name: 'Worli Sea Face', pincode: '400030' },
];

const MAHARASHTRA_CITIES = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Aurangabad'];
const INDIAN_STATES = ['Maharashtra', 'Delhi', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Gujarat', 'Rajasthan', 'West Bengal', 'Uttar Pradesh', 'Madhya Pradesh'];

// Day name helpers
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getNextDates(count = 3) {
    const dates = [];
    const base = new Date();
    for (let i = 0; i < count; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        dates.push(d);
    }
    return dates;
}

function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function BookingWizard() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState('service');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [metadata, setMetadata] = useState({ categories: [], subcategories: [], issues: [] });
    const [allSlots, setAllSlots] = useState([]);      // from /api/settings/booking-slots
    const [visitingFees, setVisitingFees] = useState([]); // from /api/settings/visiting-fees

    const [formData, setFormData] = useState({
        category: '', subcategory: '', issue: '', pincode: '',
        name: '', phone: '', email: '', whatsappAlerts: false,
        apartment: '', address: '', locality: '',
        city: 'Mumbai', state: 'Maharashtra', zip: '',
        specialInstructions: '',
        selectedDate: '',   // ISO date string "YYYY-MM-DD"
        selectedSlotId: '', // slot id
        selectedSlotLabel: '',
    });

    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);
                const [bookingRes, slotsRes, feesRes] = await Promise.all([
                    fetch('/api/settings/quick-booking'),
                    fetch('/api/settings/booking-slots'),
                    fetch('/api/settings/visiting-fees'),
                ]);
                const [bookingData, slotsData, feesData] = await Promise.all([
                    bookingRes.json(), slotsRes.json(), feesRes.json()
                ]);

                if (bookingData.success) {
                    const cats = bookingData.data.categories || [];
                    const subs = cats.flatMap(c => c.subcategories || []);
                    const issues = subs.flatMap(s => s.issues || []);
                    setMetadata({ categories: cats, subcategories: subs, issues });
                }
                if (slotsData.success) setAllSlots(slotsData.data || []);
                if (feesData.success) setVisitingFees(feesData.data || []);

                // Pre-fill from URL params
                const categoryId = searchParams.get('category');
                const subcategoryId = searchParams.get('subcategory');
                const issueId = searchParams.get('issue');
                const pincode = searchParams.get('pincode');
                if (categoryId) {
                    setFormData(prev => ({
                        ...prev,
                        category: categoryId,
                        subcategory: subcategoryId || '',
                        issue: issueId || '',
                        pincode: pincode || '',
                        zip: pincode || '',
                    }));
                }
            } catch (err) {
                console.error('Failed to initialize booking wizard', err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [searchParams]);

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getName = (type, id) => {
        if (!id) return '—';
        const list = type === 'appliance' ? metadata.categories
            : type === 'type' ? metadata.subcategories
                : metadata.issues;
        const found = list.find(item => item.id?.toString() === id?.toString());
        return found ? found.name : 'Selected';
    };

    const handleLocalityChange = (localityName) => {
        const found = MUMBAI_LOCALITIES.find(l => l.name === localityName);
        setFormData(prev => ({ ...prev, locality: localityName, zip: found ? found.pincode : prev.zip }));
    };

    // The visiting fee for the currently selected appliance
    const visitingFee = useMemo(() => {
        if (!formData.category || !visitingFees.length) return null;
        const match = visitingFees.find(f => f.categoryId?.toString() === formData.category?.toString());
        return match && match.fee ? match.fee : null;
    }, [formData.category, visitingFees]);

    // The 3 dates and their active slots
    const nextDates = useMemo(() => getNextDates(3), []);

    const getSlotsForDate = (date) => {
        const dayName = DAY_NAMES[date.getDay()];
        return allSlots.filter(s => s.day === dayName && s.active);
    };

    // Navigation
    const handleNext = () => {
        if (currentStep === 'service') setCurrentStep('contact');
        else if (currentStep === 'contact') setCurrentStep('slot');
        else if (currentStep === 'slot') setCurrentStep('review');
    };

    const handleBack = () => {
        if (currentStep === 'contact') setCurrentStep('service');
        else if (currentStep === 'slot') setCurrentStep('contact');
        else if (currentStep === 'review') setCurrentStep('slot');
    };

    const canProceedFromSlot = formData.selectedDate && formData.selectedSlotId;

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            // Resolve human-readable names from metadata
            const categoryName = getName('appliance', formData.category);
            const subcategoryName = getName('type', formData.subcategory);
            const issueName = getName('issue', formData.issue);

            // Split name into first/last
            const nameParts = (formData.name || '').trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';

            const payload = {
                categoryId: formData.category,
                categoryName,
                subcategoryId: formData.subcategory,
                subcategoryName,
                issueId: formData.issue,
                issueName,
                pincode: formData.zip || formData.pincode,
                description: formData.specialInstructions,
                customer: {
                    firstName,
                    lastName,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    address: {
                        apartment: formData.apartment,
                        street: formData.address,
                        locality: formData.locality,
                        city: formData.city,
                        state: formData.state,
                        zip: formData.zip
                    }
                },
                schedule: { date: formData.selectedDate, slot: formData.selectedSlotLabel }
            };
            const response = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Failed to complete booking');
            router.push('/booking/success?id=' + (result.bookingId || result.jobId));
        } catch (error) {
            console.error('Booking failed:', error);
            alert(error.message || 'Failed to submit booking. Please try again.');
        } finally {
            setSubmitting(false);
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
        <div className="booking-wizard-container animate-slide-in">
            <div className="booking-card">
                <div className="booking-header">
                    <BookingSteps currentStep={currentStep} />
                </div>

                <div className="booking-body">

                    {/* ── Step 1: Service Details ── */}
                    {currentStep === 'service' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Service Details</h2>
                            <div className="service-summary">
                                {[
                                    { label: 'Appliance', value: getName('appliance', formData.category) },
                                    { label: 'Service Type', value: getName('type', formData.subcategory) },
                                    { label: 'Issue', value: getName('issue', formData.issue) },
                                    { label: 'Pincode', value: formData.pincode },
                                ].map(row => (
                                    <div key={row.label} className="summary-row">
                                        <span className="summary-label">{row.label}</span>
                                        <span className="summary-value">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                ℹ️ Service details are pre-selected. Go back to homepage to change.
                            </p>
                        </div>
                    )}

                    {/* ── Step 2: Contact Info ── */}
                    {currentStep === 'contact' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>How do we reach you?</h2>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label className="form-label">Phone Number *</label>
                                    <input type="tel" className="form-input" placeholder="+91 98765 43210"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email Address <span style={{ fontWeight: 400, color: 'var(--text-tertiary)', fontSize: '0.85em' }}>(optional)</span></label>
                                    <input type="email" className="form-input" placeholder="your@email.com"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                                <input type="checkbox" id="whatsappAlerts" checked={formData.whatsappAlerts}
                                    onChange={e => setFormData({ ...formData, whatsappAlerts: e.target.checked })}
                                    style={{ width: '18px', height: '18px', accentColor: '#25D366', cursor: 'pointer' }} />
                                <label htmlFor="whatsappAlerts" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '1.1em' }}>📲</span>
                                    Send me alerts by WhatsApp message.
                                </label>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--spacing-lg)' }}>
                                <div className="form-group">
                                    <label className="form-label">Your Name *</label>
                                    <input type="text" className="form-input" placeholder="Full name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Suite, Apt, Building, Flat Number etc. *</label>
                                <input type="text" className="form-input" placeholder="e.g. Flat 4B, Tower C, Sunrise Residency"
                                    value={formData.apartment}
                                    onChange={e => setFormData({ ...formData, apartment: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Street, Landmark, Locality etc. *</label>
                                <input type="text" className="form-input" placeholder="e.g. Near Reliance Fresh, MG Road"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Locality *</label>
                                <select className="form-input" value={formData.locality}
                                    onChange={e => handleLocalityChange(e.target.value)}
                                    style={{ cursor: 'pointer' }}>
                                    <option value="">— Select your locality —</option>
                                    {MUMBAI_LOCALITIES.map(l => (
                                        <option key={l.name} value={l.name}>{l.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 140px' }}>
                                <div className="form-group">
                                    <label className="form-label">City *</label>
                                    <select className="form-input" value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        style={{ cursor: 'pointer' }}>
                                        {MAHARASHTRA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">State *</label>
                                    <select className="form-input" value={formData.state}
                                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        style={{ cursor: 'pointer' }}>
                                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Pincode *</label>
                                    <input type="text" className="form-input" placeholder="400001" maxLength={6}
                                        value={formData.zip}
                                        onChange={e => setFormData({ ...formData, zip: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Special Instructions</label>
                                <textarea className="form-textarea" rows={3}
                                    value={formData.specialInstructions}
                                    onChange={e => setFormData({ ...formData, specialInstructions: e.target.value })}
                                    placeholder="Gate code, parking info, pet at home, etc." />
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Date & Time Slot ── */}
                    {currentStep === 'slot' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-xs)' }}>Choose a Date &amp; Time</h2>
                            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-lg)' }}>
                                Pick your preferred slot — we'll confirm availability by SMS/WhatsApp.
                            </p>

                            {/* ── 3 Date Buttons ── */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
                                {nextDates.map((date, i) => {
                                    const key = formatDateKey(date);
                                    const slotCount = getSlotsForDate(date).length;
                                    const isSelected = formData.selectedDate === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setFormData(prev => ({ ...prev, selectedDate: key, selectedSlotId: '', selectedSlotLabel: '' }))}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                borderRadius: 'var(--radius-md)',
                                                border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-primary)',
                                                backgroundColor: isSelected ? 'var(--color-primary)' : 'var(--bg-elevated)',
                                                color: isSelected ? 'var(--text-inverse)' : 'var(--text-primary)',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.15s ease',
                                                boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                                            }}
                                        >
                                            <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 500, opacity: 0.8, marginBottom: '4px' }}>
                                                {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : SHORT_DAYS[date.getDay()]}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, lineHeight: 1 }}>
                                                {date.getDate()}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', opacity: 0.75, marginTop: '2px' }}>
                                                {SHORT_MONTHS[date.getMonth()]}
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', marginTop: '6px', opacity: 0.7 }}>
                                                {slotCount > 0 ? `${slotCount} slot${slotCount > 1 ? 's' : ''}` : 'No slots'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ── Available Slots for Selected Date ── */}
                            {formData.selectedDate && (() => {
                                const selDate = nextDates.find(d => formatDateKey(d) === formData.selectedDate);
                                const daySlots = selDate ? getSlotsForDate(selDate) : [];
                                return (
                                    <div>
                                        <h4 style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                            Available time slots
                                        </h4>
                                        {daySlots.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-tertiary)' }}>
                                                <AlertCircle size={24} style={{ marginBottom: '8px' }} />
                                                <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>No slots available for this day.</p>
                                                <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)' }}>Please select another date.</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                                {daySlots.map(slot => {
                                                    const isSelected = formData.selectedSlotId === slot.id;
                                                    return (
                                                        <button
                                                            key={slot.id}
                                                            onClick={() => setFormData(prev => ({ ...prev, selectedSlotId: slot.id, selectedSlotLabel: slot.label || `${slot.startTime} – ${slot.endTime}` }))}
                                                            style={{
                                                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                                                borderRadius: 'var(--radius-md)',
                                                                border: isSelected ? '2px solid var(--color-primary)' : '2px solid var(--border-primary)',
                                                                backgroundColor: isSelected ? 'rgba(99,102,241,0.15)' : 'var(--bg-elevated)',
                                                                color: 'var(--text-primary)',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 'var(--spacing-md)',
                                                                textAlign: 'left',
                                                                transition: 'all 0.15s ease',
                                                                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                                                            }}
                                                        >
                                                            <Clock size={20} style={{ color: isSelected ? 'var(--color-primary)' : 'var(--text-tertiary)', flexShrink: 0 }} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600 }}>{slot.label || `${slot.startTime} – ${slot.endTime}`}</div>
                                                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>
                                                                    {slot.startTime} – {slot.endTime} · Up to {slot.maxBookings} bookings
                                                                </div>
                                                            </div>
                                                            {isSelected && <CheckCircle2 size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {!formData.selectedDate && (
                                <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
                                    ↑ Select a date above to see available time slots
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Step 4: Review & Estimated Expense ── */}
                    {currentStep === 'review' && (
                        <div className="step-content">
                            <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>Review Your Booking</h2>

                            {/* Service & Contact Summary */}
                            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>Service</div>
                                    <div className="form-grid">
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Appliance</div>
                                            <div style={{ fontWeight: 600 }}>{getName('appliance', formData.category)}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-tertiary)' }}>Issue</div>
                                            <div style={{ fontWeight: 600 }}>{getName('issue', formData.issue)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-primary)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>Contact &amp; Address</div>
                                    <div style={{ fontWeight: 600 }}>{formData.name}</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                                        {formData.phone}{formData.email && ` · ${formData.email}`}
                                        {formData.whatsappAlerts && <span style={{ marginLeft: '8px', color: '#25D366', fontSize: '0.85em' }}>📲 WhatsApp on</span>}
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        {[formData.apartment, formData.address, formData.locality, `${formData.city}, ${formData.state} – ${formData.zip}`].filter(Boolean).join(', ')}
                                    </div>
                                </div>

                                <div style={{ padding: 'var(--spacing-md)' }}>
                                    <div style={{ fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '0.05em', marginBottom: 'var(--spacing-sm)' }}>Appointment</div>
                                    <div style={{ fontWeight: 600 }}>
                                        {formData.selectedDate ? (() => {
                                            const d = new Date(formData.selectedDate + 'T00:00:00');
                                            return `${SHORT_DAYS[d.getDay()]}, ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
                                        })() : '—'}
                                        {' · '}{formData.selectedSlotLabel || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* ── Estimated Expense Section ── */}
                            <div style={{
                                borderRadius: 'var(--radius-lg)',
                                border: '2px solid #f59e0b',
                                overflow: 'hidden',
                            }}>
                                <div style={{ padding: 'var(--spacing-md) var(--spacing-lg)', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Info size={18} color="#fff" />
                                    <span style={{ fontWeight: 700, color: '#fff', fontSize: 'var(--font-size-sm)' }}>Estimated Expense</span>
                                </div>
                                <div style={{ padding: 'var(--spacing-lg)', backgroundColor: '#fefce8' }}>
                                    {/* Fee highlight */}
                                    {visitingFee ? (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-md)', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid #fcd34d', marginBottom: 'var(--spacing-lg)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 'var(--font-size-base)', color: '#1c1917' }}>Visiting / Diagnosing Fee</div>
                                                <div style={{ fontSize: 'var(--font-size-xs)', color: '#78716c' }}>Payable at the time of visit</div>
                                            </div>
                                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, color: '#d97706' }}>
                                                ₹{visitingFee}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-sm) var(--spacing-md)', backgroundColor: '#fff', borderRadius: 'var(--radius-md)', border: '1px solid #fcd34d', fontSize: 'var(--font-size-sm)', color: '#78716c' }}>
                                            Visiting / diagnosing fee applies — amount will be confirmed on booking.
                                        </div>
                                    )}

                                    {/* Info bullets */}
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        {[
                                            {
                                                icon: '🔍',
                                                bold: 'Visiting / diagnosing fee covers:',
                                                text: 'Diagnosing and identifying the problem. In many cases it also covers solving minor issues like a burnt DC fuse or a loose connection.'
                                            },
                                            {
                                                icon: '🔩',
                                                bold: 'Spare parts — informed before repair:',
                                                text: 'If any spare parts are required, our technician will inform you of the cost before beginning any repair work. No surprise charges.'
                                            },
                                            {
                                                icon: '⏱️',
                                                bold: 'Repair time — shared after diagnosis:',
                                                text: 'The estimated time to complete the repair will be shared with you after our technician has diagnosed the issue.'
                                            },
                                        ].map((item, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm) 0', borderBottom: i < 2 ? '1px solid #fde68a' : 'none' }}>
                                                <span style={{ fontSize: '1.3em', flexShrink: 0 }}>{item.icon}</span>
                                                <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.5, color: '#44403c' }}>
                                                    <strong style={{ color: '#1c1917' }}>{item.bold}</strong>{' '}
                                                    {item.text}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="booking-footer">
                    {currentStep !== 'service' ? (
                        <button onClick={handleBack} className="btn btn-secondary">
                            <ChevronLeft size={18} /> Back
                        </button>
                    ) : <div />}

                    {currentStep === 'review' ? (
                        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary"
                            style={{ padding: '12px 32px' }}>
                            {submitting ? 'Processing…' : 'Complete Booking'}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            className="btn btn-primary"
                            disabled={currentStep === 'slot' && !canProceedFromSlot}
                            style={{ padding: '12px 32px', opacity: (currentStep === 'slot' && !canProceedFromSlot) ? 0.5 : 1, cursor: (currentStep === 'slot' && !canProceedFromSlot) ? 'not-allowed' : 'pointer' }}
                        >
                            Next Step <ChevronRight size={18} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
