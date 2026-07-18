import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const technicianId = searchParams.get('technicianId')

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        const sessionToken = request.headers.get('x-session-token')
        const { data: technician, error } = await supabase
            .from('technicians')
            .select('id, name, email, phone, is_active, created_at, current_session_token, weekly_off_day, mdm_device_id')
            .eq('id', technicianId)
            .single()

        if (error || !technician) {
            console.error('Error fetching technician profile:', error)
            return NextResponse.json(
                { error: 'Technician not found' },
                { status: 404 }
            )
        }

        if (!technician.current_session_token || technician.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        delete technician.current_session_token

        let mdmProfiles = null
        if (technician.mdm_device_id) {
            try {
                const { getDeviceProfiles, associateKioskProfile, disassociateKioskProfile } = await import('@/lib/manageEngine')
                const res = await getDeviceProfiles(technician.mdm_device_id)
                if (res && res.profiles && Array.isArray(res.profiles)) {
                    mdmProfiles = res.profiles

                    // Self-healing: Compare actual live duty status with MDM server profiles list
                    const { data: liveLoc } = await supabase
                        .from('technician_live_locations')
                        .select('is_online')
                        .eq('technician_id', technicianId)
                        .maybeSingle()

                    const isOnline = liveLoc ? liveLoc.is_online === true : false
                    
                    // Trigger background self-healing if profiles mismatch
                    const onDutyProfileId = process.env.MANAGEENGINE_ON_DUTY_PROFILE_ID || "51167000000097017"
                    const offDutyProfileId = process.env.MANAGEENGINE_OFF_DUTY_PROFILE_ID || "5116700000101018"
                    
                    const hasOnDuty = mdmProfiles.some(p => p && p.profile_id === onDutyProfileId)
                    const hasOffDuty = mdmProfiles.some(p => p.profile_id === offDutyProfileId)

                    if (isOnline) {
                        if (!hasOnDuty || hasOffDuty) {
                            // Should have On-Duty, but either lacks it or still has Off-Duty
                            console.log(`[MDM SELF-HEALING] Aligning device ${technician.mdm_device_id} to ON-DUTY profile`);
                            associateKioskProfile(technician.mdm_device_id).catch(console.error)
                        }
                    } else {
                        if (hasOnDuty || !hasOffDuty) {
                            // Should have Off-Duty, but either has On-Duty or lacks Off-Duty
                            console.log(`[MDM SELF-HEALING] Aligning device ${technician.mdm_device_id} to OFF-DUTY profile`);
                            disassociateKioskProfile(technician.mdm_device_id).catch(console.error)
                        }
                    }
                }
            } catch (err) {
                console.error('[MDM SELF-HEALING ERROR] Failed to fetch profiles or heal state:', err)
            }
        }

        return NextResponse.json({
            success: true,
            technician,
            mdmProfiles
        })

    } catch (error) {
        console.error('Error in profile API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function PATCH(request) {
    try {
        const { technicianId, ...updates } = await request.json()

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Technician ID is required' },
                { status: 400 }
            )
        }

        // Validate active session
        const sessionToken = request.headers.get('x-session-token')
        const { data: tech } = await supabase
            .from('technicians')
            .select('current_session_token')
            .eq('id', technicianId)
            .single()

        if (!tech || !tech.current_session_token || tech.current_session_token !== sessionToken) {
            return NextResponse.json({ error: 'Unauthorized session' }, { status: 401 })
        }

        // Don't allow updating sensitive fields
        delete updates.password_hash
        delete updates.username
        delete updates.is_active

        const { data: technician, error } = await supabase
            .from('technicians')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', technicianId)
            .select()
            .single()

        if (error) {
            console.error('Error updating profile:', error)
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            )
        }

        // Remove sensitive data
        const { password_hash, ...profileData } = technician

        return NextResponse.json({
            success: true,
            technician: profileData,
            message: 'Profile updated successfully'
        })

    } catch (error) {
        console.error('Error in profile update API:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
