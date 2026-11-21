import { createServerSupabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const supabase = createServerSupabase();
    if (!supabase) {
        return NextResponse.json({ success: false, error: 'Database connection failed' }, { status: 500 });
    }

    try {
        const body = await request.json();
        const {
            name = 'upload',
            type = 'image/jpeg',
            folder = 'ecom-v2/categories',
            bucket = 'website-assets'
        } = body;

        let ext = (name.split('.').pop() || 'jpg').toLowerCase();
        if (ext === 'quicktime') ext = 'mov';
        if (ext === 'jpeg') ext = 'jpg';
        if (ext.length > 5 || ext.includes('/') || ext.includes('\\')) ext = 'jpg';

        const safeFolder = folder.replace(/^\/+|\/+$/g, '');
        const filePath = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(filePath);

        if (error) {
            console.error('[signed-url] error creating signed url:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return NextResponse.json({
            success: true,
            signedUrl: data.signedUrl,
            token: data.token,
            path: filePath,
            publicUrl
        });
    } catch (err) {
        console.error('[signed-url] exception:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
