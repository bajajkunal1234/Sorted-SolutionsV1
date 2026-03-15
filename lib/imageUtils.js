import sharp from 'sharp'

/**
 * Compress an image buffer using Sharp.
 * - Converts to WebP for maximum compression
 * - Resizes to max 1920px on the longest edge (preserving aspect ratio)
 * - Falls back to original buffer if Sharp fails (e.g. for GIFs, SVGs)
 *
 * @param {Buffer} buffer - Raw file buffer
 * @param {string} mimeType - Original MIME type (e.g. 'image/jpeg')
 * @param {object} options
 * @param {number} options.quality - WebP quality 1-100 (default 82)
 * @param {number} options.maxDimension - Max width/height in px (default 1920)
 * @returns {{ buffer: Buffer, contentType: string, ext: string }}
 */
export async function compressImage(buffer, mimeType = '', options = {}) {
    const { quality = 82, maxDimension = 1920 } = options

    // Skip non-images and SVGs
    if (!mimeType.startsWith('image/') || mimeType === 'image/svg+xml') {
        return { buffer, contentType: mimeType, ext: mimeType.split('/')[1] || 'bin' }
    }

    try {
        const compressed = await sharp(buffer)
            .rotate() // Auto-orient based on EXIF metadata
            .resize(maxDimension, maxDimension, {
                fit: 'inside',        // preserve aspect ratio, never enlarge
                withoutEnlargement: true,
            })
            .webp({ quality })
            .toBuffer()

        // Only use if we actually saved space
        const finalBuffer = compressed.length < buffer.length ? compressed : buffer
        const finalType = compressed.length < buffer.length ? 'image/webp' : mimeType

        const savedKB = ((buffer.length - finalBuffer.length) / 1024).toFixed(1)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[compress] ${(buffer.length / 1024).toFixed(1)}KB → ${(finalBuffer.length / 1024).toFixed(1)}KB (saved ${savedKB}KB)`)
        }

        return {
            buffer: finalBuffer,
            contentType: finalType,
            ext: finalType === 'image/webp' ? 'webp' : (mimeType.split('/')[1] || 'jpg'),
        }
    } catch (err) {
        // Non-fatal: return original if Sharp can't handle this format
        console.warn('[compress] Sharp failed, using original:', err.message)
        return { buffer, contentType: mimeType, ext: mimeType.split('/')[1] || 'jpg' }
    }
}
