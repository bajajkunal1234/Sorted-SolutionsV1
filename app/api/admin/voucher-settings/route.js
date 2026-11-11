import { NextResponse } from 'next/server';
import { 
    getAllVoucherSettings, 
    updateVoucherSetting, 
    resetVoucherCounter, 
    previewVoucherNumber, 
    getNextVoucherNumber 
} from '@/lib/voucherNumberService';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const type = searchParams.get('type');

        if (action === 'preview' && type) {
            const preview = await previewVoucherNumber(type);
            return NextResponse.json({ success: true, preview });
        }

        const settings = await getAllVoucherSettings();
        return NextResponse.json({ success: true, settings });
    } catch (err) {
        console.error('Error fetching voucher settings:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, voucher_type } = body;

        if (action === 'reset' && voucher_type) {
            const updated = await resetVoucherCounter(voucher_type);
            return NextResponse.json({ success: true, data: updated, message: `Counter reset for ${voucher_type}` });
        }

        if (action === 'next' && voucher_type) {
            const nextNumber = await getNextVoucherNumber(voucher_type);
            return NextResponse.json({ success: true, voucher_number: nextNumber });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (err) {
        console.error('Error processing voucher settings action:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { settings } = body;

        if (!Array.isArray(settings)) {
            return NextResponse.json({ success: false, error: 'Invalid settings format: array required' }, { status: 400 });
        }

        const updated = [];
        for (const s of settings) {
            if (s.voucher_type) {
                const res = await updateVoucherSetting(s.voucher_type, {
                    label: s.label,
                    prefix: s.prefix ?? '',
                    suffix: s.suffix ?? '',
                    starting_number: parseInt(s.starting_number, 10) || 1,
                    current_number: parseInt(s.current_number, 10) || 1,
                    padding: parseInt(s.padding, 10) || 0,
                    reset_frequency: s.reset_frequency || 'never',
                    include_year: s.include_year || 'NONE',
                    separator: s.separator !== undefined ? s.separator : '-'
                });
                updated.push(res);
            }
        }

        return NextResponse.json({ success: true, settings: updated, message: 'All voucher numbering settings saved successfully!' });
    } catch (err) {
        console.error('Error saving voucher settings:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
