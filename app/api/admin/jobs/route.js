import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// GET - Fetch all jobs or filter by query params
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const status = searchParams.get('status')
        const customerId = searchParams.get('customer_id')
        const technicianId = searchParams.get('technician_id')

        let query = supabase
            .from('jobs')
            .select(`
                *,
                customer:customers(*),
                technician:technicians(*)
            `)
            .order('created_at', { ascending: false })

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }
        if (customerId) {
            query = query.eq('customer_id', customerId)
        }
        if (technicianId) {
            query = query.eq('assigned_to', technicianId)
        }

        const { data, error } = await query

        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create new job
export async function POST(request) {
    try {
        const body = await request.json()

        const { data, error } = await supabase
            .from('jobs')
            .insert([body])
            .select()
            .single()

        if (error) throw error

        // Create initial interaction
        await supabase.from('job_interactions').insert([{
            job_id: data.id,
            type: 'created',
            message: `Job created by ${body.created_by || 'Admin'}`,
            user_name: body.created_by || 'Admin'
        }])

        // Log to global interactions
        logInteractionServer({
            type: 'job-created-admin',
            category: 'job',
            jobId: String(data.id),
            customerId: body.customer_id ? String(body.customer_id) : null,
            customerName: data.customer_name || null,
            performedByName: body.created_by || 'Admin',
            description: `Job ${data.job_number || data.id} created by admin — ${data.category || ''} ${data.subcategory || ''}`.trim(),
            source: 'Admin',
        });

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update job
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, ...updates } = body

        const { data, error } = await supabase
            .from('jobs')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        // Log job lifecycle status changes
        const statusInteractionMap = {
            assigned: { type: 'job-assigned', description: `Job ${data.job_number || id} assigned to technician` },
            in_progress: { type: 'job-started', description: `Job ${data.job_number || id} work started` },
            completed: { type: 'job-completed', description: `Job ${data.job_number || id} marked completed` },
            cancelled: { type: 'job-cancelled', description: `Job ${data.job_number || id} cancelled` },
        };
        const statusLog = statusInteractionMap[updates.status];
        if (statusLog) {
            logInteractionServer({
                type: statusLog.type,
                category: 'job',
                jobId: String(id),
                customerId: data.customer_id ? String(data.customer_id) : null,
                customerName: data.customer_name || null,
                performedByName: body.updated_by || 'Admin',
                description: statusLog.description,
                source: 'Admin',
            });
        }

        // Side effect: If job is marked as completed, generate a draft invoice
        if (updates.status === 'completed') {
            try {
                // 1. Fetch customer to get ledger_id
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('ledger_id, name')
                    .eq('id', data.customer_id)
                    .single()

                if (customerData?.ledger_id) {
                    // 2. Check for existing invoice for this job
                    const { data: existing } = await supabase
                        .from('sales_invoices')
                        .select('id')
                        .eq('job_id', id)
                        .single()

                    if (!existing) {
                        // 3. Create Draft Invoice
                        const year = new Date().getFullYear();
                        const invoiceNumber = `INV-${year}-${Math.floor(Math.random() * 9000) + 1000}`;
                        const baseAmount = data.amount || 800;
                        const gstRate = 18;
                        const taxAmount = (baseAmount * gstRate) / 100;

                        await supabase.from('sales_invoices').insert({
                            invoice_number: invoiceNumber,
                            reference: invoiceNumber,
                            account_id: customerData.ledger_id,
                            account_name: customerData.name,
                            job_id: id,
                            date: new Date().toISOString().split('T')[0],
                            status: 'draft',
                            subtotal: baseAmount,
                            total_tax: taxAmount,
                            total_amount: baseAmount + taxAmount,
                            items: [{
                                description: `${data.category || 'Repair'} Service - ${data.job_number}`,
                                qty: 1,
                                rate: baseAmount,
                                taxRate: gstRate,
                                total: baseAmount + taxAmount
                            }]
                        })

                        // 4. Log Interaction
                        await supabase.from('job_interactions').insert([{
                            job_id: id,
                            type: 'sales-invoice-created-draft',
                            message: `Automated draft invoice ${invoiceNumber} generated on job completion.`,
                            user_name: 'System'
                        }])
                    }
                }
            } catch (automatedError) {
                console.error('Failed to generate automated invoice:', automatedError)
            }
        }

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete job
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        const { error } = await supabase
            .from('jobs')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
