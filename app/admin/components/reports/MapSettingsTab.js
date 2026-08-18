'use client'

import { useState, useEffect } from 'react';
import { Save, Layers, MapPin, Eye, Settings, HelpCircle, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

export default function MapSettingsTab() {
    const [adminSettings, setAdminSettings] = useState({
        mapViewType: 'roadmap',
        custMarkerType: 'thin',
        techMarkerType: 'wrench',
        supplierMarkerType: 'thin',
        autoExpandSingleJob: true,
        enableRoutePathHighlight: true,
        showCustomersLayer: true,
        showTechniciansLayer: true,
        showSuppliersLayer: true
    });

    const [techSettings, setTechSettings] = useState({
        mapViewType: 'roadmap',
        custMarkerType: 'thin',
        supplierMarkerType: 'thin',
        autoExpandSingleJob: true,
        enableRoutePathHighlight: true,
        showCustomersLayer: true,
        showSuppliersLayer: true,
        showSelfLayer: true
    });

    const [activeSubTab, setActiveSubTab] = useState('admin-map'); // 'admin-map' | 'tech-map'
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch both Admin & Tech settings from database on mount (bypassing route cache)
    useEffect(() => {
        const fetchAllSettings = async () => {
            setLoading(true);
            try {
                const [adminRes, techRes] = await Promise.all([
                    fetch(`/api/admin/website-settings?key=map_settings&t=${Date.now()}`).then(r => r.json()),
                    fetch(`/api/admin/website-settings?key=tech_map_settings&t=${Date.now()}`).then(r => r.json())
                ]);

                if (adminRes.success && adminRes.data && adminRes.data.value) {
                    setAdminSettings(adminRes.data.value);
                    // Sync localStorage cache for Admin Map
                    const val = adminRes.data.value;
                    localStorage.setItem('mapViewType', val.mapViewType || 'roadmap');
                    localStorage.setItem('custMarkerType', val.custMarkerType || 'thin');
                    localStorage.setItem('techMarkerType', val.techMarkerType || 'wrench');
                    localStorage.setItem('supplierMarkerType', val.supplierMarkerType || 'thin');
                    localStorage.setItem('autoExpandSingleJob', String(val.autoExpandSingleJob !== false));
                    localStorage.setItem('enableRoutePathHighlight', String(val.enableRoutePathHighlight !== false));
                    localStorage.setItem('showCustomersLayer', String(val.showCustomersLayer !== false));
                    localStorage.setItem('showTechniciansLayer', String(val.showTechniciansLayer !== false));
                    localStorage.setItem('showSuppliersLayer', String(val.showSuppliersLayer !== false));
                }

                if (techRes.success && techRes.data && techRes.data.value) {
                    setTechSettings(techRes.data.value);
                }
            } catch (err) {
                console.error('Failed to load map settings from database:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllSettings();
    }, []);

    const handleAdminChange = (key, value) => {
        setAdminSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleTechChange = (key, value) => {
        setTechSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (activeSubTab === 'admin-map') {
                // 1. Update localStorage cache for instant admin map updates
                localStorage.setItem('mapViewType', adminSettings.mapViewType);
                localStorage.setItem('custMarkerType', adminSettings.custMarkerType);
                localStorage.setItem('techMarkerType', adminSettings.techMarkerType);
                localStorage.setItem('supplierMarkerType', adminSettings.supplierMarkerType);
                localStorage.setItem('autoExpandSingleJob', String(adminSettings.autoExpandSingleJob));
                localStorage.setItem('enableRoutePathHighlight', String(adminSettings.enableRoutePathHighlight));
                localStorage.setItem('showCustomersLayer', String(adminSettings.showCustomersLayer));
                localStorage.setItem('showTechniciansLayer', String(adminSettings.showTechniciansLayer));
                localStorage.setItem('showSuppliersLayer', String(adminSettings.showSuppliersLayer));

                // 2. Save Admin settings to database
                const res = await fetch('/api/admin/website-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: 'map_settings',
                        value: adminSettings,
                        description: 'Global Admin jobs dashboard map visualization and overlay settings'
                    })
                });
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'Failed to save Admin settings');
                alert('✅ Admin Map settings saved to database successfully!');
            } else {
                // Save Tech settings to database
                const res = await fetch('/api/admin/website-settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        key: 'tech_map_settings',
                        value: techSettings,
                        description: 'Global Technician jobs dashboard map visualization and overlay settings'
                    })
                });
                const result = await res.json();
                if (!result.success) throw new Error(result.error || 'Failed to save Technician settings');
                alert('✅ Technician Map settings saved to database successfully!');
            }
        } catch (err) {
            alert('Failed to save settings: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '12px' }}>
                <Loader2 className="animate-spin" size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading map settings from database...</span>
            </div>
        );
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', color: '#f1f5f9', fontFamily: 'inherit' }}>
            {/* Header section */}
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>Map Configuration Settings</h2>
                    <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>Configure view types, marker styles, overlays and routing behaviors for maps</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isSaving ? '#475569' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: isSaving ? 'default' : 'pointer',
                        boxShadow: isSaving ? 'none' : '0 4px 12px rgba(37,99,235,0.2)'
                    }}
                >
                    <Save size={16} /> {isSaving ? 'Syncing...' : 'Save Map Settings'}
                </button>
            </div>

            {/* Split subtabs selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px', gap: '8px' }}>
                <button
                    onClick={() => setActiveSubTab('admin-map')}
                    style={{
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: activeSubTab === 'admin-map' ? '#38bdf8' : '#94a3b8',
                        borderBottom: activeSubTab === 'admin-map' ? '2px solid #38bdf8' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Admin Jobs Map Settings
                </button>
                <button
                    onClick={() => setActiveSubTab('tech-map')}
                    style={{
                        padding: '10px 16px',
                        fontSize: '14px',
                        fontWeight: 700,
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: activeSubTab === 'tech-map' ? '#38bdf8' : '#94a3b8',
                        borderBottom: activeSubTab === 'tech-map' ? '2px solid #38bdf8' : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    Technician Jobs Map Settings
                </button>
            </div>

            {/* Config views depending on sub-tab */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', flex: 1, overflowY: 'auto', paddingBottom: '32px' }}>
                {activeSubTab === 'admin-map' ? (
                    /* ── ADMIN MAP CONFIGURATIONS ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Admin Overlays */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} /> Active Map Overlay Layers (Admin)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Customers Layer</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay customer property pins on the map</p>
                                    </div>
                                    <button onClick={() => handleAdminChange('showCustomersLayer', !adminSettings.showCustomersLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: adminSettings.showCustomersLayer ? '#10b981' : '#64748b' }}>
                                        {adminSettings.showCustomersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Technicians Layer</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay live tracking pins for active technicians</p>
                                    </div>
                                    <button onClick={() => handleAdminChange('showTechniciansLayer', !adminSettings.showTechniciansLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: adminSettings.showTechniciansLayer ? '#10b981' : '#64748b' }}>
                                        {adminSettings.showTechniciansLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Suppliers Layer</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay spare parts suppliers for route alignment checks</p>
                                    </div>
                                    <button onClick={() => handleAdminChange('showSuppliersLayer', !adminSettings.showSuppliersLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: adminSettings.showSuppliersLayer ? '#10b981' : '#64748b' }}>
                                        {adminSettings.showSuppliersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Admin Marker Styles */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={18} /> Marker Styles & Layer Views (Admin)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Map Base Layer Style:</label>
                                <select value={adminSettings.mapViewType} onChange={(e) => handleAdminChange('mapViewType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="roadmap">Google Roadmap (Standard Map)</option>
                                    <option value="satellite">Google Satellite (Imagery view)</option>
                                    <option value="hybrid">Google Hybrid (Satellite + Road Labels)</option>
                                    <option value="terrain">Google Terrain (Topography & Shading)</option>
                                    <option value="dark">Dark Mode Map (CartoDB Dark Matter)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Customer Marker Design:</label>
                                <select value={adminSettings.custMarkerType} onChange={(e) => handleAdminChange('custMarkerType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="thin">Thin Color-Coded Pin (Timeline Style)</option>
                                    <option value="circle">Photo/Initials Circle (Standard)</option>
                                    <option value="compact-pin">Compact Map Pin (Clean blue pin with initials)</option>
                                    <option value="pin">Standard Map Pin (Larger blue pin with initials)</option>
                                    <option value="compact">Compact Dot (Minimized marker dots)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Technician Marker Design:</label>
                                <select value={adminSettings.techMarkerType} onChange={(e) => handleAdminChange('techMarkerType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="wrench">Person Badge (Colored technician symbol)</option>
                                    <option value="pin">Standard Map Pin (Orange pin with initials)</option>
                                    <option value="avatar">Tech Initials Circle (Initials only circle)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Supplier Marker Design:</label>
                                <select value={adminSettings.supplierMarkerType} onChange={(e) => handleAdminChange('supplierMarkerType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="thin">Thin Color-Coded Pin (Timeline Style)</option>
                                    <option value="pin">Standard Map Pin (Green pin with initials)</option>
                                    <option value="circle">Initials Circle (Green circle badge)</option>
                                    <option value="compact">Compact Dot (Minimized green dot)</option>
                                </select>
                            </div>
                        </div>

                        {/* Admin Interactions */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} /> Popup Accordion & Interactions (Admin)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Auto-Expand Single Jobs</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Immediately open details and proximity routing when property has only 1 job</p>
                                    </div>
                                    <button onClick={() => handleAdminChange('autoExpandSingleJob', !adminSettings.autoExpandSingleJob)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: adminSettings.autoExpandSingleJob ? '#10b981' : '#64748b' }}>
                                        {adminSettings.autoExpandSingleJob ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Enable Polyline Routing Calculations</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Calculate road route and render paths on map on technician clicks</p>
                                    </div>
                                    <button onClick={() => handleAdminChange('enableRoutePathHighlight', !adminSettings.enableRoutePathHighlight)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: adminSettings.enableRoutePathHighlight ? '#10b981' : '#64748b' }}>
                                        {adminSettings.enableRoutePathHighlight ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── TECHNICIAN MAP CONFIGURATIONS ── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Tech Overlays */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={18} /> Active Map Overlay Layers (Technician)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Assigned Customers</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Display technician's assigned job customer pins on map</p>
                                    </div>
                                    <button onClick={() => handleTechChange('showCustomersLayer', !techSettings.showCustomersLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: techSettings.showCustomersLayer ? '#10b981' : '#64748b' }}>
                                        {techSettings.showCustomersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Spares Suppliers</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Display supplier stores on map to look up parts</p>
                                    </div>
                                    <button onClick={() => handleTechChange('showSuppliersLayer', !techSettings.showSuppliersLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: techSettings.showSuppliersLayer ? '#10b981' : '#64748b' }}>
                                        {techSettings.showSuppliersLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Show Live Self Location</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Overlay the technician's real-time GPS position badge</p>
                                    </div>
                                    <button onClick={() => handleTechChange('showSelfLayer', !techSettings.showSelfLayer)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: techSettings.showSelfLayer ? '#10b981' : '#64748b' }}>
                                        {techSettings.showSelfLayer ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Tech Marker Styles */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={18} /> Marker Styles & Layer Views (Technician)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Map Base Layer Style:</label>
                                <select value={techSettings.mapViewType} onChange={(e) => handleTechChange('mapViewType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="roadmap">Google Roadmap (Standard Map)</option>
                                    <option value="satellite">Google Satellite (Imagery view)</option>
                                    <option value="hybrid">Google Hybrid (Satellite + Road Labels)</option>
                                    <option value="terrain">Google Terrain (Topography & Shading)</option>
                                    <option value="dark">Dark Mode Map (CartoDB Dark Matter)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Customer Marker Design:</label>
                                <select value={techSettings.custMarkerType} onChange={(e) => handleTechChange('custMarkerType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="thin">Thin Color-Coded Pin (Timeline Style)</option>
                                    <option value="circle">Photo/Initials Circle (Standard)</option>
                                    <option value="compact-pin">Compact Map Pin</option>
                                    <option value="pin">Standard Map Pin</option>
                                    <option value="compact">Compact Dot</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 700, color: '#cbd5e1' }}>Supplier Marker Design:</label>
                                <select value={techSettings.supplierMarkerType} onChange={(e) => handleTechChange('supplierMarkerType', e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
                                    <option value="thin">Thin Color-Coded Pin (Timeline Style)</option>
                                    <option value="pin">Standard Map Pin (Green pin with initials)</option>
                                    <option value="circle">Initials Circle (Green circle badge)</option>
                                    <option value="compact">Compact Dot (Minimized green dot)</option>
                                </select>
                            </div>
                        </div>

                        {/* Tech Interactions */}
                        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} /> Popup Accordion & Interactions (Technician)
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Auto-Expand Single Jobs</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Immediately open details and proximity routing when property has only 1 job</p>
                                    </div>
                                    <button onClick={() => handleTechChange('autoExpandSingleJob', !techSettings.autoExpandSingleJob)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: techSettings.autoExpandSingleJob ? '#10b981' : '#64748b' }}>
                                        {techSettings.autoExpandSingleJob ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '14px' }}>
                                    <div>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>Enable In-App GPS Driving Routes</span>
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>Calculate road route and render paths from technician's live location on map clicks</p>
                                    </div>
                                    <button onClick={() => handleTechChange('enableRoutePathHighlight', !techSettings.enableRoutePathHighlight)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: techSettings.enableRoutePathHighlight ? '#10b981' : '#64748b' }}>
                                        {techSettings.enableRoutePathHighlight ? <ToggleRight size={38} /> : <ToggleLeft size={38} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right column: Explanatory Previews */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <HelpCircle size={16} color="#38bdf8" /> Map Legends & Colors
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#cbd5e1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', fontSize: '9px', color: '#fff' }}>C</div>
                                <div>
                                    <strong style={{ color: '#38bdf8' }}>Customers (Blue):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents job properties. Tapping reveals job details list.</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fef08a', border: '1.5px solid #eab308', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '10px' }}>🔧</div>
                                <div>
                                    <strong style={{ color: '#eab308' }}>Technicians (Yellow/Orange):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents live locations. Under the Technician tab, this represents **ME** (the local tech).</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#22c55e', border: '1.5px solid #fff', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 'bold', fontSize: '9px', color: '#fff' }}>S</div>
                                <div>
                                    <strong style={{ color: '#22c55e' }}>Suppliers (Green):</strong>
                                    <span style={{ display: 'block', color: '#94a3b8', fontSize: '10px' }}>Represents spares merchants, allowing technicians to check distance and pick up spare parts on their way.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.03)', border: '1px dashed rgba(56, 189, 248, 0.15)', borderRadius: '12px', padding: '20px', fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
                        💡 <strong>Real-time Apply:</strong> Map configurations are fetched dynamically on map tab mount. Swapping between settings will apply the next time you open the <strong>Jobs Tab &gt; Map View</strong> on Admin or Technician apps.
                    </div>
                </div>
            </div>
        </div>
    );
}
