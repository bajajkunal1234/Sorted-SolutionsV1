'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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

// Automatically re-centers map when center prop changes (e.g. after geocoding)
function MapController({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 17, { animate: true, duration: 1 });
        }
    }, [center, map]);
    return null;
}

/**
 * PinDropMap — Reusable draggable pin map component.
 *
 * Props:
 *   initialLat {number}   — Starting latitude (defaults to Mumbai center)
 *   initialLng {number}   — Starting longitude
 *   geocodeQuery {string} — When this string changes and no coords are set, auto-geocodes
 *   onChange    {fn}      — Called with { lat, lng } when pin is moved
 *   height      {string}  — CSS height (default '240px')
 *   label       {string}  — Optional helper label above the map
 *   readOnly    {boolean} — If true, renders a non-draggable view-only map
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
    const hasCoords = initialLat && initialLng;
    const [position, setPosition] = useState(
        hasCoords ? [initialLat, initialLng] : MUMBAI_CENTER
    );
    const [mapCenter, setMapCenter] = useState(
        hasCoords ? [initialLat, initialLng] : null
    );
    const [geocoding, setGeocoding] = useState(false);
    const lastQuery = useRef('');

    // Auto-geocode when address text changes (debounced 900ms)
    useEffect(() => {
        if (readOnly || !geocodeQuery || geocodeQuery === lastQuery.current) return;
        const timer = setTimeout(async () => {
            if (!geocodeQuery.trim() || geocodeQuery.length < 8) return;
            lastQuery.current = geocodeQuery;
            setGeocoding(true);
            try {
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeQuery + ', Mumbai, India')}&limit=1`,
                    { headers: { 'Accept-Language': 'en' } }
                );
                const data = await res.json();
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lng = parseFloat(data[0].lon);
                    const newPos = [lat, lng];
                    setPosition(newPos);
                    setMapCenter(newPos);
                    if (onChange) onChange({ lat, lng });
                }
            } catch (e) {
                // silently fail — user can drag pin manually
            } finally {
                setGeocoding(false);
            }
        }, 900);
        return () => clearTimeout(timer);
    }, [geocodeQuery, readOnly, onChange]);

    // Sync initial coords if parent updates them after mount
    useEffect(() => {
        if (initialLat && initialLng) {
            const newPos = [initialLat, initialLng];
            setPosition(newPos);
            setMapCenter(newPos);
        }
    }, [initialLat, initialLng]);

    const handleMove = (coords) => {
        setPosition([coords.lat, coords.lng]);
        if (onChange) onChange(coords);
    };

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

            {/* Helper text */}
            {!readOnly && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 12px', marginBottom: 8,
                    background: 'rgba(56,189,248,0.08)',
                    border: '1px solid rgba(56,189,248,0.2)',
                    borderRadius: 8, fontSize: 12, color: '#7dd3fc',
                    fontWeight: 500,
                }}>
                    📍 {geocoding ? 'Finding location...' : 'Drag the red pin to your exact building entrance'}
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
            {position && position !== MUMBAI_CENTER && (
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
