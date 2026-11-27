export const HOMEPAGE_SECTION_TYPES = [
    {
        id: 'horizontal_carousel',
        label: 'Horizontal Carousel',
        shortLabel: 'Horizontal Carousel',
        desc: 'Swipeable row or 3D showcase of services & media cards. Add as many as needed.'
    },
    {
        id: 'vertical_carousel',
        label: 'Vertical Carousel',
        shortLabel: 'Vertical Carousel',
        desc: 'Vertical reels-style snap stack, interactive deck, or vertical showcase feed.'
    },
    {
        id: 'media_banner',
        label: 'Image / GIF Banner',
        shortLabel: 'Image / GIF Banner',
        desc: 'Static image or animated GIF banner with optional title, description & CTA.'
    },
    {
        id: 'video_banner',
        label: 'Video Showcase',
        shortLabel: 'Video Section',
        desc: 'Autoplay reel, widescreen cinema video, or split video showcase with CTA.'
    }
];

export const SECTION_THEMES = [
    { id: 'light', label: 'Clean White', bg: '#ffffff', text: '#0f172a' },
    { id: 'soft', label: 'Soft Slate', bg: '#f6f7fb', text: '#0f172a' },
    { id: 'dark', label: 'Cinema Dark', bg: '#0f172a', text: '#ffffff' },
    { id: 'violet', label: 'Sorted Violet', bg: '#23144d', text: '#ffffff' }
];

