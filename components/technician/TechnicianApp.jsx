'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapPin, Clock, Phone, ChevronRight, ChevronLeft, Navigation, Briefcase, TrendingUp, Settings, User, Moon, Sun, Calendar, DollarSign, Calculator, LayoutGrid, List, Columns, Maximize, BookOpen, LayoutDashboard, X, Package, Trash2, Table, Activity, AlertCircle, Play, Power, Loader2, Mail, Map, Download, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import JobDetailView from '@/components/technician/JobDetailView';
import ExpensesList from '@/components/technician/ExpensesList';
import CalendarView from '@/components/technician/CalendarView';
import PerformanceView from '@/components/technician/PerformanceView';
import RepairCalculator from '@/components/common/RepairCalculator';
import JobsTableView from '@/components/technician/JobsTableView';
import NotificationBell from '@/components/common/NotificationBell';
import { logInteraction } from '@/lib/interactions';
import JobsSearchPanel from '@/components/shared/JobsSearchPanel';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import PWAPrompt from '@/components/common/PWAPrompt';
import TechSupportTab from '@/components/technician/TechSupportTab';
import TechEmailInbox from '@/components/technician/TechEmailInbox';
import CollectPaymentFlow from '@/components/shared/CollectPaymentFlow';
import LocalityCombobox from '@/components/common/LocalityCombobox';
import { apiCall, syncOfflineQueue } from '@/lib/offlineSync';
import { registerPlugin } from '@capacitor/core';

