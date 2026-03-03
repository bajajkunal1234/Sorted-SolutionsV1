import { getSupabaseServer } from '@/lib/supabase-server'
import { fetchQuickBookingData } from '@/lib/data/quickBookingData'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch quick booking settings with hierarchical data
export async function GET() {
    try {
        const settings = await fetchQuickBookingData();
        if (!settings) {
            return NextResponse.json({ success: false, error: 'Failed to fetch booking data' }, { status: 500 });
        }
        return NextResponse.json({ success: true, data: settings })
    } catch (error) {
        console.error('Error in quick-booking GET route:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// PUT - Update global quick booking settings (title, subtitle, pincodes, messages)
export async function PUT(request) {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }
    try {
        const settings = await request.json()

        const { data, error } = await supabase
            .from('quick_booking_settings')
            .upsert({
                id: 1, // Always update the same row
                title: settings.title,
                subtitle: settings.subtitle,
                serviceable_pincodes: settings.serviceable_pincodes,
                valid_pincode_message: settings.valid_pincode_message,
                invalid_pincode_message: settings.invalid_pincode_message,
                help_text: settings.help_text,
                updated_at: new Date().toISOString()
            })
            .select()

        if (error) throw error

        return NextResponse.json({ success: true, data: data[0] })
    } catch (error) {
        console.error('Error updating quick booking settings:', error)
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        )
    }
}

// POST - Create new category, subcategory, or issue
export async function POST(request) {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }
    try {
        const body = await request.json();
        const { type, data } = body;

        let result;

        switch (type) {
            case 'category':
                result = await supabase
                    .from('booking_categories')
                    .insert({
                        name: data.name,
                        show_on_booking_form: data.showOnBookingForm ?? true,
                        display_order: data.displayOrder ?? 0
                    })
                    .select()
                    .single();
                break;

            case 'subcategory':
                result = await supabase
                    .from('booking_subcategories')
                    .insert({
                        category_id: data.categoryId,
                        name: data.name,
                        show_on_booking_form: data.showOnBookingForm ?? true,
                        display_order: data.displayOrder ?? 0
                    })
                    .select()
                    .single();
                break;

            case 'issue':
                result = await supabase
                    .from('booking_issues')
                    .insert({
                        subcategory_id: data.subcategoryId,
                        name: data.name,
                        show_on_booking_form: data.showOnBookingForm ?? true,
                        display_order: data.displayOrder ?? 0
                    })
                    .select()
                    .single();
                break;

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid type' },
                    { status: 400 }
                );
        }

        if (result.error) throw result.error;

        return NextResponse.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Error creating booking form item:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// PATCH - Update existing category, subcategory, or issue
export async function PATCH(request) {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }
    try {
        const body = await request.json();
        const { type, id, data } = body;

        let result;
        const updateData = {};

        if (data.name !== undefined) updateData.name = data.name;
        if (data.showOnBookingForm !== undefined) updateData.show_on_booking_form = data.showOnBookingForm;
        if (data.displayOrder !== undefined) updateData.display_order = data.displayOrder;
        // Pricing fields (issues only, ignored harmlessly for categories/subcategories)
        if (data.price !== undefined) updateData.price = data.price === '' ? null : Number(data.price);
        if (data.price_label !== undefined) updateData.price_label = data.price_label || null;

        switch (type) {
            case 'category':
                result = await supabase
                    .from('booking_categories')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();
                break;

            case 'subcategory':
                result = await supabase
                    .from('booking_subcategories')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();
                break;

            case 'issue':
                result = await supabase
                    .from('booking_issues')
                    .update(updateData)
                    .eq('id', id)
                    .select()
                    .single();
                break;

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid type' },
                    { status: 400 }
                );
        }

        if (result.error) throw result.error;

        return NextResponse.json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error('Error updating booking form item:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Remove category, subcategory, or issue
export async function DELETE(request) {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }
    try {
        const body = await request.json();
        const { type, id } = body;

        let result;

        switch (type) {
            case 'category':
                result = await supabase
                    .from('booking_categories')
                    .delete()
                    .eq('id', id);
                break;

            case 'subcategory':
                result = await supabase
                    .from('booking_subcategories')
                    .delete()
                    .eq('id', id);
                break;

            case 'issue':
                result = await supabase
                    .from('booking_issues')
                    .delete()
                    .eq('id', id);
                break;

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid type' },
                    { status: 400 }
                );
        }

        if (result.error) throw result.error;

        return NextResponse.json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting booking form item:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
