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

// MUMBAI center defaults
const MUMBAI_CENTER = [19.076, 72.8777];
const NOMINATIM = 'https://nominatim.openstreetmap.org/search?format=json&limit=1';

/**
 * Try Nominatim with a query string. Returns [lat, lng] or null.
 */
async function tryGeocode(query) {
    if (!query || query.trim().length < 4) return null;
    try {
        const res = await fetch(
            `${NOMINATIM}&q=${encodeURIComponent(query + ', Mumbai, India')}`,
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

// Fly map to new center whenever it changes
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
 *   initialLat    {number}   — Starting latitude
 *   initialLng    {number}   — Starting longitude
 *   geocodeQuery  {string}   — Combined "building, street, locality" string.
 *                              Re-triggers search whenever any part changes.
 *   onChange      {fn}       — Called with { lat, lng } on pin move or geocode
 *   height        {string}   — CSS height (default '240px')
 *   label         {string}   — Optional label above the map
 *   readOnly      {boolean}  — View-only mode (no drag)
 *
 * Geocoding strategy (progressive fallback):
 *   1. Full query: building + street + locality
 *   2. Drop first part: street + locality
 *   3. Last resort: locality / pincode only
 */
export default function PinDropMap({
    initialLat,
    initialLng,
    geocodeQuery = '',
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
    const [searchStatus, setSearchStatus] = useState(''); // '' | 'found' | 'not_found'

    const debounceRef = useRef(null);
    const lastSearchedQuery = useRef('');
    // Track whether user has manually dragged — suppress auto-re-pin if so
    const userDragged = useRef(false);

    /**
     * Core geocoding function with progressive fallback:
     *   1. Full query (building + street + locality)
     *   2. Without first part (street + locality)
     *   3. Just the last part (locality or pincode)
     */
    const runGeocode = useCallback(async (query) => {
        if (!query || query.trim().length < 4) return;

        const parts = query.split(',').map(p => p.trim()).filter(Boolean);

        setGeocoding(true);
        setSearchStatus('');
        lastSearchedQuery.current = query;

        let result = null;

        // 1. Try full combined query
        result = await tryGeocode(query);

        // 2. Drop building name — search street + locality
        if (!result && parts.length >= 2) {
            result = await tryGeocode(parts.slice(1).join(', '));
        }

        // 3. Last resort — just locality / pincode
        if (!result && parts.length >= 1) {
            result = await tryGeocode(parts[parts.length - 1]);
        }

        if (result) {
            const [lat, lng] = result;
            if (!userDragged.current) {
                // User hasn't manually placed pin yet — move it to geocoded spot
                setPosition(result);
                setMapCenter(result);
                if (onChange) onChange({ lat, lng });
            } else {
                // User dragged already — fly map to area but keep their pin placement
                setMapCenter(result);
            }
            setSearchStatus('found');
        } else {
            setSearchStatus('not_found');
        }

        setGeocoding(false);
    }, [onChange]);

    // Re-geocode whenever geocodeQuery changes (debounced 900ms)
    // No "same query" guard — any field edit (building/street/locality) triggers a new search
    useEffect(() => {
        if (readOnly) return;
        if (!geocodeQuery || geocodeQuery.trim().length < 4) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            // If the query actually changed from the last search, reset the drag flag
            if (geocodeQuery !== lastSearchedQuery.current) {
                userDragged.current = false;
            }
            runGeocode(geocodeQuery);
        }, 900);

        return () => clearTimeout(debounceRef.current);
    }, [geocodeQuery, readOnly, runGeocode]);

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

    // Manual search button — forces re-search and resets drag flag
    const handleManualSearch = () => {
        if (!geocodeQuery || geocodeQuery.trim().length < 4) return;
        userDragged.current = false;
        runGeocode(geocodeQuery);
    };

    const statusText = geocoding
        ? '🔍 Searching map...'
        : searchStatus === 'found'
            ? '✅ Location found — drag pin to fine-tune'
            : searchStatus === 'not_found'
                ? '⚠️ Not found — drag pin manually to your location'
                : '📍 Fill in the address fields above to auto-locate';

    const statusColor = geocoding ? '#7dd3fc'
        : searchStatus === 'found' ? '#6ee7b7'
        : searchStatus === 'not_found' ? '#fca5a5'
        : '#7dd3fc';

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

            {/* Status bar + manual Search button */}
            {!readOnly && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                        flex: 1, padding: '7px 12px',
                        background: 'rgba(56,189,248,0.08)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        borderRadius: 8, fontSize: 12,
                        color: statusColor, fontWeight: 500,
                    }}>
                        {statusText}
                    </div>
                    <button
                        type="button"
                        onClick={handleManualSearch}
                        disabled={geocoding || !geocodeQuery || geocodeQuery.trim().length < 4}
                        style={{
                            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: '1px solid rgba(99,102,241,0.4)',
                            background: geocoding ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.12)',
                            color: '#818cf8', cursor: geocoding ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            opacity: (!geocodeQuery || geocodeQuery.trim().length < 4) ? 0.4 : 1,
                        }}
                    >
                        {geocoding ? '...' : '🔍 Search'}
                    </button>
                </div>
            )}

            {/* Map */}
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

            {/* Coordinates display */}
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
