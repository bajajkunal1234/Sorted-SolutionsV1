'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Technician Icon
const techIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204085.png', // A wrench/worker icon or similar
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
});

// Custom Customer Icon
const customerIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/8044/8044237.png', // A home pin icon
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
});

function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, map.getZoom(), { animate: true, duration: 1 });
        }
    }, [center, map]);
    return null;
}

export default function MapVisualizer({ technicianLocation, customerLocation, height = '300px' }) {
    // Default center to customer location, then technician, then a default fallback (e.g. Mumbai)
    const [center, setCenter] = useState(customerLocation || technicianLocation || [19.0760, 72.8777]);

    useEffect(() => {
        if (technicianLocation) setCenter(technicianLocation);
    }, [technicianLocation]);

    return (
        <div style={{ height, width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-primary)', zIndex: 1 }}>
            <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">Carto</a>'
                />
                
                <MapUpdater center={center} />

                {technicianLocation && (
                    <Marker position={technicianLocation} icon={techIcon}>
                        <Popup>
                            <strong>Technician</strong><br/>
                            Moving to location...
                        </Popup>
                    </Marker>
                )}

                {customerLocation && (
                    <Marker position={customerLocation} icon={customerIcon}>
                        <Popup>
                            <strong>Customer Location</strong>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
