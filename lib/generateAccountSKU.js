/**
 * Shared utility — generates the next sequential SKU for an accounts record.
 * Prefix rules (mirrors the admin accounts POST endpoint):
 *   C = Customer / Sundry Debtors
 *   S = Supplier / Creditor
 *   B = Bank
 *   T = Technician
 *  FA = Fixed Assets
 *   A = All others
 *
 * Uses the service-role Supabase client so it can read the accounts table
 * regardless of RLS policies (the anon key is blocked from reading accounts).
 *
 * Used by: /api/admin/accounts (POST), /api/auth/customer/signup, /api/booking
 */
import { createServerSupabase } from '@/lib/supabase-server';

export async function generateAccountSKU(type = '', under = '') {
    const underLow = under.toLowerCase();
    const typeLow  = type.toLowerCase();

    let prefix = 'A';
    if (underLow.includes('customer') || underLow.includes('debtor') || typeLow === 'customer')    prefix = 'C';
    else if (underLow.includes('supplier') || underLow.includes('creditor') || typeLow === 'supplier') prefix = 'S';
    else if (underLow.includes('bank'))                                                              prefix = 'B';
    else if (underLow.includes('fixed'))                                                             prefix = 'FA';
    else if (underLow.includes('technician') || typeLow === 'technician')                           prefix = 'T';

    try {
        const supabase = createServerSupabase();
        const { data: existing } = await supabase
            .from('accounts')
            .select('sku')
            .like('sku', `${prefix}%`);

        const maxNum = (existing || []).reduce((max, acc) => {
            const n = parseInt((acc.sku || '').replace(prefix, '')) || 0;
            return n > max ? n : max;
        }, 100);

        return `${prefix}${maxNum + 1}`;
    } catch (e) {
        console.error('[generateAccountSKU] failed, using timestamp fallback:', e.message);
        return `${prefix}${Date.now().toString().slice(-5)}`;
    }
}
