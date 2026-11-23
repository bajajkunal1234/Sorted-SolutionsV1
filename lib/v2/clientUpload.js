import imageCompression from 'browser-image-compression';

/**
 * Uploads a file with automatic direct Supabase signed upload and client-side compression
 * for large images. Completely bypasses Vercel 4.5MB serverless limits (HTTP 413 "Request Entity Too Large").
 *
 * @param {File} file - File object from input
 * @param {Object} options
 * @param {string} [options.folder='ecom-v2/categories'] - Destination folder in Supabase bucket
 * @param {string} [options.bucket='website-assets'] - Supabase storage bucket
 * @param {boolean} [options.preserveFormat=false] - Whether to force PNG format preservation
 * @param {number} [options.maxSizeMB=1.2] - Target maximum size in MB for compression
 * @param {number} [options.maxWidthOrHeight=1800] - Max dimension for resized image
 * @returns {Promise<string>} Public URL of uploaded asset
 */
export async function uploadClientMedia(file, options = {}) {
    if (!file) throw new Error('No file provided for upload');

    const {
        folder = 'ecom-v2/categories',
        bucket = 'website-assets',
        preserveFormat = false,
        maxSizeMB = 1.2,
        maxWidthOrHeight = 1800
    } = options;

    let fileToUpload = file;

    // Detect file type
    const mimeType = file.type || '';
    const fileName = file.name || '';
    const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|webp|bmp)$/i.test(fileName);
    const isGif = mimeType === 'image/gif' || /\.gif$/i.test(fileName);
    const isSvg = mimeType === 'image/svg+xml' || /\.svg$/i.test(fileName);

    // Automatically compress raster images (skip animated GIFs and SVGs) to lightweight WebP
    if (isImage && !isGif && !isSvg) {
        try {
            // Unless preserveFormat is explicitly true (e.g. transparent icons), convert to modern WebP for 80-95% compression
            const targetMime = preserveFormat ? (mimeType || 'image/png') : 'image/webp';
            const baseName = (fileName || `image_${Date.now()}`).replace(/\.[^/.]+$/, '');
            const targetFileName = preserveFormat ? fileName : `${baseName}.webp`;

            const compOptions = {
                maxSizeMB: maxSizeMB || 0.2, // Default 200 KB target
                maxWidthOrHeight: maxWidthOrHeight || 1400,
                useWebWorker: true,
                fileType: targetMime,
                initialQuality: 0.82
            };
            const compressedBlob = await imageCompression(file, compOptions);
            fileToUpload = new File([compressedBlob], targetFileName, {
                type: targetMime
            });
        } catch (compErr) {
            console.warn('[uploadClientMedia] Client compression failed or skipped, trying raw upload:', compErr);
            fileToUpload = file;
        }
    }

    // ── STRATEGY 1: Direct Signed Upload to Supabase Storage ──
    // Direct upload streams file straight to Supabase CDN/storage without routing bytes
    // through Vercel serverless functions, eliminating the 4.5MB payload limit entirely.
    try {
        const signRes = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: fileToUpload.name || file.name,
                type: fileToUpload.type || file.type || 'application/octet-stream',
                folder,
                bucket
            })
        });

        if (signRes.ok) {
            const signData = await signRes.json();
            if (signData.success && signData.signedUrl && signData.publicUrl) {
                const putRes = await fetch(signData.signedUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': fileToUpload.type || file.type || 'application/octet-stream'
                    },
                    body: fileToUpload
                });

                if (putRes.ok) {
                    return signData.publicUrl;
                }
                console.warn('[uploadClientMedia] Direct signed upload PUT returned', putRes.status, 'trying fallback');
            }
        }
    } catch (signedErr) {
        console.warn('[uploadClientMedia] Signed upload error, falling back to /api/upload:', signedErr);
    }

    // ── STRATEGY 2: Fallback to /api/upload ──
    const MAX_ALLOWED_BYTES = 4.4 * 1024 * 1024;
    if (fileToUpload.size > MAX_ALLOWED_BYTES) {
        const sizeMb = (fileToUpload.size / (1024 * 1024)).toFixed(1);
        throw new Error(`File is too large (${sizeMb} MB). Maximum allowed upload size is 4.5 MB. Please choose a smaller file.`);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('bucket', bucket);
    formData.append('folder', folder);
    if (preserveFormat || mimeType.includes('png') || fileName.toLowerCase().endsWith('.png')) {
        formData.append('preserveFormat', 'true');
    }

    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });

    if (!res.ok) {
        let errorMsg = `Upload failed (Status ${res.status})`;
        try {
            const text = await res.text();
            if (res.status === 413) {
                errorMsg = 'File is too large for the server (limit 4.5MB). Please select a smaller file.';
            } else if (text) {
                try {
                    const parsed = JSON.parse(text);
                    errorMsg = parsed.error || errorMsg;
                } catch {
                    errorMsg = text.length > 200 ? text.slice(0, 200) + '...' : text;
                }
            }
        } catch {
            // keep default errorMsg
        }
        throw new Error(errorMsg);
    }

    const json = await res.json();
    if (!json.success || !json.url) {
        throw new Error(json.error || 'Upload failed: no URL returned');
    }

    return json.url;
}
