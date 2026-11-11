import { createServerSupabase } from '@/lib/supabase-server';

/**
 * Service to manage centralized, atomic sequential voucher numbering.
 * Supports: sales, purchase, quotation, receipt, payment, journal,
 *           job, account_customer, account_supplier, account_general,
 *           inventory_product, inventory_service.
 */

export function formatVoucherNumber(setting, num, date = new Date()) {
    if (!setting) return String(num);

    const now = date instanceof Date ? date : new Date(date);
    let yearStr = '';
    if (setting.include_year === 'YYYY') {
        yearStr = String(now.getFullYear());
    } else if (setting.include_year === 'YY') {
        yearStr = String(now.getFullYear()).slice(-2);
    }

    const pad = Number(setting.padding) || 0;
    const paddedNum = pad > 0 ? String(num).padStart(pad, '0') : String(num);

    const sep = setting.separator !== undefined ? setting.separator : '-';
    let result = setting.prefix || '';

    if (yearStr) {
        if (result && sep) {
            result = `${result}${sep}${yearStr}`;
        } else {
            result = `${result}${yearStr}`;
        }
    }

    if (result && sep) {
        result = `${result}${sep}${paddedNum}`;
    } else {
        result = `${result}${paddedNum}`;
    }

    if (setting.suffix) {
        if (sep) {
            result = `${result}${sep}${setting.suffix}`;
        } else {
            result = `${result}${setting.suffix}`;
        }
    }

    return result;
}

/**
 * Atomically generates and increments the next voucher number from Supabase.
 */
export async function getNextVoucherNumber(voucherType) {
    const supabase = createServerSupabase();
    try {
        const { data, error } = await supabase.rpc('get_next_voucher_number', {
            p_voucher_type: voucherType
        });
        if (error) {
            console.error(`[voucherNumberService] get_next_voucher_number error for ${voucherType}:`, error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error(`[voucherNumberService] exception for ${voucherType}:`, e.message);
        return null;
    }
}

/**
 * Previews the next voucher number without incrementing the counter.
 */
export async function previewVoucherNumber(voucherType) {
    const supabase = createServerSupabase();
    try {
        const { data, error } = await supabase.rpc('preview_voucher_number', {
            p_voucher_type: voucherType
        });
        if (error) {
            console.error(`[voucherNumberService] preview_voucher_number error for ${voucherType}:`, error.message);
            return null;
        }
        return data;
    } catch (e) {
        console.error(`[voucherNumberService] exception previewing ${voucherType}:`, e.message);
        return null;
    }
}

/**
 * Fetches all voucher settings.
 */
export async function getAllVoucherSettings() {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
        .from('voucher_settings')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('[voucherNumberService] fetch error:', error.message);
        throw error;
    }
    return data || [];
}

/**
 * Updates settings and refreshes format_preview.
 */
export async function updateVoucherSetting(voucherType, updates) {
    const supabase = createServerSupabase();
    
    // Calculate new preview format
    const previewNum = updates.current_number ?? updates.starting_number ?? 1;
    const formatPreview = formatVoucherNumber({
        prefix: updates.prefix,
        suffix: updates.suffix,
        padding: updates.padding,
        include_year: updates.include_year,
        separator: updates.separator
    }, previewNum);

    const payload = {
        ...updates,
        format_preview: formatPreview,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('voucher_settings')
        .update(payload)
        .eq('voucher_type', voucherType)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Resets a voucher's counter back to its starting number.
 */
export async function resetVoucherCounter(voucherType) {
    const supabase = createServerSupabase();
    const { data: setting, error: getErr } = await supabase
        .from('voucher_settings')
        .select('starting_number, prefix, suffix, padding, include_year, separator')
        .eq('voucher_type', voucherType)
        .single();

    if (getErr || !setting) throw (getErr || new Error('Setting not found'));

    const startNum = setting.starting_number || 1;
    const formatPreview = formatVoucherNumber(setting, startNum);

    const { data, error } = await supabase
        .from('voucher_settings')
        .update({
            current_number: startNum,
            last_reset_date: new Date().toISOString(),
            format_preview: formatPreview,
            updated_at: new Date().toISOString()
        })
        .eq('voucher_type', voucherType)
        .select()
        .single();

    if (error) throw error;
    return data;
}
