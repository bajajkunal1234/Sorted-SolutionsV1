import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function GET(request) {
    const supabase = createServerSupabase()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    try {
        let query = supabase
            .from('technicians')
            .select('id, name, username, phone, is_active, created_at, photo_url, rating, years_experience, bio, specializations, customer_card_fields, ledger_id, date_joined, last_working_day, weekly_off_day, aadhaar_url, pan_url, appointment_letter_url, is_fired, mdm_device_id, driving_licence_url')
            .order('name', { ascending: true })

        if (id) query = query.eq('id', id).single()

        const { data, error } = await query
        if (error) throw error

        // Fetch live locations for duty_status enrichment
        const { data: liveLocs } = await supabase
            .from('technician_live_locations')
            .select('technician_id, duty_status, is_online');
        
        const locMap = {};
        for (const loc of liveLocs || []) {
            locMap[loc.technician_id] = {
                duty_status: loc.duty_status || 'offline',
                is_online: loc.is_online || false
            };
        }

        const enrich = (tech) => ({
            ...tech,
            duty_status: locMap[tech.id]?.duty_status || 'offline',
            is_online: locMap[tech.id]?.is_online || false
        });

        const enrichedData = id ? enrich(data) : (data || []).map(enrich);

        return NextResponse.json({ success: true, data: enrichedData })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

export async function PATCH(request) {
    const supabase = createServerSupabase()
    try {
        const { searchParams } = new URL(request.url)
        const queryId = searchParams.get('id')

        const body = await request.json()
        const id = queryId || body.id
        const updates = { ...body }
        delete updates.id

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        // Check if username is already taken by another technician
        if (updates.username) {
            const { data: existingTech } = await supabase
                .from('technicians')
                .select('id')
                .eq('username', updates.username)
                .neq('id', id)
                .maybeSingle()

            if (existingTech) {
                return NextResponse.json({ success: false, error: 'Username is already taken' }, { status: 400 })
            }
        }

        // Hash password if provided, otherwise protect password_hash field
        if (updates.password) {
            updates.password_hash = await bcrypt.hash(updates.password, 12)
            delete updates.password
        } else {
            delete updates.password_hash
            delete updates.password
        }

        if (updates.date_joined === '') updates.date_joined = null
        if (updates.last_working_day === '') updates.last_working_day = null
        if (updates.rating === '') updates.rating = null
        if (updates.years_experience === '') updates.years_experience = null

        const { data, error } = await supabase
            .from('technicians')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('id, name, username, phone, is_active, photo_url, rating, years_experience, bio, specializations, customer_card_fields, ledger_id, date_joined, last_working_day, weekly_off_day, aadhaar_url, pan_url, appointment_letter_url, is_fired, mdm_device_id, driving_licence_url')
            .single()

        if (error) throw error
        return NextResponse.json({ success: true, data })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}

export async function POST(request) {
    const supabase = createServerSupabase()
    try {
        const body = await request.json()
        const { id, action } = body

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

        if (action === 'remote-logout') {
            const { data, error } = await supabase
                .from('technicians')
                .update({ 
                    current_session_token: null, 
                    updated_at: new Date().toISOString() 
                })
                .eq('id', id)
                .select('id, name')
                .single()

            if (error) throw error
            return NextResponse.json({ success: true, message: `Technician ${data.name} logged out remotely.`, data })
        }

        return NextResponse.json({ error: 'invalid action' }, { status: 400 })
    } catch (err) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 })
    }
}
