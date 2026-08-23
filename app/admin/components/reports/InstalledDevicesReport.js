'use client'

import { useState, useEffect } from 'react';
import { Smartphone, Download, RefreshCcw, Search, CheckCircle, XCircle, Info, Copy, Check, Globe, Shield, Clock } from 'lucide-react';

export default function InstalledDevicesReport() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [activeTab, setActiveTab] = useState('tech'); // 'tech' | 'admin' | 'logins'
    const [searchTerm, setSearchTerm] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    const fetchDevicesData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/reports/installed-devices');
            const json = await res.json();
            if (json.success) {
                setData(json.data);
            } else {
                setError(json.error || 'Failed to load device reports');
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevicesData();
    }, []);

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: 'var(--spacing-md)' }}>
                <RefreshCcw className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Loading installed devices report...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 'var(--spacing-lg)', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--border-radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <span style={{ fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <XCircle size={16} /> Error Loading Report
                </span>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>{error}</span>
                <button className="btn btn-primary" onClick={fetchDevicesData} style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-xs)' }}>
                    Try Again
                </button>
            </div>
        );
    }

    const { techApp, adminApp, activity } = data || {};

    const filteredTechs = (techApp?.list || []).filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.mdmDeviceId && t.mdmDeviceId.includes(searchTerm)) ||
        (t.lastIp && t.lastIp.includes(searchTerm))
    );

    const filteredAdmins = (adminApp?.list || []).filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.fcmToken && a.fcmToken.includes(searchTerm))
    );

    const filteredActivity = (activity?.list || []).filter(log =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.deviceName && log.deviceName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.ipAddress && log.ipAddress.includes(searchTerm)) ||
        (log.appVersion && log.appVersion.includes(searchTerm))
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {/* Header section with Stats & Download APKs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                
                {/* Tech App Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '170px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, color: '#3b82f6' }}>
                        <Smartphone size={100} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Technician Mobile App</span>
                                <h3 style={{ margin: 'var(--spacing-xs) 0 0 0', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>Version {techApp?.latestVersion}</h3>
                            </div>
                            <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{techApp?.apkSize}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{techApp?.installedDevices}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Installed Devices</div>
                            </div>
                            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: '#10b981' }}>{techApp?.loggedInDevices}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Active Logins</div>
                            </div>
                        </div>
                    </div>

                    <a 
                        href="/downloads/technician-app-v9.apk" 
                        download="SortedTechnician_v9.apk"
                        className="btn btn-primary"
                        style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '8px' }}
                    >
                        <Download size={14} /> Download Technician APK
                    </a>
                </div>

                {/* Admin App Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)',
                    border: '1px solid rgba(236, 72, 153, 0.15)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '170px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, color: '#ec4899' }}>
                        <Smartphone size={100} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Admin Mobile App</span>
                                <h3 style={{ margin: 'var(--spacing-xs) 0 0 0', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>Version {adminApp?.latestVersion}</h3>
                            </div>
                            <span style={{ fontSize: '10px', background: 'rgba(236, 72, 153, 0.2)', color: '#ec4899', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{adminApp?.apkSize}</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{adminApp?.installedDevices}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Installed Devices (FCM)</div>
                            </div>
                            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: '#ec4899' }}>
                                    {activity?.list.filter(a => a.role === 'admin' && a.platform.toLowerCase().includes('app')).length || 0}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Active App Logins</div>
                            </div>
                        </div>
                    </div>

                    <a 
                        href="/downloads/admin-app.apk" 
                        download="SortedAdmin_v1.apk"
                        className="btn btn-secondary"
                        style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '8px' }}
                    >
                        <Download size={14} /> Download Admin APK
                    </a>
                </div>

                {/* Overall Session Stats Card */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    borderRadius: 'var(--border-radius-lg)',
                    padding: 'var(--spacing-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '170px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.1, color: '#10b981' }}>
                        <Globe size={100} />
                    </div>
                    <div>
                        <div>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.05em' }}>Web & App Logins Log</span>
                            <h3 style={{ margin: 'var(--spacing-xs) 0 0 0', color: 'var(--text-primary)', fontSize: 'var(--font-size-lg)' }}>Session Activity</h3>
                        </div>
                        
                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{activity?.webActiveCount || 0}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Web Sessions</div>
                            </div>
                            <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                            <div>
                                <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: '#10b981' }}>{activity?.appActiveCount || 0}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Mobile App Logins</div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={fetchDevicesData}
                        className="btn btn-secondary"
                        style={{ marginTop: 'var(--spacing-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '8px' }}
                    >
                        <RefreshCcw size={14} /> Refresh Device Metrics
                    </button>
                </div>

            </div>

            {/* Filter and Tab section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
                
                {/* Tabs & Search controls */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: 'var(--border-radius-md)' }}>
                        <button 
                            className={`btn ${activeTab === 'tech' ? 'btn-primary' : ''}`}
                            onClick={() => { setActiveTab('tech'); setSearchTerm(''); }}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                        >
                            Technician Devices ({filteredTechs.length})
                        </button>
                        <button 
                            className={`btn ${activeTab === 'admin' ? 'btn-primary' : ''}`}
                            onClick={() => { setActiveTab('admin'); setSearchTerm(''); }}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                        >
                            Registered Admins ({filteredAdmins.length})
                        </button>
                        <button 
                            className={`btn ${activeTab === 'logins' ? 'btn-primary' : ''}`}
                            onClick={() => { setActiveTab('logins'); setSearchTerm(''); }}
                            style={{ padding: '6px 12px', fontSize: 'var(--font-size-xs)' }}
                        >
                            All Active Logins ({filteredActivity.length})
                        </button>
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '280px' }}>
                        <input
                            type="text"
                            placeholder={activeTab === 'logins' ? "Search by user, platform, device..." : "Search by name, ID or IP..."}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '8px 12px 8px 32px',
                                borderRadius: 'var(--border-radius-md)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                color: 'var(--text-primary)',
                                fontSize: 'var(--font-size-xs)'
                            }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
                    </div>
                </div>

                {/* Info Tip banner */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-sm)',
                    padding: 'var(--spacing-sm)',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--border-radius-md)',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)'
                }}>
                    <Info size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        {activeTab === 'tech' ? (
                            <span><strong>Technician hardware info:</strong> Shows unique MDM hardware tokens registered on each technician profile. If a device has a <strong>session token</strong>, they are currently logged into the app.</span>
                        ) : activeTab === 'admin' ? (
                            <span><strong>Registered admin devices:</strong> Displays FCM push notification tokens generated when the admin app is opened/initialized on a physical device.</span>
                        ) : (
                            <span><strong>Active Login activity:</strong> A unified feed tracking web browser logins, mobile app sessions, device models (parsed from User Agent), IP addresses, and app versions.</span>
                        )}
                    </div>
                </div>
            </div>

            {/* List Details Table */}
            <div className="table-responsive" style={{ border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
                {activeTab === 'logins' ? (
                    <table className="table" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>User / Holder</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Role</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Platform</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Device / Browser</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>App Version</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>IP Address</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Last Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredActivity.length > 0 ? (
                                filteredActivity.map((log) => (
                                    <tr key={log.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '12px var(--spacing-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{log.userName}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)' }}>
                                            <span style={{
                                                fontSize: '10px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                textTransform: 'capitalize',
                                                background: log.role === 'admin' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                                color: log.role === 'admin' ? '#ec4899' : '#3b82f6'
                                            }}>{log.role}</span>
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-primary)' }}>{log.platform}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>{log.deviceName}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                            <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                                                {log.appVersion}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>{log.ipAddress}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            {new Date(log.lastActive).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>No active login activity recorded.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : activeTab === 'tech' ? (
                    <table className="table" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Technician Name</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>MDM Hardware ID</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Platform</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Device / Browser</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>App Version</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>Active Session</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Last IP Address</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Last Active</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>Push (FCM)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTechs.length > 0 ? (
                                filteredTechs.map((tech) => (
                                    <tr key={tech.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '12px var(--spacing-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{tech.name}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)' }}>
                                            {tech.mdmDeviceId ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <code style={{ fontSize: '10px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 4px', borderRadius: '4px' }}>{tech.mdmDeviceId}</code>
                                                    <button 
                                                        onClick={() => copyToClipboard(tech.mdmDeviceId, tech.id)} 
                                                        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
                                                        title="Copy Device ID"
                                                    >
                                                        {copiedId === tech.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No device registered</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-primary)' }}>
                                            {tech.platform !== 'N/A' ? (
                                                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {tech.platform}
                                                </span>
                                            ) : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>{tech.deviceName}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                            {tech.appVersion !== 'N/A' ? (
                                                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {tech.appVersion}
                                                </span>
                                            ) : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                            {tech.isLoggedIn ? (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 'bold', fontSize: '10px' }}>
                                                    <CheckCircle size={10} /> Active
                                                </span>
                                            ) : (
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 6px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '10px' }}>
                                                    Logged Out
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>{tech.lastIp || 'N/A'}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            {tech.lastActive ? new Date(tech.lastActive).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                backgroundColor: tech.hasFcm ? '#10b981' : '#ef4444',
                                                boxShadow: tech.hasFcm ? '0 0 8px #10b981' : 'none'
                                            }} title={tech.hasFcm ? 'Registered for push notifications' : 'Push token missing'} />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={9} style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>No technicians found matching filter.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="table" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Device Name / Holder</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>FCM Notification Token</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>Active Session</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600 }}>Registration Date</th>
                                <th style={{ padding: '12px var(--spacing-sm)', fontWeight: 600, textAlign: 'center' }}>Push (FCM)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAdmins.length > 0 ? (
                                filteredAdmins.map((admin) => (
                                    <tr key={admin.id} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                        <td style={{ padding: '12px var(--spacing-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>{admin.name}</td>
                                        <td style={{ padding: '12px var(--spacing-sm)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <code style={{ fontSize: '9px', color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)', padding: '2px 4px', borderRadius: '4px', display: 'inline-block', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {admin.fcmToken}
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(admin.fcmToken, admin.id)} 
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-secondary)' }}
                                                    title="Copy FCM Token"
                                                >
                                                    {copiedId === admin.id ? <Check size={12} style={{ color: '#10b981' }} /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center', color: 'var(--text-secondary)' }}>-</td>
                                        <td style={{ padding: '12px var(--spacing-sm)', color: 'var(--text-secondary)' }}>
                                            {new Date(admin.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                        </td>
                                        <td style={{ padding: '12px var(--spacing-sm)', textAlign: 'center' }}>
                                            <span style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                backgroundColor: '#10b981',
                                                boxShadow: '0 0 8px #10b981'
                                            }} title="Registered for push notifications" />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>No registered admin devices found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
