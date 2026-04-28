import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { logInteractionServer } from '@/lib/log-interaction-server'

export const dynamic = 'force-dynamic'

// GET - Fetch all journal entries with lines
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const type = searchParams.get('type')
        const startDate = searchParams.get('start_date')
        const endDate = searchParams.get('end_date')

        let query = supabase
            .from('journal_entries')
            .select(`
                *,
                lines:journal_entry_lines(
                    *,
                    account:accounts(id, name, under, sku)
                )
            `)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(100)

        if (id) {
            query = query.eq('id', id).single()
            const { data, error } = await query
            if (error) throw error
            return NextResponse.json({ success: true, data })
        }

        if (type) query = query.eq('reference_type', type)
        if (startDate) query = query.gte('date', startDate)
        if (endDate) query = query.lte('date', endDate)

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ success: true, data })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// POST - Create manual journal entry
export async function POST(request) {
    try {
        const body = await request.json()
        const { date, reference_type = 'manual', notes, lines } = body

        if (!lines || !Array.isArray(lines) || lines.length < 2) {
            return NextResponse.json({ success: false, error: 'A journal entry requires at least two lines' }, { status: 400 })
        }

        // Validate Balance
        const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
        const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return NextResponse.json({ success: false, error: `Journal is unbalanced. Debits: ${totalDebit}, Credits: ${totalCredit}` }, { status: 400 })
        }

        if (totalDebit <= 0) {
            return NextResponse.json({ success: false, error: 'Journal must have a non-zero value' }, { status: 400 })
        }

        // Generate ID
        const dateObj = new Date(date || Date.now());
        const yy = String(dateObj.getFullYear()).slice(-2);
        const { count } = await supabase.from('journal_entries').select('*', { count: 'exact', head: true });
        const entry_number = `JE-${yy}-${String((count || 0) + 1).padStart(4, '0')}`;

        // Insert Header
        const { data: header, error: headerErr } = await supabase
            .from('journal_entries')
            .insert([{
                entry_number,
                date: date || new Date().toISOString(),
                reference_type,
                notes
            }])
            .select()
            .single()

        if (headerErr) throw headerErr

        // Insert Lines
        const linePayloads = lines.map(l => ({
            journal_entry_id: header.id,
            account_id: l.account_id,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            description: l.description || ''
        }))

        const { error: linesErr } = await supabase
            .from('journal_entry_lines')
            .insert(linePayloads)

        if (linesErr) {
            // rollback
            await supabase.from('journal_entries').delete().eq('id', header.id)
            throw linesErr
        }

        // Log interaction for manual
        if (reference_type === 'manual') {
            logInteractionServer({
                type: 'journal-created',
                category: 'account',
                performedByName: 'Admin',
                description: `Created Manual Journal ${entry_number} for ₹${totalDebit}`,
                source: 'Admin App'
            });
        }

        return NextResponse.json({ success: true, data: header })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// PUT - Update manual journal entry
export async function PUT(request) {
    try {
        const body = await request.json()
        const { id, date, notes, lines } = body

        if (!id) return NextResponse.json({ success: false, error: 'Journal ID required' }, { status: 400 })

        const { data: current } = await supabase.from('journal_entries').select('reference_type').eq('id', id).single()
        if (current?.reference_type !== 'manual') {
            return NextResponse.json({ success: false, error: 'Only manual journal entries can be edited' }, { status: 400 })
        }

        if (!lines || !Array.isArray(lines) || lines.length < 2) {
            return NextResponse.json({ success: false, error: 'A journal entry requires at least two lines' }, { status: 400 })
        }

        const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
        const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
        
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return NextResponse.json({ success: false, error: `Journal is unbalanced.` }, { status: 400 })
        }

        const { data: header, error: headerErr } = await supabase
            .from('journal_entries')
            .update({ date: date || new Date().toISOString(), notes })
            .eq('id', id)
            .select()
            .single()

        if (headerErr) throw headerErr

        await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', id)

        const linePayloads = lines.map(l => ({
            journal_entry_id: id,
            account_id: l.account_id,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            description: l.description || ''
        }))

        const { error: linesErr } = await supabase.from('journal_entry_lines').insert(linePayloads)
        if (linesErr) throw linesErr

        logInteractionServer({ type: 'journal-updated', category: 'account', performedByName: 'Admin', description: `Updated Manual Journal ${header.entry_number}`, source: 'Admin App' });

        return NextResponse.json({ success: true, data: header })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// DELETE - Delete manual journal entry
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) return NextResponse.json({ success: false, error: 'Journal ID required' }, { status: 400 })

        const { data: current } = await supabase.from('journal_entries').select('reference_type, reference_id, entry_number').eq('id', id).single()
        
        if (!current) {
            return NextResponse.json({ success: false, error: 'Journal entry not found' }, { status: 404 })
        }

        if (current.reference_type !== 'manual') {
            const typeMap = {
                'sales_invoice': 'sales_invoices',
                'purchase_invoice': 'purchase_invoices',
                'receipt_invoice': 'receipt_vouchers',
                'payment_invoice': 'payment_vouchers'
            };
            const tableName = typeMap[current.reference_type];
            let isOrphan = false;

            if (tableName && current.reference_id) {
                const { data: sourceTx } = await supabase.from(tableName).select('id').eq('id', current.reference_id).single();
                if (!sourceTx) isOrphan = true;
            } else if (!tableName) {
                // If it's a completely unknown type, treat it as an orphan so it can be cleared
                isOrphan = true;
            }

            if (!isOrphan) {
                return NextResponse.json({ success: false, error: 'Only manual journal entries can be deleted directly. Delete the source transaction instead.' }, { status: 400 })
            }
        }

        const { error } = await supabase.from('journal_entries').delete().eq('id', id)
        if (error) throw error

        logInteractionServer({ type: 'journal-deleted', category: 'account', performedByName: 'Admin', description: `Deleted Manual Journal ${current.entry_number}`, source: 'Admin App' });

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

