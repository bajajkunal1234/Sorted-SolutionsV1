'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon behavior
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const startIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#10b981;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">S</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const endIcon = new L.DivIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:#ef4444;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">E</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
});

const stopIcon = (index, duration) => new L.DivIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:#64748b;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)" title="Stopped for ${duration} mins">P${index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
});

const jobIcon = (jobNumber) => new L.DivIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:8px;background:#f59e0b;border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;box-shadow:0 2px 5px rgba(0,0,0,0.3)">${jobNumber.split('-')[1] || 'J'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
});

const playbackIcon = new L.DivIcon({
    className: '',
    html: `<div style="position:relative;width:20px;height:20px;border-radius:50%;background:#3b82f6;border:2px solid #ffffff;box-shadow:0 2px 5px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;top:-4px;left:-4px;width:24px;height:24px;border-radius:50%;background:#3b82f6;opacity:0.4;animation:ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:#ffffff;"></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const MUMBAI = [19.076, 72.8777];

// Fit bounds to route automatically
function FitBounds({ path }) {
    const map = useMap();
    const hasFitRef = useRef(false);

    useEffect(() => {
        if (!path || path.length === 0) return;
        const bounds = L.latLngBounds(path.map(p => [p.lat, p.lng]));
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            hasFitRef.current = true;
        }
    }, [path, map]);
    return null;
}

// Controller to programmatically pan map view
function MapPanController({ panTo }) {
    const map = useMap();
    useEffect(() => {
        if (panTo) {
            map.setView([panTo.lat, panTo.lng], 16, { animate: true });
        }
    }, [panTo, map]);
    return null;
}

export default function TechnicianTimelineMap({ routePath = [], stops = [], jobsList = [], playbackPosition = null, panTo = null }) {
    const defaultCenter = routePath.length > 0 ? [routePath[0].lat, routePath[0].lng] : MUMBAI;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <MapContainer
                center={defaultCenter}
                zoom={12}
                style={{ width: '100%', height: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Draw Route Path */}
                {routePath.length > 1 && (
                    <Polyline
                        positions={routePath.map(p => [p.lat, p.lng])}
                        color="var(--color-primary, #3b82f6)"
                        weight={4}
                        opacity={0.8}
                    />
                )}

                {/* Start Marker */}
                {routePath.length > 0 && (
                    <Marker position={[routePath[0].lat, routePath[0].lng]} icon={startIcon}>
                        <Popup>
                            <strong>Shift Start Location</strong><br />
                            Time: {new Date(routePath[0].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                )}

                {/* End Marker */}
                {routePath.length > 1 && (
                    <Marker position={[routePath[routePath.length - 1].lat, routePath[routePath.length - 1].lng]} icon={endIcon}>
                        <Popup>
                            <strong>Shift End Location</strong><br />
                            Time: {new Date(routePath[routePath.length - 1].time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                )}

                {/* Stop/Idle Markers */}
                {stops.map((stop, i) => (
                    <Marker key={`stop-${i}`} position={[stop.lat, stop.lng]} icon={stopIcon(i + 1, stop.durationMinutes)}>
                        <Popup>
                            <strong>Parking Stop #{i + 1}</strong><br />
                            Duration: {stop.durationMinutes} minutes<br />
                            Arrival: {new Date(stop.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br />
                            Departure: {new Date(stop.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Popup>
                    </Marker>
                ))}

                {/* Job Marker Pins */}
                {jobsList.map((job, i) => {
                    const loc = job.propertyLocation;
                    if (!loc) return null;
                    const lat = loc.lat || loc.latitude;
                    const lng = loc.lng || loc.longitude;
                    if (!lat || !lng) return null;

                    return (
                        <Marker key={`job-${job.id}-${i}`} position={[lat, lng]} icon={jobIcon(job.jobNumber)}>
                            <Popup>
                                <strong>{job.jobNumber} ({job.category})</strong><br />
                                Customer: {job.customerName}<br />
                                Address: {job.address}
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Playback Pulsing Dot */}
                {playbackPosition && (
                    <Marker position={[playbackPosition.lat, playbackPosition.lng]} icon={playbackIcon} />
                )}

                <FitBounds path={routePath} />
                <MapPanController panTo={panTo} />
            </MapContainer>
        </div>
    );
}
