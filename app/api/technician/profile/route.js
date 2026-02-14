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

        const { data: technician, error } = await supabase
            .from('technicians')
            .select('id, name, mobile, email, username, is_active, created_at, address, city, pincode')
            .eq('id', technicianId)
            .single()

        if (error) {
            console.error('Error fetching technician profile:', error)
            return NextResponse.json(
                { error: 'Technician not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            technician
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
