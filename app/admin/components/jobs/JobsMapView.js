'use client'

import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, User, Briefcase, Calendar, CheckCircle, Clock, Loader2, Phone } from 'lucide-react';
import { techniciansAPI } from '@/lib/adminAPI';
import { generateInitialsAvatar } from '@/lib/utils/accountHelpers';

// Leaflet default marker fix (fallback icon)
const techIcon = typeof window !== 'undefined' ? L.divIcon({
    html: `<div style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 2px solid #eab308;
        background-color: #fef08a;
        color: #854d0e;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        font-weight: bold;
    ">🔧</div>`,
    className: 'custom-tech-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
}) : null;

// Helper to center the map when jobs change
function MapCenterController({ jobs }) {
    const map = useMap();
    useEffect(() => {
        if (!jobs || jobs.length === 0) return;
        const validCoords = jobs
            .map(j => {
                const lat = j.property?.lat || j.lat;
                const lng = j.property?.lng || j.lng;
                return (lat && lng) ? [lat, lng] : null;
            })
            .filter(Boolean);

        if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords);
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
    }, [jobs, map]);
    return null;
}

// Haversine straight-line distance formula
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export default function JobsMapView({ jobs, onUpdateJob }) {
    const [technicians, setTechnicians] = useState([]);
    const [fleetLocations, setFleetLocations] = useState([]);
    const [loadingTechs, setLoadingTechs] = useState(false);
    
    // Proximity distances loading state
    const [distances, setDistances] = useState({});
    const [loadingDistances, setLoadingDistances] = useState(false);
    const [activeJobId, setActiveJobId] = useState(null);

    // Fetch technicians and fleet locations on mount
    const fetchTechData = async () => {
        setLoadingTechs(true);
        try {
            const [techRes, fleetRes] = await Promise.all([
                techniciansAPI.getAll(),
                fetch('/api/admin/fleet-locations').then(res => res.json())
            ]);
            
            setTechnicians(techRes || []);
            if (fleetRes?.success) {
                setFleetLocations(fleetRes.data || []);
            }
        } catch (err) {
            console.error('Failed to load technician live coordinates:', err);
        } finally {
            setLoadingTechs(false);
        }
    };

    useEffect(() => {
        fetchTechData();
        // Refresh live locations every 45 seconds
        const timer = setInterval(fetchTechData, 45000);
        return () => clearInterval(timer);
    }, []);

    // Helper to build circular client icons containing photo or initials
    const getCustomerIcon = (job) => {
        const name = job.customer?.name || job.customer_name || 'Customer';
        const img = job.customer?.accountImage;
        const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        const avatar = generateInitialsAvatar(name);

        const htmlContent = img
            ? `<div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                background-color: #1e3a8a;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
              ">
                  <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
              </div>`
            : `<div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 2px solid #3b82f6;
                background-color: ${avatar.backgroundColor || '#3b82f6'};
                color: ${avatar.textColor || '#ffffff'};
                font-size: 12px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              ">
                  ${initials}
              </div>`;

        return L.divIcon({
            html: htmlContent,
            className: 'custom-customer-marker',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
            popupAnchor: [0, -17]
        });
    };

    // Calculate real-road google distances for nearest 5 technicians
    const handleCalculateDistances = async (job) => {
        const jobLat = job.property?.lat || job.lat;
        const jobLng = job.property?.lng || job.lng;
        if (!jobLat || !jobLng) return;

        setActiveJobId(job.id);
        setLoadingDistances(true);
        setDistances({});

        const candidates = technicians
            .filter(t => t.is_active !== false)
            .map(tech => {
                const liveLoc = fleetLocations.find(l => l.technician_id === tech.id);
                if (!liveLoc || !liveLoc.latitude || !liveLoc.longitude) {
                    return { ...tech, straightDist: Infinity };
                }
                const dist = getHaversineDistance(
                    jobLat, jobLng,
                    liveLoc.latitude, liveLoc.longitude
                );
                return { 
                    ...tech, 
                    straightDist: dist, 
                    coords: `${liveLoc.latitude},${liveLoc.longitude}`,
                    isOnline: liveLoc.is_online
                };
            });

        // Filter and sort candidates
        candidates.sort((a, b) => a.straightDist - b.straightDist);
        const closestCandidates = candidates.slice(0, 5).filter(t => t.straightDist !== Infinity);

        const googleResults = {};
        await Promise.all(closestCandidates.map(async (tech) => {
            try {
                const res = await fetch(`/api/admin/google-distance?origin=${tech.coords}&destination=${jobLat},${jobLng}`);
                const data = await res.json();
                if (data.success) {
                    googleResults[tech.id] = {
                        distance: data.distance,
                        duration: data.duration,
                        isOnline: tech.isOnline
                    };
                }
            } catch (err) {
                console.error('Google Matrix computation failed:', err);
            }
        }));

        setDistances(googleResults);
        setLoadingDistances(false);
    };

    // Filter jobs that have valid coordinates
    const geocodedJobs = useMemo(() => {
        return jobs.filter(j => {
            const lat = j.property?.lat || j.lat;
            const lng = j.property?.lng || j.lng;
            return !!(lat && lng);
        });
    }, [jobs]);

    // Handle technician assignment from popup
    const handleAssign = async (job, tech) => {
        if (!onUpdateJob) return;
        const confirmChange = window.confirm(`Assign job ${job.job_number} to ${tech.name}?`);
        if (!confirmChange) return;

        await onUpdateJob({
            ...job,
            technician_id: tech.id,
            technician_name: tech.name,
            status: job.status === 'new_job_request' ? 'scheduled' : job.status
        });
    };

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
            {/* Map Container */}
            <MapContainer
                center={[19.117, 72.905]} // Default Mumbai area
                zoom={12}
                style={{ height: '100%', width: '100%', zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    attribution='&copy; Google Maps'
                />

                <MapCenterController jobs={geocodedJobs} />

                {/* Customer Job Markers */}
                {geocodedJobs.map(job => {
                    const lat = job.property?.lat || job.lat;
                    const lng = job.property?.lng || job.lng;
                    const customerName = job.customer?.name || job.customer_name || 'Customer';
                    const isAssigned = !!job.technician_id;

                    return (
                        <Marker
                            key={job.id}
                            position={[lat, lng]}
                            icon={getCustomerIcon(job)}
                            eventHandlers={{
                                click: () => handleCalculateDistances(job)
                            }}
                        >
                            <Tooltip direction="top" offset={[0, -18]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{job.job_number}</span> - {customerName}
                                </div>
                            </Tooltip>

                            <Popup maxWidth={320}>
                                <div style={{ minWidth: '260px', color: '#f1f5f9', fontFamily: 'inherit' }}>
                                    {/* Job Header */}
                                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#38bdf8' }}>{job.job_number}</span>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '12px',
                                                backgroundColor: isAssigned ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: isAssigned ? '#10b981' : '#ef4444',
                                                fontWeight: 600,
                                                textTransform: 'capitalize'
                                            }}>{job.status.replace(/_/g, ' ')}</span>
                                        </div>
                                        <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '4px 0 0', color: '#e2e8f0' }}>{job.jobName || job.description || 'Job details'}</h4>
                                    </div>

                                    {/* Job Meta Info */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <User size={13} /> <span style={{ color: '#cbd5e1' }}>{customerName}</span>
                                        </div>
                                        {job.customer?.mobile && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={13} /> <span style={{ color: '#cbd5e1' }}>{job.customer.mobile}</span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={13} /> <span>Scheduled: {job.scheduled_date || job.dueDate || 'N/A'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Briefcase size={13} />
                                            <span>
                                                Current Assignee: <strong style={{ color: isAssigned ? '#fbbf24' : '#ef4444' }}>{job.technician_name || 'Unassigned'}</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Proximity / Routing Assignment Tool */}
                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                                        <h5 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>
                                            Proximity Assignment
                                        </h5>

                                        {loadingDistances ? (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '12px 0', color: '#38bdf8', fontSize: '12px' }}>
                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Calculating Google routes...
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                                                {/* Listed closest technicians via Google Maps */}
                                                {Object.keys(distances).length > 0 ? (
                                                    technicians
                                                        .filter(t => distances[t.id])
                                                        .map(t => {
                                                            const distInfo = distances[t.id];
                                                            const isCurrent = job.technician_id === t.id;
                                                            return (
                                                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#e2e8f0' }}>{t.name}</span>
                                                                        <span style={{ fontSize: '9px', color: '#38bdf8', fontWeight: 500 }}>
                                                                            🚗 {distInfo.distance} ({distInfo.duration})
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleAssign(job, t)}
                                                                        disabled={isCurrent}
                                                                        style={{
                                                                            padding: '3px 8px',
                                                                            fontSize: '10px',
                                                                            fontWeight: 700,
                                                                            borderRadius: '4px',
                                                                            border: 'none',
                                                                            cursor: isCurrent ? 'default' : 'pointer',
                                                                            backgroundColor: isCurrent ? 'rgba(16,185,129,0.15)' : '#38bdf8',
                                                                            color: isCurrent ? '#10b981' : '#0f172a'
                                                                        }}
                                                                    >
                                                                        {isCurrent ? 'Assigned' : 'Assign'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: '#64748b', padding: '4px 0' }}>
                                                        No technicians with active live location nearby.
                                                    </div>
                                                )}

                                                {/* Expandable fallback dropdown for all active technicians */}
                                                <div style={{ marginTop: '4px' }}>
                                                    <select
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (!val) return;
                                                            const t = technicians.find(tech => tech.id === val);
                                                            if (t) handleAssign(job, t);
                                                            e.target.value = '';
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '5px',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#1e293b',
                                                            border: '1px solid #475569',
                                                            color: '#e2e8f0',
                                                            fontSize: '11px',
                                                            cursor: 'pointer',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        <option value="">— Reassign to other tech —</option>
                                                        {technicians
                                                            .filter(t => t.is_active !== false && t.id !== job.technician_id)
                                                            .map(t => (
                                                                <option key={t.id} value={t.id}>{t.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Technician Live Location Markers */}
                {fleetLocations.map(loc => {
                    const tech = technicians.find(t => t.id === loc.technician_id);
                    if (!tech || tech.is_active === false) return null;

                    return (
                        <Marker
                            key={loc.technician_id}
                            position={[loc.latitude, loc.longitude]}
                            icon={techIcon}
                        >
                            <Tooltip direction="top" offset={[0, -16]}>
                                <div>
                                    <span style={{ fontWeight: 600 }}>{tech.name}</span> (Technician)
                                </div>
                            </Tooltip>

                            <Popup>
                                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 700, color: '#eab308' }}>{tech.name}</h4>
                                    <div><strong>Status:</strong> {loc.is_on_job ? 'On Job 🔧' : 'Available 🟢'}</div>
                                    {loc.battery_level !== undefined && <div><strong>Battery:</strong> {loc.battery_level}%</div>}
                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                                        Last seen: {new Date(loc.last_seen).toLocaleTimeString()}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
