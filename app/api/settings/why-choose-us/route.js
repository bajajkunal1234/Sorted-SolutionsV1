import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('website_why_choose_us')
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
        console.error('Error fetching Why Choose Us features:', error);
        return NextResponse.json({ success: true, data: [] });
    }
}

export async function POST(request) {
    try {
        const features = await request.json();

        const { error: deleteError } = await supabase
            .from('website_why_choose_us')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (deleteError) throw deleteError;

        const insertData = features.map((f, index) => ({
            title: f.title,
            description: f.description,
            icon_name: f.icon,
            display_order: index + 1
        }));

        const { data, error } = await supabase
            .from('website_why_choose_us')
            .insert(insertData)
            .select();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error saving Why Choose Us features:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}