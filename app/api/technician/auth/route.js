import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export async function POST(request) {
    try {
        const { username, password } = await request.json()

        // Validate input
        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            )
        }

        // Fetch technician by username
        const { data: technician, error } = await supabase
            .from('technicians')
            .select('*')
            .eq('username', username)
            .eq('is_active', true)
            .single()

        if (error || !technician) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            )
        }

        // Verify password (supports both hashed and legacy plain text)
        let isValid = false
        if (technician.password_hash) {
            // Check if it's a bcrypt hash (starts with $2a$ or $2b$)
            if (technician.password_hash.startsWith('$2')) {
                isValid = await bcrypt.compare(password, technician.password_hash)
            } else {
                // Legacy plain text check (will be removed after migration)
                isValid = technician.password_hash === password
            }
        }

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid username or password' },
                { status: 401 }
            )
        }

        // Remove sensitive data before sending response
        const { password_hash, ...technicianData } = technician

        // Create session data
        const sessionData = {
            technicianId: technician.id,
            username: technician.username,
            name: technician.name,
            role: 'technician'
        }

        return NextResponse.json({
            success: true,
            technician: technicianData,
            session: sessionData,
            message: 'Login successful'
        })

    } catch (error) {
        console.error('Technician auth error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