const isNativePlatform = () => {
    if (typeof window === 'undefined') return false;
    return !!(window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web');
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // metres
    const phi1 = lat1 * Math.PI/180;
    const phi2 = lat2 * Math.PI/180;
    const deltaPhi = (lat2-lat1) * Math.PI/180;
    const deltaLambda = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(deltaPhi/2) * Math.sin(deltaPhi/2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda/2) * Math.sin(deltaLambda/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
};

const GPSBridgePlugin = typeof window !== 'undefined' && window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform() !== 'web'
    ? registerPlugin('GPSBridgePlugin')
    : null;

const TechnicianJobsMapView = dynamic(() => import('@/components/technician/TechnicianJobsMapView'), {
    ssr: false,
    loading: () => (
        <div style={{ height: '380px', width: '100%', borderRadius: 12, backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            🗺️ Loading Map View...
        </div>
    )
});

const applyPendingQueueUpdates = (jobsList) => {
    if (typeof window === 'undefined') return jobsList;
    try {
        const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
        if (queue.length === 0) return jobsList;

        return jobsList.map(job => {
            let updatedJob = { ...job };
            // Find all pending requests in the queue related to this job
            queue.forEach(item => {
                const isJobUrl = (item.url || '').includes(`/api/technician/jobs/${job.id}`) || 
                                 ((item.url || '').includes(`/api/admin/transactions`) && item.body && (item.body || '').includes(job.id));
                if (isJobUrl) {
                    try {
                        const bodyObj = JSON.parse(item.body);
                        if (bodyObj) {
                            if (bodyObj.status) {
                                updatedJob.status = bodyObj.status;
                            }
                            if (bodyObj.arrived_at) {
                                updatedJob.arrived_at = bodyObj.arrived_at;
                            }
                            if (bodyObj.repair_note_added_at) {
                                updatedJob.repair_note_added_at = bodyObj.repair_note_added_at;
                            }
                            if ((item.url || '').includes('/complete-job') || bodyObj.action === 'complete' || bodyObj.action === 'close_job' || ((item.url || '').includes('/interactions') && bodyObj.type === 'job-closed')) {
                                updatedJob.status = 'closed';
                            }
                        }
                    } catch (e) {
                        if ((item.url || '').includes('/complete-job') || (item.url || '').includes('/interactions')) {
                            updatedJob.status = 'closed';
                        }
                    }
                }
            });
            return updatedJob;
        });
    } catch (e) {
        console.warn('[Offline] Error applying pending queue updates:', e);
        return jobsList;
    }
};

function TechnicianApp() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [viewMode, setViewMode] = useState('kanban');
    const [hasClickedMap, setHasClickedMap] = useState(true);
    const [backPressToast, setBackPressToast] = useState('');
    const [pendingVisitSummary, setPendingVisitSummary] = useState(null);
    const [postponedSummaries, setPostponedSummaries] = useState([]);
    const [nativeAppVersion, setNativeAppVersion] = useState('Web PWA');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('postponed_visit_summaries');
            if (saved) {
                setPostponedSummaries(JSON.parse(saved));
            }
        } catch (e) {}
    }, []);

    const [visitNotes, setVisitNotes] = useState('');
    const [recording, setRecording] = useState(false);
    const [audioLoading, setAudioLoading] = useState(false);
    const [uploadedAudioUrl, setUploadedAudioUrl] = useState('');
    const [submittingVisitSummary, setSubmittingVisitSummary] = useState(false);
    const [visitSummaryJobDetails, setVisitSummaryJobDetails] = useState(null);
    const [visitSummaryInteractions, setVisitSummaryInteractions] = useState([]);
    const [visitSummaryQuotation, setVisitSummaryQuotation] = useState(null);
    const [visitSummaryInvoice, setVisitSummaryInvoice] = useState(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recognitionRef = useRef(null);

    const translateToEnglish = async (text) => {
        try {
            const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`);
            const json = await res.json();
            if (json && json[0]) {
                const translated = json[0].map(s => s[0]).join('');
                return translated;
            }
            return text;
        } catch (e) {
            console.error('Translation failed, using raw transcript:', e);
            return text;
        }
    };

    const uploadAudioBlob = async (blob) => {
        setAudioLoading(true);
        const fileName = `voice-summary-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}.webm`;
        const filePath = `uploads/${fileName}`;

        try {
            const { data, error } = await supabase.storage
                .from('media')
                .upload(filePath, blob, {
                    contentType: 'audio/webm',
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(filePath);

            setUploadedAudioUrl(urlData.publicUrl);
        } catch (e) {
            console.error('Failed to upload audio recording:', e);
            alert('Failed to upload audio recording: ' + e.message);
        } finally {
            setAudioLoading(false);
        }
    };

    const handleVoiceRecordToggle = async () => {
        if (recording) {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            setRecording(false);
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorderRef.current = new MediaRecorder(stream);
                audioChunksRef.current = [];

                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    await uploadAudioBlob(audioBlob);
                    stream.getTracks().forEach(track => track.stop());
                };

                mediaRecorderRef.current.start();
                setRecording(true);

                if (typeof window !== 'undefined') {
                    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if (SpeechRecognition) {
                        const rec = new SpeechRecognition();
                        rec.continuous = true;
                        rec.interimResults = false;
                        rec.lang = 'en-IN';

                        rec.onresult = (event) => {
                            const lastIndex = event.results.length - 1;
                            const transcriptText = event.results[lastIndex][0].transcript;
                            if (transcriptText.trim()) {
                                setVisitNotes(prev => prev ? prev + ' ' + transcriptText.trim() : transcriptText.trim());
                            }
                        };
                        rec.onerror = (e) => {
                            console.error('Speech recognition error:', e);
                        };
                        rec.start();
                        recognitionRef.current = rec;
                    }
                }
            } catch (err) {
                console.error(err);
                const isNative = isNativePlatform();
                if (isNative && GPSBridgePlugin) {
                    if (window.confirm('Microphone access is required for recording voice notes.\n\nWould you like to open App Settings to allow Microphone access?')) {
                        GPSBridgePlugin.openAppSettings().catch(e => {
                            console.error('Failed to open app settings:', e);
                        });
                    }
                } else {
                    alert('Microphone access is required for recording voice notes. Please allow microphone access in your browser settings (usually by clicking the lock/site settings icon next to the URL).');
                }
            }
        }
    };

    const handleSubmitVisitSummary = async () => {
        if (!visitNotes.trim()) {
            alert('Please enter visit summary notes.');
            return;
        }
        setSubmittingVisitSummary(true);
        const techName = technicianData?.name || 'Technician';
        try {
            const jobId = pendingVisitSummary.jobId;
            const res = await apiCall(`/api/technician/jobs/${jobId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'visit-summary',
                    category: 'job',
                    description: `Visit Summary Notes: ${visitNotes.trim()}`,
                    user_name: techName,
                    metadata: {
                        notes: visitNotes.trim(),
                        audio_url: uploadedAudioUrl || null,
                        distance_metres: pendingVisitSummary.distanceMetres,
                        checkout_latitude: pendingVisitSummary.actualCheckoutLat,
                        checkout_longitude: pendingVisitSummary.actualCheckoutLng,
                        checkin_latitude: pendingVisitSummary.lat,
                        checkin_longitude: pendingVisitSummary.lng,
                        checkin_time: pendingVisitSummary.time
                    }
                })
            });

            if (res.ok) {
                alert('Visit summary submitted successfully!');
                
                try {
                    const saved = localStorage.getItem('postponed_visit_summaries');
                    const list = saved ? JSON.parse(saved) : [];
                    const newList = list.filter(item => String(item.jobId) !== String(pendingVisitSummary.jobId));
                    localStorage.setItem('postponed_visit_summaries', JSON.stringify(newList));
                    setPostponedSummaries(newList);
                } catch (e) {}

                try {
                    const active = localStorage.getItem('active_visit_check_in');
                    if (active && String(JSON.parse(active).jobId) === String(pendingVisitSummary.jobId)) {
                        localStorage.removeItem('active_visit_check_in');
                    }
                } catch (e) {}

                setPendingVisitSummary(null);
            } else {
                throw new Error('Failed to submit interaction to server');
            }
        } catch (e) {
            console.error('Error submitting visit summary:', e);
            alert('Failed to submit: ' + e.message);
        } finally {
            setSubmittingVisitSummary(false);
        }
    };

    useEffect(() => {
        if (!pendingVisitSummary) return;

        const loadVisitSummaryData = async () => {
            try {
                const jobId = pendingVisitSummary.jobId;
                const [jobRes, intRes, quoRes, invRes] = await Promise.all([
                    apiCall(`/api/technician/jobs/${jobId}`),
                    apiCall(`/api/technician/jobs/${jobId}/interactions`),
                    apiCall(`/api/technician/jobs/${jobId}/quotation`).catch(() => null),
                    apiCall(`/api/technician/jobs/${jobId}/invoice`).catch(() => null),
                ]);

                if (jobRes.ok) {
                    const jobData = await jobRes.json();
                    if (jobData.success) {
                        setVisitSummaryJobDetails(jobData.job);
                    }
                }

                if (intRes.ok) {
                    const intData = await intRes.json();
                    if (intData.success) {
                        setVisitSummaryInteractions(intData.data || []);
                    }
                }

                if (quoRes && quoRes.ok) {
                    const quoData = await quoRes.json();
                    if (quoData.success && quoData.data && quoData.data.length > 0) {
                        setVisitSummaryQuotation(quoData.data[0]);
                    }
                }

                if (invRes && invRes.ok) {
                    const invData = await invRes.json();
                    if (invData.success && invData.invoice) {
                        setVisitSummaryInvoice(invData.invoice);
                    } else if (invData.success && invData.data && invData.data.length > 0) {
                        setVisitSummaryInvoice(invData.data[0]);
                    }
                }
            } catch (e) {
                console.error('Failed to load visit summary job details:', e);
            }
        };

        setVisitNotes('');
        setUploadedAudioUrl('');
        setVisitSummaryJobDetails(null);
        setVisitSummaryInteractions([]);
        setVisitSummaryQuotation(null);
        setVisitSummaryInvoice(null);
        loadVisitSummaryData();
    }, [pendingVisitSummary]);



    useEffect(() => {
        if (typeof window !== 'undefined') {
            const clicked = localStorage.getItem('tech_clicked_map_v1');
            if (!clicked) {
                setHasClickedMap(false);
            }
        }
    }, []);

    const [jobs, setJobs] = useState([]);
    const setJobsWithQueueMerge = (rawJobsList) => {
        const merged = applyPendingQueueUpdates(rawJobsList).filter(j => j.status !== 'closed' && j.status !== 'cancelled');
        setJobs(merged);
    };
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
    const [gpsStatus, setGpsStatus] = useState('granted'); // Bypass location restriction for now
    const [gpsErrorDetail, setGpsErrorDetail] = useState(''); // stores the exact geolocator error message for diagnostics
    const [isOnline, setIsOnline] = useState(true);
    const [dutyStatus, setDutyStatus] = useState('offline'); // 'offline', 'on_duty', 'lunch'
    const [showLogoutReminder, setShowLogoutReminder] = useState(false);
    const [leaves, setLeaves] = useState([]);
    const [leavesLoading, setLeavesLoading] = useState(false);
    const [dutyStatusError, setDutyStatusError] = useState(null);
    const [mdmProfiles, setMdmProfiles] = useState(null);
    const [shiftActionLoading, setShiftActionLoading] = useState(null); // 'start', 'end', or null
    const [isClearingCache, setIsClearingCache] = useState(false);
    const [syncError, setSyncError] = useState(null);

    const isOnlineRef = useRef(isOnline);
    useEffect(() => {
        isOnlineRef.current = isOnline;
    }, [isOnline]);

    // 8:00 PM Logout Reminder Effect
    useEffect(() => {
        if (!isOnline) {
            setShowLogoutReminder(false);
            return;
        }
        
        const checkReminder = () => {
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const localDate = new Date(utc + (3600000 * 5.5)); // India timezone
            const currentHour = localDate.getHours();
            
            if (currentHour >= 20) { // 8:00 PM or later
                setShowLogoutReminder(true);
                
                // Trigger browser push notification if permissions granted
                if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'granted') {
                        new Notification("Shift End Reminder", {
                            body: "Your shift ended at 8:00 PM. Please log out/end your shift to disable location tracking.",
                            tag: "shift-logout-reminder"
                        });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission();
                    }
                }
            } else {
                setShowLogoutReminder(false);
            }
        };

        checkReminder();
        const interval = setInterval(checkReminder, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [isOnline]);


    // Offline Sync States & Listeners
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [syncItems, setSyncItems] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isDeviceOnline, setIsDeviceOnline] = useState(true);
    const [apkSize, setApkSize] = useState('6.53 MB');
    const [showForceUpdateModal, setShowForceUpdateModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        const url = 'https://sortedsolutions.in/downloads/technician-app-v7.apk';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => {
                    setCopied(true),
                    setTimeout(() => setCopied(false), 3000);
                })
                .catch(() => fallbackCopy(url));
        } else {
            fallbackCopy(url);
        }
    };

    const fallbackCopy = (text) => {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            alert('Failed to copy. Please type: sortedsolutions.in/downloads/technician-app-v7.apk');
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/firebase-messaging-sw.js')
                .then(reg => console.log('[ServiceWorker] Registered on startup:', reg.scope))
                .catch(err => console.warn('[ServiceWorker] Registration failed on startup:', err));
        }

        const checkAppVersion = async () => {
            const isNative = isNativePlatform();
            if (isNative && GPSBridgePlugin) {
                try {
                    // Check if getAppVersion method exists on the plugin
                    if (GPSBridgePlugin.getAppVersion) {
                        const res = await GPSBridgePlugin.getAppVersion();
                        if (res && res.version) {
                            setNativeAppVersion(res.version);
                            if (res.version === '1.7.0') {
                                // Up to date!
                                return;
                            }
                        }
                    }
                    // Old version or missing method -> Force update
                    setShowForceUpdateModal(true);
                } catch (e) {
                    // Failed to call -> Force update
                    setShowForceUpdateModal(true);
                }
            }
        };
        // Run check after a short delay to ensure native plugins are initialized
        const timer = setTimeout(checkAppVersion, 1000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        fetch('/downloads/technician-app-v7.apk', { method: 'HEAD' })
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
        const handleQueueChange = (e) => {
            const count = e.detail.count || 0;
            setPendingSyncCount(count);
            const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
            setSyncItems(queue);
            setSyncError(localStorage.getItem('offline_sync_error'));
        };
        const handleSyncComplete = () => {
            setPendingSyncCount(0);
            setSyncItems([]);
            setSyncError(null);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-queue-changed', handleQueueChange);
        window.addEventListener('offline-sync-complete', handleSyncComplete);

        const initialQueue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
        setPendingSyncCount(initialQueue.length);
        setSyncItems(initialQueue);
        setSyncError(localStorage.getItem('offline_sync_error'));

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-queue-changed', handleQueueChange);
            window.removeEventListener('offline-sync-complete', handleSyncComplete);
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
    const [showCashFlowModal, setShowCashFlowModal] = useState(false);
    const [pendingCashPayments, setPendingCashPayments] = useState([]);
    const [showJobSelectorModal, setShowJobSelectorModal] = useState(false);
    const [showStockModal, setShowStockModal] = useState(false);
    const [stock, setStock] = useState([]);
    const [stockLoading, setStockLoading] = useState(false);
    const [showEmailInbox, setShowEmailInbox] = useState(false);
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

    const activeTabRef = useRef(activeTab);
    useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.backHandlers = window.backHandlers || [];
        }
    }, []);

    useEffect(() => {
        if (!selectedJob) return;
        const handler = () => setSelectedJob(null);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [selectedJob]);

    useEffect(() => {
        if (!selectedJob) return;

        // Check if there is an active check-in session for this job
        try {
            const activeStr = localStorage.getItem('active_visit_check_in');
            if (activeStr) {
                const active = JSON.parse(activeStr);
                if (String(active.jobId) === String(selectedJob.id)) {
                    setPendingVisitSummary({
                        ...active,
                        actualCheckoutLat: null,
                        actualCheckoutLng: null,
                        distanceMetres: 0
                    });
                    // Close the selected job detail view so the modal is focus
                    setSelectedJob(null);
                    return;
                }
            }
        } catch (e) {}

        // Check if there is a postponed summary for this job
        try {
            const saved = localStorage.getItem('postponed_visit_summaries');
            if (saved) {
                const list = JSON.parse(saved);
                const found = list.find(item => String(item.jobId) === String(selectedJob.id));
                if (found) {
                    setPendingVisitSummary(found);
                    // Close the selected job detail view so the modal is focus
                    setSelectedJob(null);
                    return;
                }
            }
        } catch (e) {}
    }, [selectedJob]);

    useEffect(() => {
        if (!showStockModal) return;
        const handler = () => setShowStockModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showStockModal]);

    useEffect(() => {
        if (!showCashFlowModal) return;
        const handler = () => setShowCashFlowModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showCashFlowModal]);

    useEffect(() => {
        if (!showEmailInbox) return;
        const handler = () => setShowEmailInbox(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showEmailInbox]);

    useEffect(() => {
        if (!showCollectPayment) return;
        const handler = () => setShowCollectPayment(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showCollectPayment]);

    useEffect(() => {
        if (!calculatorJob) return;
        const handler = () => setCalculatorJob(null);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [calculatorJob]);

    useEffect(() => {
        if (!showJobSelectorModal) return;
        const handler = () => setShowJobSelectorModal(false);
        window.backHandlers = window.backHandlers || [];
        window.backHandlers.push(handler);
        return () => {
            window.backHandlers = (window.backHandlers || []).filter(h => h !== handler);
        };
    }, [showJobSelectorModal]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let backListener = null;
        let lastBackPress = 0;

        const initBackButton = async () => {
            try {
                const { App } = await import('@capacitor/app');

                backListener = await App.addListener('backButton', () => {
                    // Check dynamic back handler stack first
                    if (window.backHandlers && window.backHandlers.length > 0) {
                        const handler = window.backHandlers.pop();
                        handler();
                        return;
                    }

                    // Otherwise, switch active tab to dashboard
                    if (activeTabRef.current !== 'dashboard') {
                        setActiveTab('dashboard');
                        return;
                    }

                    // Exit on double tap
                    const now = Date.now();
                    if (now - lastBackPress < 2000) {
                        App.exitApp();
                    } else {
                        lastBackPress = now;
                        setBackPressToast('Press back again to exit Sorted App');
                        setTimeout(() => {
                            setBackPressToast('');
                        }, 2000);
                    }
                });
            } catch (err) {
                console.warn('[BackButton] Capacitor App plugin not available:', err);
            }
        };

        initBackButton();

        return () => {
            if (backListener) {
                backListener.remove();
            }
        };
    }, []);

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

    const [scheduledJobsCount, setScheduledJobsCount] = useState(0);
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
    const [submittingPurchase, setSubmittingPurchase] = useState(false);
    const [submittingLeave, setSubmittingLeave] = useState(false);
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

    useEffect(() => {
        if (!technicianId) return;
        const logTechSession = async () => {
            try {
                const isNative = isNativePlatform();
                
                // Generate/retrieve a persistent device session ID for this browser/device
                let devId = localStorage.getItem('device_session_id');
                if (!devId) {
                    devId = 'dev_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    localStorage.setItem('device_session_id', devId);
                }
                
                await fetch('/api/admin/reports/installed-devices', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: technicianId,
                        userName: technicianData?.name || 'Technician',
                        role: 'technician',
                        platform: isNative ? 'Technician App (Mobile)' : 'Web Browser',
                        appVersion: '1.6.0',
                        deviceSessionId: devId
                    })
                });
            } catch (e) {
                console.warn('Failed to log tech session:', e);
            }
        };
        logTechSession();
    }, [technicianId, technicianData]);

    useEffect(() => {
        if (showStockModal && technicianId) {
            (async () => {
                setStockLoading(true);
                try {
                    const res = await apiCall(`/api/technician/stock?technicianId=${technicianId}`);
                    const json = await res.json();
                    if (json.success) {
                        setStock(json.stock || []);
                    }
                } catch (err) {
                    console.error('Failed to fetch stock:', err);
                } finally {
                    setStockLoading(false);
                }
            })();
        }
    }, [showStockModal, technicianId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleUnauthorizedLogout = () => {
            const isNative = isNativePlatform();
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

    // ── Request push notification permission once logged in ────────────────
    usePushNotifications({ userType: 'technician', userId: technicianId });

    const checkGpsAndPingLocation = async () => {
        if (!technicianId) return;

        const isNative = isNativePlatform();

        // 1. If native, bypass GPS check and never block the app UI
        if (isNative) {
            setGpsStatus('granted');
        }

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            setGpsErrorDetail('navigator.geolocation is undefined');
            setGpsStatus('granted');
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
                setGpsErrorDetail('');
                try {
                    localStorage.setItem('lastKnownCoordinates', JSON.stringify({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude
                    }));
                } catch (e) {}

                // Check distance from active check-in site
                try {
                    const activeCheckInStr = localStorage.getItem('active_visit_check_in');
                    if (activeCheckInStr) {
                        const activeCheckIn = JSON.parse(activeCheckInStr);
                        if (activeCheckIn.lat && activeCheckIn.lng && pos.coords.latitude && pos.coords.longitude) {
                            const dist = getDistanceMeters(
                                Number(activeCheckIn.lat), Number(activeCheckIn.lng),
                                Number(pos.coords.latitude), Number(pos.coords.longitude)
                            );
                            if (dist > 500) {
                                // Clear active check-in session so it doesn't trigger again
                                localStorage.removeItem('active_visit_check_in');
                                // Trigger Visit Summary Modal
                                setPendingVisitSummary({
                                    ...activeCheckIn,
                                    actualCheckoutLat: pos.coords.latitude,
                                    actualCheckoutLng: pos.coords.longitude,
                                    distanceMetres: dist
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error checking active visit location distance:', e);
                }
                // Web/PWA: post coordinates.
                if (!isNative) {
                    const activeWorkingHours = isWorkingHoursCheck();
                    if (!activeWorkingHours) return;
                    // Web PWA fallback: Force precise location tracking during working/shift hours (8 AM - 9 PM)
                    // regardless of online/offline status toggle.
                    const pingPrecision = activeWorkingHours ? 'precise' : 'approx';

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
                                is_online: isOnline,
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
                setGpsErrorDetail(`[Code ${err.code}] ${err.message}`);
                let cached = null;
                try {
                    cached = localStorage.getItem('lastKnownCoordinates');
                } catch (e) {}
                if (cached) {
                    console.log('GPS error, using cached coordinates:', cached);
                    setGpsStatus('granted');
                    return;
                }
                setGpsStatus('granted');
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleGpsRetry = async () => {
        const isNative = isNativePlatform();
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

    const getLocalityColor = (locality) => {
        if (!locality) return 'var(--text-secondary)';
        const cleanLoc = locality.toLowerCase().trim();
        if (cleanLoc.includes('aarey')) return '#fbbf24';
        if (cleanLoc.includes('goregaon east')) return '#38bdf8';
        if (cleanLoc.includes('goregaon west')) return '#818cf8';
        if (cleanLoc.includes('bandra')) return '#f472b6';
        if (cleanLoc.includes('kandivali')) return '#34d399';
        let hash = 0;
        for (let i = 0; i < locality.length; i++) {
            hash = locality.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 85%, 70%)`;
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
        const weeklyOffDay = technicianData?.weekly_off_day || 'Sunday';
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayDayName = dayNames[new Date().getDay()];
        const isWeeklyOff = todayDayName === weeklyOffDay;
        
        if (isWeeklyOff) return false;

        const hasApprovedLeave = leaves.some(
            (leave) => leave.leave_date === todayStr && leave.status === 'approved'
        );
        return !hasApprovedLeave;
    };

    const updateOnlineStatus = async (status) => {
        setIsOnline(status);
        
        const isNative = isNativePlatform();
        if (isNative && GPSBridgePlugin) {
            try {
                await GPSBridgePlugin.setOnlineStatus({ isOnline: status });
            } catch (err) {
                console.error('[GPSBridge] Failed to set online status:', err);
            }
        }

        let sessionToken = null;
        try {
            const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
            if (session) {
                sessionToken = JSON.parse(session).session_token;
            }
        } catch (e) {}

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const trackingSource = isNative ? 'native_service' : 'web';
                    const precision = status ? 'precise' : 'approx';
                    
                    fetch('/api/technician/location', {
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
                            tracking_source: trackingSource,
                            is_online: status,
                            location_precision: precision,
                            session_token: sessionToken
                        }),
                    })
                    .then((res) => {
                        if (res.status === 401) {
                            window.dispatchEvent(new CustomEvent('unauthorized-session-logout'));
                        }
                    })
                    .catch((err) => console.error('Error posting location on toggle:', err));
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

    const handleStartShift = async () => {
        setDutyStatusError(null);
        try {
        setShiftActionLoading('start');
            let sessionToken = null;
            const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
            if (session) {
                sessionToken = JSON.parse(session).session_token;
            }
            
            const res = await fetch('/api/technician/shift/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken ? { 'x-session-token': sessionToken } : {})
                },
                body: JSON.stringify({ technician_id: technicianId })
            });
            const data = await res.json();
            if (data.success) {
                setDutyStatus('on_duty');
                await updateOnlineStatus(true);
            } else {
                setDutyStatusError(data.error || 'Failed to start shift');
            }
        } catch (err) {
            console.error('Error in handleStartShift:', err);
            setDutyStatusError('Network error starting shift');
        } finally {
            setShiftActionLoading(null);
        }
    };

    const handleEndShift = async () => {
        setDutyStatusError(null);
        try {
        setShiftActionLoading('end');
            let sessionToken = null;
            const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
            if (session) {
                sessionToken = JSON.parse(session).session_token;
            }

            const res = await fetch('/api/technician/shift/end', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken ? { 'x-session-token': sessionToken } : {})
                },
                body: JSON.stringify({ technician_id: technicianId })
            });
            const data = await res.json();
            if (data.success) {
                setDutyStatus('offline');
                await updateOnlineStatus(false);
            } else {
                setDutyStatusError(data.error || 'Failed to end shift');
            }
        } catch (err) {
            console.error('Error in handleEndShift:', err);
            setDutyStatusError('Network error ending shift');
        } finally {
            setShiftActionLoading(null);
        }
    };

    const handleToggleLunch = async () => {
        setDutyStatusError(null);
        const action = dutyStatus === 'lunch' ? 'end' : 'start';
        try {
            let sessionToken = null;
            const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
            if (session) {
                sessionToken = JSON.parse(session).session_token;
            }

            const res = await fetch('/api/technician/shift/lunch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(sessionToken ? { 'x-session-token': sessionToken } : {})
                },
                body: JSON.stringify({ technician_id: technicianId, action })
            });
            const data = await res.json();
            if (data.success) {
                setDutyStatus(data.duty_status);
            } else {
                setDutyStatusError(data.error || 'Failed to update lunch status');
            }
        } catch (err) {
            console.error('Error in handleToggleLunch:', err);
            setDutyStatusError('Network error updating lunch status');
        }
    };

    // Fetch initial online status and leaves
    useEffect(() => {
        if (!technicianId) return;

        const loadInitialData = async () => {
            try {
                // Fetch online status and duty status
                const { data, error } = await supabase
                    .from('technician_live_locations')
                    .select('is_online, duty_status')
                    .eq('technician_id', technicianId)
                    .maybeSingle();
                
                if (error) {
                    console.error('Error fetching online status:', error);
                } else if (data) {
                    setIsOnline(data.is_online !== false);
                    setDutyStatus(data.duty_status || (data.is_online ? 'on_duty' : 'offline'));
                    const isNative = isNativePlatform();
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

        const isNative = isNativePlatform();

        // Run foreground check immediately to verify status and set block screens
        checkGpsAndPingLocation();

        // Run foreground check periodically (every 60s) for distance-based checkouts on both web and native
        const pingInterval = setInterval(checkGpsAndPingLocation, 60_000);

        return () => {
            if (pingInterval) clearInterval(pingInterval);
        };
    }, [technicianId]);

    // Start native background service only after GPS/location permission is granted
    useEffect(() => {
        if (!technicianId || gpsStatus !== 'granted') return;

        const isNative = isNativePlatform();

        if (isNative && GPSBridgePlugin) {
            let sessionToken = null;
            try {
                const session = localStorage.getItem('technicianSession') || sessionStorage.getItem('technicianSession');
                if (session) {
                    sessionToken = JSON.parse(session).session_token;
                }
            } catch (e) {}

            GPSBridgePlugin.setTechnicianId({ id: String(technicianId), sessionToken: sessionToken })
                .then(() => {
                    console.log('[Native GPS] Technician ID registered on native service');
                    setGpsStatus('granted');
                    
                    // Request battery optimization bypass for continuous background tracking on Android
                    if (GPSBridgePlugin.checkAndRequestBatteryOptimization) {
                        GPSBridgePlugin.checkAndRequestBatteryOptimization()
                            .then(res => {
                                console.log('[Native GPS] Battery optimization status:', res);
                            })
                            .catch(err => {
                                console.warn('[Native GPS] Failed to check battery optimization:', err);
                            });
                    }
                })
                .catch(err => {
                    console.error('[Native GPS] Failed to register technician ID:', err);
                    setGpsStatus('granted');
                });
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

    const fetchScheduledJobs = async () => {
        if (!technicianId) return;
        try {
            const { data, error } = await supabase
                .from('jobs')
                .select('id')
                .eq('technician_id', technicianId)
                .eq('status', 'scheduled');
            
            if (error) throw error;
            setScheduledJobsCount(data ? data.length : 0);
        } catch (err) {
            console.error('Error fetching scheduled jobs count:', err);
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

    const fetchPendingCashPayments = async () => {
        if (!technicianId) return;
        try {
            const response = await apiCall(`/api/technician/payment?technicianId=${technicianId}&t=${Date.now()}`);
            if (response.ok) {
                const json = await response.json();
                if (json.success) {
                    setPendingCashPayments(json.data || []);
                }
            }
        } catch (err) {
            console.error('Error fetching pending cash payments:', err);
        }
    };

    const fetchJobs = async (isBackground = false) => {
        if (!technicianId) return [];
        try {
            if (!isBackground) setLoading(true);
            const response = await apiCall(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch jobs');
            }

            const data = await response.json();
            const jobsList = data.jobs || [];
            setJobsWithQueueMerge(jobsList);
            setError(null);

            // Silently warm/preload individual job details in the background
            if (jobsList.length > 0) {
                setTimeout(() => {
                    jobsList.forEach(job => {
                        apiCall(`/api/technician/jobs/${job.id}`).catch(() => {});
                        apiCall(`/api/technician/jobs/${job.id}/interactions`).catch(() => {});
                        apiCall(`/api/technician/jobs/${job.id}/quotation`).catch(() => {});
                        apiCall(`/api/technician/jobs/${job.id}/invoice`).catch(() => {});
                        apiCall(`/api/admin/interactions?job_id=${job.id}`).catch(() => {});
                    });
                }, 200);
            }

            return jobsList;
        } catch (err) {
            console.error('Error fetching jobs:', err);
            if (!isBackground) setError('Failed to load jobs. Please try again.');
            return [];
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const fetchIncentives = async () => {
        if (!technicianId) return;
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
        if (!technicianId) return;
        try {
            const response = await apiCall(`/api/technician/profile?technicianId=${technicianId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setTechnicianData(data.technician);
                    setMdmProfiles(data.mdmProfiles || null);
                    // Update local storage to keep it fresh
                    try {
                        localStorage.setItem('technicianData', JSON.stringify(data.technician));
                    } catch (e) {
                        console.warn('[Profile] Failed to update technicianData cache:', e);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    const handleForceRefreshCache = async () => {
        if (!isDeviceOnline) {
            alert('Cannot refresh data while offline. Please connect to the internet first.');
            return;
        }
        setIsRefreshingData(true);
        try {
            const [fetchedJobs] = await Promise.all([
                fetchJobs(true),
                fetchProfile(),
                fetchIncentives(),
                fetchPurchaseRequests(),
                fetchPendingCashPayments(),
                fetchScheduledJobs(),
                apiCall('/api/products').catch(err => console.warn('Failed to cache products:', err)),
                apiCall('/api/admin/print-settings').catch(err => console.warn('Failed to cache print settings:', err)),
                apiCall('/api/admin/qrcodes').catch(err => console.warn('Failed to cache QR codes:', err)),
                apiCall(`/api/technician/stock?technicianId=${technicianId}`).catch(err => console.warn('Failed to cache stock:', err)),
                apiCall(`/api/technician/leaves?technicianId=${technicianId}`).catch(err => console.warn('Failed to cache leaves:', err))
            ]);

            // Specifically wait for all detailed job caches to be warmed/updated to make sure it's 100% complete
            const jobsData = fetchedJobs || [];
            if (jobsData.length > 0) {
                const warmPromises = [];
                jobsData.forEach(job => {
                    warmPromises.push(apiCall(`/api/technician/jobs/${job.id}`).catch(() => {}));
                    warmPromises.push(apiCall(`/api/technician/jobs/${job.id}/interactions`).catch(() => {}));
                    warmPromises.push(apiCall(`/api/technician/jobs/${job.id}/quotation`).catch(() => {}));
                    warmPromises.push(apiCall(`/api/technician/jobs/${job.id}/invoice`).catch(() => {}));
                    warmPromises.push(apiCall(`/api/admin/interactions?job_id=${job.id}`).catch(() => {}));
                });
                await Promise.all(warmPromises);
            }

            alert('Offline Sync Preload Complete! All jobs, product catalogs, stock, QR codes, and settings are now cached and ready for offline use.');
        } catch (err) {
            console.error('Error preloading cache:', err);
            alert('Cache preload completed with some warnings. Please verify your connection.');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const handleClearAppCache = async () => {
        if (!confirm('This will refresh the app and clear all temporary website files and cache. Your login session and any pending offline sync changes will NOT be deleted. Do you want to proceed?')) {
            return;
        }
        setIsClearingCache(true);
        try {
            // 1. Clear Service Worker Registrations
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            }

            // 2. Clear Cache Storage API caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            // 3. Clear Session Storage
            sessionStorage.clear();

            alert('App Cache Cleared successfully! The app will now reload.');
            
            // 4. Force a hard reload bypassing cache by appending a unique query parameter
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('t', Date.now().toString());
            window.location.replace(newUrl.toString());
        } catch (err) {
            console.error('Error clearing app cache:', err);
            alert('Failed to clear some cache files: ' + err.message + '. We will reload anyway.');
            window.location.reload();
        } finally {
            setIsClearingCache(false);
        }
    };

    // Instant session check on focus/visibility change
    useEffect(() => {
        if (!technicianId) return;

        const handleCheck = () => {
            if (document.visibilityState === 'visible') {
                // Fetching profile checks session immediately on the server
                fetchProfile();
            }
        };

        window.addEventListener('focus', handleCheck);
        document.addEventListener('visibilitychange', handleCheck);

        return () => {
            window.removeEventListener('focus', handleCheck);
            document.removeEventListener('visibilitychange', handleCheck);
        };
    }, [technicianId]);

    // Fetch jobs and incentives when technician ID is available
    useEffect(() => {
        if (!technicianId) return;

        fetchJobs(false);
        fetchIncentives();
        fetchProfile();
        fetchScheduledJobs();
        fetchPurchaseRequests();
        fetchPendingCashPayments();

        // Silently warm/preload essential caches in background for offline use
        apiCall('/api/products').catch(() => {});
        apiCall('/api/admin/print-settings').catch(() => {});
        apiCall('/api/admin/qrcodes').catch(() => {});
        apiCall(`/api/technician/stock?technicianId=${technicianId}`).catch(() => {});
        apiCall(`/api/technician/leaves?technicianId=${technicianId}`).catch(() => {});

        // Listen for offline sync completion to reload jobs list
        const handleSyncComplete = () => {
            fetchJobs(true);
            fetchPendingCashPayments();
        };
        window.addEventListener('offline-sync-complete', handleSyncComplete);

        // 30-second polling — fallback in case Supabase realtime misses an event
        // Realtime handles instant updates; polling is just a safety net
        const pollInterval = setInterval(() => {
            fetchJobs(true);
            fetchScheduledJobs();
            fetchPendingCashPayments();
        }, 30000);

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
                    fetchJobs(true); 
                    fetchScheduledJobs();
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
            const isNative = isNativePlatform();
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
        if (submittingPurchase) return;
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
            setSubmittingPurchase(true);
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
            setSubmittingPurchase(false);
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
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <button 
                                onClick={() => {
                                    setViewMode('map');
                                    localStorage.setItem('tech_clicked_map_v1', 'true');
                                    setHasClickedMap(true);
                                }} 
                                title="Map View" 
                                style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: viewMode === 'map' ? 'var(--bg-primary)' : 'transparent', color: viewMode === 'map' ? '#3b82f6' : 'var(--text-secondary)', boxShadow: viewMode === 'map' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <Map size={16} />
                            </button>
                            {!hasClickedMap && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-10px',
                                    backgroundColor: '#ef4444',
                                    color: '#ffffff',
                                    fontSize: '8px',
                                    fontWeight: 900,
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    boxShadow: '0 1px 3px rgba(239, 68, 68, 0.4)',
                                    pointerEvents: 'none',
                                    letterSpacing: '0.5px'
                                }}>
                                    NEW
                                </span>
                            )}
                        </div>
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
                                apiCall(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`)
                                    .then(r => r.json())
                                    .then(d => { setJobsWithQueueMerge(d.jobs || []); setError(null); })
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
                    viewMode === 'map' ? (
                        <TechnicianJobsMapView
                            jobs={sortedJobs}
                            onJobClick={handleOpenJob}
                        />
                    ) : viewMode === 'table' ? (
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
                                            const isUrgent = job.priority === 'urgent';
                                            
                                            const assignedDate = new Date(job.assignedAt || job.createdAt || job.created_at);
                                            const diffMs = Date.now() - assignedDate.getTime();
                                            const hoursCrossed = Math.max(0, Math.floor(diffMs / (3600 * 1000)));
                                            let ribbonColor = '#3b82f6';
                                            if (hoursCrossed >= 25 && hoursCrossed <= 48) {
                                                ribbonColor = '#f97316';
                                            } else if (hoursCrossed > 48) {
                                                ribbonColor = '#ef4444';
                                            }

                                            const isRepeat = job.warranty || String(job.description || '').toLowerCase().startsWith('repeat');
                                            const isOver100Hours = hoursCrossed >= 100;

                                            let cardBg = 'var(--bg-elevated)';
                                            let cardBorder = isUrgent ? '2px solid #ef4444' : '2px solid var(--border-primary)';

                                            if (isRepeat) {
                                                cardBg = 'rgba(249, 115, 22, 0.08)';
                                                cardBorder = '2px solid rgba(249, 115, 22, 0.25)';
                                            }
                                            if (isOver100Hours) {
                                                cardBg = 'rgba(239, 68, 68, 0.08)';
                                                cardBorder = '2px solid rgba(239, 68, 68, 0.3)';
                                            }
                                            if (isUrgent) {
                                                cardBorder = '2px solid #ef4444';
                                            }

                                            const shouldHideAddress = !isOnline && !isWorkingHours();

                                            return (
                                                <div key={job.id} style={{ backgroundColor: cardBg, border: cardBorder, borderRadius: 'var(--radius-lg)', padding: '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: isUrgent ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none', position: 'relative', overflow: 'hidden', flexShrink: 0 }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        backgroundColor: ribbonColor,
                                                        color: '#ffffff',
                                                        padding: '3px 8px',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '0 0 0 8px',
                                                        zIndex: 2
                                                    }}>
                                                        {hoursCrossed} hrs
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', paddingRight: '48px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? ` · ${job.product.brand}` : ''}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={12} color={timeLeft.color} />
                                                                <span style={{ fontSize: '11px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span>
                                                            </div>
                                                            {job.priority_note && (
                                                                <span style={{
                                                                    backgroundColor: '#ffffff',
                                                                    color: '#000000',
                                                                    border: '1px solid #000000',
                                                                    borderRadius: '8px 8px 8px 1px',
                                                                    padding: '1px 6px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    whiteSpace: 'nowrap',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px',
                                                                    zIndex: 10
                                                                }}>
                                                                    ☁️ {job.priority_note}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                            <MapPin size={14} color={getLocalityColor(job.locality)} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                            <span style={{ 
                                                                fontSize: '13px', 
                                                                fontWeight: 'bold', 
                                                                color: getLocalityColor(job.locality), 
                                                                lineHeight: 1.4, 
                                                                whiteSpace: 'normal', 
                                                                wordBreak: 'break-word' 
                                                            }}>
                                                                {job.locality || job.city || 'No location'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-primary)', gap: '8px' }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>{priority.text}</div>
                                                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', alignItems: 'center' }}>
                                                            {job.mobile ? (
                                                                isOnline ? (
                                                                    <a href={`tel:${job.mobile}`} style={{ padding: '5px 10px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '3px' }}>📞 Call</a>
                                                                ) : (
                                                                    <button onClick={() => alert('Please go online to call customers.')} style={{ padding: '5px 10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 }}>📞 Call</button>
                                                                )
                                                            ) : null}
                                                            {shouldHideAddress ? (
                                                                <button onClick={() => alert('Please go online/working hours to view map.')} style={{ padding: '5px 10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 }}>📍 Map</button>
                                                            ) : (
                                                                (job.location?.lat && job.location?.lng) ? (
                                                                    <a href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '3px' }}>📍 Map</a>
                                                                ) : (job.locality || job.city || job.address) ? (
                                                                    <a href={`https://www.google.com/maps/search/${encodeURIComponent([job.address, job.locality, job.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', gap: '3px' }}>📍 Map</a>
                                                                ) : null
                                                            )}
                                                        </div>
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
                                            const isUrgent = job.priority === 'urgent';
                                            
                                            // LIST MODE RENDERER
                                            if (viewMode === 'list') {
                                                return (
                                                    <div key={job.id} onClick={() => handleOpenJob(job)} style={{ backgroundColor: 'var(--bg-elevated)', border: `1px solid ${isUrgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-md)', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s', boxShadow: isUrgent ? '0 0 0 1px rgba(239, 68, 68, 0.2)' : 'none' }}>
                                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                            <div style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '6px', fontSize: '11px', fontWeight: 600, width: '90px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {job.status ? job.status.replace(/[-_]/g, ' ').toUpperCase() : 'OPEN'}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
                                                                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {job.customerName} <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>· {job.description || job.product?.type || 'Service'}</span>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', position: 'relative', marginTop: '2px' }}>
                                                                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '8px', fontWeight: 600 }}>
                                                                        {technicianData?.name ? technicianData.name.split(' ').map(n => n[0]).join('') : 'T'}
                                                                    </div>
                                                                    {job.priority_note && (
                                                                        <div style={{
                                                                            backgroundColor: '#ffffff',
                                                                            color: '#000000',
                                                                            border: '1px solid #000000',
                                                                            borderRadius: '8px 8px 8px 1px',
                                                                            padding: '2px 5px',
                                                                            fontSize: '9px',
                                                                            fontWeight: 700,
                                                                            whiteSpace: 'nowrap',
                                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '2px',
                                                                            zIndex: 10
                                                                        }}>
                                                                            ☁️ {job.priority_note}
                                                                        </div>
                                                                    )}
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
                                            const assignedDate = new Date(job.assignedAt || job.createdAt || job.created_at);
                                            const diffMs = Date.now() - assignedDate.getTime();
                                            const hoursCrossed = Math.max(0, Math.floor(diffMs / (3600 * 1000)));
                                            let ribbonColor = '#3b82f6';
                                            if (hoursCrossed >= 25 && hoursCrossed <= 48) {
                                                ribbonColor = '#f97316';
                                            } else if (hoursCrossed > 48) {
                                                ribbonColor = '#ef4444';
                                            }

                                            const shouldHideAddress = !isOnline && !isWorkingHours();

                                            return (
                                                <div key={job.id} style={{ backgroundColor: 'var(--bg-elevated)', border: `2px solid ${isUrgent ? '#ef4444' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-lg)', padding: isDetail ? '16px' : '12px', cursor: 'pointer', transition: 'all var(--transition-normal)', boxShadow: isUrgent ? '0 0 0 2px rgba(239, 68, 68, 0.15)' : 'none', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', flexShrink: 0 }} onClick={() => handleOpenJob(job)} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        right: 0,
                                                        backgroundColor: ribbonColor,
                                                        color: '#ffffff',
                                                        padding: '3px 8px',
                                                        fontSize: '10px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '0 0 0 8px',
                                                        zIndex: 2
                                                    }}>
                                                        {hoursCrossed} hrs
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', paddingRight: '48px' }}>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: isDetail ? '16px' : '13px', fontWeight: 700, marginBottom: '2px', lineHeight: 1.2 }}>{job.description || job.product?.type || job.issueCategory || 'Service Job'}</div>
                                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                                {job.customerName}{(job.product?.brand && job.product.brand !== 'Unknown') ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.brand}</span> : null}{job.description && job.product?.type ? <span style={{ color: 'var(--text-tertiary)' }}> · {job.product.type}</span> : null}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={12} color={timeLeft.color} />
                                                                <span style={{ fontSize: '12px', color: timeLeft.color, fontWeight: 600 }}>{timeLeft.text}</span>
                                                            </div>
                                                            {job.priority_note && (
                                                                <span style={{
                                                                    backgroundColor: '#ffffff',
                                                                    color: '#000000',
                                                                    border: '1px solid #000000',
                                                                    borderRadius: '8px 8px 8px 1px',
                                                                    padding: '1px 6px',
                                                                    fontSize: '10px',
                                                                    fontWeight: 700,
                                                                    whiteSpace: 'nowrap',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px',
                                                                    zIndex: 10
                                                                }}>
                                                                    ☁️ {job.priority_note}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                                            <MapPin size={14} color={getLocalityColor(job.locality)} style={{ marginTop: '2px', flexShrink: 0 }} />
                                                            <span style={{ 
                                                                fontSize: '13px', 
                                                                fontWeight: 'bold', 
                                                                color: getLocalityColor(job.locality), 
                                                                lineHeight: 1.4, 
                                                                whiteSpace: 'normal', 
                                                                wordBreak: 'break-word' 
                                                            }}>
                                                                {job.locality || job.city || 'No location'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: isDetail ? 'wrap' : 'nowrap' }}>
                                                        <div style={{ padding: '2px 8px', backgroundColor: getStatusColor(job.status) + '20', color: getStatusColor(job.status), borderRadius: '12px', fontSize: '10px', fontWeight: 600, flexShrink: 0 }}>{job.status ? job.status.replace(/[-_]/g, ' ').toUpperCase() : 'OPEN'}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', flex: 1, whiteSpace: isDetail ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{job.defect || 'No defect specified'}"</div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                                                        <div style={{ padding: '2px 6px', backgroundColor: priority.color + '20', color: priority.color, borderRadius: '4px', fontSize: '10px', fontWeight: 600, marginRight: '4px', whiteSpace: 'nowrap' }}>{priority.text}</div>
                                                        {job.mobile ? (
                                                            isOnline ? (
                                                                <a href={`tel:${job.mobile}`} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📞 Call</a>
                                                            ) : (
                                                                <button onClick={() => alert('Please go online to call customers.')} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 }}>📞 Call</button>
                                                            )
                                                        ) : null}
                                                        {shouldHideAddress ? (
                                                            <button onClick={() => alert('Please go online/working hours to view map.')} style={{ flex: 1, padding: '7px 4px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'not-allowed', opacity: 0.6 }}>📍 Map</button>
                                                        ) : (
                                                            (job.location?.lat && job.location?.lng) ? (
                                                                <a href={`https://www.google.com/maps?q=${job.location.lat},${job.location.lng}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a>
                                                            ) : (job.locality || job.city || job.address) ? (
                                                                <a href={`https://www.google.com/maps/search/${encodeURIComponent([job.address, job.locality, job.city].filter(Boolean).join(', '))}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: '7px 4px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>📍 Map</a>
                                                            ) : null
                                                        )}
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

    const getQueueItemLabel = (item) => {
        try {
            if (!item.body) return `API Request (${item.method})`;
            const bodyObj = typeof item.body === 'string' ? JSON.parse(item.body) : item.body;
            
            if (bodyObj.action) {
                switch (bodyObj.action) {
                    case 'mark_on_way':
                        return 'Start Job / Sharing GPS';
                    case 'mark_arrived':
                        return 'Arrive at Destination';
                    case 'before-photos-uploaded':
                        return 'Upload Check-in Photos';
                    case 'close_visit':
                        return 'Check-out & Close Visit';
                    case 'approve_quotation':
                        return 'Approve Quotation';
                    default:
                        return `Status Update: ${bodyObj.action}`;
                }
            }
            if (bodyObj.type === 'approve_quotation') {
                return 'Quotation Approval Log';
            }
            if (item.url.includes('/api/technician/jobs/') && item.url.includes('/interactions')) {
                return `Log Interaction: ${bodyObj.type || 'Activity'}`;
            }
            if (item.url.includes('/api/technician/jobs/') && bodyObj.total_amount !== undefined) {
                return 'Save Invoice details';
            }
            return `${item.method} Request to ${item.url.split('/').pop()}`;
        } catch (e) {
            return `Queued Request (${item.method})`;
        }
    };

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
                        { label: 'Joined', value: technicianData?.joinDate ? new Date(technicianData.joinDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '...' },
                        { label: 'App Version', value: nativeAppVersion }
                    ].map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx !== 5 ? '1px solid var(--border-primary)' : 'none', paddingBottom: idx !== 5 ? '8px' : '0' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right', wordBreak: item.breakWord ? 'break-all' : 'normal', maxWidth: '70%' }}>{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sync Center Section */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={18} color="#3b82f6" />
                        <span>Sync Center</span>
                    </div>
                    <span style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backgroundColor: isDeviceOnline ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: isDeviceOnline ? '#10b981' : '#ef4444',
                        fontWeight: 700
                    }}>
                        {isDeviceOnline ? '● Online' : '● Offline Mode'}
                    </span>
                </h3>

                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: '1.4' }}>
                    Actions taken offline are saved to your device and sync automatically in the background when internet connectivity returns.
                </p>

                {syncError && (
                    <div style={{
                        marginBottom: 'var(--spacing-md)',
                        padding: '10px',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ef4444',
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <strong>Last Sync Error:</strong>
                            <div style={{ marginTop: '2px', wordBreak: 'break-all', fontWeight: 500 }}>{syncError}</div>
                        </div>
                    </div>
                )}

                {pendingSyncCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px 0', border: '1px dashed var(--border-primary)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>✅</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Up to Date</span>
                        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', marginBottom: '12px' }}>All actions and photos are fully synced.</p>
                        <button
                            onClick={handleForceRefreshCache}
                            disabled={isRefreshingData || !isDeviceOnline}
                            className="btn btn-secondary"
                            style={{
                                padding: '6px 12px',
                                fontSize: '11px',
                                fontWeight: 600,
                                height: 'auto',
                                backgroundColor: isDeviceOnline ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                color: isDeviceOnline ? 'var(--text-primary)' : 'var(--text-tertiary)',
                                border: '1px solid var(--border-primary)',
                                opacity: (isRefreshingData || !isDeviceOnline) ? 0.6 : 1,
                                cursor: (isRefreshingData || !isDeviceOnline) ? 'not-allowed' : 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <RefreshCw size={12} className={isRefreshingData ? 'spin' : ''} />
                            {isRefreshingData ? 'Preloading...' : 'Preload Offline Cache'}
                        </button>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Pending Changes ({pendingSyncCount})</span>
                            <button
                                onClick={async () => {
                                    if (isSyncing || !isDeviceOnline) return;
                                    setIsSyncing(true);
                                    try {
                                        await syncOfflineQueue();
                                        // Refresh state after sync attempt
                                        const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
                                        setPendingSyncCount(queue.length);
                                        setSyncItems(queue);
                                        setSyncError(localStorage.getItem('offline_sync_error'));
                                    } catch (err) {
                                        console.warn('Manual sync failed:', err);
                                        setSyncError(err.message);
                                    } finally {
                                        setIsSyncing(false);
                                    }
                                }}
                                disabled={isSyncing || !isDeviceOnline}
                                className="btn btn-primary"
                                style={{
                                    padding: '6px 12px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    height: 'auto',
                                    backgroundColor: isDeviceOnline ? '#3b82f6' : 'var(--bg-tertiary)',
                                    color: isDeviceOnline ? 'white' : 'var(--text-tertiary)',
                                    opacity: (isSyncing || !isDeviceOnline) ? 0.6 : 1,
                                    cursor: (isSyncing || !isDeviceOnline) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: '8px', backgroundColor: 'var(--bg-primary)' }}>
                            {syncItems.map((item, idx) => {
                                const hasFiles = typeof item.body === 'string' && item.body.includes('/offline-file-placeholder?id=');
                                return (
                                    <div key={item.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-primary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {getQueueItemLabel(item)}
                                            </span>
                                            <span style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
                                                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {hasFiles && (
                                            <span style={{ fontSize: '10px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                📸 Attachment(s) Queued Locally
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                    Install the native Android app for thermal printer support and reliable push notifications.
                </p>
                <a
                    href="/downloads/technician-app-v7.apk"
                    download="SortedTechnician_v7.apk"
                    target="_blank"
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
                        cursor: 'pointer',
                        marginBottom: '12px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                    <Download size={16} />
                    Download Tech App v6 APK ({apkSize})
                </a>
            </div>

            {/* Clear Cache Section */}
            <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-primary)',
                marginBottom: 'var(--spacing-md)'
            }}>
                <h3 style={{ fontSize: 'var(--font-size-base)', fontWeight: 600, marginBottom: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Trash2 size={18} color="#ef4444" />
                    <span>App Storage &amp; Cache</span>
                </h3>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-sm)', lineHeight: '1.4' }}>
                    If the app is behaving incorrectly or not showing the latest updates, clear the website cache. This will reload the app without logging you out or losing pending offline changes.
                </p>
                <button
                    onClick={handleClearAppCache}
                    disabled={isClearingCache}
                    className="btn btn-secondary"
                    style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: '#ef4444',
                        fontWeight: 600,
                        border: '1px solid #ef4444',
                        cursor: isClearingCache ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        fontSize: 'var(--font-size-sm)'
                    }}
                >
                    {isClearingCache ? (
                        <>
                            <Loader2 size={16} className="spin" />
                            Clearing Cache...
                        </>
                    ) : (
                        <>
                            <Trash2 size={16} />
                            Clear App Cache
                        </>
                    )}
                </button>
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
                                                backgroundColor: req.status === 'cancelled' ? '#fee2e2' : (isPending ? '#fef3c7' : '#d1fae5'),
                                                color: req.status === 'cancelled' ? '#dc2626' : (isPending ? '#d97706' : '#059669'),
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {req.status === 'cancelled' ? 'Rejected' : (isPending ? 'Pending Audit' : 'Approved')}
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

    const renderStockView = () => {
        return (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header Row (Sticky/Frozen) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', flexShrink: 0 }}>
                    <button 
                        onClick={() => setShowStockModal(false)} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'var(--text-primary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: '4px' 
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
                        <Package size={20} color="#f59e0b" /> My Physical Stock
                    </h3>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', justifyContent: 'flex-start' }}>
                    {stockLoading ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            Loading inventory...
                        </div>
                    ) : stock.length === 0 ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            No spare parts currently in your physical inventory. Handovers from the Service Center will appear here.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {stock.map(item => (
                                <div 
                                    key={item.id}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column',
                                        padding: '14px', 
                                        backgroundColor: 'var(--bg-secondary)', 
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-primary)',
                                        gap: '10px'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                <span>SKU: {item.sku || 'N/A'}</span>
                                                <span>•</span>
                                                <span>{item.category}</span>
                                            </div>
                                        </div>
                                        <span 
                                            style={{ 
                                                fontSize: '12px', 
                                                fontWeight: 700, 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                backgroundColor: item.quantity <= 0 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                                                color: item.quantity <= 0 ? '#ef4444' : '#10b981'
                                            }}
                                        >
                                            {item.quantity} Qty
                                        </span>
                                    </div>

                                    {/* Audit Details - Negative Stock Trace */}
                                    {item.quantity < 0 && item.negative_details && item.negative_details.length > 0 && (
                                        <div style={{ padding: '8px 10px', backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: '6px', borderLeft: '3px solid #ef4444', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billed On Jobs (Negative Stock Trace):</div>
                                            {item.negative_details.map((neg, idx) => (
                                                <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', borderBottom: idx < item.negative_details.length - 1 ? '1px dashed var(--border-primary)' : 'none', paddingBottom: idx < item.negative_details.length - 1 ? '4px' : '0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        <span>Job: {neg.job_number}</span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{new Date(neg.date).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>📍 {neg.location}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Audit Details - Positive Stock Handover Trace */}
                                    {item.quantity > 0 && item.positive_details && item.positive_details.length > 0 && (
                                        <div style={{ padding: '8px 10px', backgroundColor: 'rgba(16,185,129,0.06)', borderRadius: '6px', borderLeft: '3px solid #10b981', display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Center Handover Log:</div>
                                            {item.positive_details.map((pos, idx) => (
                                                <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', borderBottom: idx < item.positive_details.length - 1 ? '1px dashed var(--border-primary)' : 'none', paddingBottom: idx < item.positive_details.length - 1 ? '4px' : '0' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        <span>Handover: {pos.handover_id.slice(0, 8)}...</span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{new Date(pos.date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    {pos.other_items && pos.other_items.length > 0 && (
                                                        <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '3px', fontStyle: 'italic' }}>
                                                            📦 Other items in batch: {pos.other_items.join(', ')}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCashFlowView = () => {
        return (
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header Row (Sticky/Frozen) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-primary)', flexShrink: 0 }}>
                    <button 
                        onClick={() => setShowCashFlowModal(false)} 
                        style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: 'var(--text-primary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            padding: '4px' 
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-primary)' }}>
                        <DollarSign size={20} color="#10b981" /> Cash Flow Details
                    </h3>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, minHeight: 0, overflowX: 'hidden', overflowY: 'auto', padding: 'var(--spacing-md)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', justifyContent: 'flex-start' }}>
                    {/* Summary Card */}
                    <div style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Total Cash to Handover:</span>
                        <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>
                            ₹{pendingCashPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Handover this cash to the service center at the end of your shift. Once the admin verifies and posts the receipt, these entries will vanish.
                    </p>

                    {pendingCashPayments.length === 0 ? (
                        <div style={{
                            padding: '24px',
                            textAlign: 'center',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: '8px',
                            border: '1px dashed var(--border-primary)',
                            color: 'var(--text-tertiary)',
                            fontSize: '13px',
                            fontWeight: 500
                        }}>
                            🎉 No pending cash handover. All cash settled!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {pendingCashPayments.map((payment) => {
                                const collectedDate = new Date(payment.created_at || payment.date);
                                const isOneDayAgo = (Date.now() - collectedDate.getTime()) >= 24 * 60 * 60 * 1000;
                                
                                const propData = payment.jobs?.property;
                                const locality = propData?.locality || propData?.city || 'No location';
                                const appliance = payment.jobs?.appliance || 'No appliance';

                                return (
                                    <div
                                        key={payment.id}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            padding: '12px 14px',
                                            borderRadius: '8px',
                                            backgroundColor: isOneDayAgo ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-secondary)',
                                            border: isOneDayAgo ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-primary)',
                                            transition: 'border-color 0.2s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {payment.jobs?.customer_name || 'Walk-in Customer'}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    Job: #{payment.jobs?.job_number || 'General'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: isOneDayAgo ? '#ef4444' : 'var(--text-primary)' }}>
                                                ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '12px', 
                                            fontSize: '12px',
                                            color: 'var(--text-secondary)',
                                            borderTop: '1px solid var(--border-primary)',
                                            paddingTop: '8px',
                                            marginTop: '2px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={12} color="var(--text-tertiary)" />
                                                <span>{locality}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Briefcase size={12} color="var(--text-tertiary)" />
                                                <span>{appliance}</span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                                                Collected: {collectedDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} {collectedDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                            {isOneDayAgo && (
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    color: '#ef4444'
                                                }}>
                                                    ⚠️ Overdue Handover
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
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
        if (showStockModal) {
            return renderStockView();
        }
        if (showCashFlowModal) {
            return renderCashFlowView();
        }

        const openJobsCount = jobs.filter(j => j.status !== 'completed' && j.status !== 'closed' && j.status !== 'cancelled').length;

        const cardsData = [
            {
                title: 'Physical Stock',
                description: 'View your spare parts and inventory stock levels',
                icon: <Package size={20} color="#f59e0b" />,
                color: '#f59e0b',
                onClick: () => setShowStockModal(true)
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
            },
            {
                title: 'Email Inbox',
                description: 'Read and reply to client & support emails',
                icon: <Mail size={20} color="#3b82f6" />,
                color: '#3b82f6',
                onClick: () => setShowEmailInbox(true)
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

                {/* Pending Visit Summary Banners */}
                {postponedSummaries.map((summary) => (
                    <div 
                        key={summary.jobId}
                        onClick={() => setPendingVisitSummary(summary)}
                        style={{
                            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0.25))',
                            border: '1px solid rgba(249, 115, 22, 0.4)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            color: '#ffedd5',
                            boxShadow: 'var(--shadow-sm)',
                            marginBottom: '4px'
                        }}
                    >
                        <AlertCircle size={20} color="#fb923c" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.4 }}>
                            <strong>Pending Visit Summary:</strong> You have a pending summary for Job <strong>#{summary.jobNumber}</strong>. Tap here to write notes and submit.
                        </div>
                        <ChevronRight size={16} color="#fb923c" />
                    </div>
                ))}

                {/* Duty Status Card */}
                <div 
                    className="card"
                    style={{ 
                        padding: 'var(--spacing-lg)', 
                        borderLeft: `4px solid ${!isOnline ? '#6b7280' : (dutyStatus === 'lunch' ? '#f59e0b' : '#10b981')}`, 
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
                            <Activity size={20} color={!isOnline ? '#6b7280' : (dutyStatus === 'lunch' ? '#f59e0b' : '#10b981')} /> Duty Status
                        </h3>
                        <span style={{ 
                            fontSize: '12px', 
                            fontWeight: 700, 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            backgroundColor: !isOnline ? 'rgba(107,114,128,0.1)' : (dutyStatus === 'lunch' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)'),
                            color: !isOnline ? '#6b7280' : (dutyStatus === 'lunch' ? '#f59e0b' : '#10b981')
                        }}>
                            {!isOnline ? 'OFFLINE 🔴' : (dutyStatus === 'lunch' ? 'ON LUNCH 🟡' : 'ON DUTY 🟢')}
                        </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        {!isOnline 
                            ? "Your shift is ended. GPS location sharing is disabled for your privacy." 
                            : (dutyStatus === 'lunch' 
                                ? "You are on a lunch break. GPS sharing remains active. Enjoy your break!"
                                : "Your shift is active. Precise GPS location tracking is locked Always-On.")}
                    </p>

                    {/* MDM Policy Status Display */}
                    {mdmProfiles && mdmProfiles.length > 0 && (
                        <div style={{
                            padding: '10px 12px',
                            backgroundColor: 'rgba(99, 102, 241, 0.05)',
                            border: '1px solid rgba(99, 102, 241, 0.15)',
                            borderRadius: '8px',
                            fontSize: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            marginTop: '8px'
                        }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🛡️ Active MDM Policies:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '4px' }}>
                                {mdmProfiles.map((p, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>• {p.profile_name}</span>
                                        <span style={{ 
                                            fontSize: '10px', 
                                            fontWeight: 'bold',
                                            color: p.status === "6" ? '#10b981' : '#f59e0b',
                                            backgroundColor: p.status === "6" ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '8px'
                                        }}>
                                            {p.status === "6" ? "Applied" : "Pending"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active shift/lunch controls */}
                    <div style={{ marginTop: '4px', width: '100%' }}>
                        {!isOnline ? (
                            <button
                                onClick={handleStartShift}
                                    disabled={shiftActionLoading !== null}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                    {shiftActionLoading === 'start' ? (
                                        <>
                                            <Loader2 style={{ animation: 'mdmSpin 1s linear infinite' }} size={16} /> Starting...
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: "18px", marginRight: "4px" }}>🛵</span> Start Work Shift
                                        </>
                                    )}
                            </button>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Lunch break toggle */}
                                <button
                                    onClick={handleToggleLunch}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #f59e0b',
                                        backgroundColor: dutyStatus === 'lunch' ? '#f59e0b' : 'transparent',
                                        color: dutyStatus === 'lunch' ? 'black' : '#f59e0b',
                                        fontWeight: 'bold',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    🍱 {dutyStatus === 'lunch' ? 'End Lunch Break' : 'Start Lunch Break'}
                                </button>

                                {/* End Shift button */}
                                {(() => {
                                    const now = new Date();
                                    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                                    const localDate = new Date(utc + (3600000 * 5.5)); // India timezone
                                    const currentHour = localDate.getHours();
                                    const isLocked = currentHour >= 9 && currentHour < 19; // Locked during core shift hours (9 AM - 7 PM)

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <button
                                                onClick={handleEndShift}
                                                disabled={isLocked || shiftActionLoading !== null}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    backgroundColor: isLocked ? 'var(--bg-secondary)' : '#ef4444',
                                                    color: isLocked ? 'var(--text-tertiary)' : 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '14px',
                                                    cursor: (isLocked || shiftActionLoading !== null) ? 'not-allowed' : 'pointer',
                                                    opacity: (isLocked || shiftActionLoading !== null) ? 0.6 : 1,
                                                    border: isLocked ? '1px dashed var(--border-primary)' : 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                {isLocked ? (
                                                    '🔒 End Shift (Locked)'
                                                ) : shiftActionLoading === 'end' ? (
                                                    <>
                                                        <Loader2 style={{ animation: 'mdmSpin 1s linear infinite' }} size={14} /> Ending...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Power size={14} /> End Shift & Turn Off GPS
                                                    </>
                                                )}
                                            </button>
                                            {isLocked && (
                                                <span style={{ fontSize: '11px', color: '#f87171', fontStyle: 'italic', textAlign: 'center', marginTop: '2px' }}>
                                                    End Shift is locked during shift hours (9:00 AM - 7:00 PM)
                                                </span>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {showLogoutReminder && (
                        <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '6px', lineHeight: 1.4 }}>
                            <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <strong>Reminder:</strong> Shift ended at 8:00 PM. Please click "End Shift" above to disassociate MDM kiosk mode and turn off location sharing.
                            </div>
                        </div>
                    )}

                    {dutyStatusError && (
                        <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                            <AlertCircle size={14} /> {dutyStatusError}
                        </div>
                    )}

                    {(!isOnline && isSupposedToBeOnDutyToday()) && (
                        <div style={{ color: '#f59e0b', fontSize: '12px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: '6px', lineHeight: 1.4 }}>
                            <AlertCircle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <strong>Alert:</strong> You are scheduled to be on duty today. Please click "Start Work Shift" above to access your jobs.
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
                        <div style={{ 
                            backgroundColor: 'var(--bg-secondary)', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            textAlign: 'center', 
                            border: scheduledJobsCount > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-primary)',
                            boxShadow: scheduledJobsCount > 0 ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none'
                        }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{scheduledJobsCount}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, marginTop: '4px' }}>Scheduled Jobs</div>
                        </div>
                    </div>
                </div>


                {/* Cash Flow / Handover Card */}
                <div 
                    className="card"
                    onClick={() => setShowCashFlowModal(true)}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    style={{ 
                        padding: 'var(--spacing-lg)', 
                        borderLeft: '4px solid #10b981', 
                        backgroundColor: 'var(--bg-elevated)', 
                        borderRadius: 'var(--radius-lg)', 
                        boxShadow: 'var(--shadow-sm)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <DollarSign size={20} color="#10b981" /> Cash Flow / Handover
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ 
                            fontSize: '14px', 
                            fontWeight: 700, 
                            color: '#10b981', 
                            backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                            padding: '6px 12px', 
                            borderRadius: '12px' 
                        }}>
                            Total in Hand: ₹{pendingCashPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <ChevronRight size={20} color="var(--text-tertiary)" />
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
                {gpsErrorDetail && (
                    <div style={{
                        padding: '10px 14px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#ef4444',
                        borderRadius: 10,
                        fontSize: 12,
                        fontFamily: 'monospace',
                        marginBottom: 20,
                        maxWidth: 320,
                        textAlign: 'center',
                        wordBreak: 'break-word'
                    }}>
                        Error details: {gpsErrorDetail}
                    </div>
                )}
                <button 
                    onClick={handleGpsRetry}
                    style={{
                        width: '100%',
                        maxWidth: 280,
                        padding: '14px',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontSize: '15px',
                        boxShadow: '0 4px 12px rgba(245,158,11,0.25)',
                        marginBottom: '24px'
                    }}
                >
                    Retry / Enable GPS
                </button>

                <div style={{
                    width: '100%',
                    maxWidth: 340,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '16px',
                    textAlign: 'left'
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        💡 Troubleshooting GPS Issues:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                        <li style={{ marginBottom: '6px' }}>
                            <strong>Unblock in Address Bar:</strong> If Chrome/Safari is not prompting you, look at the top left of your browser address bar next to <code>sortedsolutions.in</code>. Click the <strong>Sliders/Tune icon</strong> (or Lock icon) and change <strong>Location</strong> to <strong>Allow</strong>.
                        </li>
                        <li style={{ marginBottom: '6px' }}>
                            <strong>Don't use Incognito Mode:</strong> Browsers in Incognito/Private tabs completely block location access by default.
                        </li>
                        <li style={{ marginBottom: '6px' }}>
                            <strong>Avoid In-App Browsers:</strong> If opened from WhatsApp or Email, copy the link and open it directly in Chrome or Safari.
                        </li>
                        <li style={{ marginBottom: '6px' }}>
                            <strong>Turn System GPS ON:</strong> Ensure your phone's main "Location / GPS" setting is turned on in the top pull-down menu.
                        </li>
                        <li>
                            <strong>Allow Browser App Permission:</strong> Go to your phone Settings &gt; Apps &gt; Chrome (or Safari) &gt; Permissions &gt; Location &gt; set to <strong>"Allow while using app"</strong>.
                        </li>
                    </ul>
                </div>
            </div>
        );
    }

    if (showForceUpdateModal) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: 'var(--bg-primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '30px',
                zIndex: 99999,
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif',
                textAlign: 'center'
            }}>
                <div style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '450px',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <span style={{ fontSize: '48px' }}>⚠️</span>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#ef4444' }}>App Update Required</h2>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        You are using an outdated version of the Sorted Technician app. 
                        A mandatory update is required to continue. This update contains critical fixes for GPS tracking.
                    </p>
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                const isNative = isNativePlatform();
                                const downloadUrl = 'https://sortedsolutions.in/downloads/technician-app-v7.apk';
                                if (isNative && GPSBridgePlugin && GPSBridgePlugin.openSystemBrowser) {
                                    GPSBridgePlugin.openSystemBrowser({ url: downloadUrl }).catch(() => {
                                        window.location.href = downloadUrl;
                                    });
                                } else {
                                    window.location.href = downloadUrl;
                                }
                            }
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '14px',
                            borderRadius: '12px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '15px',
                            marginTop: '8px',
                            boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
                        }}
                    >
                        Download & Install Update
                    </button>

                    <button
                        onClick={handleCopyLink}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            backgroundColor: copied ? '#059669' : '#4b5563',
                            color: 'white',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {copied ? '✓ Link Copied!' : '📋 Copy Download Link'}
                    </button>

                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-primary)',
                        textAlign: 'left',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        width: '100%'
                    }}>
                        <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>💡 How to install:</strong>
                        1. Click <strong>Download</strong> or copy the link to your clipboard.<br />
                        2. Open **Google Chrome** or **Samsung Internet** on your phone.<br />
                        3. Paste the link into Chrome's address bar and download the APK.<br />
                        4. Once downloaded, open the file and tap **Install / Update**.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
        <style>{`@keyframes mdmSpin { 100% { transform: rotate(360deg); } }`}</style>
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
                ) : showEmailInbox ? (
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <TechEmailInbox 
                            technicianData={technicianData} 
                            onBack={() => setShowEmailInbox(false)} 
                        />
                    </div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboardTab()}
                        {activeTab === 'calendar' && (
                            <CalendarView 
                                technicianId={technicianId} 
                                jobs={jobs} 
                                onSelectJob={setSelectedJob}
                                setActiveTab={setActiveTab}
                                technicianData={technicianData}
                            />
                        )}
                        {activeTab === 'jobs' && renderJobsTab()}
                        {activeTab === 'expenses' && <ExpensesList technicianId={technicianId} />}
                        {activeTab === 'incentives' && renderIncentivesTab()}
                        {activeTab === 'performance' && <PerformanceView technicianId={technicianId} />}
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
                        setShowEmailInbox(false);
                        setShowPurchaseRequestsList(false);
                        setShowStockModal(false);
                        setShowCashFlowModal(false);
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
                        setShowEmailInbox(false);
                        setShowStockModal(false);
                        setShowCashFlowModal(false);
                        setActiveTab('jobs');
                    }}
                >
                    <Briefcase size={20} />
                    <span>Jobs</span>
                </button>
                <button
                    className={`tab-item ${(activeTab === 'performance' && !showSupport) ? 'active' : ''}`}
                    onClick={() => {
                        setShowSupport(false);
                        setShowEmailInbox(false);
                        setShowStockModal(false);
                        setShowCashFlowModal(false);
                        setActiveTab('performance');
                    }}
                >
                    <TrendingUp size={20} />
                    <span>Performance</span>
                </button>
                <button
                    className={`tab-item ${(activeTab === 'settings' || showSupport) ? 'active' : ''}`}
                    onClick={() => {
                        setShowSupport(false);
                        setShowEmailInbox(false);
                        setShowStockModal(false);
                        setShowCashFlowModal(false);
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
                                disabled={submittingLeave}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '10px', opacity: submittingLeave ? 0.5 : 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!leaveStartDate || !leaveEndDate) {
                                        alert('Please select start and end dates');
                                        return;
                                    }
                                    if (submittingLeave) return;

                                    const start = new Date(leaveStartDate);
                                    const end = new Date(leaveEndDate);
                                    if (start > end) {
                                        alert('Start date cannot be after end date');
                                        return;
                                    }

                                    // Generate array of date strings between start and end inclusive
                                    const dates = [];
                                    let current = new Date(start);
                                    while (current <= end) {
                                        // Skip Sundays (getDay() === 0 is Sunday)
                                        if (current.getDay() !== 0) {
                                            dates.push(current.toISOString().split('T')[0]);
                                        }
                                        current.setDate(current.getDate() + 1);
                                    }

                                    if (dates.length === 0) {
                                        alert('No working days in the selected date range.');
                                        return;
                                    }

                                    setSubmittingLeave(true);
                                    try {
                                        for (const d of dates) {
                                            const res = await apiCall('/api/technician/leaves', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    technician_id: technicianId,
                                                    leave_date: d,
                                                    reason: leaveReason
                                                })
                                            });
                                            const json = await res.json();
                                            if (!res.ok) {
                                                throw new Error(json.error || 'Failed to submit leave request');
                                            }
                                        }
                                        alert('Leave request submitted successfully!');
                                        
                                        // Refresh leaves list
                                        const leavesRes = await apiCall(`/api/technician/leaves?technicianId=${technicianId}`);
                                        const leavesJson = await leavesRes.json();
                                        if (leavesJson && leavesJson.success) {
                                            setLeaves(leavesJson.leaves || []);
                                        }
                                        
                                        setShowLeaveModal(false);
                                        setLeaveStartDate('');
                                        setLeaveEndDate('');
                                        setLeaveReason('');
                                    } catch (err) {
                                        alert('Failed to submit leave: ' + err.message);
                                    } finally {
                                        setSubmittingLeave(false);
                                    }
                                }}
                                disabled={submittingLeave}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submittingLeave ? 0.7 : 1 }}
                            >
                                {submittingLeave ? 'Submitting...' : 'Submit Request'}
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
                    isOnline={isOnline}
                    shouldHideAddress={!isOnline && !isWorkingHours()}
                    onJobUpdate={(updatedJob) => {
                        // Update both the jobs list AND the selectedJob so the header/status reflects immediately
                        if (updatedJob) {
                            setSelectedJob(prev => ({ ...prev, ...updatedJob }));
                            setJobs(prevJobs =>
                                prevJobs
                                    .map(j => j.id === updatedJob.id ? { ...j, ...updatedJob } : j)
                                    .filter(j => j.status !== 'closed' && j.status !== 'cancelled')
                            );
                        }
                        // Background refetch for full consistency
                        setTimeout(() => {
                            if (technicianId) {
                                apiCall(`/api/technician/jobs?technicianId=${technicianId}&t=${Date.now()}`)
                                    .then(res => res.json())
                                    .then(data => {
                                        setJobsWithQueueMerge(data.jobs || []);
                                        fetchPendingCashPayments();
                                    })
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
                        fetchJobs(true);
                        fetchPendingCashPayments();
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

            {/* Visit Summary Modal (Distance-based checkout) */}
            {pendingVisitSummary && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        maxHeight: '90vh',
                        background: 'linear-gradient(180deg, #1e293b, #0f172a)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '24px',
                        padding: '24px',
                        overflowY: 'auto',
                        color: '#f8fafc',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', marginBottom: '12px' }}>
                                <MapPin size={28} color="#f87171" />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Visit Complete Check</h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0' }}>
                                You moved {Math.round(pendingVisitSummary.distanceMetres)}m away from customer site. Please submit visit notes.
                            </p>
                        </div>

                        {/* Job Details Card */}
                        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px 12px', fontSize: '13px' }}>
                                <span style={{ color: '#94a3b8' }}>Job ID:</span>
                                <strong style={{ color: '#38bdf8' }}>{pendingVisitSummary.jobNumber}</strong>
                                
                                <span style={{ color: '#94a3b8' }}>Customer:</span>
                                <strong>{pendingVisitSummary.customerName}</strong>
                                
                                <span style={{ color: '#94a3b8' }}>Locality:</span>
                                <strong>{pendingVisitSummary.locality}</strong>
                                
                                <span style={{ color: '#94a3b8' }}>Appliance:</span>
                                <strong>{pendingVisitSummary.appliance} ({pendingVisitSummary.applianceType})</strong>
                                
                                <span style={{ color: '#94a3b8' }}>Issue:</span>
                                <span style={{ color: '#cbd5e1' }}>{pendingVisitSummary.defect}</span>

                                {/* Quotation */}
                                <span style={{ color: '#94a3b8' }}>Quotation:</span>
                                <strong>
                                    {visitSummaryQuotation ? `₹${visitSummaryQuotation.total_amount.toLocaleString('en-IN')}` : 'None'}
                                </strong>

                                {/* Invoice */}
                                <span style={{ color: '#94a3b8' }}>Invoice:</span>
                                <strong>
                                    {visitSummaryInvoice ? `${visitSummaryInvoice.invoice_number} (${visitSummaryInvoice.status})` : 'None'}
                                </strong>

                                {/* Payments */}
                                <span style={{ color: '#94a3b8' }}>Payments:</span>
                                <strong>
                                    {(() => {
                                        const payInts = visitSummaryInteractions.filter(i => i.type === 'payment-received');
                                        if (payInts.length === 0) return 'None';
                                        return payInts.map(p => `₹${p.metadata?.amount || p.amount} (${p.metadata?.method || 'CASH'})`).join(', ');
                                    })()}
                                </strong>
                            </div>

                            {/* Images thumbnails */}
                            {(() => {
                                const beforeInts = visitSummaryInteractions.filter(i => i.type === 'before-photos-uploaded');
                                const afterInts = visitSummaryInteractions.filter(i => i.type === 'after-photos-uploaded');
                                const beforeUrls = beforeInts.flatMap(i => i.metadata?.attachments || []);
                                const afterUrls = afterInts.flatMap(i => i.metadata?.attachments || []);

                                if (beforeUrls.length === 0 && afterUrls.length === 0) return null;

                                return (
                                    <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                                        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px', fontWeight: 600 }}>Photos Uploaded</div>
                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                            {beforeUrls.map((url, i) => (
                                                <div key={`bef-${i}`} style={{ position: 'relative', flexShrink: 0, width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(56,189,248,0.2)' }}>
                                                    <img src={url} alt="before" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: '8px', background: 'rgba(56,189,248,0.85)', color: '#fff', textAlign: 'center', fontWeight: 700, padding: '1px 0' }}>BEF</span>
                                                </div>
                                            ))}
                                            {afterUrls.map((url, i) => (
                                                <div key={`aft-${i}`} style={{ position: 'relative', flexShrink: 0, width: '48px', height: '48px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    <img src={url} alt="after" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, fontSize: '8px', background: 'rgba(16,185,129,0.85)', color: '#fff', textAlign: 'center', fontWeight: 700, padding: '1px 0' }}>AFT</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Text Feedback */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                                Tell us what happened on this job: *
                            </label>
                            <textarea
                                value={visitNotes}
                                onChange={(e) => setVisitNotes(e.target.value)}
                                placeholder="Diagnosis details, repair status, customer feedback, next steps..."
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    color: '#f8fafc',
                                    resize: 'vertical',
                                    minHeight: '90px',
                                    outline: 'none',
                                    lineHeight: 1.5
                                }}
                            />
                        </div>

                        {/* Hinglish Audio Recording Button */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                            <button
                                type="button"
                                onClick={handleVoiceRecordToggle}
                                disabled={audioLoading}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    background: recording ? '#ef4444' : 'rgba(56,189,248,0.12)',
                                    color: recording ? '#fff' : '#38bdf8',
                                    border: recording ? 'none' : '1px solid rgba(56,189,248,0.25)',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {recording ? (
                                    <>🛑 Stop & Translate</>
                                ) : audioLoading ? (
                                    <>
                                        <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                        Uploading Voice...
                                    </>
                                ) : (
                                    <>🎤 Speak Hindi/Hinglish</>
                                )}
                            </button>

                            {uploadedAudioUrl && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(16,185,129,0.1)',
                                    border: '1px solid rgba(16,185,129,0.25)',
                                    color: '#10b981',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    borderRadius: '12px',
                                    padding: '0 12px'
                                }}>
                                    🔊 Audio Saved
                                </div>
                            )}
                        </div>

                        {/* Microphone Guidance / Settings Helper */}
                        <div 
                            onClick={async () => {
                                const isNative = isNativePlatform();
                                if (isNative && GPSBridgePlugin) {
                                    if (window.confirm('Would you like to open App Settings to grant Microphone permission for voice recording?')) {
                                        await GPSBridgePlugin.openAppSettings().catch(e => console.error(e));
                                    }
                                } else {
                                    alert('To enable microphone access:\n\n1. Click the lock/settings icon next to the URL at the top of your browser.\n2. Turn on the "Microphone" toggle.\n3. Reload the page.');
                                }
                            }}
                            style={{
                                fontSize: '11px',
                                color: '#94a3b8',
                                textAlign: 'center',
                                marginTop: '-8px',
                                marginBottom: '12px',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                            }}
                        >
                            <span>⚠️ Mic Blocked? Tap here to fix permissions</span>
                        </div>

                        {/* Submit Actions */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleSubmitVisitSummary}
                                disabled={submittingVisitSummary || !visitNotes.trim()}
                                style={{
                                    flex: 2,
                                    padding: '14px',
                                    borderRadius: '14px',
                                    background: visitNotes.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(16,185,129,0.15)',
                                    border: 'none',
                                    color: visitNotes.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    cursor: visitNotes.trim() && !submittingVisitSummary ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                {submittingVisitSummary ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        Submitting...
                                    </>
                                ) : (
                                    <>Submit Visit Notes</>
                                )}
                            </button>
                            
                            <button
                                onClick={() => {
                                    try {
                                        const saved = localStorage.getItem('postponed_visit_summaries');
                                        const list = saved ? JSON.parse(saved) : [];
                                        const filtered = list.filter(item => String(item.jobId) !== String(pendingVisitSummary.jobId));
                                        const newList = [...filtered, pendingVisitSummary];
                                        localStorage.setItem('postponed_visit_summaries', JSON.stringify(newList));
                                        setPostponedSummaries(newList);
                                    } catch (e) {}
                                    setPendingVisitSummary(null);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '14px',
                                    background: 'rgba(56,189,248,0.12)',
                                    border: '1px solid rgba(56,189,248,0.3)',
                                    color: '#38bdf8',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Fill Later
                            </button>

                            <button
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to discard this check-out summary? You will lose this visit record if you dismiss.')) {
                                        try {
                                            const saved = localStorage.getItem('postponed_visit_summaries');
                                            const list = saved ? JSON.parse(saved) : [];
                                            const newList = list.filter(item => String(item.jobId) !== String(pendingVisitSummary.jobId));
                                            localStorage.setItem('postponed_visit_summaries', JSON.stringify(newList));
                                            setPostponedSummaries(newList);
                                        } catch (e) {}

                                        try {
                                            const active = localStorage.getItem('active_visit_check_in');
                                            if (active && String(JSON.parse(active).jobId) === String(pendingVisitSummary.jobId)) {
                                                localStorage.removeItem('active_visit_check_in');
                                            }
                                        } catch (e) {}

                                        setPendingVisitSummary(null);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '14px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#cbd5e1',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
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
                                disabled={submittingPurchase}
                                className="btn btn-secondary"
                                style={{ flex: 1, padding: '10px', opacity: submittingPurchase ? 0.5 : 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={submitPurchaseInvoice}
                                disabled={submittingPurchase}
                                className="btn btn-primary"
                                style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submittingPurchase ? 0.7 : 1 }}
                            >
                                {submittingPurchase ? 'Submitting...' : 'Submit Purchase Invoice'}
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

            {backPressToast && (
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    color: 'white',
                    padding: '8px 18px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    zIndex: 99999,
                    border: '1px solid rgba(255,255,255,0.1)',
                    pointerEvents: 'none',
                    boxShadow: 'var(--shadow-lg)',
                    whiteSpace: 'nowrap'
                }}>
                    {backPressToast}
                </div>
            )}
        </div>
        </>
    );
}

export default TechnicianApp;






