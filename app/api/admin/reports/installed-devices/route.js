import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Fetch technician device details
        const { data: techs, error: techErr } = await supabase
            .from('technicians')
            .select('id, name, last_device_ip, fcm_token, current_session_token, mdm_device_id')
            .order('name');
            
        if (techErr) throw techErr;

        // 2. Fetch admin recipient device details
        const { data: admins, error: adminErr } = await supabase
            .from('admin_recipients')
            .select('id, name, fcm_token, created_at')
            .order('created_at', { ascending: false });

        if (adminErr) throw adminErr;

        // 3. Get APK metadata from public directory if available
        let techApkSize = '6.72 MB';
        let adminApkSize = '6.72 MB';
        
        try {
            const publicDir = path.join(process.cwd(), 'public', 'downloads');
            
            const techPath = path.join(publicDir, 'technician-app-v6.apk');
            if (fs.existsSync(techPath)) {
                const stats = fs.statSync(techPath);
                techApkSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
            }
            
            const adminPath = path.join(publicDir, 'admin-app.apk');
            if (fs.existsSync(adminPath)) {
                const stats = fs.statSync(adminPath);
                adminApkSize = `${(stats.size / (1024 * 1024)).toFixed(2)} MB`;
            }
        } catch (fsErr) {
            console.error('Failed to read APK file sizes:', fsErr);
        }

        // 4. Aggregate stats
        const totalTechs = techs.length;
        const techsWithMdm = techs.filter(t => t.mdm_device_id).length;
        const techsWithFcm = techs.filter(t => t.fcm_token).length;
        const techsLoggedIn = techs.filter(t => t.current_session_token).length;

        // Deduplicate admin recipients by FCM token to get unique installed devices
        const uniqueAdminTokens = new Set();
        const deduplicatedAdmins = [];
        (admins || []).forEach(item => {
            if (item.fcm_token && !uniqueAdminTokens.has(item.fcm_token)) {
                uniqueAdminTokens.add(item.fcm_token);
                deduplicatedAdmins.push(item);
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                techApp: {
                    latestVersion: '1.6.0 (v6)',
                    apkSize: techApkSize,
                    totalTechnicians: totalTechs,
                    installedDevices: techsWithMdm,
                    registeredFcm: techsWithFcm,
                    loggedInDevices: techsLoggedIn,
                    list: techs.map(t => ({
                        id: t.id,
                        name: t.name,
                        mdmDeviceId: t.mdm_device_id || null,
                        isLoggedIn: !!t.current_session_token,
                        lastIp: t.last_device_ip || null,
                        hasFcm: !!t.fcm_token
                    }))
                },
                adminApp: {
                    latestVersion: '1.0.0 (v1)',
                    apkSize: adminApkSize,
                    installedDevices: uniqueAdminTokens.size,
                    list: deduplicatedAdmins.map(a => ({
                        id: a.id,
                        name: a.name || 'Admin',
                        fcmToken: a.fcm_token,
                        registeredAt: a.created_at
                    }))
                }
            }
        });
    } catch (err) {
        console.error('Installed Devices API exception:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
