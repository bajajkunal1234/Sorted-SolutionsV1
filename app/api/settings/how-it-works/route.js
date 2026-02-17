import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_how_it_works')
            .select('*')
            .order('display_order', { ascending: true });

        if (error) throw error;

        const mappedData = (data || []).map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            icon: item.icon_name,
            order: item.display_order
        }));

        return NextResponse.json({ success: true, data: mappedData });
    } catch (error) {
        console.error('Error fetching How It Works steps:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    try {
        const steps = await request.json();

        // Delete all and re-insert for reordering
        const { error: deleteError } = await supabase
            .from('website_how_it_works')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) throw deleteError;

        const insertData = steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            icon_name: step.icon,
            display_order: index + 1,
            step_number: index + 1
        }));

        const { data, error } = await supabase
            .from('website_how_it_works')
            .insert(insertData)
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error saving How It Works steps:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}