export const HORIZONTAL_LAYOUTS = [
    {
        id: 'uc_snap_row',
        name: 'Classic Service Strip',
        badge: 'Popular',
        desc: 'Clean Urban Company style horizontal cards with thumbnail, price & +ADD button.',
        ratio: '1:1 Square or 4:3',
        pixels: '800 × 800 px (or 800 × 600 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'peek_center',
        name: 'Glide Peek Center Focus',
        badge: 'Ref #1',
        desc: 'Large centered active card with left & right neighbor cards peeking on the edges + dots.',
        ratio: '16:10 or 4:3 Landscape',
        pixels: '1000 × 640 px (or 960 × 720 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'spotlight_wide',
        name: 'Spotlight Wide + Side Cards',
        badge: 'Ref #2',
        desc: 'Expanded wide center spotlight card with bottom gradient title/description flanked by compact side cards.',
        ratio: '16:10 Center / 3:4 Sides',
        pixels: '1000 × 680 px (works cleanly for all)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'layered_pyramid',
        name: 'Layered Depth Pyramid',
        badge: 'Ref #3',
        desc: 'Symmetrical overlapping stepped cards where the active center card pops forward.',
        ratio: '3:4 Portrait or 4:5',
        pixels: '750 × 1000 px (or 800 × 1000 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'curved_arc',
        name: '3D Curved Panoramic Arc',
        badge: 'Ref #4',
        desc: 'Perspective-angled panoramic gallery arranged along a gentle 3D horizontal curve.',
        ratio: '4:5 or 1:1 Square',
        pixels: '800 × 1000 px (or 800 × 800 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'coverflow_deck',
        name: 'Coverflow Framed Deck',
        badge: 'Ref #5',
        desc: 'Framed focal card with fanned receding cards tucked behind on both left & right + arrows.',
        ratio: '4:3 Landscape',
        pixels: '960 × 720 px (with clean margins)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'diagonal_cascade',
        name: 'Diagonal Cascade Escalator',
        badge: 'Ref #6',
        desc: 'Staggered diagonal step-down card sequence with floating pill tags & quick action.',
        ratio: '3:4 Portrait',
        pixels: '750 × 1000 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'poster_cards',
        name: 'Editorial Poster Cards',
        badge: 'Rich Visual',
        desc: 'Tall full-bleed portrait cards with bottom gradient overlay, badge, price & quick book.',
        ratio: '3:4 Portrait',
        pixels: '750 × 1000 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'grid_2row',
        name: '2-Row Compact Shelf',
        badge: 'Dense Catalog',
        desc: 'Two-row horizontal scrollable grid ideal for showcasing 6–12 services compactly.',
        ratio: '1:1 Square',
        pixels: '600 × 600 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'spotlight_split',
        name: 'Feature Card + Scroll Row',
        badge: 'Promo + Cards',
        desc: 'Highlighted intro card (or section banner) paired with horizontally scrolling service cards.',
        ratio: '4:3 or 1:1 Square',
        pixels: '800 × 600 px / 800 × 800 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    }
];

export const VERTICAL_LAYOUTS = [
    {
        id: 'vertical_reels_peek',
        name: 'Vertical Reels Snap Stack',
        badge: 'Ref #7',
        desc: 'Tall vertical snap viewport with the active card centered and prev/next cards peeking top & bottom.',
        ratio: '9:16 Vertical or 4:5',
        pixels: '720 × 1280 px (or 800 × 1000 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'vertical_story_split',
        name: 'Vertical Media + Service Split',
        badge: 'Detailed',
        desc: 'Vertical showcase rows pairing tall card media alongside full highlights, pricing & +ADD.',
        ratio: '4:3 or 1:1 Square',
        pixels: '800 × 600 px (or 800 × 800 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'vertical_stacked_deck',
        name: 'Vertical Overlapping Deck',
        badge: 'Interactive',
        desc: 'Stacked 3D vertical deck with depth shadow and up/down step controls.',
        ratio: '16:10 or 4:3',
        pixels: '1000 × 650 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'vertical_accordion_list',
        name: 'Interactive Spotlight List',
        badge: 'Compact',
        desc: 'Vertical list where clicking a service smoothly expands its rich media preview & booking CTA.',
        ratio: '16:9 or 4:3',
        pixels: '960 × 540 px (or 800 × 600 px)',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    },
    {
        id: 'vertical_feed_cards',
        name: 'Full-Width Vertical Feed',
        badge: 'Editorial',
        desc: 'Clean vertical column of full-width visual cards with service pricing & quick add.',
        ratio: '16:9 Wide',
        pixels: '1200 × 675 px',
        maxSize: 'Image/GIF: 8 MB • Video: 15 MB'
    }
];

export const MEDIA_BANNER_LAYOUTS = [
    {
        id: 'contained_rounded',
        name: 'Contained Rounded Banner',
        badge: 'Classic',
        desc: 'Clean rounded banner card aligned to the page container.',
        ratio: '21:9 or 2:1 Wide',
        pixels: '1280 × 540 px (or 1200 × 600 px)',
        maxSize: 'PNG/WebP/JPG/GIF: Max 8 MB'
    },
    {
        id: 'full_bleed',
        name: 'Full-Bleed Edge-to-Edge',
        badge: 'Impact',
        desc: 'Edge-to-edge full-width banner spanning the entire screen width.',
        ratio: '21:9 Ultra-Wide or 16:9',
        pixels: '1440 × 600 px (Mobile safe 1200 × 600 px)',
        maxSize: 'PNG/WebP/JPG/GIF: Max 8 MB'
    },
    {
        id: 'split_left_media',
        name: 'Split Card (Media Left)',
        badge: '2-Column',
        desc: 'Image/GIF on the left with Title, Description box & CTA button on the right.',
        ratio: '4:3 or 1:1 Square',
        pixels: '800 × 600 px (or 800 × 800 px)',
        maxSize: 'PNG/WebP/JPG/GIF: Max 8 MB'
    },
    {
        id: 'split_right_media',
        name: 'Split Card (Media Right)',
        badge: '2-Column',
        desc: 'Title, Description box & CTA button on the left with Image/GIF on the right.',
        ratio: '4:3 or 1:1 Square',
        pixels: '800 × 600 px (or 800 × 800 px)',
        maxSize: 'PNG/WebP/JPG/GIF: Max 8 MB'
    },
    {
        id: 'overlay_card',
        name: 'Banner with Overlay Text & CTA',
        badge: 'Hero Style',
        desc: 'Full visual backdrop with scrim and floating Title, Description & CTA inside.',
        ratio: '16:9 or 2:1 Wide',
        pixels: '1280 × 640 px (keep center/left readable)',
        maxSize: 'PNG/WebP/JPG/GIF: Max 8 MB'
    }
];

export const VIDEO_BANNER_LAYOUTS = [
    {
        id: 'cinema_wide',
        name: 'Contained 16:9 Cinema Player',
        badge: 'Standard',
        desc: 'Rounded 16:9 widescreen video player inside the page container.',
        ratio: '16:9 Widescreen',
        pixels: '1280 × 720 px or 1920 × 1080 px',
        maxSize: 'MP4 (H.264) / WebM: Max 15 MB'
    },
    {
        id: 'full_bleed_video',
        name: 'Full-Bleed Autoplay Video',
        badge: 'Immersive',
        desc: 'Edge-to-edge looping ambient or promo video strip with optional overlay CTA.',
        ratio: '16:9 or 21:9',
        pixels: '1280 × 720 px or 1440 × 620 px',
        maxSize: 'MP4 (H.264) / WebM: Max 15 MB (muted for autoplay)'
    },
    {
        id: 'vertical_reel_9_16',
        name: '9:16 Vertical Reel Showcase',
        badge: 'Shorts / Reels',
        desc: 'Portrait 9:16 video reel centered (with side Title, Description & CTA on desktop).',
        ratio: '9:16 Portrait',
        pixels: '720 × 1280 px or 1080 × 1920 px',
        maxSize: 'MP4 (H.264) / WebM: Max 15 MB'
    },
    {
        id: 'split_video_showcase',
        name: 'Split Video + Details Card',
        badge: '2-Column',
        desc: 'Video player alongside Title, Description box & prominent CTA button.',
        ratio: '16:9 or 4:5',
        pixels: '1280 × 720 px (or 800 × 1000 px)',
        maxSize: 'MP4 (H.264) / WebM: Max 15 MB'
    }
];

export function getLayoutsForType(type) {
    switch (type) {
        case 'vertical_carousel':
            return VERTICAL_LAYOUTS;
        case 'media_banner':
            return MEDIA_BANNER_LAYOUTS;
        case 'video_banner':
            return VIDEO_BANNER_LAYOUTS;
        case 'horizontal_carousel':
        default:
            return HORIZONTAL_LAYOUTS;
    }
}

export function getLayoutMeta(type, layoutId) {
    const list = getLayoutsForType(type);
    return list.find(l => l.id === layoutId) || list[0];
}

export function sanitizeHomepageSection(raw = {}, idx = 0) {
    const validTypes = ['horizontal_carousel', 'vertical_carousel', 'media_banner', 'video_banner'];
    const type = validTypes.includes(raw.type) ? raw.type : 'horizontal_carousel';
    const layouts = getLayoutsForType(type);
    const layout = layouts.some(l => l.id === raw.layout) ? raw.layout : layouts[0].id;
    const validThemes = SECTION_THEMES.map(t => t.id);
    const theme = validThemes.includes(raw.theme) ? raw.theme : 'light';

    const items = Array.isArray(raw.items)
        ? raw.items.map((item, iIdx) => ({
            id: String(item.id || `item-${iIdx + 1}-${Date.now().toString(36)}`),
            serviceId: item.serviceId ? String(item.serviceId) : '',
            title: String(item.title || '').trim(),
            subtitle: String(item.subtitle || '').trim(),
            badge: String(item.badge || '').trim(),
            mediaType: ['image', 'gif', 'video'].includes(item.mediaType) ? item.mediaType : 'image',
            mediaUrl: String(item.mediaUrl || '').trim(),
            linkUrl: String(item.linkUrl || '').trim()
        }))
        : [];

    return {
        id: String(raw.id || `sec-${idx + 1}-${Date.now().toString(36)}`),
        type,
        layout,
        theme,
        enabled: raw.enabled !== false,
        title: String(raw.title || '').trim(),
        description: String(raw.description || '').trim(),
        ctaText: String(raw.ctaText || '').trim(),
        ctaLink: String(raw.ctaLink || '').trim(),
        mediaType: ['image', 'gif', 'video'].includes(raw.mediaType)
            ? raw.mediaType
            : (type === 'video_banner' ? 'video' : 'image'),
        mediaUrl: String(raw.mediaUrl || '').trim(),
        posterUrl: String(raw.posterUrl || '').trim(),
        autoplay: raw.autoplay !== false,
        muted: raw.muted !== false,
        loop: raw.loop !== false,
        controls: Boolean(raw.controls),
        items,
        order: typeof raw.order === 'number' ? raw.order : idx + 1
    };
}
