import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function parseDeviceFromUserAgent(ua) {
    if (!ua) return 'Unknown Device';
    
    const normalized = ua.toLowerCase();
    
    // Check if it's running via Capacitor/native app wrapper
    const isApp = normalized.includes('capacitor') || normalized.includes('sortedtech') || normalized.includes('sortedadmin');
    
    if (isApp) {
        if (normalized.includes('android')) {
            const match = ua.match(/\bAndroid\b[^;]*;\s*([^;)]+)/);
            return `Android App (${match ? match[1].trim() : 'Android Device'})`;
        }
        if (normalized.includes('iphone') || normalized.includes('ipad')) {
            return 'iOS App (iPhone/iPad)';
        }
        return 'Mobile App';
    }
    
    // Fallback: Parse Browser and OS
    let browser = 'Browser';
    if (ua.includes('Firefox/')) browser = 'Firefox';
    else if (ua.includes('Chrome/')) browser = 'Chrome';
    else if (ua.includes('Safari/')) browser = 'Safari';
    else if (ua.includes('Edge/')) browser = 'Edge';
    
    let os = 'OS';
    if (normalized.includes('windows')) os = 'Windows';
    else if (normalized.includes('macintosh') || normalized.includes('mac os')) os = 'macOS';
    else if (normalized.includes('linux')) os = 'Linux';
    else if (normalized.includes('android')) {
        const match = ua.match(/\bAndroid\b[^;]*;\s*([^;)]+)/);
        os = match ? `Android (${match[1].trim()})` : 'Android';
    }
    else if (normalized.includes('iphone') || normalized.includes('ipad')) os = 'iOS';
    
    return `${browser} on ${os}`;
}

export async function GET() {
    try {
        // 1. Fetch live activity logs
        const { data: activityLogs, error: actErr } = await supabase
            .from('login_activity')
            .select('*')
            .order('last_active_at', { ascending: false });
            
        if (actErr) throw actErr;

        // 2. Fetch technician details for fallback/MDM listing
        const { data: techs, error: techErr } = await supabase
            .from('technicians')
            .select('id, name, last_device_ip, fcm_token, current_session_token, mdm_device_id')
            .order('name');
            
        if (techErr) throw techErr;

        // 3. Fetch admin recipients for fallback
        const { data: admins, error: adminErr } = await supabase
            .from('admin_recipients')
            .select('id, name, fcm_token, created_at')
            .order('created_at', { ascending: false });

        if (adminErr) throw adminErr;

        // 4. Get APK file sizes
        let techApkSize = '6.72 MB';
        let adminApkSize = '6.72 MB';
        try {
            const publicDir = path.join(process.cwd(), 'public', 'downloads');
            const techPath = path.join(publicDir, 'technician-app-v6.apk');
            if (fs.existsSync(techPath)) {
                techApkSize = `${(fs.statSync(techPath).size / (1024 * 1024)).toFixed(2)} MB`;
            }
            const adminPath = path.join(publicDir, 'admin-app.apk');
            if (fs.existsSync(adminPath)) {
                adminApkSize = `${(fs.statSync(adminPath).size / (1024 * 1024)).toFixed(2)} MB`;
            }
        } catch (fsErr) {
            console.error('Failed to read APK sizes:', fsErr);
        }

        // Process lists and merge
        const formattedActivity = (activityLogs || []).map(log => ({
            id: log.id,
            userId: log.user_id,
            userName: log.user_name,
            role: log.role,
            platform: log.platform,
            appVersion: log.app_version,
            ipAddress: log.ip_address,
            deviceName: parseDeviceFromUserAgent(log.user_agent),
            lastActive: log.last_active_at
        }));

        // Deduplicate admin recipients
        const uniqueAdminTokens = new Set();
        const deduplicatedAdmins = [];
        (admins || []).forEach(item => {
            if (item.fcm_token && !uniqueAdminTokens.has(item.fcm_token)) {
                uniqueAdminTokens.add(item.fcm_token);
                deduplicatedAdmins.push(item);
            }
        });

        // Compute counts
        const webActiveCount = formattedActivity.filter(a => a.platform.toLowerCase().includes('web')).length;
        const appActiveCount = formattedActivity.filter(a => a.platform.toLowerCase().includes('app')).length;

        return NextResponse.json({
            success: true,
            data: {
                techApp: {
                    latestVersion: '1.6.0 (v6)',
                    apkSize: techApkSize,
                    totalTechnicians: techs.length,
                    installedDevices: techs.filter(t => t.mdm_device_id).length,
                    registeredFcm: techs.filter(t => t.fcm_token).length,
                    loggedInDevices: techs.filter(t => t.current_session_token).length,
                    list: techs.map(t => {
                        // Find the most recent activity log for this technician
                        const latestLog = formattedActivity.find(log => log.userId === t.id);
                        return {
                            id: t.id,
                            name: t.name,
                            mdmDeviceId: t.mdm_device_id || null,
                            isLoggedIn: !!t.current_session_token,
                            lastIp: t.last_device_ip || null,
                            hasFcm: !!t.fcm_token,
                            platform: latestLog ? latestLog.platform : (t.mdm_device_id ? 'Technician App (Mobile)' : 'N/A'),
                            appVersion: latestLog ? latestLog.appVersion : (t.mdm_device_id ? '1.6.0' : 'N/A'),
                            deviceName: latestLog ? latestLog.deviceName : (t.mdm_device_id ? 'Android Device' : 'N/A'),
                            lastActive: latestLog ? latestLog.lastActive : null
                        };
                    })
                },
                adminApp: {
                    latestVersion: '1.0.0 (v1)',
                    apkSize: adminApkSize,
                    installedDevices: uniqueAdminTokens.size,
                    list: deduplicatedAdmins.map(a => ({
                        id: a.id,
                        name: a.name || 'Admin Device',
                        fcmToken: a.fcm_token,
                        registeredAt: a.created_at
                    }))
                },
                activity: {
                    webActiveCount,
                    appActiveCount,
                    list: formattedActivity
                }
            }
        });
    } catch (err) {
        console.error('Installed Devices API exception:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { userId, userName, role, platform, appVersion, fcmToken, deviceSessionId } = await request.json();
        
        if (!userId || !userName || !role || !platform || !appVersion) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }
        
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
        const userAgent = request.headers.get('user-agent') || 'Unknown';
        
        // Fallback for older apps or requests lacking deviceSessionId
        const devSessionId = deviceSessionId || `fallback_${platform.replace(/\s+/g, '_')}`;
        
        const { error } = await supabase
            .from('login_activity')
            .upsert({
                user_id: userId,
                user_name: userName,
                role,
                platform,
                app_version: appVersion,
                ip_address: ip,
                user_agent: userAgent,
                fcm_token: fcmToken || null,
                device_session_id: devSessionId,
                last_active_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,device_session_id'
            });
            
        if (error) throw error;
        
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Failed to log login session:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
