import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

// GET - Fetch all technicians
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('technicians')
            .select('*')
            .order('name', { ascending: true })

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new technician
export async function POST(request) {
    try {
        const body = await request.json()

        // Hash password if provided
        if (body.password) {
            const salt = bcrypt.genSaltSync(10)
            body.password_hash = bcrypt.hashSync(body.password, salt)
            delete body.password // Remove plain text password
        }

        const { data, error } = await supabase
            .from('technicians')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update technician
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, password, ...updates } = body

        // If password is provided, hash it before storing
        if (password) {
            const salt = bcrypt.genSaltSync(10)
            updates.password_hash = bcrypt.hashSync(password, salt)
        }

        const { data, error } = await supabase
            .from('technicians')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete technician
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('technicians')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
