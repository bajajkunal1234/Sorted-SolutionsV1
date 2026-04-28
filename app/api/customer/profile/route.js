import { createServerSupabase } from '@/lib/supabase-server'
import { logInteractionServer } from '@/lib/log-interaction-server'
import { NextResponse } from 'next/server'

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const customerId = searchParams.get('customerId')

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServerSupabase()
        const { data: customer, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single()

        if (error) {
            console.error('Error fetching customer profile:', error)
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            )
        }

        // Remove sensitive data if any
        const { password_hash, ...profileData } = customer

        return NextResponse.json({
            success: true,
            customer: profileData
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
        const { customerId, ...updates } = await request.json()

        if (!customerId) {
            return NextResponse.json(
                { error: 'Customer ID is required' },
                { status: 400 }
            )
        }

        // Don't allow updating sensitive fields
        delete updates.password_hash
        delete updates.id

        const supabase = createServerSupabase()
        const { data: customer, error } = await supabase
            .from('customers')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', customerId)
            .select()
            .single()

        if (error) {
            console.error('Error updating profile:', error)
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            )
        }

        // Sync with ledger if exists
        if (customer.ledger_id && (updates.name || updates.image_url)) {
            const ledgerUpdates = {}
            if (updates.name) ledgerUpdates.name = updates.name
            if (updates.image_url) ledgerUpdates.account_image = updates.image_url
            
            await supabase
                .from('accounts')
                .update(ledgerUpdates)
                .eq('id', customer.ledger_id)
        }

        // Log interaction
        let updateDesc = []
        if (updates.name) updateDesc.push('name')
        if (updates.image_url) updateDesc.push('profile photo')
        if (updates.profile_complete) updateDesc.push('profile setup completed')
        
        if (updateDesc.length > 0) {
            await logInteractionServer({
                type: 'profile-updated',
                category: 'account',
                customerId: customer.ledger_id || null,
                customerName: customer.name || customer.phone,
                description: `Customer updated ${updateDesc.join(', ')}`,
                source: 'Customer App'
            })
        }

        // Remove sensitive data
        const { password_hash, ...profileData } = customer

        return NextResponse.json({
            success: true,
            customer: profileData,
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
