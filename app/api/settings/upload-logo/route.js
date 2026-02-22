import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
    const supabase = createServerSupabase();
    if (!supabase) return NextResponse.json({ success: false, error: 'No DB connection' }, { status: 500 });

    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `brands/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const { data, error } = await supabase.storage
            .from('website-assets')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('website-assets')
            .getPublicUrl(fileName);

        return NextResponse.json({ success: true, url: publicUrl });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}
