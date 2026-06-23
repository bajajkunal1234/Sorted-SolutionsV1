'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Phone, ChevronRight, ChevronLeft, Navigation, Briefcase, TrendingUp, Settings, User, Moon, Sun, Calendar, DollarSign, Calculator, LayoutGrid, List, Columns, Maximize, BookOpen, LayoutDashboard, X, Package, Trash2, Table, Activity, AlertCircle } from 'lucide-react';
import JobDetailView from '@/components/technician/JobDetailView';
import ExpensesList from '@/components/technician/ExpensesList';
import CalendarView from '@/components/technician/CalendarView';
import RepairCalculator from '@/components/common/RepairCalculator';
import JobsTableView from '@/components/technician/JobsTableView';
import NotificationBell from '@/components/common/NotificationBell';
import { logInteraction } from '@/lib/interactions';
import JobsSearchPanel from '@/components/shared/JobsSearchPanel';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PWAPrompt from '@/components/common/PWAPrompt';
import TechSupportTab from '@/components/technician/TechSupportTab';
import CollectPaymentFlow from '@/components/shared/CollectPaymentFlow';
import LocalityCombobox from '@/components/common/LocalityCombobox';
import { apiCall } from '@/lib/offlineSync';
import { registerPlugin } from '@capacitor/core';

const GPSBridgePlugin = typeof window !== 'undefined' && window.Capacitor
    ? registerPlugin('GPSBridgePlugin')
    : null;

