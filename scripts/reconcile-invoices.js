const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envText = fs.readFileSync('.env.local', 'utf8');
let url = '', key = '';
envText.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
        url = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    }
    if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
        key = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    } else if (!key && trimmed.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
        key = trimmed.split('=')[1].trim().replace(/['"]/g, '');
    }
});

if (!url || !key) {
    console.error('Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

const isDryRun = process.argv.includes('--dry-run');

async function reconcile() {
    console.log(`Starting invoice reconciliation (mode: ${isDryRun ? 'DRY-RUN' : 'APPLY'})...\n`);

    // 1. Fetch all sales invoices
    const { data: invoices, error: invErr } = await supabase
        .from('sales_invoices')
        .select('id, invoice_number, job_id, total_amount, paid_amount, status, created_at, account_id')
        .order('created_at', { ascending: true });

    if (invErr) {
        console.error('Failed to fetch sales_invoices:', invErr);
        return;
    }
    console.log(`Found ${invoices.length} total sales invoices.`);

    // 2. Fetch all receipt vouchers
    const { data: receipts, error: rcptErr } = await supabase
        .from('receipt_vouchers')
        .select('id, receipt_number, job_id, amount, status, payment_mode, created_at')
        .order('created_at', { ascending: true });

    if (rcptErr) {
        console.error('Failed to fetch receipt_vouchers:', rcptErr);
        return;
    }
    console.log(`Found ${receipts.length} total receipt vouchers.`);

    // 3. Fetch all existing allocations
    const { data: allocations, error: allocErr } = await supabase
        .from('receipt_voucher_allocations')
        .select('*');

    if (allocErr) {
        console.error('Failed to fetch receipt_voucher_allocations:', allocErr);
        return;
    }
    console.log(`Found ${allocations.length} existing receipt voucher allocations.\n`);

    // Index receipts by job_id
    const receiptsByJob = new Map();
    for (const r of receipts) {
        if (!r.job_id) continue;
        const jId = String(r.job_id);
        if (!receiptsByJob.has(jId)) receiptsByJob.set(jId, []);
        receiptsByJob.get(jId).push(r);
    }

    // Index allocations by receipt_voucher_id + invoice_id
    const existingAllocSet = new Set(
        allocations.map(a => `${a.receipt_voucher_id}_${a.invoice_id}`)
    );

    let toPaidCount = 0;
    let toPartialCount = 0;
    let finalizedToUnpaidCount = 0;
    let unchangedCount = 0;
    let newAllocations = [];
    let invoiceUpdates = [];

    for (const inv of invoices) {
        const totalAmt = parseFloat(inv.total_amount) || 0;
        let jobReceipts = [];
        if (inv.job_id) {
            jobReceipts = (receiptsByJob.get(String(inv.job_id)) || []).filter(r => r.status === 'cleared');
        }

        const totalClearedReceipts = jobReceipts.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        
        // Also check if any allocations already exist for this invoice from non-job receipts
        const existingInvoiceAllocs = allocations.filter(a => a.invoice_id === inv.id);
        const existingAllocAmt = existingInvoiceAllocs.reduce((sum, a) => sum + (parseFloat(a.amount_applied) || 0), 0);

        const effectivePaidAmt = Math.max(totalClearedReceipts, existingAllocAmt);

        let targetStatus = inv.status;
        if (totalAmt > 0 && effectivePaidAmt >= totalAmt) {
            targetStatus = 'paid';
        } else if (effectivePaidAmt > 0) {
            targetStatus = 'partial';
        } else if (inv.status === 'finalized') {
            targetStatus = 'unpaid';
        }

        const statusChanged = targetStatus !== inv.status;
        const paidAmtChanged = Math.abs((parseFloat(inv.paid_amount) || 0) - effectivePaidAmt) > 0.01;

        if (statusChanged || paidAmtChanged) {
            invoiceUpdates.push({
                id: inv.id,
                invoice_number: inv.invoice_number,
                total_amount: totalAmt,
                old_paid: inv.paid_amount,
                new_paid: effectivePaidAmt,
                old_status: inv.status,
                new_status: targetStatus,
                job_id: inv.job_id
            });

            if (targetStatus === 'paid') toPaidCount++;
            else if (targetStatus === 'partial') toPartialCount++;
            else if (targetStatus === 'unpaid' && inv.status === 'finalized') finalizedToUnpaidCount++;
        } else {
            unchangedCount++;
        }

        // Prepare missing allocations
        for (const r of jobReceipts) {
            const allocKey = `${r.id}_${inv.id}`;
            if (!existingAllocSet.has(allocKey)) {
                newAllocations.push({
                    receipt_voucher_id: r.id,
                    invoice_id: inv.id,
                    amount_applied: parseFloat(r.amount) || 0
                });
                existingAllocSet.add(allocKey);
            }
        }
    }

    console.log('--- RECONCILIATION SUMMARY ---');
    console.log(`Invoices transitioning to PAID: ${toPaidCount}`);
    console.log(`Invoices transitioning to PARTIAL: ${toPartialCount}`);
    console.log(`Invoices transitioning from FINALIZED to UNPAID: ${finalizedToUnpaidCount}`);
    console.log(`Total Invoices requiring DB update: ${invoiceUpdates.length}`);
    console.log(`Invoices already up to date: ${unchangedCount}`);
    console.log(`Missing receipt allocations to create: ${newAllocations.length}`);
    console.log('------------------------------\n');

    if (invoiceUpdates.length > 0) {
        console.log('Sample invoice updates (first 5):');
        invoiceUpdates.slice(0, 5).forEach(u => {
            console.log(`  ${u.invoice_number || u.id}: ₹${u.total_amount} | Paid: ₹${u.old_paid} -> ₹${u.new_paid} | Status: ${u.old_status} -> ${u.new_status}`);
        });
        console.log('');
    }

    if (isDryRun) {
        console.log('Dry run complete. Run without --dry-run to apply changes.');
        return;
    }

    // Apply allocations in batches
    if (newAllocations.length > 0) {
        console.log(`Inserting ${newAllocations.length} allocations...`);
        const BATCH_SIZE = 100;
        for (let i = 0; i < newAllocations.length; i += BATCH_SIZE) {
            const batch = newAllocations.slice(i, i + BATCH_SIZE);
            const { error: insErr } = await supabase
                .from('receipt_voucher_allocations')
                .insert(batch);
            if (insErr) {
                console.error(`Error inserting batch at ${i}:`, insErr);
            }
        }
        console.log('Allocations inserted successfully.');
    }

    // Apply invoice updates
    if (invoiceUpdates.length > 0) {
        console.log(`Updating ${invoiceUpdates.length} sales invoices...`);
        let updatedCount = 0;
        for (const u of invoiceUpdates) {
            const { error: upErr } = await supabase
                .from('sales_invoices')
                .update({
                    paid_amount: u.new_paid,
                    status: u.new_status
                })
                .eq('id', u.id);
            if (upErr) {
                console.error(`Failed to update invoice ${u.invoice_number}:`, upErr);
            } else {
                updatedCount++;
            }
        }
        console.log(`Updated ${updatedCount}/${invoiceUpdates.length} sales invoices.`);
    }

    console.log('\nReconciliation completed successfully!');
}

reconcile().catch(console.error);
