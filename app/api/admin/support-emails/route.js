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

        // 1. Fetch mailboxes (company emails)
        // We select recipient_email and sender_email + metadata to isolate company mailboxes from customer ones
        const { data: mailboxData, error: mailboxErr } = await supabase
            .from('support_emails')
            .select('recipient_email, sender_email, metadata')
        
        if (mailboxErr) throw mailboxErr

        const mailboxSet = new Set()
        mailboxSet.add('support@sortedsolutions.in')
        mailboxSet.add('kunalbajaj@sortedsolutions.in')

        mailboxData?.forEach(m => {
            const isOutbound = m.metadata?.direction === 'outbound'
            if (isOutbound && m.sender_email) {
                mailboxSet.add(m.sender_email.toLowerCase().trim())
            } else if (!isOutbound && m.recipient_email) {
                mailboxSet.add(m.recipient_email.toLowerCase().trim())
            }
        })
        const mailboxes = Array.from(mailboxSet)

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
            const cleanMailbox = mailbox.toLowerCase().trim()
            query = query.or(`recipient_email.eq.${cleanMailbox},sender_email.eq.${cleanMailbox}`)
        }

        // Apply search term filter (sender_name, sender_email, subject, body_text)
        if (search && search.trim() !== '') {
            const cleanSearch = search.trim()
            query = query.or(`sender_name.ilike.%${cleanSearch}%,sender_email.ilike.%${cleanSearch}%,subject.ilike.%${cleanSearch}%,body_text.ilike.%${cleanSearch}%`)
        }

        const { data: emails, error: emailsErr } = await query

        if (emailsErr) throw emailsErr

        // 3. Link customer accounts by matching the customer's email address
        let enrichedEmails = []
        if (emails && emails.length > 0) {
            const targetCustomerEmails = [...new Set(emails.map(e => {
                const isOutbound = e.metadata?.direction === 'outbound';
                return isOutbound ? e.recipient_email : e.sender_email;
            }).filter(Boolean))]
            
            // Query accounts matching these emails
            const { data: accounts, error: accountsErr } = await supabase
                .from('accounts')
                .select('id, name, mobile, email, type, status, sku')
                .in('email', targetCustomerEmails)

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
                const isOutbound = email.metadata?.direction === 'outbound';
                const custEmail = isOutbound ? email.recipient_email : email.sender_email;
                const linkedAcc = custEmail ? accountMap[custEmail.toLowerCase().trim()] : null;
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

// POST - Send an email (via Resend or SendGrid) and log it in the database
export async function POST(request) {
    try {
        const body = await request.json()
        const { from, to, subject, body_text, body_html } = body

        if (!from || !to || !subject || (!body_text && !body_html)) {
            return NextResponse.json({ success: false, error: 'From, To, Subject, and Body are required' }, { status: 400 })
        }

        const supabase = getSupabaseServer()
        if (!supabase) {
            return NextResponse.json({ success: false, error: 'Database client not available' }, { status: 503 })
        }

        let emailSent = false
        let provider = 'none'
        let errorDetails = null

        const resendKey = process.env.RESEND_API_KEY
        const sendgridKey = process.env.SENDGRID_API_KEY

        if (resendKey) {
            provider = 'resend'
            try {
                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendKey}`
                    },
                    body: JSON.stringify({
                        from: `Sorted Solutions <${from}>`,
                        to,
                        subject,
                        text: body_text || '',
                        html: body_html || body_text || ''
                    })
                })
                const data = await res.json()
                if (res.ok && data.id) {
                    emailSent = true
                } else {
                    errorDetails = data
                }
            } catch (err) {
                errorDetails = err.message
            }
        } else if (sendgridKey) {
            provider = 'sendgrid'
            try {
                const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sendgridKey}`
                    },
                    body: JSON.stringify({
                        personalizations: [{ to: [{ email: to }] }],
                        from: { email: from, name: 'Sorted Solutions Support' },
                        subject,
                        content: [
                            { type: 'text/plain', value: body_text || '' },
                            { type: 'text/html', value: body_html || body_text || '' }
                        ]
                    })
                })
                if (res.ok) {
                    emailSent = true
                } else {
                    const data = await res.json()
                    errorDetails = data
                }
            } catch (err) {
                errorDetails = err.message
            }
        } else {
            // Simulated sent (no credentials configured)
            emailSent = true
            provider = 'simulated'
        }

        // Always save the sent email record in the database for history tracking
        const { data: savedEmail, error: saveErr } = await supabase
            .from('support_emails')
            .insert([{
                recipient_email: to.toLowerCase().trim(),
                sender_email: from.toLowerCase().trim(),
                sender_name: 'Sorted Solutions Support',
                subject,
                body_text: body_text || '',
                body_html: body_html || body_text || '',
                status: 'read', // Outbound is already read
                metadata: {
                    direction: 'outbound',
                    provider,
                    sent_success: emailSent,
                    send_error: errorDetails
                }
            }])
            .select()
            .single()

        if (saveErr) throw saveErr

        return NextResponse.json({
            success: true,
            simulated: provider === 'simulated',
            data: savedEmail
        })
    } catch (error) {
        console.error('Failed to send outbound email:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
