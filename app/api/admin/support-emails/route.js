import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - List emails with filters, search, and customer linkage + list of active mailboxes
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status') // 'unread', 'read', 'resolved', 'archived', 'all', 'active'
        const mailbox = searchParams.get('mailbox') // recipient_email or 'all'
        const search = searchParams.get('search') // search term
        const limit = parseInt(searchParams.get('limit') || '100', 10)

        const supabase = getSupabaseServer()
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 })
        }

        // 1. Fetch all unique recipient_emails (mailboxes) to build dynamic UI lists
        const { data: mailboxData, error: mailboxErr } = await supabase
            .from('support_emails')
            .select('recipient_email')
        
        if (mailboxErr) throw mailboxErr

        const mailboxes = [...new Set((mailboxData || []).map(m => m.recipient_email).filter(Boolean))]

        // 2. Build the query for emails
        let query = supabase
            .from('support_emails')
            .select('*')
            .order('received_at', { ascending: false })
            .limit(limit)

        // Apply status filter
        if (status && status !== 'all') {
            if (status === 'active') {
                query = query.in('status', ['unread', 'read'])
            } else {
                query = query.eq('status', status)
            }
        }

        // Apply mailbox filter
        if (mailbox && mailbox !== 'all') {
            query = query.eq('recipient_email', mailbox.toLowerCase().trim())
        }

        // Apply search term filter (sender_name, sender_email, subject, body_text)
        if (search && search.trim() !== '') {
            const cleanSearch = search.trim()
            query = query.or(`sender_name.ilike.%${cleanSearch}%,sender_email.ilike.%${cleanSearch}%,subject.ilike.%${cleanSearch}%,body_text.ilike.%${cleanSearch}%`)
        }

        const { data: emails, error: emailsErr } = await query

        if (emailsErr) throw emailsErr

        // 3. Link customer accounts by matching sender_email
        let enrichedEmails = []
        if (emails && emails.length > 0) {
            const senderEmails = [...new Set(emails.map(e => e.sender_email).filter(Boolean))]
            
            // Query accounts matching these emails
            const { data: accounts, error: accountsErr } = await supabase
                .from('accounts')
                .select('id, name, mobile, email, type, status, sku')
                .in('email', senderEmails)

            if (accountsErr) {
                console.error('Error fetching linked accounts:', accountsErr)
            }

            const accountMap = {}
            accounts?.forEach(acc => {
                if (acc.email) {
                    accountMap[acc.email.toLowerCase().trim()] = acc
                }
            })

            enrichedEmails = emails.map(email => {
                const linkedAcc = email.sender_email ? accountMap[email.sender_email.toLowerCase().trim()] : null
                return {
                    ...email,
                    customer_account: linkedAcc
                }
            })
        }

        return NextResponse.json({
            success: true,
            data: enrichedEmails,
            mailboxes
        })
    } catch (error) {
        console.error('Failed to get support emails:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PATCH - Update email status (e.g. read, resolved, archived)
export async function PATCH(request) {
    try {
        const body = await request.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ success: false, error: 'Email ID and Status are required' }, { status: 400 })
        }

        const allowedStatuses = ['unread', 'read', 'resolved', 'archived']
        if (!allowedStatuses.includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 })
        }

        const supabase = getSupabaseServer()
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 })
        }

        const { data, error } = await supabase
            .from('support_emails')
            .update({ status })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        console.error('Failed to update email status:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete email permanent
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ success: false, error: 'Email ID is required' }, { status: 400 })
        }

        const supabase = getSupabaseServer()
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 })
        }

        const { error } = await supabase
            .from('support_emails')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete email:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
