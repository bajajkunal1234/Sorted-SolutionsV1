'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';

// Fix icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Blue technician icon
const techIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204085.png',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
});

// Mumbai center default
const MUMBAI = [19.076, 72.8777];

/**
 * TechnicianLiveMap — Admin fleet monitoring map.
 * Shows all active technicians (in-progress jobs) on a live map.
 * Updates in real-time via Supabase Realtime broadcasts.
 */
export default function TechnicianLiveMap({ activeTechnicians = [] }) {
    // Map of jobId → { lat, lng, techName, jobNumber, customerName, customerAddress }
    const [positions, setPositions] = useState({});
    const channelsRef = useRef([]);

    // Subscribe to all in-progress job channels
    useEffect(() => {
        // Cleanup old subscriptions
        channelsRef.current.forEach(ch => supabase.removeChannel(ch));
        channelsRef.current = [];

        if (!activeTechnicians || activeTechnicians.length === 0) return;

        activeTechnicians.forEach(tech => {
            if (!tech.job_id) return;

            const ch = supabase.channel(`tracking:job_${tech.job_id}`);
            ch.on('broadcast', { event: 'location_update' }, ({ payload }) => {
                if (!payload?.latitude || !payload?.longitude) return;
                setPositions(prev => ({
                    ...prev,
                    [tech.job_id]: {
                        lat: payload.latitude,
                        lng: payload.longitude,
                        techName: tech.technician_name || 'Technician',
                        jobNumber: tech.job_number,
                        customerName: tech.customer_name,
                        customerAddress: tech.address || tech.locality || '',
                    }
                }));
            }).subscribe();

            channelsRef.current.push(ch);
        });

        return () => {
            channelsRef.current.forEach(ch => supabase.removeChannel(ch));
        };
    }, [activeTechnicians]);

    const positionList = Object.values(positions);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Live count badges */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', color: '#38bdf8', fontWeight: 700, fontSize: 13 }}>
                    🔵 {activeTechnicians.length} Technicians on duty
                </div>
                <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', fontWeight: 700, fontSize: 13 }}>
                    📡 {positionList.length} Broadcasting location
                </div>
                {positionList.length === 0 && activeTechnicians.length > 0 && (
                    <div style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', color: '#f59e0b', fontSize: 12 }}>
                        ⏳ Waiting for technicians to start their jobs and share location...
                    </div>
                )}
            </div>

            {/* Map */}
            <div style={{ height: 480, borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                <MapContainer center={MUMBAI} zoom={12} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">Carto</a>'
                    />

                    {positionList.map((pos, i) => (
                        <Marker key={i} position={[pos.lat, pos.lng]} icon={techIcon}>
                            <Popup>
                                <div style={{ minWidth: 160 }}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>🔧 {pos.techName}</div>
                                    <div style={{ color: '#6366f1', fontSize: 12 }}>Job #{pos.jobNumber}</div>
                                    <div style={{ marginTop: 4, fontSize: 12, color: '#334155' }}>
                                        👤 {pos.customerName}
                                    </div>
                                    {pos.customerAddress && (
                                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                            📍 {pos.customerAddress}
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Legend */}
            {positionList.length === 0 && activeTechnicians.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 14 }}>
                    No technicians currently working in-progress jobs.
                </div>
            )}

            {/* Technician List */}
            {activeTechnicians.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                    {activeTechnicians.map(tech => {
                        const isLive = !!positions[tech.job_id];
                        return (
                            <div key={tech.job_id} style={{
                                padding: '12px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.03)',
                                border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                display: 'flex', alignItems: 'center', gap: 10
                            }}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                                    backgroundColor: isLive ? '#10b981' : '#475569',
                                    boxShadow: isLive ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none'
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {tech.technician_name || 'Unknown'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                        Job #{tech.job_number} · {tech.customer_name}
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: isLive ? '#10b981' : '#475569', fontWeight: 600 }}>
                                    {isLive ? '● LIVE' : 'Offline'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
