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
 * Used by: /api/admin/accounts (POST), /api/auth/customer/signup, /api/booking
 */
import { supabase } from '@/lib/supabase';

export async function generateAccountSKU(type = '', under = '') {
    const underLow = under.toLowerCase();
    const typeLow  = type.toLowerCase();

    let prefix = 'A';
    if (underLow.includes('customer') || underLow.includes('debtor') || typeLow === 'customer')    prefix = 'C';
    else if (underLow.includes('supplier') || underLow.includes('creditor') || typeLow === 'supplier') prefix = 'S';
    else if (underLow.includes('bank'))                                                              prefix = 'B';
    else if (underLow.includes('fixed'))                                                             prefix = 'FA';
    else if (underLow.includes('technician') || typeLow === 'technician')                           prefix = 'T';

    const { data: existing } = await supabase
        .from('accounts')
        .select('sku')
        .like('sku', `${prefix}%`);

    const maxNum = (existing || []).reduce((max, acc) => {
        const n = parseInt((acc.sku || '').replace(prefix, '')) || 0;
        return n > max ? n : max;
    }, 100);

    return `${prefix}${maxNum + 1}`;
}
