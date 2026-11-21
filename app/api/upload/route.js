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

        if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
            return NextResponse.json({ success: false, error: 'No valid file uploaded' }, { status: 400 });
        }

        let bucket = formData.get('bucket') || 'media';
        const folder = formData.get('folder') || 'uploads';

        const bytes = await file.arrayBuffer();
        if (!bytes || bytes.byteLength === 0) {
            return NextResponse.json({ success: false, error: 'Uploaded file is empty' }, { status: 400 });
        }
        const rawBuffer = Buffer.from(bytes);

        const preserveFormatParam = formData.get('preserveFormat');
        const isLogo = folder.includes('logos') || folder.includes('brand');
        const isSubcat = folder.includes('subcategories') || folder.includes('thumbnails');
        const isPng = (file.type && file.type.includes('png')) || (file.name && file.name.toLowerCase().endsWith('.png'));
        const preserveFormat = preserveFormatParam === 'true' || ((isLogo || isSubcat) && isPng);

        // Compress images; videos/PDFs/GIFs pass through unchanged; PNG logos preserved as pure PNG
        const { buffer, contentType, ext } = await compressImage(rawBuffer, file.type || (isPng ? 'image/png' : 'image/jpeg'), {
            preserveFormat
        });

        // Route large files, videos, or ecom-v2 assets to 'website-assets' bucket (which has no 5MB limit)
        if (bucket === 'media' && (rawBuffer.byteLength > 4.5 * 1024 * 1024 || (contentType && contentType.startsWith('video/')) || folder.startsWith('ecom-v2'))) {
            bucket = 'website-assets';
        }

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