function TechnicianApp() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewMode, setViewMode] = useState('kanban');

    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [groupBy, setGroupBy] = useState('none');
    const [sortBy, setSortBy] = useState('dueDate');
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTags, setActiveTags] = useState([]);
    const [savedViews, setSavedViews] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);
    const [selectedJob, setSelectedJob] = useState(null);
    const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking' | 'granted' | 'denied' | 'error'
    const [isOnline, setIsOnline] = useState(true);
    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);
    const [dutyStatusError, setDutyStatusError] = useState(null);

    const isOnlineRef = useRef(isOnline);
    useEffect(() => {
        isOnlineRef.current = isOnline;
    }, [isOnline]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleUnauthorizedLogout = () => {
            const isNative = typeof window !== 'undefined' && !!window.Capacitor;
            if (isNative && GPSBridgePlugin) {
                GPSBridgePlugin.clearTechnicianId().catch(() => {});
            }
            if (technicianId) {
                fetch('/api/customer/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'logout', technician_id: technicianId })
                }).catch(() => {});
            }
            localStorage.removeItem('technicianSession');
            localStorage.removeItem('technicianData');
            alert('You have been logged out because you logged in on another device.');
            window.location.href = '/login';
        };

        window.addEventListener('unauthorized-session-logout', handleUnauthorizedLogout);
        return () => {
            window.removeEventListener('unauthorized-session-logout', handleUnauthorizedLogout);
        };
    }, [technicianId]);

    // Offline Sync States & Listeners
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [isDeviceOnline, setIsDeviceOnline] = useState(true);
    const [apkSize, setApkSize] = useState('6.53 MB');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        fetch('/downloads/technician-app.apk', { method: 'HEAD' })
            .then(res => {
                const bytes = res.headers.get('Content-Length');
                if (bytes) {
                    const mb = (parseInt(bytes, 10) / 1000000).toFixed(2);
                    setApkSize(`${mb} MB`);
                }
            })
            .catch(err => console.warn('Could not fetch APK size:', err));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setIsDeviceOnline(navigator.onLine);

        const handleOnline = () => setIsDeviceOnline(true);
        const handleOffline = () => setIsDeviceOnline(false);
        const handleQueueChange = (e) => setPendingSyncCount(e.detail.count || 0);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-queue-changed', handleQueueChange);

        const initialQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
        setPendingSyncCount(initialQueue.length);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-queue-changed', handleQueueChange);
        };
    }, []);

    // Columns Visibility for Table View
    const [visibleColumns, setVisibleColumns] = useState({
        job: true,
        customer: true,
        locality: true,
        brand: true,
        dueDate: true,
        visited: true,
        quotation: true,
        invoice: true,
        status: true,
        appliance: true,
        applianceType: true
    });
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);

    // Close column dropdown on click outside
    useEffect(() => {
        if (!showColumnDropdown) return;
        const handleOutsideClick = (e) => {
            if (!e.target.closest('.column-toggler-container-tech')) {
                setShowColumnDropdown(false);
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showColumnDropdown]);
    const [calculatorJob, setCalculatorJob] = useState(null); // job to open in RepairCalculator
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('techDarkMode');
            return saved === null ? true : saved === 'true';
        }
        return true;
    });
    const [showCollectPayment, setShowCollectPayment] = useState(false);
    const [showJobSelectorModal, setShowJobSelectorModal] = useState(false);
    const [showPurchaseJobSelectorModal, setShowPurchaseJobSelectorModal] = useState(false);
    const [purchaseJob, setPurchaseJob] = useState(null);
    const [showPurchaseCalculator, setShowPurchaseCalculator] = useState(false);
    const [pendingPurchaseItems, setPendingPurchaseItems] = useState(null);
    const [showPurchaseNotesModal, setShowPurchaseNotesModal] = useState(false);
    const [purchaseVendorName, setPurchaseVendorName] = useState('');
    const [purchaseNotes, setPurchaseNotes] = useState('');

    // Spare part supplier search & create states
    const [suppliers, setSuppliers] = useState([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [isNewSupplier, setIsNewSupplier] = useState(false);
    const [newSupplierName, setNewSupplierName] = useState('');
    const [newSupplierPhone, setNewSupplierPhone] = useState('');
    const [newSupplierLocality, setNewSupplierLocality] = useState('');
    const [newSupplierPincode, setNewSupplierPincode] = useState('');
    const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [purchasePaidBy, setPurchasePaidBy] = useState('company'); // company or technician
    
    const supplierContainerRef = useRef(null);

    const fetchSuppliers = async () => {
        try {
            setSuppliersLoading(true);
            const { data, error } = await supabase
                .from('accounts')
                .select('id, name, mobile, phone, address')
                .eq('under', 'spare-parts-suppliers')
                .neq('status', 'archived')
                .order('name', { ascending: true });
            
            if (error) throw error;
            setSuppliers(data || []);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
        } finally {
            setSuppliersLoading(false);
        }
    };

    useEffect(() => {
        if (showPurchaseNotesModal) {
            fetchSuppliers();
            setSelectedSupplier(null);
            setIsNewSupplier(false);
            setNewSupplierName('');
            setNewSupplierPhone('');
            setNewSupplierLocality('');
            setNewSupplierPincode('');
            setSupplierSearchQuery('');
            setShowSupplierDropdown(false);
            setPurchaseVendorName('');
            setPurchasePaidBy('company');
        }
    }, [showPurchaseNotesModal]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (supplierContainerRef.current && !supplierContainerRef.current.contains(e.target)) {
                setShowSupplierDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const [dashboardView, setDashboardView] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('techDashboardView') || 'grid';
        return 'grid';
    });
    useEffect(() => {
        if (typeof window !== 'undefined') localStorage.setItem('techDashboardView', dashboardView);
    }, [dashboardView]);

    const [repeatCallsCount, setRepeatCallsCount] = useState(0);
    const [showPurchaseRequestsList, setShowPurchaseRequestsList] = useState(false);
    const [purchaseRequests, setPurchaseRequests] = useState([]);
    const [purchaseRequestsLoading, setPurchaseRequestsLoading] = useState(false);

    // Apply dark mode theme class initially and on change
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (darkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        }
    }, [darkMode]);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showSupport, setShowSupport] = useState(false);
    const [leaveStartDate, setLeaveStartDate] = useState('');
    const [leaveEndDate, setLeaveEndDate] = useState('');
    const [leaveReason, setLeaveReason] = useState('');
    const [technicianData, setTechnicianData] = useState(null);
    const [technicianId, setTechnicianId] = useState(null);
    
    const firstName = technicianData?.name ? technicianData.name.split(' ')[0] : 'Technician';

    // Incentive Data State
    const [incentiveData, setIncentiveData] = useState({
        metrics: {
            jobsCompleted: 0,
            revenueGenerated: 0,
            rating: 0
        },
        incentive: {
            total: 0,
            breakdown: []
        },
        period: ''
    });

    // Check authentication and get technician ID
    useEffect(() => {
        const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
        const storedTechData = localStorage.getItem('technicianData') || sessionStorage.getItem('technicianData');

        if (!session) {
            router.push('/login');
            return;
        }

        try {
            const sessionData = JSON.parse(session);
            const techData = JSON.parse(storedTechData);
            setTechnicianId(sessionData.technicianId);
            setTechnicianData(techData);
        } catch (err) {
            console.error('Error parsing session:', err);
            router.push('/login');
        }
    }, [router]);

    // ── Request push notification permission once logged in ────────────────
    usePushNotifications({ userType: 'technician', userId: technicianId });

    const checkGpsAndPingLocation = async () => {
        if (!technicianId) return;

        const isNative = typeof window !== 'undefined' && !!window.Capacitor;

        // 1. If native, bypass GPS check and never block the app UI
        if (isNative) {
            setGpsStatus('granted');
            return;
        }

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGpsStatus('error');
            return;
        }

        const isWorkingHoursCheck = () => {
            const now = new Date();
            const hours = now.getHours();
            return hours >= 8 && hours < 21; // 8:00 AM to 9:00 PM
        };

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                setGpsStatus('granted');
                try {
                    localStorage.setItem('lastKnownCoordinates', JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                } catch (e) {}
                // Web/PWA: post coordinates.
                if (!isNative) {
                    const activeWorkingHours = isWorkingHoursCheck();
                    const currentOnline = isOnlineRef.current;
                    const pingOnline = activeWorkingHours ? currentOnline : false;
                    const pingPrecision = pingOnline ? 'precise' : 'approx';

                    let sessionToken = null;
                    try {
                        const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                        if (session) {
                            sessionToken = JSON.parse(session).session_token;
                        }
                    } catch (e) {}

                    let batteryLevel = null;
                    if (typeof navigator !== 'undefined' && navigator.getBattery) {
                        try {
                            const battery = await navigator.getBattery();
                            batteryLevel = Math.round(battery.level * 100);
                        } catch (e) {}
                    }

                    let connectivityStatus = 'online';
                    if (typeof navigator !== 'undefined') {
                        if (!navigator.onLine) {
                            connectivityStatus = 'offline';
                        } else if (navigator.connection) {
                            const connType = navigator.connection.type || navigator.connection.effectiveType || 'unknown';
                            if (connType.includes('wifi')) {
                                connectivityStatus = 'WiFi';
                            } else if (connType.includes('cellular') || ['4g', '3g', '2g'].includes(connType)) {
                                connectivityStatus = 'Cellular';
                            } else {
                                connectivityStatus = connType;
                            }
                        }
                    }

                    try {
                        const res = await fetch('/api/technician/location', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                ...(sessionToken ? { 'x-session-token': sessionToken } : {})
                            },
                            body: JSON.stringify({
                                technician_id: technicianId,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                                is_on_job: false,
                                tracking_source: 'web',
                                is_online: pingOnline,
                                location_precision: pingPrecision,
                                session_token: sessionToken,
                                battery_level: batteryLevel,
                                connectivity_status: connectivityStatus
                            }),
                        });
                        if (res.status === 401) {
                            window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
                        }
                    } catch (err) {
                        console.warn('Failed to post location ping:', err);
                    }
                }
            },
            (err) => {
                console.warn('GPS check failed:', err);
                if (err.code === 1) {
                    setGpsStatus('denied');
                } else {
                    setGpsStatus('error');
                }
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
        );
    };

    const handleGpsRetry = async () => {
        const isNative = typeof window !== 'undefined' && !!window.Capacitor;
        if (isNative && GPSBridgePlugin) {
            try {
                if (gpsStatus === 'error') {
                    await GPSBridgePlugin.openLocationSettings();
                } else if (gpsStatus === 'denied') {
                    await GPSBridgePlugin.openAppSettings();
                }
            } catch (err) {
                console.warn('Failed to open settings:', err);
            }
        }
        checkGpsAndPingLocation();
    };

    const isWorkingHours = () => {
        const now = new Date();
        const hours = now.getHours();
        return hours >= 8 && hours < 21; // 8:00 AM - 9:00 PM
    };

    const getTodayLocalString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isSupposedToBeOnDutyToday = () => {
        const todayStr = getTodayLocalString();
        const isSunday = new Date().getDay() === 0;
        if (isSunday) return false;

        const hasApprovedLeave = leaves.some(
            (leave) => leave.leave_date === todayStr && leave.status === 'approved'
        );
        return !hasApprovedLeave;
    };

    const updateOnlineStatus = async (status) => {
        setIsOnline(status);
        
        const isNative = typeof window !== 'undefined' && !!window.Capacitor;
        if (isNative && GPSBridgePlugin) {
            try {
                await GPSBridgePlugin.setOnlineStatus({ isOnline: status });
            } catch (err) {
                console.error('[GPSBridge] Failed to set online status:', err);
            }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const trackingSource = isNative ? 'native_service' : 'web';
                    const precision = status ? 'precise' : 'approx';
                    
                    fetch('/api/technician/location', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            technician_id: technicianId,
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            is_on_job: false,
                            tracking_source: trackingSource,
                            is_online: status,
                            location_precision: precision
                        }),
                    }).catch((err) => console.error('Error posting location on toggle:', err));
                },
                (err) => {
                    console.warn('Error getting location on toggle:', err);
                    supabase
                        .from('technician_live_locations')
                        .update({ 
                            is_online: status,
                            location_precision: status ? 'precise' : 'approx',
                            updated_at: new Date().toISOString()
                        })
                        .eq('technician_id', technicianId)
                        .then(({ error }) => {
                            if (error) console.error('Error updating live location status:', error);
                        });
                },
                { 
                    enableHighAccuracy: status,
                    timeout: 10000, 
                    maximumAge: 30000 
                }
            );
        } else {
            const { error } = await supabase
                .from('technician_live_locations')
                .update({ 
                    is_online: status,
                    location_precision: status ? 'precise' : 'approx',
                    updated_at: new Date().toISOString()
                })
                .eq('technician_id', technicianId);
            if (error) console.error('Error updating live location status fallback:', error);
        }
    };

    const handleToggleOnline = async () => {
        const newStatus = !isOnline;
        if (newStatus) {
            if (!isWorkingHours()) {
                setDutyStatusError("You cannot go online outside working hours (8:00 AM - 9:00 PM).");
                setTimeout(() => setDutyStatusError(null), 5000);
                return;
            }
        }
        setDutyStatusError(null);
        await updateOnlineStatus(newStatus);
    };

    // Fetch initial online status and leaves
    useEffect(() => {
        if (!technicianId) return;

        const loadInitialData = async () => {
            try {
                // Fetch online status
                const { data, error } = await supabase
                    .from('technician_live_locations')
                    .select('is_online')
                    .eq('technician_id', technicianId)
                    .maybeSingle();
                
                if (error) {
                    console.error('Error fetching online status:', error);
                } else if (data) {
                    setIsOnline(data.is_online !== false);
                    const isNative = typeof window !== 'undefined' && !!window.Capacitor;
                    if (isNative && GPSBridgePlugin) {
                        GPSBridgePlugin.setOnlineStatus({ isOnline: data.is_online !== false })
                            .catch(err => console.error('[Native GPS] setOnlineStatus failed on mount:', err));
                    }
                }

                // Fetch leaves
                setLeavesLoading(true);
                const leavesRes = await apiCall(`/api/technician/leaves?technicianId=${technicianId}`);
                const leavesJson = await leavesRes.json();
                if (leavesJson && leavesJson.success) {
                    setLeaves(leavesJson.leaves || []);
                }
            } catch (err) {
                console.error('Error loading initial data:', err);
            } finally {
                setLeavesLoading(false);
            }
        };

        loadInitialData();
    }, [technicianId]);

    // ── Silent background location tracking ──────────────────────────────────
    // Tracks technician coordinates.
    // Uses native background service on mobile app, falls back to browser setInterval on web.
    useEffect(() => {
        if (!technicianId) return;

        const isNative = typeof window !== 'undefined' && !!window.Capacitor;

        // Run foreground check immediately to verify status and set block screens
        checkGpsAndPingLocation();

        let pingInterval;

        if (!isNative) {
            // Web fallback: ping every 60s
            pingInterval = setInterval(checkGpsAndPingLocation, 60_000);
        }

        return () => {
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [technicianId]);

    // Start native background service only after GPS/location permission is granted
    useEffect(() => {
        if (!technicianId || gpsStatus !== 'granted') return;

        const isNative = typeof window !== 'undefined' && !!window.Capacitor;

        if (isNative && GPSBridgePlugin) {
            let sessionToken = null;
            try {
                const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                if (session) {
                    sessionToken = JSON.parse(session).session_token;
                }
            } catch (e) {}

            GPSBridgePlugin.setTechnicianId({ id: String(technicianId), sessionToken: sessionToken })
                .then(() => console.log('[Native GPS] Technician ID registered on native service'))
                .catch(err => console.error('[Native GPS] Failed to register technician ID:', err));
        }
    }, [technicianId, gpsStatus]);

    // Load saved views from Supabase after technicianId is ready
    useEffect(() => {
        if (!technicianId) return;
        const loadViews = async () => {
            try {
                const res = await apiCall(`/api/technician/job-views?technicianId=${technicianId}`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setSavedViews(json.data);
                    const def = json.data.find(v => v.isDefault);
                    if (def) applyViewConfig(def.config);
                }
            } catch (err) {
                console.warn('Could not load saved views:', err);
            }
        };
        loadViews();
    }, [technicianId]);


    const applyViewConfig = (config) => {
        if (!config) return;
        if (config.groupBy)    setGroupBy(config.groupBy);
        if (config.sortBy)     setSortBy(config.sortBy);
        if (config.sortOrder)  setSortOrder(config.sortOrder);
        if (config.activeTags) setActiveTags(config.activeTags);
    };

    const fetchRepeatCalls = async () => {
        if (!technicianId) return;
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('id')
                .eq('technician_id', technicianId)
                .eq('warranty', true);
            
            if (error) throw error;
            setRepeatCallsCount(data ? data.length : 0);
        } catch (err) {
            console.error('Error fetching repeat calls count:', err);
        }
    };

    const fetchPurchaseRequests = async () => {
        if (!technicianId) return;
        try {
            setPurchaseRequestsLoading(true);
            const { data, error } = await supabase
                .from('purchase_invoices')
                .select('*')
                .eq('po_reference', technicianId)
                .order('date', { ascending: false });
            
            if (error) throw error;
            setPurchaseRequests(data || []);
        } catch (err) {
            console.error('Error fetching purchase requests:', err);
        } finally {
            setPurchaseRequestsLoading(false);
        }
    };

    // Fetch jobs and incentives when technician ID is available
    useEffect(() => {
        if (!technicianId) return;

        const fetchJobs = async () => {
            try {
                setLoading(true);
                const response = await apiCall(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch jobs');
                }

                const data = await response.json();
                setJobs(data.jobs || []);
                setError(null);
            } catch (err) {
                console.error('Error fetching jobs:', err);
                setError('Failed to load jobs. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        const fetchIncentives = async () => {
            try {
                const response = await apiCall(`/api/technician/incentives?technicianId=${technicianId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setIncentiveData(data.data);
                    }
                }
            } catch (err) {
                console.error('Error fetching incentives:', err);
            }
        };

        const fetchProfile = async () => {
            try {
                const response = await apiCall(`/api/technician/profile?technicianId=${technicianId}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setTechnicianData(data.technician);
                        // Update local storage to keep it fresh
                        localStorage.setItem('technicianData', JSON.stringify(data.technician));
                    }
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchJobs();
        fetchIncentives();
        fetchProfile();
        fetchRepeatCalls();
        fetchPurchaseRequests();

        // Listen for offline sync completion to reload jobs list
        const handleSyncComplete = () => {
            fetchJobs();
        };
        window.addEventListener('offline-sync-complete', handleSyncComplete);

        // 5-minute polling — fallback in case Supabase realtime misses an event
        // Realtime handles instant updates; polling is just a safety net
        const pollInterval = setInterval(() => {
            fetchJobs();
            fetchRepeatCalls();
        }, 300000);

        // Setup real-time listener (best-effort; polling handles missed events)
        const channel = supabase
            .channel(`technician:jobs:${technicianId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'jobs',
                    filter: `technician_id=eq.${technicianId}`
                },
                () => { 
                    fetchJobs(); 
                    fetchRepeatCalls();
                }
            )
            .subscribe();

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener('offline-sync-complete', handleSyncComplete);
            supabase.removeChannel(channel);
        };
    }, [technicianId]);

    // Logout handler
    const handleLogout = async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            const isNative = typeof window !== 'undefined' && !!window.Capacitor;
            if (isNative && GPSBridgePlugin) {
                try {
                    await GPSBridgePlugin.clearTechnicianId();
                } catch (err) {
                    console.error('Failed to clear native GPS settings on logout:', err);
                }
            }
            localStorage.removeItem('technicianSession');
            localStorage.removeItem('technicianData');
            // Force a hard reload to clear any in-memory state
            window.location.href = '/login';
        }
    };

    // Calculate time left to due
    const getTimeLeft = (dueDate) => {
        if (!dueDate) return { text: 'No Due Date', color: '#6b7280', urgent: false };
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (diff < 0) return { text: 'Overdue', color: '#ef4444', urgent: true };
        if (hours < 2) return { text: `${hours}h ${minutes}m`, color: '#ef4444', urgent: true };
        if (hours < 6) return { text: `${hours}h ${minutes}m`, color: '#f59e0b', urgent: false };
        return { text: `${hours}h ${minutes}m`, color: '#10b981', urgent: false };
    };

    // Get status badge color (9 canonical statuses)
    const getStatusColor = (status) => {
        const colors = {
            'new_job_request':   '#3b82f6',
            'scheduled':         '#06b6d4',
            'diagnosing_quoting':'#f59e0b',
            'quotation_sent':    '#8b5cf6',
            'parts_ordered':     '#f97316',
            'work_in_progress':  '#10b981',
            'cx_reschedule':     '#ec4899',
            'cancelled':         '#ef4444',
            'closed':            '#6b7280',
        };
        return colors[status] || '#6b7280';
    };

    // Get priority badge
    const getPriorityBadge = (priority) => {
        const badges = {
            'urgent': { text: '🔴 URGENT', color: '#ef4444' },
            'high': { text: '🟡 HIGH', color: '#f59e0b' },
            'normal': { text: '🟢 NORMAL', color: '#10b981' },
            'low': { text: '⚪ LOW', color: '#6b7280' }
        };
        return badges[priority] || badges.normal;
    };

    // Apply filters — closed/cancelled already excluded by API
    const filteredJobs = jobs.filter(job => {

        const matchesSearch = !searchTerm ||
            (job.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.brand?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.product?.type?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.locality?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (job.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        for (const tag of activeTags) {
            if (tag.type === 'preset') {
                const f = tag.filter;
                if (f._preset === 'dueToday') {
                    const d = new Date(job.dueDate);
                    if (d.toDateString() !== new Date().toDateString()) return false;
                } else if (f._preset === 'overdue') {
                    const d = new Date(job.dueDate); d.setHours(0,0,0,0);
                    const today = new Date(); today.setHours(0,0,0,0);
                    if (!(d < today)) return false;
                } else {
                    if (f.status   && job.status !== f.status) return false;
                    if (f.priority && (job.priority || 'normal') !== f.priority) return false;
                }
            } else if (tag.type === 'custom' && tag.conditions) {
                for (const cond of tag.conditions) {
                    let fieldVal = '';
                    switch (cond.field) {
                        case 'status':      fieldVal = job.status || ''; break;
                        case 'priority':    fieldVal = job.priority || 'normal'; break;
                        case 'locality':    fieldVal = job.locality || ''; break;
                        case 'customer':    fieldVal = job.customerName || ''; break;
                        case 'dueDate':     fieldVal = job.dueDate || ''; break;
                        case 'createdDate': fieldVal = job.created_at || ''; break;
                        default: fieldVal = '';
                    }
                    const v = cond.value.toLowerCase();
                    const fv = (fieldVal || '').toLowerCase();
                    let passes = true;
                    switch (cond.operator) {
                        case 'is':           passes = fv === v; break;
                        case 'is_not':       passes = fv !== v; break;
                        case 'contains':     passes = fv.includes(v); break;
                        case 'not_contains': passes = !fv.includes(v); break;
                        case 'before':       passes = !!fieldVal && new Date(fieldVal) < new Date(cond.value); break;
                        case 'after':        passes = !!fieldVal && new Date(fieldVal) > new Date(cond.value); break;
                    }
                    if (!passes) return false;
                }
            }
        }
        return true;
    });

    // Sort jobs
    const sortedJobs = [...filteredJobs].sort((a, b) => {
        let aVal, bVal;
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        switch (sortBy) {
            case 'dueDate':
                aVal = new Date(a.dueDate || a.scheduled_date || 0);
                bVal = new Date(b.dueDate || b.scheduled_date || 0);
                break;
            case 'createdAt':
                aVal = new Date(a.created_at || a.createdAt || 0);
                bVal = new Date(b.created_at || b.createdAt || 0);
                break;
            case 'customer':
                aVal = (a.customerName || '').toLowerCase();
                bVal = (b.customerName || '').toLowerCase();
                break;
            case 'priority':
                aVal = priorityOrder[a.priority] ?? 2;
                bVal = priorityOrder[b.priority] ?? 2;
                break;
            case 'locality':
                aVal = (a.locality || '').toLowerCase();
                bVal = (b.locality || '').toLowerCase();
                break;
            case 'jobName':
                aVal = (a.description || a.jobName || '').toLowerCase();
                bVal = (b.description || b.jobName || '').toLowerCase();
                break;
            case 'brand':
                aVal = (a.brand?.name || a.brand || '').toLowerCase();
                bVal = (b.brand?.name || b.brand || '').toLowerCase();
                break;
            case 'appliance':
                aVal = (a.appliance || a.product?.name || '').toLowerCase();
                bVal = (b.appliance || b.product?.name || '').toLowerCase();
                break;
            case 'applianceType':
                aVal = (a.subcategory || a.product?.type || '').toLowerCase();
                bVal = (b.subcategory || a.product?.type || '').toLowerCase();
                break;
            case 'status':
                aVal = (a.status || '').toLowerCase();
                bVal = (b.status || '').toLowerCase();
                break;
            case 'visited':
                aVal = a.arrived_at ? 1 : 0;
                bVal = b.arrived_at ? 1 : 0;
                break;
            case 'quotation':
                aVal = parseFloat(a.quotations?.[0]?.total_amount || 0);
                bVal = parseFloat(b.quotations?.[0]?.total_amount || 0);
                break;
            case 'invoice':
                aVal = parseFloat(a.sales_invoices?.[0]?.total_amount || 0);
                bVal = parseFloat(b.sales_invoices?.[0]?.total_amount || 0);
                break;
            default:
                return 0;
        }
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const effectiveGroupBy = viewMode === 'kanban' && (groupBy === 'none' || !groupBy) ? 'status' : (groupBy || 'none');

    // Group sorted jobs
    const groupedJobs = {};
    sortedJobs.forEach(job => {
        let key;
        if (effectiveGroupBy === 'status') {
            key = job.status ? job.status.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Unknown';
        } else if (effectiveGroupBy === 'due-date') {
            if (!job.dueDate) { key = 'No Date'; }
            else {
                const d = new Date(job.dueDate);
                d.setHours(0, 0, 0, 0);
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
                if (d < today) key = 'Overdue';
                else if (d.getTime() === today.getTime()) key = 'Today';
                else if (d.getTime() === tomorrow.getTime()) key = 'Tomorrow';
                else key = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            }
        } else if (effectiveGroupBy === 'priority') {
            const pMap = { urgent: '🔴 Urgent', high: '🟡 High', normal: '🟢 Normal', low: '⚪ Low' };
            key = pMap[job.priority] || '🟢 Normal';
        } else if (effectiveGroupBy === 'locality') {
            key = job.locality || job.city || 'Unknown Area';
        } else if (effectiveGroupBy === 'customer') {
            key = job.customerName || 'Walk-in';
        } else if (effectiveGroupBy === 'warranty') {
            key = job.product?.warranty?.status === 'in-warranty' ? 'In Warranty' : 'Out of Warranty';
        } else {
            key = 'All Jobs';
        }

        if (!groupedJobs[key]) groupedJobs[key] = [];
        groupedJobs[key].push(job);
    });

    // ── Named View Helpers ────────────────────────────────────────
    const uid = () => Math.random().toString(36).slice(2, 9);

    const persistViews = async (views) => {
        setSavedViews(views);
        try {
            await apiCall('/api/technician/job-views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ technicianId, views }),
            });
        } catch (e) { console.error('persist views failed', e); }
    };

    const handleSaveNamedView = async (name) => {
        setSaveStatus('saving');
        const config = { groupBy, sortBy, sortOrder, activeTags };
        const existing = savedViews.find(v => v.name.toLowerCase() === name.toLowerCase());
        let updated;
        if (existing) {
            updated = savedViews.map(v => v.name.toLowerCase() === name.toLowerCase() ? { ...v, config } : v);
        } else {
            const isFirst = savedViews.length === 0;
            updated = [...savedViews, { id: uid(), name, isDefault: isFirst, config }];
        }
        await persistViews(updated);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 2000);
    };

    const handleApplyView = (view) => applyViewConfig(view.config);

    const handleDeleteView = async (id) => {
        const updated = savedViews.filter(v => v.id !== id);
        if (savedViews.find(v => v.id === id)?.isDefault && updated.length > 0) {
            updated[0] = { ...updated[0], isDefault: true };
        }
        await persistViews(updated);
    };

    const handleSetDefaultView = async (id) => {
        await persistViews(savedViews.map(v => ({ ...v, isDefault: v.id === id })));
    };

    const handleResetView = () => {
        setGroupBy('status');
        setSortBy('dueDate');
        setSortOrder('asc');
        setActiveTags([]);
        setSearchTerm('');
    };

    const handleCallCustomer = (mobile, customerName = 'Customer', jobId = null, customerId = null) => {
        if (!isOnline) {
            alert('Please go online to call customers.');
            return;
        }
        if (!isWorkingHours()) {
            alert('Calling customers is only allowed during working hours (8:00 AM - 9:00 PM).');
            return;
        }
        window.location.href = `tel:${mobile}`;
    };

    const handleOpenJob = (job) => {
        setSelectedJob(job);
    };

    const handleViewLocation = (job) => {
        const addr = encodeURIComponent(job.address || job.locality || job.customerName);
        window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
    };

    const submitPurchaseInvoice = async () => {
        if (isNewSupplier) {
            if (!newSupplierName.trim()) {
                alert('Please enter Supplier / Shop Name');
                return;
            }
            const phoneClean = newSupplierPhone.trim().replace(/\D/g, '');
            if (!phoneClean) {
                alert('Please enter Mobile / Phone Number');
                return;
            }
            if (phoneClean.length !== 10) {
                alert('Please enter a valid 10-digit mobile number');
                return;
            }
            if (!newSupplierLocality || newSupplierLocality === '') {
                alert('Please select Supplier Locality');
                return;
            }
        } else {
            if (!selectedSupplier) {
                alert('Please select an existing Supplier or choose Add New Supplier');
                return;
            }
        }
        if (!pendingPurchaseItems || pendingPurchaseItems.length === 0) return;
        
        try {
            const itemsList = pendingPurchaseItems.map(item => {
                const itemSubtotal = item.qty * item.rate;
                return {
                    ...item,
                    taxRate: 0,
                    total: itemSubtotal
                };
            });

            const subtotal = itemsList.reduce((sum, item) => sum + (item.qty * item.rate), 0);
            const totalTax = 0;
            const cgst = 0;
            const sgst = 0;
            const igst = 0;
            const totalAmount = subtotal;

            const nameOfTech = technicianData?.name || 'Technician';
            const techNotes = purchaseNotes.trim();
            const formattedNotes = `Technician: ${nameOfTech}${techNotes ? ` | Notes: ${techNotes}` : ''}`;

            let accountId = null;
            let vendorName = '';
            let billingAddress = '';
            
            if (isNewSupplier) {
                vendorName = newSupplierName.trim();
                billingAddress = JSON.stringify({
                    name: newSupplierName.trim(),
                    phone: newSupplierPhone.trim(),
                    locality: newSupplierLocality,
                    pincode: newSupplierPincode,
                    isSuggested: true
                });
            } else {
                accountId = selectedSupplier.id;
                vendorName = selectedSupplier.name;
                billingAddress = selectedSupplier.billing_address || '';
            }

            const purchaseData = {
                reference: 'Technician Purchase',
                status: 'draft',
                account_id: accountId,
                account_name: vendorName,
                po_reference: technicianId || '',
                notes: formattedNotes,
                job_id: purchaseJob?.id || null,
                items: itemsList,
                subtotal,
                discount: 0,
                cgst,
                sgst,
                igst,
                total_tax: totalTax,
                total_amount: totalAmount,
                date: new Date().toISOString().split('T')[0],
                vendor_invoice_number: '',
                paid_by: purchasePaidBy,
                billing_address: billingAddress
            };

            const response = await apiCall('/api/admin/transactions?type=purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(purchaseData)
            });

            const result = await response.json();
            if (result.success) {
                alert('✅ Purchase invoice draft created successfully! Admin will review and post it.');
                fetchPurchaseRequests();

                // Send Supabase realtime broadcast
                const channel = supabase.channel('realtime:technician_updates');
                channel.subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.send({
                            type: 'broadcast',
                            event: 'purchase_submitted',
                            payload: { technicianId }
                        });
                        supabase.removeChannel(channel);
                    }
                });

                if (purchaseJob?.id) {
                    const sendLog = (lat = null, lng = null) => {
                        const metadata = lat && lng ? { latitude: lat, longitude: lng } : {};
                        apiCall(`/api/technician/jobs/${purchaseJob.id}/interactions`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'purchase-invoice-created',
                                category: 'billing',
                                description: `Technician spare purchase draft of ₹${totalAmount.toLocaleString('en-IN')} created`,
                                user_name: nameOfTech,
                                customer_id: purchaseJob.customerId || null,
                                metadata
                            })
                        }).catch(() => {});
                    };

                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => sendLog(pos.coords.latitude, pos.coords.longitude),
                            () => sendLog(),
                            { timeout: 5000, enableHighAccuracy: true }
                        );
                    } else {
                        sendLog();
                    }
                }
            } else {
                throw new Error(result.error || 'Failed to create purchase invoice');
            }
        } catch (err) {
            console.error('Error submitting purchase invoice:', err);
            alert('Failed to submit purchase invoice: ' + err.message);
        } finally {
            setShowPurchaseNotesModal(false);
            setPendingPurchaseItems(null);
            setPurchaseVendorName('');
            setPurchaseNotes('');
            setPurchaseJob(null);
            setSelectedSupplier(null);
            setIsNewSupplier(false);
            setNewSupplierName('');
            setNewSupplierPhone('');
            setNewSupplierLocality('');
            setNewSupplierPincode('');
            setSupplierSearchQuery('');
            setShowSupplierDropdown(false);
            setPurchasePaidBy('company');
        }
    };

    const handleDeletePurchaseRequest = async (id) => {
        if (!confirm('Are you sure you want to delete this purchase request? This action cannot be undone.')) {
            return;
        }
        try {
            const response = await apiCall(`/api/admin/transactions?type=purchase&id=${id}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (data.success) {
                alert('✅ Purchase request deleted successfully!');
                fetchPurchaseRequests();
            } else {
                throw new Error(data.error || 'Failed to delete purchase request');
            }
        } catch (err) {
            console.error('Error deleting purchase request:', err);
            alert('Error deleting purchase request: ' + err.message);
        }
    };

    // Jobs Tab Content
    const renderJobsTab = () => (
        <>
            <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-primary)' }}>
                <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', margin: 0 }}>
                    <Briefcase size={24} color="#3b82f6" />
                    {firstName}'s Jobs
                </h2>
            </div>
            {/* ── Search Panel ── */}
            <div style={{
                padding: '8px 10px',
                backgroundColor: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border-primary)',
            }}>
                <JobsSearchPanel
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    sortOrder={sortOrder}
                    onSortOrderChange={setSortOrder}
                    activeTags={activeTags}
                    onAddTag={(tag) => setActiveTags(prev => [...prev.filter(t => t.id !== tag.id), tag])}
                    onRemoveTag={(id) => setActiveTags(prev => prev.filter(t => t.id !== id))}
                    savedViews={savedViews}
                    onSaveNamedView={handleSaveNamedView}
                    onApplyView={handleApplyView}
                    onDeleteView={handleDeleteView}
                    onSetDefaultView={handleSetDefaultView}
                    saveStatus={saveStatus}
                    onResetView={handleResetView}
                    showAssignee={false}
                    groupByOptions={[
                        { value: 'none',     label: 'None' },
                        { value: 'status',   label: 'Status' },
                        { value: 'due-date', label: 'Due Date' },
                        { value: 'priority', label: 'Priority' },
                        { value: 'locality', label: 'Locality' },
                        { value: 'customer', label: 'Customer' },
                        { value: 'warranty', label: 'Warranty' },
                    ]}
                    sortByOptions={[
                        { value: 'dueDate',       label: 'Due Date' },
                        { value: 'createdAt',     label: 'Creation Date' },
                        { value: 'jobName',       label: 'Job Name' },
                        { value: 'customer',      label: 'Customer' },
                        { value: 'priority',      label: 'Priority' },
                        { value: 'locality',      label: 'Locality' },
                        { value: 'brand',         label: 'Brand' },
                        { value: 'appliance',     label: 'Appliance' },
                        { value: 'applianceType', label: 'Appliance Type' },
                        { value: 'status',        label: 'Status' },
                        { value: 'visited',       label: 'Visited' },
                        { value: 'quotation',     label: 'Quotation' },
                        { value: 'invoice',       label: 'Invoice' },
                    ]}
                />
                {/* Count + Refresh */}
                {/* View Options + Count + Refresh */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                    
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-primary)' }}>
                        <button onClick={() => setViewMode('card')} title="Card View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'card' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'card' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <LayoutGrid size={16} />
                        </button>
                        <button onClick={() => setViewMode('list')} title="List View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'list' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'list' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <List size={16} />
                        </button>
                        <button onClick={() => setViewMode('kanban')} title="Kanban View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'kanban' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'kanban' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'kanban' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Columns size={16} />
                        </button>
                        <button onClick={() => setViewMode('table')} title="Table View" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'table' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'table' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                            <Table size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {sortedJobs.length} active jobs
                        </span>

                        {/* Columns Selection Dropdown (Table View only) */}
                        {viewMode === 'table' && (
                            <div className="column-toggler-container-tech" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowColumnDropdown(!showColumnDropdown);
                                    }}
                                    style={{
                                        padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                                        border: '1px solid var(--border-primary)', borderRadius: '5px',
                                        backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <Settings size={12} />
                                    <span>Columns</span>
                                </button>
                                {showColumnDropdown && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '4px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-primary)',
                                        borderRadius: 'var(--radius-md)',
                                        boxShadow: 'var(--shadow-lg)',
                                        padding: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        minWidth: '160px',
                                        zIndex: 110
                                    }}>
                                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', padding: '2px 8px', borderBottom: '1px solid var(--border-primary)', marginBottom: '4px' }}>
                                            Toggle Columns
                                        </div>
                                        {Object.keys(visibleColumns).map(col => (
                                            <label
                                                key={col}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns[col]}
                                                    onChange={() => setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ textTransform: 'capitalize' }}>
                                                    {col === 'dueDate' ? 'Due Date' : col === 'visited' ? 'Visited?' : col === 'applianceType' ? 'Appliance Type' : col}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setLoading(true);
                                fetch(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`)
                                    .then(r => r.json())
                                    .then(d => { setJobs(d.jobs || []); setError(null); })
                                    .catch(() => setError('Failed to refresh.'))
                                    .finally(() => setLoading(false));
                            }}
                            title="Refresh jobs"
                            style={{
                                padding: '3px 8px', fontSize: '11px', cursor: 'pointer',
                                border: '1px solid var(--border-primary)', borderRadius: '5px',
                                backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                        >
                            ↻ Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--spacing-sm)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--spacing-sm)' }}>
                            Loading jobs...
                        </div>
                    </div>
                ) : error ? (
                    <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        color: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        margin: 'var(--spacing-md)'
                    }}>
                        <div style={{ fontSize: 'var(--font-size-base)', marginBottom: 'var(--spacing-sm)' }}>
                            {error}
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={() => window.location.reload()}
                            style={{ marginTop: 'var(--spacing-sm)' }}
                        >
                            Retry
                        </button>
                    </div>
                ) : Object.keys(groupedJobs).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                        No jobs found
                    </div>
                ) : (
                    viewMode === 'table' ? (
                        <JobsTableView
                            jobs={sortedJobs}
                            onJobClick={handleOpenJob}
                            getStatusColor={getStatusColor}
                            getTimeLeft={getTimeLeft}
                            visibleColumns={visibleColumns}
                            groupBy={effectiveGroupBy}
                            groupedJobs={groupedJobs}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={(key) => {
                                if (sortBy === key) {
                                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                    setSortBy(key);
                                    setSortOrder('asc');
                                }
                            }}
                        />
                    ) : viewMode === 'kanban' ? (
                        <div style={{ display: 'flex', gap: '16px', height: '100%', overflowX: 'auto', paddingBottom: '16px', alignItems: 'flex-start' }}>
                            {Object.keys(groupedJobs).map(groupKey => (
                                <div key={groupKey} style={{ minWidth: '290px', width: '290px', flexShrink: 0, backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-primary)', maxHeight: '100%' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {groupKey} 
                                        <span style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-primary)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', color: 'var(--text-primary)' }}>
                                            {groupedJobs[groupKey].length}
                                        </span>
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px', flex: 1, justifyContent: 'flex-start' }}>
                                        {groupedJobs[groupKey].map(job => {
                                            const timeLeft = getTimeLeft(job.dueDate);
                                            const priority = getPriorityBadge(job.priority);
                                            
                                            // Kanban uses standard card view layout inside columns
                                            return (
                                                <div key={job.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `2px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: timeLeft.urgent ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none' }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? ` · ${job.product.brand}` : ''}</div>
                                                        </div>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{priority.text}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color={timeLeft.color} /><span style={{ fontSize: '11px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}><MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} /><span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4, whiteSpace: 'normal', wordBreak: 'break-word' }}>{job.locality || job.city || 'No location'}</span></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {Object.keys(groupedJobs).map(groupKey => (
                                <div key={groupKey}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-primary)', paddingBottom: '6px' }}>
                                        {groupKey} ({groupedJobs[groupKey].length})
                                    </h3>
                                    <div style={{ 
                                        display: viewMode === 'list' ? 'flex' : 'grid', 
                                        flexDirection: 'column',
                                        gridTemplateColumns: viewMode === 'detail' ? 'repeat(auto-fill, minmax(350px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))', 
                                        gap: viewMode === 'list' ? '8px' : '16px' 
                                    }}>
                                        {groupedJobs[groupKey].map(job => {
                                            const timeLeft = getTimeLeft(job.dueDate);
                                            const priority = getPriorityBadge(job.priority);
                                            const isDetail = viewMode === 'detail';
                                            
                                            // LIST MODE RENDERER
                                            if (viewMode === 'list') {
                                                return (
                                                    <div key={job.id} onClick={() => handleOpenJob(job)} style={{ backgroundColor: 'var(--bg-elevated)', border: `1px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s', boxShadow: timeLeft.urgent ? '0 0 0 1px rgba(239, 68, 68, 0.2)' : 'none' }}>
                                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '6px', fontSize: '11px', fontWeight: 600, width: '90px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {job.status ? job.status.replace(/[-_]/g, ' ').toUpperCase() : 'OPEN'}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {job.customerName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {job.description || job.product?.type || 'Service'}</span>
                                                                </div>
                                                            </div>
                                                            {job.locality && (
                                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', width: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                    <MapPin size={12} /> {job.locality}
                                                                </div>
                                                            )}
                                                            <div style={{ fontSize: '12px', color: timeLeft.color, fontWeight: 600, width: '80px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                                <Clock size={12} /> {timeLeft.text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            
                                            // CARD & DETAIL MODE RENDERER
                                            return (
                                                <div key={job.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `2px solid ${timeLeft.urgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: isDetail ? '16px' : '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: timeLeft.urgent ? '0 0 0 2px rgba(239, 68, 68, 0.1)' : 'none', display: 'flex', flexDirection: 'column' }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: isDetail ? '18px' : '16px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                                {job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.brand}</span> : null}{job.description && job.product?.type ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.type}</span> : null}
                                                            </div>
                                                        </div>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{priority.text}</div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} color={timeLeft.color} /><span style={{ fontSize: '12px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span></div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}><MapPin size={12} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} /><span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{job.locality || job.city || job.address || 'No location'}</span></div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: isDetail ? 'wrap' : 'nowrap' }}>
                                                        <div style={{ padding: '2px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '12px', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>{job.status ? job.status.replace(/[-_]/g, ' ').toUpperCase() : 'OPEN'}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1, whiteSpace: isDetail ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{job.defect || 'No defect specified'}"</div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => setCalculatorJob(job)} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(139,92,246,0.15)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>🧮 Estimate</button>
                                                        {job.mobile && isOnline && isWorkingHours() ? <a href={`tel:${job.mobile}`} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📞 Call</a> : null}
                                                        {(job.location?.lat && job.location?.lng) ? <a href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a> : (job.locality || job.city || job.address) ? <a href={`https://www.google.com/maps/search/${encodeURIComponent([job.address, job.locality, job.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a> : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>
        </>
    );

    // Incentives Tab Content
    const renderIncentivesTab = () => (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <TrendingUp size={24} color="#10b981" />
                My Performance
            </h2>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: '-8px', marginBottom: 'var(--spacing-md)' }}>
                Overview of jobs and revenue generated during {incentiveData.period}
            </p>

            {/* Performance Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        JOBS COMPLETED
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#3b82f6' }}>
                        {incentiveData.metrics.jobsCompleted}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        REVENUE GENERATED
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#10b981' }}>
                        ₹{incentiveData.metrics.revenueGenerated.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                </div>

                <div style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)'
                }}>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xs)' }}>
                        AVERAGE RATING
                    </div>
                    <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: '#f59e0b' }}>
                        ⭐ {incentiveData.metrics.rating}
                    </div>
                </div>
            </div>
        </div>
    );

    // Settings Tab Content
    const renderSettingsTab = () => (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <Settings size={24} color="#3b82f6" />
                {firstName}'s Settings
            </h2>

            {/* Profile Section */}
            <div style={{
                padding: 'var(--spacing-lg)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                    Profile Information
                </h3>

                {/* Profile Picture */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto var(--spacing-sm)',
                        fontSize: '2rem',
                        fontWeight: 700,
                        color: 'white'
                    }}>
                        {technicianData?.name ? technicianData.name.split(' ').map(n => n[0]).join('') : 'T'}
                    </div>
                </div>

                {/* Profile Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                        { label: 'Name', value: technicianData?.name || 'Loading...' },
                        { label: 'Employee ID', value: technicianData?.id || '...' },
                        { label: 'Phone', value: technicianData?.phone || '...' },
                        { label: 'Email', value: technicianData?.email || '...', breakWord: true },
                        { label: 'Joined', value: technicianData?.joinDate ? new Date(technicianData.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '...' }
                    ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx !== 4 ? '1px solid var(--border-primary)' : 'none', paddingBottom: idx !== 4 ? '8px' : '0' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', wordBreak: item.breakWord ? 'break-all' : 'normal', maxWidth: '70%' }}>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Leave Marking */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    Leave Management
                </h3>
                <button
                    onClick={() => setShowLeaveModal(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)' }}
                >
                    <Calendar size={16} />
                    Mark Leave / Request Time Off
                </button>
            </div>

            {/* Appearance */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>
                    Appearance
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        {darkMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>Dark Mode</span>
                    </div>
                    <button
                        onClick={() => {
                            const next = !darkMode;
                            setDarkMode(next);
                            localStorage.setItem('techDarkMode', String(next));
                            if (next) {
                                document.documentElement.setAttribute('data-theme', 'dark');
                            } else {
                                document.documentElement.removeAttribute('data-theme');
                            }
                        }}
                        style={{
                            width: '50px',
                            height: '28px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: darkMode ? '#3b82f6' : 'var(--bg-tertiary)',
                            border: 'none',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all var(--transition-fast)'
                        }}
                    >
                        <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: 'white',
                            position: 'absolute',
                            top: '3px',
                            left: darkMode ? '25px' : '3px',
                            transition: 'all var(--transition-fast)'
                        }}></div>
                    </button>
                </div>
            </div>

            {/* Support SOPs */}
            <div style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)',
                overflow: 'hidden'
            }}>
                <button
                    onClick={() => setShowSupport(true)}
                    style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-elevated)',
                        border: 'none', cursor: 'pointer', gap: 'var(--spacing-sm)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(139,92,246,0.15)', display: 'flex' }}>
                            <BookOpen size={18} color="#8b5cf6" />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>Support &amp; SOPs</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Guides, policies, and how-tos</div>
                        </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-tertiary)" />
                </button>
            </div>

            {/* Download APK Section */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📱</span>
                    Android App
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)', lineHeight: '1.4' }}>
                    Install the native Android app for 24/7 background location tracking, thermal printer support, and reliable push notifications.
                </p>
                <a
                    href="/downloads/technician-app.apk"
                    download="SortedTechnician.apk"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: '#10b981',
                        color: 'white',
                        fontWeight: 600,
                        textDecoration: 'none',
                        textAlign: 'center',
                        fontSize: 'var(--font-size-sm)',
                        transition: 'background-color 0.2s',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                    <Package size={16} />
                    Download APK (Latest Version - {apkSize})
                </a>
            </div>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="btn btn-danger"
                style={{ width: '100%', padding: '10px' }}
            >
                Logout
            </button>
        </div>
    );

    // Purchase Requests List Content
    const renderPurchaseRequestsList = () => {
        return (
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--spacing-sm)' }}>
                    <button 
                        onClick={() => setShowPurchaseRequestsList(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', fontWeight: 600, fontSize: '14px', padding: 0 }}
                    >
                        <ChevronLeft size={20} /> Back
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Package size={22} color="#f59e0b" /> Purchase Requests
                    </h2>
                    <button 
                        onClick={fetchPurchaseRequests}
                        title="Refresh list"
                        style={{
                            padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                            border: '1px solid var(--border-primary)', borderRadius: '5px',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                    >
                        ↻
                    </button>
                </div>

                {/* Create New Request Button */}
                <button
                    onClick={() => setShowPurchaseJobSelectorModal(true)}
                    className="btn"
                    style={{
                        padding: '12px',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'background-color 0.2s'
                    }}
                >
                    + Create New Purchase Request
                </button>

                {/* Requests List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {purchaseRequestsLoading ? (
                        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-secondary)' }}>
                            Loading requests...
                        </div>
                    ) : purchaseRequests.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: 'var(--spacing-xl)',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--text-secondary)'
                        }}>
                            <Package size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                            <p style={{ margin: 0, fontSize: '14px' }}>No purchase requests found.</p>
                            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>Create a new request above to log spares purchases.</p>
                        </div>
                    ) : (
                        purchaseRequests.map(req => {
                            const isPending = req.status === 'draft';
                            const isHandedOver = !!req.handed_to_service_center;
                            return (
                                <div 
                                    key={req.id}
                                    style={{
                                        padding: 'var(--spacing-md)',
                                        backgroundColor: 'var(--bg-elevated)',
                                        borderRadius: 'var(--radius-lg)',
                                        border: '1px solid var(--border-primary)',
                                        boxShadow: 'var(--shadow-sm)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px'
                                    }}
                                >
                                    {/* Date & Vendor */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{req.account_name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {new Date(req.created_at || req.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(req.created_at || req.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            {/* Status Badge */}
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                backgroundColor: isPending ? '#fef3c7' : '#d1fae5',
                                                color: isPending ? '#d97706' : '#059669',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isPending ? 'Pending Audit' : 'Approved'}
                                            </span>
                                            {/* Handover Badge */}
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '9999px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                backgroundColor: isHandedOver ? '#d1fae5' : '#f3f4f6',
                                                color: isHandedOver ? '#059669' : '#6b7280',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {isHandedOver ? '✓ Handed to SC' : 'Pending SC Handover'}
                                            </span>
                                            {/* Payment Badge */}
                                            {req.paid_by === 'technician' && (() => {
                                                const isPaid = parseFloat(req.paid_amount || 0) >= parseFloat(req.total_amount || 0);
                                                return (
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        backgroundColor: isPaid ? '#d1fae5' : '#fee2e2',
                                                        color: isPaid ? '#059669' : '#dc2626',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {isPaid ? 'Paid' : 'Pending Payment'}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Items list */}
                                    {req.items && req.items.length > 0 && (
                                        <div style={{ borderTop: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {req.items.map((it, idx) => (
                                                <div key={idx} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>• {it.description} <span style={{ color: 'var(--text-tertiary)' }}>x{it.qty}</span></span>
                                                    <span>₹{parseFloat(it.rate || 0).toLocaleString('en-IN')}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Total amount */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Amount</span>
                                        <span style={{ fontSize: '16px', color: 'var(--text-primary)' }}>₹{parseFloat(req.total_amount || 0).toLocaleString('en-IN')}</span>
                                    </div>

                                    {isPending && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px dashed var(--border-primary)', paddingTop: '8px', marginTop: '4px' }}>
                                            <button
                                                onClick={() => handleDeletePurchaseRequest(req.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    color: '#ef4444',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    padding: 0
                                                }}
                                            >
                                                <Trash2 size={14} /> Delete Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    // Dashboard Tab Content
    const renderDashboardTab = () => {
        if (showPurchaseRequestsList) {
            return renderPurchaseRequestsList();
        }

        const openJobsCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'closed' && j.status !== 'cancelled').length;

        const cardsData = [
            {
                title: 'Estimate Calculator',
                description: 'Create an invoice or quotation for a job',
                icon: <Calculator size={20} color="#8b5cf6" />,
                color: '#8b5cf6',
                onClick: () => setShowJobSelectorModal(true)
            },
            {
                title: 'Collect Payment',
                description: 'Log cash, company UPI, or send Razorpay link',
                icon: <DollarSign size={20} color="#10b981" />,
                color: '#10b981',
                onClick: () => setShowCollectPayment(true)
            },
            {
                title: 'Purchase Spare Parts',
                description: 'Log parts purchased from local vendors / suppliers',
                icon: <Package size={20} color="#f59e0b" />,
                color: '#f59e0b',
                onClick: () => {
                    setShowPurchaseRequestsList(true);
                    fetchPurchaseRequests();
                }
            },
            {
                title: 'Calendar & Leaves',
                description: 'View assigned jobs timeline and apply for leaves',
                icon: <Calendar size={20} color="#ec4899" />,
                color: '#ec4899',
                onClick: () => setActiveTab('calendar')
            },
            {
                title: 'Expenses',
                description: 'Log and track out-of-pocket expenses',
                icon: <DollarSign size={20} color="#ef4444" />,
                color: '#ef4444',
                onClick: () => setActiveTab('expenses')
            }
        ];
        
        return (
            <div style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', justifyContent: 'flex-start' }}>
                {/* Dashboard Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', margin: 0 }}>
                        <LayoutDashboard size={24} color="#3b82f6" />
                        {firstName}'s Dashboard
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-primary)' }}>
                            <button 
                                onClick={() => setDashboardView('grid')} 
                                title="Grid View" 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: dashboardView === 'grid' ? 'var(--bg-primary)' : 'transparent', color: dashboardView === 'grid' ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setDashboardView('list')} 
                                title="List View" 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: dashboardView === 'list' ? 'var(--bg-primary)' : 'transparent', color: dashboardView === 'list' ? '#3b82f6' : 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <List size={16} />
                            </button>
                        </div>
                        {technicianId && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <NotificationBell recipientId={technicianId} recipientType="technician" theme={darkMode ? 'dark' : 'light'} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Duty Status Card */}
                <div 
                    className="card"
                    style={{ 
                        padding: 'var(--spacing-lg)', 
                        borderLeft: `4px solid ${isOnline ? '#10b981' : '#6b7280'}`, 
                        backgroundColor: 'var(--bg-elevated)', 
                        borderRadius: 'var(--radius-lg)', 
                        boxShadow: 'var(--shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Activity size={20} color={isOnline ? '#10b981' : '#6b7280'} /> Duty Status
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isOnline ? '#10b981' : 'var(--text-secondary)' }}>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                            <button
                                onClick={handleToggleOnline}
                                style={{
                                    width: '48px',
                                    height: '24px',
                                    borderRadius: '12px',
                                    backgroundColor: isOnline ? '#10b981' : '#475569',
                                    border: 'none',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    padding: 0,
                                    outline: 'none'
                                }}
                            >
                                <span
                                    style={{
                                        width: '18px',
                                        height: '18px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ffffff',
                                        position: 'absolute',
                                        top: '3px',
                                        left: isOnline ? '27px' : '3px',
                                        transition: 'left 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                    }}
                                />
                            </button>
                        </div>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {isOnline 
                            ? "You are Online. Precise GPS location tracking is active. Customers and admin can see your live dispatch status." 
                            : "You are Offline. Live GPS dispatch status is disabled."}
                    </p>

                    {dutyStatusError && (
                        <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                            <AlertCircle size={14} /> {dutyStatusError}
                        </div>
                    )}

                    {(!isOnline && isSupposedToBeOnDutyToday()) && (
                        <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '6px', lineHeight: 1.4 }}>
                            <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <strong>Alert:</strong> You are scheduled to be on duty today. Please switch to Online status to receive and view your jobs.
                            </div>
                        </div>
                    )}
                </div>

                {/* Jobs Summary Card (On Top) */}
                <div 
                    className="card"
                    style={{ padding: 'var(--spacing-lg)', cursor: 'pointer', borderLeft: '4px solid #3b82f6', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', transition: 'transform 0.2s' }}
                    onClick={() => setActiveTab('jobs')}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <Briefcase size={20} color="#3b82f6" /> Jobs Overview
                        </h3>
                        <ChevronRight size={20} color="var(--text-tertiary)" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-primary)' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b' }}>{openJobsCount}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Open Jobs</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-primary)' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{repeatCallsCount}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Repeat Calls</div>
                        </div>
                    </div>
                </div>


                {/* Grid / List Cards Wrapper */}
                <div style={{ 
                    display: dashboardView === 'grid' ? 'grid' : 'flex',
                    gridTemplateColumns: dashboardView === 'grid' ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'none',
                    flexDirection: dashboardView === 'grid' ? 'none' : 'column',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    {cardsData.map((card, index) => (
                        <div 
                            key={index}
                            className="card"
                            style={{ 
                                padding: dashboardView === 'grid' ? '12px 10px' : 'var(--spacing-md) var(--spacing-lg)', 
                                cursor: 'pointer', 
                                borderLeft: `4px solid ${card.color}`, 
                                backgroundColor: 'var(--bg-elevated)', 
                                borderRadius: 'var(--radius-lg)', 
                                boxShadow: 'var(--shadow-sm)', 
                                transition: 'all 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minHeight: dashboardView === 'grid' ? '112px' : 'auto',
                                gridColumn: (dashboardView === 'grid' && index === cardsData.length - 1 && cardsData.length % 2 !== 0) ? 'span 2' : 'auto'
                            }}
                            onClick={card.onClick}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, minWidth: 0, paddingRight: dashboardView === 'grid' ? '0px' : '4px' }}>
                                    <h3 style={{ 
                                        fontSize: dashboardView === 'grid' ? '13px' : '15px', 
                                        fontWeight: 600, 
                                        display: 'flex', 
                                        flexDirection: dashboardView === 'grid' ? 'column' : 'row',
                                        alignItems: dashboardView === 'grid' ? 'flex-start' : 'center', 
                                        gap: dashboardView === 'grid' ? '6px' : '6px', 
                                        marginBottom: '6px', 
                                        margin: 0, 
                                        whiteSpace: dashboardView === 'grid' ? 'normal' : 'nowrap', 
                                        overflow: dashboardView === 'grid' ? 'visible' : 'hidden', 
                                        textOverflow: dashboardView === 'grid' ? 'clip' : 'ellipsis',
                                        lineHeight: 1.25
                                    }}>
                                        {card.icon}
                                        <span style={{ 
                                            overflow: dashboardView === 'grid' ? 'visible' : 'hidden', 
                                            textOverflow: dashboardView === 'grid' ? 'clip' : 'ellipsis', 
                                            whiteSpace: dashboardView === 'grid' ? 'normal' : 'nowrap',
                                            wordBreak: 'break-word'
                                        }}>{card.title}</span>
                                    </h3>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.25' }}>
                                        {card.description}
                                    </p>
                                </div>
                                {dashboardView !== 'grid' && <ChevronRight size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderLoader = (text) => {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                height: '100%',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#000000',
                color: '#ffffff',
                padding: '24px',
                boxSizing: 'border-box',
                fontFamily: 'sans-serif'
            }}>
                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                ` }} />
                <img 
                    src="/new-logo.jpg" 
                    alt="Sorted Solutions" 
                    style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'contain',
                        marginBottom: '32px'
                    }}
                />
                <div style={{
                    width: '36px',
                    height: '36px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTop: '3px solid #f59e0b',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '20px'
                }} />
                <h1 style={{
                    fontSize: '20px',
                    fontWeight: 700,
                    margin: '0 0 8px 0',
                    letterSpacing: '1px',
                    textTransform: 'uppercase'
                }}>Sorted Solutions</h1>
                <p style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    margin: 0
                }}>{text}</p>
            </div>
        );
    };

    if (!technicianId) {
        return renderLoader("Loading jobs...");
    }

    if (gpsStatus === 'checking') {
        return renderLoader("Verifying location access...");
    }

    if (gpsStatus === 'denied' || gpsStatus === 'error') {
        const isError = gpsStatus === 'error';
        return (
            <div className="dvh-full" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                backgroundColor: '#000000',
                color: '#ffffff',
                textAlign: 'center',
                zIndex: 9999,
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <img 
                    src="/new-logo.jpg" 
                    alt="Sorted Solutions" 
                    style={{
                        width: '120px',
                        height: '120px',
                        objectFit: 'contain',
                        marginBottom: '32px'
                    }}
                />
                <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
                    {isError ? 'GPS Services Disabled' : 'Location Access Required'}
                </h1>
                <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '320px', lineHeight: 1.6, marginBottom: '24px' }}>
                    {isError 
                        ? "Your device's GPS or Location Services appear to be turned off. Please enable Location/GPS in your phone settings to proceed."
                        : "Sorted Solutions requires active GPS to manage your assigned jobs. Please enable location permissions for this app in your device settings to proceed."}
                </p>
                <button 
                    onClick={handleGpsRetry}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(245,158,11,0.25)'
                    }}
                >
                    Retry / Enable GPS
                </button>
            </div>
        );
    }

    return (
        <>
        {/* PWA install + notification permission prompt — shown once on first load */}
        <PWAPrompt
            appName="Sorted Technician"
            appColor="#f59e0b"
            userType="technician"
            userId={technicianId}
        />
        <div className="h-dvh" style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
            {!isDeviceOnline && (
                <div style={{ backgroundColor: '#b45309', color: '#fef3c7', textAlign: 'center', padding: '6px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 1000, borderBottom: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
                    <span>⚠️ Working Offline</span>
                    {pendingSyncCount > 0 && <span style={{ opacity: 0.8 }}>· {pendingSyncCount} changes saved locally</span>}
                </div>
            )}
            {isDeviceOnline && pendingSyncCount > 0 && (
                <div style={{ backgroundColor: '#1e3a8a', color: '#dbeafe', textAlign: 'center', padding: '6px 12px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', zIndex: 1000, borderBottom: '1px solid rgba(59,130,246,0.2)', flexShrink: 0 }}>
                    <span>🔄 Syncing {pendingSyncCount} changes to the server...</span>
                </div>
            )}
            {/* Tab Content — Support view intercepts here so bottom nav stays visible */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {showSupport ? (
                    <>
                        {/* Support Header */}
                        <div style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            backgroundColor: 'var(--bg-elevated)',
                            borderBottom: '1px solid var(--border-primary)',
                            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
                        }}>
                            <button
                                onClick={() => setShowSupport(false)}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', color: '#8b5cf6', fontWeight: 600, fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
                            >
                                <ChevronLeft size={16} /> Settings
                            </button>
                            <div style={{ flex: 1, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <BookOpen size={18} color="#8b5cf6" /> Support &amp; SOPs
                            </div>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <TechSupportTab />
                        </div>
                    </>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboardTab()}
                        {activeTab === 'calendar' && (
                            <CalendarView 
                                technicianId={technicianId} 
                                jobs={jobs} 
                                onSelectJob={setSelectedJob}
                                setActiveTab={setActiveTab}
                            />
                        )}
                        {activeTab === 'jobs' && renderJobsTab()}
                        {activeTab === 'expenses' && <ExpensesList technicianId={technicianId} />}
                        {activeTab === 'incentives' && renderIncentivesTab()}
                        {activeTab === 'settings' && renderSettingsTab()}
                    </>
                )}
            </div>

            {/* Bottom Tabs */}
            <nav className="bottom-tabs">
                <button
                    className={`tab-item ${(activeTab === 'dashboard' && !showSupport) ? 'active' : ''}`}
                    onClick={() => {
                        setShowSupport(false);
                        setShowPurchaseRequestsList(false);
                        setActiveTab('dashboard');
                    }}
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </button>
                <button
                    className={`tab-item ${(activeTab === 'jobs' && !showSupport) ? 'active' : ''}`}
                    onClick={() => {
                        setShowSupport(false);
                        setActiveTab('jobs');
                    }}
                >
                    <Briefcase size={20} />
                    <span>Jobs</span>
                </button>
                <button
                    className={`tab-item ${(activeTab === 'settings' || showSupport) ? 'active' : ''}`}
                    onClick={() => {
                        setShowSupport(false);
                        setActiveTab('settings');
                    }}
                >
                    <Settings size={20} />
                    <span>Settings</span>
                </button>
            </nav>



            {/* Leave Marking Modal */}
            {showLeaveModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}
                    onClick={() => setShowLeaveModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            width: '100%',
                            boxShadow: 'var(--shadow-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Request Leave
                        </h3>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={leaveStartDate}
                                onChange={(e) => setLeaveStartDate(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                End Date
                            </label>
                            <input
                                type="date"
                                value={leaveEndDate}
                                onChange={(e) => setLeaveEndDate(e.target.value)}
                                className="form-input"
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Reason
                            </label>
                            <textarea
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                placeholder="Enter reason for leave..."
                                className="form-input"
                                rows="3"
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button
                                onClick={() => {
                                    setShowLeaveModal(false);
                                    setLeaveStartDate('');
                                    setLeaveEndDate('');
                                    setLeaveReason('');
                                }}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!leaveStartDate || !leaveEndDate) {
                                        alert('Please select start and end dates');
                                        return;
                                    }
                                    alert(`Leave request submitted!\nFrom: ${leaveStartDate}\nTo: ${leaveEndDate}\nReason: ${leaveReason || 'Not specified'}`);
                                    setShowLeaveModal(false);
                                    setLeaveStartDate('');
                                    setLeaveEndDate('');
                                    setLeaveReason('');
                                }}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Job Detail Modal */}
            {selectedJob && (
                <JobDetailView
                    job={selectedJob}
                    onClose={() => setSelectedJob(null)}
                    isOnline={isOnline && isWorkingHours()}
                    onJobUpdate={(updatedJob) => {
                        // Update both the jobs list AND the selectedJob so the header/status reflects immediately
                        if (updatedJob) {
                            setSelectedJob(prev => ({ ...prev, ...updatedJob }));
                            setJobs(prevJobs =>
                                prevJobs.map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j)
                            );
                        }
                        // Background refetch for full consistency
                        setTimeout(() => {
                            if (technicianId) {
                                fetch(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`)
                                    .then(res => res.json())
                                    .then(data => setJobs(data.jobs || []))
                                    .catch(err => console.error('Error refreshing jobs:', err));
                            }
                        }, 1000);
                    }}
                />
            )}

            {/* Collect Payment Overlay */}
            {showCollectPayment && (
                <CollectPaymentFlow 
                    onClose={() => setShowCollectPayment(false)} 
                    context="technician" 
                    currentUserName={firstName}
                    currentUserId={technicianId}
                    onSuccess={() => {
                        // Optionally refresh the Dashboard or active jobs
                    }}
                />
            )}

            {/* Estimate/Repair Calculator Overlay */}
            {calculatorJob && (
                <RepairCalculator
                    job={calculatorJob}
                    onClose={() => setCalculatorJob(null)}
                    onCreateQuotation={(items) => {
                        setCalculatorJob(null);
                        setSelectedJob({ ...calculatorJob, _calculatorItems: items });
                    }}
                />
            )}

            {/* Purchase Spare Parts Job Selector Modal */}
            {showPurchaseJobSelectorModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}
                    onClick={() => setShowPurchaseJobSelectorModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Package size={20} color="#f59e0b" /> Select Job for Purchase
                            </h3>
                            <button onClick={() => setShowPurchaseJobSelectorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                <X size={20} />
                            </button>
                        </div>


                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', paddingRight: '4px' }}>
                            {jobs.filter(j => j.status !== 'closed' && j.status !== 'cancelled').length === 0 ? (
                                <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No active jobs found.
                                </div>
                            ) : (
                                jobs.filter(j => j.status !== 'closed' && j.status !== 'cancelled').map(job => (
                                    <div 
                                        key={job.id} 
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '12px', 
                                            backgroundColor: 'var(--bg-elevated)', 
                                            border: '1px solid var(--border-primary)', 
                                            borderRadius: 'var(--radius-md)' 
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    #{job.job_number || String(job.id).slice(0, 8)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                                                {job.customerName || 'Walk-in Customer'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {job.description || job.product?.type || job.issueCategory || 'Service Job'}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setPurchaseJob(job);
                                                setShowPurchaseJobSelectorModal(false);
                                                setShowPurchaseCalculator(true);
                                            }}
                                            style={{ 
                                                padding: '6px 12px', 
                                                backgroundColor: '#f59e0b', 
                                                color: '#fff', 
                                                border: 'none', 
                                                borderRadius: '6px', 
                                                fontSize: '12px', 
                                                fontWeight: 600, 
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Calculator Overlay */}
            {showPurchaseCalculator && (
                <RepairCalculator
                    job={purchaseJob}
                    invoiceLabel="Create Purchase Invoice"
                    onCreateInvoice={(items) => {
                        setPendingPurchaseItems(items);
                        setShowPurchaseCalculator(false);
                        setShowPurchaseNotesModal(true);
                    }}
                    onClose={() => {
                        setShowPurchaseCalculator(false);
                        setPurchaseJob(null);
                    }}
                />
            )}

            {/* Purchase Vendor & Notes Modal */}
            {showPurchaseNotesModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}
                    onClick={() => {
                        setShowPurchaseNotesModal(false);
                        setPendingPurchaseItems(null);
                        setPurchaseVendorName('');
                        setPurchaseNotes('');
                        setPurchaseJob(null);
                        setSelectedSupplier(null);
                        setIsNewSupplier(false);
                        setNewSupplierName('');
                        setNewSupplierPhone('');
                        setNewSupplierLocality('');
                        setNewSupplierPincode('');
                        setSupplierSearchQuery('');
                        setShowSupplierDropdown(false);
                        setPurchasePaidBy('company');
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            width: '100%',
                            boxShadow: 'var(--shadow-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                            Confirm Spare Parts Purchase
                        </h3>

                        <div ref={supplierContainerRef} style={{ marginBottom: 'var(--spacing-md)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xs)' }}>
                                <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, margin: 0 }}>
                                    Vendor / Shop Name *
                                </label>
                                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                    sundry creditors &gt; Spare Parts Suppliers
                                </span>
                            </div>
                            
                            {!isNewSupplier ? (
                                <>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Search existing (sundry creditors > Spare Parts Suppliers) or type to add new..."
                                            value={supplierSearchQuery}
                                            onChange={(e) => {
                                                setSupplierSearchQuery(e.target.value);
                                                setShowSupplierDropdown(true);
                                                setSelectedSupplier(null);
                                            }}
                                            onFocus={() => setShowSupplierDropdown(true)}
                                            className="form-input"
                                            style={{ width: '100%' }}
                                        />
                                        {supplierSearchQuery && (
                                            <button 
                                                onClick={() => {
                                                    setSupplierSearchQuery('');
                                                    setSelectedSupplier(null);
                                                }}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {showSupplierDropdown && (
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                backgroundColor: 'var(--bg-secondary)',
                                                border: '1px solid var(--border-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                zIndex: 1010,
                                                marginTop: '4px',
                                                boxShadow: 'var(--shadow-lg)'
                                            }}
                                        >
                                            {suppliersLoading ? (
                                                <div style={{ padding: 'var(--spacing-sm)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>Loading suppliers...</div>
                                            ) : (
                                                <>
                                                    {suppliers
                                                        .filter(s => s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()))
                                                        .map(s => (
                                                            <div 
                                                                key={s.id}
                                                                onClick={() => {
                                                                    setSelectedSupplier(s);
                                                                    setSupplierSearchQuery(s.name);
                                                                    setPurchaseVendorName(s.name);
                                                                    setShowSupplierDropdown(false);
                                                                }}
                                                                style={{
                                                                    padding: 'var(--spacing-sm)',
                                                                    cursor: 'pointer',
                                                                    borderBottom: '1px solid var(--border-primary)',
                                                                    fontSize: 'var(--font-size-sm)',
                                                                    color: 'var(--text-primary)',
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between'
                                                                }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            >
                                                                <span>{s.name}</span>
                                                                {s.mobile && <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>📞 {s.mobile}</span>}
                                                            </div>
                                                        ))
                                                    }
                                                    
                                                    <div
                                                        onClick={() => {
                                                            setIsNewSupplier(true);
                                                            setNewSupplierName(supplierSearchQuery);
                                                            setPurchaseVendorName(supplierSearchQuery);
                                                            setShowSupplierDropdown(false);
                                                        }}
                                                        style={{
                                                            padding: 'var(--spacing-sm)',
                                                            cursor: 'pointer',
                                                            fontSize: 'var(--font-size-sm)',
                                                            color: 'var(--color-primary-light)',
                                                            fontWeight: 600,
                                                            backgroundColor: 'rgba(99,102,241,0.05)',
                                                            borderTop: '1px solid var(--border-primary)'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.1)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99,102,241,0.05)'}
                                                    >
                                                        ➕ Add &ldquo;{supplierSearchQuery || 'New Supplier'}&rdquo; as new supplier
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-secondary)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                                        <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--color-primary-light)', textTransform: 'uppercase' }}>New Supplier Details</span>
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsNewSupplier(false);
                                                setSupplierSearchQuery('');
                                                setPurchaseVendorName('');
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                        >
                                            Select Existing
                                        </button>
                                    </div>
                                    
                                    <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier / Shop Name *</label>
                                            <input
                                                type="text"
                                                value={newSupplierName}
                                                onChange={(e) => {
                                                    setNewSupplierName(e.target.value);
                                                    setPurchaseVendorName(e.target.value);
                                                }}
                                                className="form-input"
                                                style={{ width: '100%' }}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Mobile / Phone Number *</label>
                                            <input
                                                type="text"
                                                placeholder="10-digit mobile number, e.g. 9876543210"
                                                value={newSupplierPhone}
                                                onChange={(e) => setNewSupplierPhone(e.target.value)}
                                                className="form-input"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Supplier Locality *</label>
                                            <LocalityCombobox
                                                value={newSupplierLocality}
                                                pincode={newSupplierPincode}
                                                onChange={(loc, pin) => {
                                                    setNewSupplierLocality(loc);
                                                    setNewSupplierPincode(pin);
                                                }}
                                                inputClassName="form-input"
                                                showPincode={true}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Who is paying for this purchase? *
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)' }}>
                                <div 
                                    onClick={() => setPurchasePaidBy('company')}
                                    style={{
                                        border: '1px solid ' + (purchasePaidBy === 'company' ? 'var(--color-primary-light)' : 'var(--border-primary)'),
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        backgroundColor: purchasePaidBy === 'company' ? 'rgba(99,102,241,0.05)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-xs)',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input 
                                        type="radio" 
                                        name="purchase_paid_by" 
                                        value="company"
                                        checked={purchasePaidBy === 'company'}
                                        onChange={() => {}} 
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span>Paid by Company</span>
                                </div>
                                <div 
                                    onClick={() => setPurchasePaidBy('technician')}
                                    style={{
                                        border: '1px solid ' + (purchasePaidBy === 'technician' ? 'var(--color-primary-light)' : 'var(--border-primary)'),
                                        borderRadius: 'var(--radius-md)',
                                        padding: 'var(--spacing-sm)',
                                        cursor: 'pointer',
                                        backgroundColor: purchasePaidBy === 'technician' ? 'rgba(99,102,241,0.05)' : 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-xs)',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-primary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <input 
                                        type="radio" 
                                        name="purchase_paid_by" 
                                        value="technician"
                                        checked={purchasePaidBy === 'technician'}
                                        onChange={() => {}}
                                        style={{ cursor: 'pointer' }}
                                    />
                                    <span>Paid by Technician</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <label style={{ display: 'block', fontSize: 'var(--font-size-sm)', fontWeight: 500, marginBottom: 'var(--spacing-xs)' }}>
                                Additional Purchase Notes / Remarks (Optional)
                            </label>
                            <textarea
                                placeholder="Enter details about payment or parts..."
                                value={purchaseNotes}
                                onChange={(e) => setPurchaseNotes(e.target.value)}
                                className="form-input"
                                rows="3"
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <button
                                onClick={() => {
                                    setShowPurchaseNotesModal(false);
                                    setPendingPurchaseItems(null);
                                    setPurchaseVendorName('');
                                    setPurchaseNotes('');
                                    setPurchaseJob(null);
                                    setSelectedSupplier(null);
                                    setIsNewSupplier(false);
                                    setNewSupplierName('');
                                    setNewSupplierPhone('');
                                    setNewSupplierLocality('');
                                    setNewSupplierPincode('');
                                    setSupplierSearchQuery('');
                                    setShowSupplierDropdown(false);
                                    setPurchasePaidBy('company');
                                }}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitPurchaseInvoice}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px' }}
                            >
                                Submit Purchase Invoice
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Job Selector Modal for Estimate Calculator */}
            {showJobSelectorModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}
                    onClick={() => setShowJobSelectorModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-primary)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--spacing-lg)',
                            maxWidth: '500px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 'var(--shadow-xl)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Calculator size={20} color="#8b5cf6" /> Select Job for Estimate
                            </h3>
                            <button onClick={() => setShowJobSelectorModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', paddingRight: '4px' }}>
                            {jobs.filter(j => j.status !== 'closed' && j.status !== 'cancelled').length === 0 ? (
                                <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No active jobs found.
                                </div>
                            ) : (
                                jobs.filter(j => j.status !== 'closed' && j.status !== 'cancelled').map(job => (
                                    <div 
                                        key={job.id} 
                                        style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center', 
                                            padding: '12px', 
                                            backgroundColor: 'var(--bg-elevated)', 
                                            border: '1px solid var(--border-primary)', 
                                            borderRadius: 'var(--radius-md)' 
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                    #{job.job_number || String(job.id).slice(0, 8)}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }}>
                                                {job.customerName || 'Walk-in Customer'}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {job.description || job.product?.type || job.issueCategory || 'Service Job'}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setCalculatorJob(job);
                                                setShowJobSelectorModal(false);
                                            }}
                                            style={{ 
                                                padding: '6px 12px', 
                                                backgroundColor: '#8b5cf6', 
                                                color: '#fff', 
                                                border: 'none', 
                                                borderRadius: '6px', 
                                                fontSize: '12px', 
                                                fontWeight: 600, 
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            Select
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
}

export default TechnicianApp;






