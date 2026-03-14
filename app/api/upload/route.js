/**
 * General-purpose upload endpoint used by technician, admin, and customer app.
 * Automatically compresses images before saving to Supabase Storage.
 *
 * POST /api/upload
 * FormData fields:
 *   file        - File (required)
 *   bucket      - Supabase bucket name (default: 'media')
 *   folder      - Sub-folder path (default: 'uploads')
 *
 * Returns: { success: true, url: "https://..." }
 */
import { createServerSupabase } from '@/lib/supabase-server';
import { compressImage } from '@/lib/imageUtils';
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

        const bucket = formData.get('bucket') || 'media';
        const folder = formData.get('folder') || 'uploads';

        const bytes = await file.arrayBuffer();
        const rawBuffer = Buffer.from(bytes);

        // Compress images; videos/PDFs pass through unchanged
        const { buffer, contentType, ext } = await compressImage(rawBuffer, file.type);

        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(fileName, buffer, { contentType, upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: file.name,
            type: contentType,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
    }
}
