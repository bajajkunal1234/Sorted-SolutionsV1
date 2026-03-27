'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Next.js Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const pinIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const MUMBAI_CENTER = [19.076, 72.8777];

/** Single Nominatim request. Returns [lat, lng] or null. */
async function nominatim(query) {
    if (!query || query.trim().length < 3) return null;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'SortedSolutions/1.0' } });
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch (_) { /* silent */ }
    return null;
}

/** Wait ms helper */
const wait = ms => new Promise(r => setTimeout(r, ms));

function DraggableMarker({ position, onMove }) {
    const markerRef = useRef(null);
    return (
        <Marker
            draggable={true}
            eventHandlers={{
                dragend() {
                    const m = markerRef.current;
                    if (m) { const { lat, lng } = m.getLatLng(); onMove({ lat, lng }); }
                }
            }}
            position={position}
            icon={pinIcon}
            ref={markerRef}
        />
    );
}

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 16, { animate: true, duration: 1.2 });
    }, [center, map]);
    return null;
}

/**
 * PinDropMap — Draggable pin map with locality-first geocoding.
 *
 * Props:
 *   initialLat    {number}  — Pre-stored lat
 *   initialLng    {number}  — Pre-stored lng
 *   localityQuery {string}  — The locality name (main anchor — searched first)
 *   pincodeQuery  {string}  — Pincode (backup anchor if locality fails)
 *   onChange      {fn}      — Called with { lat, lng }
 *   height        {string}  — CSS height
 *   label         {string}  — Label above map
 *   readOnly      {boolean}
 *
 * Search strategy (just 2 targeted requests, no rate-limit issues):
 *   1. Locality, Mumbai → fast, reliable, covers all Mumbai suburbs
 *   2. Pincode, India   → backup if locality name isn't in OSM
 *   Building / street are NOT searched (not in Nominatim DB for Mumbai)
 *   — user drags pin to the exact building entrance after locality is found.
 */
export default function PinDropMap({
    initialLat,
    initialLng,
    localityQuery = '',
    pincodeQuery = '',
    // legacy prop — still accepted but not directly searched
    geocodeQuery = '',
    onChange,
    height = '240px',
    label,
    readOnly = false,
}) {
    const hasCoords = !!(initialLat && initialLng);
    const [position, setPosition] = useState(hasCoords ? [initialLat, initialLng] : MUMBAI_CENTER);
    const [mapCenter, setMapCenter] = useState(hasCoords ? [initialLat, initialLng] : null);
    const [geocoding, setGeocoding] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');

    const debounceRef = useRef(null);
    const lastKey = useRef('');
    const userDragged = useRef(false);

    const placePin = useCallback((result) => {
        const lat = result[0], lng = result[1];
        if (!userDragged.current) {
            setPosition(result);
            setMapCenter(result);
            if (onChange) onChange({ lat, lng });
        } else {
            // User already placed pin manually — just pan map to area, don't move pin
            setMapCenter(result);
        }
    }, [onChange]);

    const runSearch = useCallback(async (locality, pincode) => {
        setGeocoding(true);
        setSearchStatus('');

        let placed = false;

        // ── Attempt 1: Locality + Mumbai ─────────────────────────────────
        if (locality && locality.trim().length >= 3) {
            const q = `${locality.trim()}, Mumbai, Maharashtra, India`;
            const r = await nominatim(q);
            if (r) { placePin(r); setSearchStatus('found'); placed = true; }
        }

        // ── Attempt 2: Pincode + India (backup, with 1s gap for Nominatim) ─
        if (!placed && pincode && /^\d{5,6}$/.test(pincode.trim())) {
            await wait(1100); // respect Nominatim 1req/sec limit
            const r = await nominatim(`${pincode.trim()}, India`);
            if (r) { placePin(r); setSearchStatus('found'); placed = true; }
        }

        if (!placed) setSearchStatus('not_found');
        setGeocoding(false);
    }, [placePin]);

    // Trigger search when locality or pincode changes
    useEffect(() => {
        if (readOnly) return;
        if (!localityQuery && !pincodeQuery) return;

        const key = `${localityQuery}|${pincodeQuery}`;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            if (key === lastKey.current) return;
            lastKey.current = key;
            if (key !== lastKey.current) userDragged.current = false;
            runSearch(localityQuery, pincodeQuery);
        }, 700);

        return () => clearTimeout(debounceRef.current);
    }, [localityQuery, pincodeQuery, readOnly, runSearch]);

    // Sync pre-stored coords when parent updates them
    useEffect(() => {
        if (initialLat && initialLng) {
            const p = [initialLat, initialLng];
            setPosition(p);
            setMapCenter(p);
        }
    }, [initialLat, initialLng]);

    const handleMove = (coords) => {
        userDragged.current = true;
        setPosition([coords.lat, coords.lng]);
        setSearchStatus('found');
        if (onChange) onChange(coords);
    };

    const handleSearch = () => {
        if (!localityQuery && !pincodeQuery) return;
        userDragged.current = false;
        lastKey.current = '';
        runSearch(localityQuery, pincodeQuery);
    };

    const statusText = geocoding
        ? '🔍 Locating area...'
        : searchStatus === 'found'
            ? '✅ Area found — drag red pin to your exact entrance'
            : searchStatus === 'not_found'
                ? '⚠️ Area not found — drag pin manually to your location'
                : '📍 Select Locality above to auto-place pin';

    const barBg = searchStatus === 'found'
        ? 'rgba(16,185,129,0.08)' : 'rgba(56,189,248,0.07)';
    const barBorder = searchStatus === 'found'
        ? 'rgba(16,185,129,0.22)' : 'rgba(56,189,248,0.18)';
    const textColor = geocoding ? '#7dd3fc'
        : searchStatus === 'found' ? '#6ee7b7'
        : searchStatus === 'not_found' ? '#fca5a5'
        : '#64748b';

    return (
        <div>
            {label && (
                <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                    {label}
                </div>
            )}

            {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, padding: '7px 12px', background: barBg, border: `1px solid ${barBorder}`, borderRadius: 8, fontSize: 12, color: textColor, fontWeight: 500 }}>
                        {statusText}
                    </div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        disabled={geocoding}
                        style={{
                            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid rgba(99,102,241,0.4)',
                            background: 'rgba(99,102,241,0.12)',
                            color: '#818cf8', cursor: geocoding ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap', opacity: geocoding ? 0.5 : 1,
                        }}
                    >
                        {geocoding ? '...' : '🔍 Search'}
                    </button>
                </div>
            )}

            <div style={{
                height, width: '100%', borderRadius: 12, overflow: 'hidden',
                border: readOnly ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(56,189,248,0.25)',
                position: 'relative', zIndex: 0,
                boxShadow: readOnly ? 'none' : '0 2px 12px rgba(56,189,248,0.1)'
            }}>
                <MapContainer center={position} zoom={hasCoords ? 16 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    />
                    {mapCenter && <MapController center={mapCenter} />}
                    {readOnly
                        ? <Marker position={position} icon={pinIcon} />
                        : <DraggableMarker position={position} onMove={handleMove} />
                    }
                </MapContainer>
            </div>

            {position && !(position[0] === MUMBAI_CENTER[0] && position[1] === MUMBAI_CENTER[1]) && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#475569', textAlign: 'right', fontFamily: 'monospace' }}>
                    {readOnly ? '📍' : '✓'} {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </div>
            )}
        </div>
    );
}
