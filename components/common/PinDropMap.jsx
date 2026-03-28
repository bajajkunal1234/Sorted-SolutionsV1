'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const pinIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

const MUMBAI_CENTER = [19.076, 72.8777];

/**
 * geocode(query) — calls our server-side proxy → Google Geocoding API.
 * Returns [lat, lng] or null.
 */
async function geocode(query) {
    if (!query || query.trim().length < 3) return null;
    try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) return [data.lat, data.lng];
    } catch (_) { /* silent */ }
    return null;
}

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
        if (center) map.flyTo(center, 17, { animate: true, duration: 1.2 });
    }, [center, map]);
    return null;
}

/**
 * PinDropMap — Google-powered geocoding with Leaflet/Carto map display.
 *
 * Props:
 *   building      {string}  — Building/society name
 *   street        {string}  — Street, landmark, area
 *   localityQuery {string}  — Locality (e.g. "Goregaon East")
 *   pincodeQuery  {string}  — Pincode
 *   initialLat    {number}  — Pre-stored lat
 *   initialLng    {number}  — Pre-stored lng
 *   onChange      {fn}      — Called with { lat, lng }
 *   height        {string}
 *   label         {string}
 *   readOnly      {boolean}
 *
 * Search strategy (using Google Geocoding, most precise to least):
 *   1. Building + Street + Locality, Mumbai   ← most precise
 *   2. Street + Locality, Mumbai              ← good fallback
 *   3. Locality, Mumbai                       ← guaranteed anchor
 *   4. Pincode, India                         ← last resort
 *
 *   Pin is placed as soon as ANY result is found at each step.
 *   Each step refines the pin location if a more precise result arrives.
 */
export default function PinDropMap({
    building = '',
    street = '',
    localityQuery = '',
    pincodeQuery = '',
    // legacy props — still accepted
    geocodeQuery = '',
    initialLat,
    initialLng,
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
    const [foundAddress, setFoundAddress] = useState('');

    const debounceRef = useRef(null);
    const lastKey = useRef('');
    const userDragged = useRef(false);

    const placePin = useCallback((result) => {
        if (!userDragged.current) {
            setPosition(result);
            setMapCenter(result);
            if (onChange) onChange({ lat: result[0], lng: result[1] });
        } else {
            setMapCenter(result); // pan map but keep user's pin
        }
    }, [onChange]);

    const runSearch = useCallback(async (bld, str, loc, pin) => {
        if (!loc && !pin && !str && !bld) return;

        setGeocoding(true);
        setSearchStatus('searching');
        setFoundAddress('');

        // Build queries from most specific → least specific
        const cityCtx = 'Mumbai, Maharashtra, India';
        const queries = [];

        if (bld && str && loc)   queries.push(`${bld}, ${str}, ${loc}, ${cityCtx}`);
        if (bld && loc)           queries.push(`${bld}, ${loc}, ${cityCtx}`);
        if (str && loc)           queries.push(`${str}, ${loc}, ${cityCtx}`);
        if (loc)                  queries.push(`${loc}, ${cityCtx}`);
        if (pin)                  queries.push(`${pin}, India`);

        let placed = false;
        for (const q of queries) {
            const result = await geocode(q);
            if (result) {
                placePin(result);
                setSearchStatus('found');
                // Show which level of precision found the result
                const label =
                    q.startsWith(bld || '!!') && bld ? 'Building found ✅'
                    : q.startsWith(str || '!!') && str ? 'Street found ✅'
                    : loc && q.includes(loc) ? 'Area found ✅'
                    : 'Pincode area ✅';
                setFoundAddress(label);
                placed = true;
                break; // Stop at first successful result
            }
        }

        if (!placed) setSearchStatus('not_found');
        setGeocoding(false);
    }, [placePin]);

    // Debounced trigger when any address field changes
    useEffect(() => {
        if (readOnly) return;
        if (!building && !street && !localityQuery && !pincodeQuery) return;

        const key = `${building}|${street}|${localityQuery}|${pincodeQuery}`;
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            if (key === lastKey.current) return;
            lastKey.current = key;
            userDragged.current = false;
            runSearch(building, street, localityQuery, pincodeQuery);
        }, 800);

        return () => clearTimeout(debounceRef.current);
    }, [building, street, localityQuery, pincodeQuery, readOnly, runSearch]);

    // Sync pre-stored coords
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
        userDragged.current = false;
        lastKey.current = '';
        runSearch(building, street, localityQuery, pincodeQuery);
    };

    const statusText = geocoding
        ? '🔍 Finding your exact location...'
        : searchStatus === 'found'
            ? `${foundAddress} — drag red pin to your exact entrance`
            : searchStatus === 'not_found'
                ? '⚠️ Not found — drag pin manually'
                : '📍 Fill address fields above to place pin automatically';

    const barBg = searchStatus === 'found' ? 'rgba(16,185,129,0.08)' : 'rgba(56,189,248,0.07)';
    const barBorder = searchStatus === 'found' ? 'rgba(16,185,129,0.22)' : 'rgba(56,189,248,0.18)';
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
                            border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)',
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
                <MapContainer center={position} zoom={hasCoords ? 17 : 12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a> | Geocoding by Google'
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
