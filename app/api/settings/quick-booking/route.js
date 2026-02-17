import { getSupabaseServer } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Fetch quick booking settings with hierarchical data
export async function GET() {
    const supabase = getSupabaseServer()
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection not available' }, { status: 503 })
    }
    try {
        // Fetch all categories
        const { data: categories, error: catError } = await supabase
            .from('booking_categories')
            .select('*')
            .order('display_order', { ascending: true });

        if (catError) throw catError;

        // Fetch all subcategories
        const { data: subcategories, error: subError } = await supabase
            .from('booking_subcategories')
            .select('*')
            .order('display_order', { ascending: true });

        if (subError) throw subError;

        // Fetch all issues
        const { data: issues, error: issueError } = await supabase
            .from('booking_issues')
            .select('*')
            .order('display_order', { ascending: true });

        if (issueError) throw issueError;

        // Build hierarchical structure
        const hierarchicalData = (categories || []).map(category => ({
            id: category.id,
            name: category.name,
            showOnBookingForm: category.show_on_booking_form,
            displayOrder: category.display_order,
            subcategories: (subcategories || [])
                .filter(sub => sub.category_id === category.id)
                .map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    showOnBookingForm: sub.show_on_booking_form,
                    displayOrder: sub.display_order,
                    issues: (issues || [])
                        .filter(issue => issue.subcategory_id === sub.id)
                        .map(issue => ({
                            id: issue.id,
                            name: issue.name,
                            showOnBookingForm: issue.show_on_booking_form,
                            displayOrder: issue.display_order
                        }))
                }))
        }));

        // Fetch global settings from quick_booking_settings table
        const { data: globalSettings } = await supabase
            .from('quick_booking_settings')
            .select('*')
            .single();

        const settings = {
            title: globalSettings?.title || 'Book A Technician Now',
            subtitle: globalSettings?.subtitle || 'Get same day service | Transparent pricing | Licensed technicians',
            serviceable_pincodes: globalSettings?.serviceable_pincodes || ['400001', '400002', '400003', '400004', '400005', '400008', '400012', '400014', '400050', '400051', '400052', '400053', '400063', '400070', '400077'],
            valid_pincode_message: globalSettings?.valid_pincode_message || '✓ We serve here!',
            invalid_pincode_message: globalSettings?.invalid_pincode_message || '✗ Not serviceable',
            help_text: globalSettings?.help_text || 'We currently serve Mumbai areas. Call us for other locations.',
            categories: hierarchicalData
        };

        return NextResponse.json({ success: true, data: settings })
    } catch (error) {
        console.error('Error fetching quick booking settings:', error)
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
