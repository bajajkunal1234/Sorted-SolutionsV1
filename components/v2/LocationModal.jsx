'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Check } from 'lucide-react';
import LocalityCombobox from '@/components/common/LocalityCombobox';
import { useV2Cart } from './CartContext';

const POPULAR_MUMBAI_HUBS = [
    { locality: 'Powai', pincode: '400076' },
    { locality: 'Andheri West', pincode: '400058' },
    { locality: 'Bandra West', pincode: '400050' },
    { locality: 'Goregaon East', pincode: '400063' },
    { locality: 'Thane West', pincode: '400601' },
    { locality: 'Chembur', pincode: '400071' },
];

export default function LocationModal() {
    const { location, saveLocation, locationModalOpen, setLocationModalOpen } = useV2Cart();
    const [locality, setLocality] = useState(location.locality || '');
    const [pincode, setPincode] = useState(location.pincode || '');
    const [flat, setFlat] = useState(location.flat || '');
    const [building, setBuilding] = useState(location.building || '');

    useEffect(() => {
        if (locationModalOpen) {
            setLocality(location.locality || '');
            setPincode(location.pincode || '');
            setFlat(location.flat || '');
            setBuilding(location.building || '');
        }
    }, [locationModalOpen, location]);

    if (!locationModalOpen) return null;

    const handleSave = (e) => {
        e.preventDefault();
        saveLocation({
            locality: locality.trim(),
            pincode: pincode.trim(),
            flat: flat.trim(),
            building: building.trim(),
        });
        setLocationModalOpen(false);
    };

    return (
        <div
            className="v2-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Select Mumbai service location"
            onClick={(e) => {
                if (e.target === e.currentTarget) setLocationModalOpen(false);
            }}
        >
            <div className="v2-sheet">
                <div className="v2-sheet-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={18} color="#6338f5" />
                        <strong style={{ fontSize: 16 }}>Select Service Location</strong>
                    </div>
                    <button
                        type="button"
                        onClick={() => setLocationModalOpen(false)}
                        aria-label="Close location modal"
                        style={{
                            border: 'none',
                            background: '#f1f5f9',
                            borderRadius: 999,
                            width: 32,
                            height: 32,
                            display: 'grid',
                            placeItems: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div className="v2-sheet-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                            <label className="v2-field-label">Mumbai Locality & Pincode *</label>
                            <LocalityCombobox
                                value={locality}
                                pincode={pincode}
                                onChange={(loc, pin) => {
                                    setLocality(loc);
                                    setPincode(pin);
                                }}
                                dropdownZIndex={120}
                            />
                        </div>

                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                                Popular Dispatch Zones
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {POPULAR_MUMBAI_HUBS.map(hub => {
                                    const active = locality.toLowerCase() === hub.locality.toLowerCase();
                                    return (
                                        <button
                                            key={hub.locality}
                                            type="button"
                                            onClick={() => {
                                                setLocality(hub.locality);
                                                setPincode(hub.pincode);
                                            }}
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: 999,
                                                border: active ? '1px solid #6338f5' : '1px solid #e2e8f0',
                                                background: active ? '#f5f3ff' : '#fff',
                                                color: active ? '#6338f5' : '#334155',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {hub.locality}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
                            <div>
                                <label className="v2-field-label">Flat / Wing</label>
                                <input
                                    className="v2-input"
                                    value={flat}
                                    onChange={(e) => setFlat(e.target.value)}
                                    placeholder="e.g. 1201"
                                />
                            </div>
                            <div>
                                <label className="v2-field-label">Building / Society</label>
                                <input
                                    className="v2-input"
                                    value={building}
                                    onChange={(e) => setBuilding(e.target.value)}
                                    placeholder="e.g. Cliff Ave, Hiranandani"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="v2-sheet-foot">
                        <button type="submit" className="v2-primary-btn" disabled={!locality.trim()}>
                            <Check size={16} />
                            Confirm Mumbai Location
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
