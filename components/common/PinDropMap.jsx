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

// Custom draggable red pin icon
const pinIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
});

const MUMBAI_CENTER = [19.076, 72.8777];

/**
 * Nominatim geocode helper. Returns [lat, lng] or null.
 */
async function tryGeocode(query) {
    if (!query || query.trim().length < 3) return null;
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query + ', Mumbai, India')}`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (data && data.length > 0) {
            return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
    } catch (_) { /* silent */ }
    return null;
}

function DraggableMarker({ position, onMove }) {
    const markerRef = useRef(null);
    const eventHandlers = {
        dragend() {
            const marker = markerRef.current;
            if (marker) {
                const { lat, lng } = marker.getLatLng();
                onMove({ lat, lng });
            }
        }
    };
    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            icon={pinIcon}
            ref={markerRef}
        />
    );
}

function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 17, { animate: true, duration: 1 });
    }, [center, map]);
    return null;
}

/**
 * PinDropMap — Reusable draggable pin map component.
 *
 * Props:
 *   initialLat      {number}  — Starting latitude
 *   initialLng      {number}  — Starting longitude
 *   geocodeQuery    {string}  — Full address: "Building, Street, Locality, Pincode"
 *   localityQuery   {string}  — JUST the locality name (guaranteed fallback anchor).
 *                               Always provided separately so the pin can always land.
 *   onChange        {fn}      — Called with { lat, lng } on pin move / geocode
 *   height          {string}  — CSS height (default '240px')
 *   label           {string}  — Optional label above the map
 *   readOnly        {boolean} — View-only mode
 *
 * Search strategy (locality is the anchor — always finds location):
 *   1. locality alone → pin immediately lands on the area  ← guaranteed
 *   2. street + locality → refines if street is found
 *   3. building + street + locality → most precise if building is found
 *   If user has already dragged the pin, map pans to area but pin stays put.
 */
export default function PinDropMap({
    initialLat,
    initialLng,
    geocodeQuery = '',
    localityQuery = '',
    onChange,
    height = '240px',
    label,
    readOnly = false,
}) {
    const hasCoords = !!(initialLat && initialLng);
    const [position, setPosition] = useState(
        hasCoords ? [initialLat, initialLng] : MUMBAI_CENTER
    );
    const [mapCenter, setMapCenter] = useState(
        hasCoords ? [initialLat, initialLng] : null
    );
    const [geocoding, setGeocoding] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');

    const debounceRef = useRef(null);
    const lastSearchedKey = useRef('');
    const userDragged = useRef(false);

    const applyResult = useCallback((result, coords) => {
        if (!userDragged.current) {
            setPosition(result);
            setMapCenter(result);
            if (onChange) onChange(coords);
        } else {
            // User has manually placed pin — only pan map, keep pin
            setMapCenter(result);
        }
    }, [onChange]);

    /**
     * Geocode with locality as guaranteed anchor.
     * Steps:
     *  1. Locality alone → pin lands immediately
     *  2. Street + locality → refine
     *  3. Building + street + locality → most precise
     *
     * The pin progressively moves to more precise location as better results come in.
     */
    const runGeocode = useCallback(async (fullQuery, locality) => {
        const parts = fullQuery.split(',').map(p => p.trim()).filter(Boolean);
        // Identify the parts: assume order is [building?, street?, locality, pincode?]
        // localityQuery is passed separately as the guaranteed anchor

        setGeocoding(true);
        setSearchStatus('');
        lastSearchedKey.current = fullQuery + '|' + locality;

        let found = false;

        // STEP 1: Search locality alone first — this is the guaranteed anchor
        const localityAnchor = locality || (parts.length >= 1 ? parts[parts.length - 2] || parts[parts.length - 1] : '');
        if (localityAnchor && localityAnchor.trim().length >= 3) {
            const res = await tryGeocode(localityAnchor);
            if (res) {
                applyResult(res, { lat: res[0], lng: res[1] });
                setSearchStatus('found');
                found = true;
            }
        }

        // STEP 2: Refine with street + locality (better precision)
        if (parts.length >= 2) {
            // Take last 2 non-numeric parts (street + locality, skip pincode)
            const nonNumeric = parts.filter(p => isNaN(p.replace(/\s/g, '')));
            if (nonNumeric.length >= 2) {
                const streetLocality = nonNumeric.slice(-2).join(', ');
                const res2 = await tryGeocode(streetLocality);
                if (res2) {
                    applyResult(res2, { lat: res2[0], lng: res2[1] });
                    setSearchStatus('found');
                    found = true;
                }
            }
        }

        // STEP 3: Try full query for maximum precision (building + street + locality)
        if (parts.length >= 3) {
            const nonNumeric = parts.filter(p => isNaN(p.replace(/\s/g, '')));
            if (nonNumeric.length >= 3) {
                const fullNonNumeric = nonNumeric.join(', ');
                const res3 = await tryGeocode(fullNonNumeric);
                if (res3) {
                    applyResult(res3, { lat: res3[0], lng: res3[1] });
                    setSearchStatus('found');
                    found = true;
                }
            }
        }

        if (!found) {
            setSearchStatus('not_found');
        }

        setGeocoding(false);
    }, [applyResult]);

    // Re-geocode whenever address fields change (debounced 900ms)
    useEffect(() => {
        if (readOnly) return;
        // Require at least locality to start geocoding
        const trigger = localityQuery || geocodeQuery;
        if (!trigger || trigger.trim().length < 3) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        const searchKey = geocodeQuery + '|' + localityQuery;

        debounceRef.current = setTimeout(() => {
            if (searchKey !== lastSearchedKey.current) {
                userDragged.current = false;
            }
            runGeocode(geocodeQuery, localityQuery);
        }, 900);

        return () => clearTimeout(debounceRef.current);
    }, [geocodeQuery, localityQuery, readOnly, runGeocode]);

    // Sync if parent passes new initial coords after mount
    useEffect(() => {
        if (initialLat && initialLng) {
            const newPos = [initialLat, initialLng];
            setPosition(newPos);
            setMapCenter(newPos);
        }
    }, [initialLat, initialLng]);

    const handleMove = (coords) => {
        userDragged.current = true;
        setPosition([coords.lat, coords.lng]);
        setSearchStatus('found');
        if (onChange) onChange(coords);
    };

    const handleManualSearch = () => {
        const trigger = localityQuery || geocodeQuery;
        if (!trigger || trigger.trim().length < 3) return;
        userDragged.current = false;
        runGeocode(geocodeQuery, localityQuery);
    };

    const statusText = geocoding
        ? '🔍 Searching...'
        : searchStatus === 'found'
            ? '✅ Location found — drag pin to fine-tune your exact spot'
            : searchStatus === 'not_found'
                ? '⚠️ Not found — drag pin manually to your location'
                : '📍 Enter Locality to auto-place the pin, then drag to fine-tune';

    const statusColor = geocoding ? '#7dd3fc'
        : searchStatus === 'found' ? '#6ee7b7'
        : searchStatus === 'not_found' ? '#fca5a5'
        : '#94a3b8';

    return (
        <div>
            {label && (
                <div style={{
                    fontSize: 12, fontWeight: 600, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    marginBottom: 6
                }}>
                    {label}
                </div>
            )}

            {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                        flex: 1, padding: '7px 12px',
                        background: searchStatus === 'found' ? 'rgba(16,185,129,0.07)' : 'rgba(56,189,248,0.08)',
                        border: `1px solid ${searchStatus === 'found' ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
                        borderRadius: 8, fontSize: 12,
                        color: statusColor, fontWeight: 500,
                    }}>
                        {statusText}
                    </div>
                    <button
                        type="button"
                        onClick={handleManualSearch}
                        disabled={geocoding}
                        style={{
                            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid rgba(99,102,241,0.4)',
                            background: 'rgba(99,102,241,0.12)',
                            color: '#818cf8',
                            cursor: geocoding ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: geocoding ? 0.5 : 1,
                        }}
                    >
                        {geocoding ? '...' : '🔍 Search'}
                    </button>
                </div>
            )}

            <div style={{
                height, width: '100%', borderRadius: 12,
                overflow: 'hidden',
                border: readOnly ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(56,189,248,0.25)',
                position: 'relative', zIndex: 0,
                boxShadow: readOnly ? 'none' : '0 2px 12px rgba(56,189,248,0.1)'
            }}>
                <MapContainer
                    center={position}
                    zoom={hasCoords ? 17 : 13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    />
                    {mapCenter && <MapController center={mapCenter} />}
                    {readOnly ? (
                        <Marker position={position} icon={pinIcon} />
                    ) : (
                        <DraggableMarker position={position} onMove={handleMove} />
                    )}
                </MapContainer>
            </div>

            {position && !(position[0] === MUMBAI_CENTER[0] && position[1] === MUMBAI_CENTER[1]) && (
                <div style={{
                    marginTop: 6, fontSize: 11, color: '#475569',
                    textAlign: 'right', fontFamily: 'monospace'
                }}>
                    {readOnly ? '📍' : '✓'} {position[0].toFixed(5)}, {position[1].toFixed(5)}
                </div>
            )}
        </div>
    );
}
