/**
 * Single source of truth for the /v2 Urban Company-inspired storefront categories.
 * Maps clean URL slugs to Supabase `inventory.category` labels, 3D icons, and banners.
 */

export const V2_CATEGORIES = [
    {
        slug: 'ac-repair',
        name: 'Air Conditioner',
        shortLabel: 'AC Service & Repair',
        mobileLabel: 'AC & Cooling',
        icon: '/images/services/ac_3d.png',
        banner: '/images/banners/banner_speed_90_mins.png',
        accent: '#eef2ff',
        tagline: 'Foam-jet cleaning, gas charging, PCB & installation across Mumbai',
        dbCategories: ['Air Conditioners', 'Air Conditioner', 'AC'],
        subgroups: ['Foam-Jet Service', 'Repair & Cooling Fix', 'Gas Refill', 'Install & Uninstall', 'AMC & Care'],
    },
    {
        slug: 'washing-machine-repair',
        name: 'Washing Machine',
        shortLabel: 'Washing Machine',
        mobileLabel: 'Washing Machine',
        icon: '/images/services/washing_machine_3d.png',
        banner: '/images/banners/banner_expertise_v3.png',
        accent: '#ecfeff',
        tagline: 'Front load, top load & semi-automatic repair with genuine spare parts',
        dbCategories: ['Washing Machine', 'Washing Machine Parts', 'Semi WM Parts'],
        subgroups: ['Front Load Repair', 'Top Load Repair', 'Semi-Automatic', 'Drum Descaling & Service'],
    },
    {
        slug: 'refrigerator-repair',
        name: 'Refrigerator',
        shortLabel: 'Refrigerator',
        mobileLabel: 'Refrigerator',
        icon: '/images/services/fridge_3d.png',
        banner: '/images/banners/banner_problem_solved_expert.png',
        accent: '#eff6ff',
        tagline: 'Single door, double door & side-by-side cooling & compressor specialists',
        dbCategories: ['Refrigerator', 'Fridge'],
        subgroups: ['Cooling & Gas', 'Door & Thermostat', 'Inverter PCB & Compressor', 'Inspection'],
    },
    {
        slug: 'oven-repair',
        name: 'Microwave & Oven',
        shortLabel: 'Microwave & Oven',
        mobileLabel: 'Oven & Microwave',
        icon: '/images/services/oven_3d.png',
        banner: '/images/banners/banner_all_in_one_v3.png',
        accent: '#fef3c7',
        tagline: 'Heating issues, magnetron, turntable motor & touch panel repairs',
        dbCategories: ['Oven', 'Microwave', 'Microwave Parts'],
        subgroups: ['Not Heating & Magnetron', 'Touchpad & Power', 'Servicing & Check-up'],
    },
    {
        slug: 'water-purifier-repair',
        name: 'Water Purifier',
        shortLabel: 'Water Purifier',
        mobileLabel: 'Water Purifier',
        icon: '/images/services/water_purifier_3d.png',
        banner: '/images/banners/banner_location_v3.png',
        accent: '#ecfdf5',
        tagline: 'RO membrane kit, UV lamp, TDS testing & periodic filter replacement',
        dbCategories: ['Water Purifier', 'RO Water Purifier'],
        subgroups: ['Full RO Servicing', 'Filter & Membrane', 'Repair & Leakage'],
    },
    {
        slug: 'hob-repair',
        name: 'Hob & Gas Stove',
        shortLabel: 'Hob & Gas Stove',
        mobileLabel: 'Hob & Chimney',
        icon: '/images/services/hob_3d.png',
        banner: '/images/banners/banner_all_in_one.png',
        accent: '#fff1f2',
        tagline: 'Built-in glass hob burners, auto-ignition, gas valve & chimney service',
        dbCategories: ['HOB Top Stoves', 'Gas Stove', 'Hob & Gas Stove', 'Himney Parts', 'Chimney'],
        subgroups: ['Gas Hob Servicing', 'Ignition & Burner Fix', 'Chimney Deep Clean'],
    },
];

export const V2_HERO_CARDS = [
    {
        id: 'promo-90min',
        badge: 'Mumbai Express',
        title: '90-Min Arrival',
        subtitle: 'Technician at your doorstep',
        image: '/images/banners/banner_speed_90_mins.png',
        href: '/v2/services/ac-repair',
    },
    {
        id: 'promo-expert',
        badge: '30-Day Warranty',
        title: 'Certified Pros',
        subtitle: 'Background verified experts',
        image: '/images/banners/banner_expertise_v3.png',
        href: '/v2/services/washing-machine-repair',
    },
    {
        id: 'promo-local',
        badge: 'Across Mumbai',
        title: 'Powai to Colaba',
        subtitle: 'Hyper-local dispatch hubs',
        image: '/images/banners/banner_location_v3.png',
        href: '/v2/services/refrigerator-repair',
    },
    {
        id: 'promo-all',
        badge: 'Upfront Rates',
        title: 'Fixed GST Bills',
        subtitle: 'No hidden surprise charges',
        image: '/images/banners/banner_problem_solved_expert.png',
        href: '/v2/services/water-purifier-repair',
    },
];

export function getCategoryBySlug(slug) {
    if (!slug) return null;
    const normalized = String(slug).trim().toLowerCase();
    return V2_CATEGORIES.find(c => c.slug === normalized) || null;
}

export function findCategoryForDbName(dbCategory) {
    if (!dbCategory) return null;
    const needle = String(dbCategory).trim().toLowerCase();
    return (
        V2_CATEGORIES.find(cat =>
            cat.dbCategories.some(db => db.toLowerCase() === needle) ||
            cat.name.toLowerCase() === needle ||
            cat.slug === needle
        ) || null
    );
}

export function inferSubgroup(item, categoryObj) {
    const name = `${item?.name || ''} ${item?.job_type || ''}`.toLowerCase();
    if (!categoryObj) return 'Popular Services';

    if (categoryObj.slug === 'ac-repair') {
        if (name.includes('amc') || name.includes('annual')) return 'AMC & Care';
        if (name.includes('install') || name.includes('uninstall') || name.includes('shifting')) return 'Install & Uninstall';
        if (name.includes('gas') || name.includes('refill') || name.includes('charging')) return 'Gas Refill';
        if (name.includes('foam') || name.includes('jet') || name.includes('service') || name.includes('clean')) return 'Foam-Jet Service';
        return 'Repair & Cooling Fix';
    }
    if (categoryObj.slug === 'washing-machine-repair') {
        if (name.includes('front')) return 'Front Load Repair';
        if (name.includes('top')) return 'Top Load Repair';
        if (name.includes('semi')) return 'Semi-Automatic';
        return 'Drum Descaling & Service';
    }
    if (categoryObj.slug === 'refrigerator-repair') {
        if (name.includes('gas') || name.includes('cool') || name.includes('compressor')) return 'Cooling & Gas';
        if (name.includes('door') || name.includes('gasket') || name.includes('thermostat')) return 'Door & Thermostat';
        if (name.includes('pcb') || name.includes('inverter')) return 'Inverter PCB & Compressor';
        return 'Inspection';
    }
    if (categoryObj.slug === 'oven-repair') {
        if (name.includes('heat') || name.includes('magnetron')) return 'Not Heating & Magnetron';
        if (name.includes('touch') || name.includes('power') || name.includes('pcb')) return 'Touchpad & Power';
        return 'Servicing & Check-up';
    }
    if (categoryObj.slug === 'water-purifier-repair') {
        if (name.includes('filter') || name.includes('membrane') || name.includes('kit')) return 'Filter & Membrane';
        if (name.includes('service') || name.includes('ro')) return 'Full RO Servicing';
        return 'Repair & Leakage';
    }
    if (categoryObj.slug === 'hob-repair') {
        if (name.includes('chimney')) return 'Chimney Deep Clean';
        if (name.includes('ignition') || name.includes('burner') || name.includes('valve')) return 'Ignition & Burner Fix';
        return 'Gas Hob Servicing';
    }

    return categoryObj.subgroups?.[0] || 'Popular Services';
}

export function normalizeWebServiceItem(row) {
    const categoryObj = findCategoryForDbName(row.category);
    const salePrice = Number(row.selling_price ?? row.sale_price ?? row.retail_price ?? 0) || 0;
    const mrp = Number(row.retail_price ?? salePrice) || salePrice;
    const gstRate = row.gst_applicable === false ? 0 : (Number(row.gst_rate ?? 18) || 18);
    const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    const highlights = Array.isArray(row.terms_conditions)
        ? row.terms_conditions.filter(Boolean)
        : (typeof row.description === 'string' && row.description.trim()
            ? row.description.split(/\r?\n|•/).map(s => s.trim()).filter(Boolean)
            : []);

    return {
        id: row.id,
        sku: row.sku || '',
        name: row.name,
        dbCategory: row.category || '',
        categorySlug: categoryObj?.slug || 'other',
        categoryName: categoryObj?.name || row.category || 'Appliance Service',
        subgroup: inferSubgroup(row, categoryObj),
        type: row.type || 'service',
        jobType: row.job_type || 'repair',
        description: row.description || '',
        highlights,
        price: salePrice,
        mrp: mrp > salePrice ? mrp : salePrice,
        discountPercent: mrp > salePrice && mrp > 0 ? Math.round(((mrp - salePrice) / mrp) * 100) : 0,
        gstRate,
        gstApplicable: row.gst_applicable !== false,
        hsnCode: row.sac_code || row.hsn_code || '998715',
        image: images[0] || categoryObj?.icon || '/images/services/ac_3d.png',
        images,
        warrantyNote: row.service_terms_template || 'Includes 30-day service warranty & post-service testing',
    };
}

export function calculateCartTotals(cartItems = []) {
    let itemsSubtotal = 0;
    let cgst = 0;
    let sgst = 0;
    let totalCount = 0;

    (cartItems || []).forEach(item => {
        const qty = Math.max(0, parseInt(item.qty, 10) || 0);
        const unitPrice = Number(item.price) || 0;
        const gstRate = item.gstApplicable === false ? 0 : (Number(item.gstRate ?? 18) || 0);
        const lineSubtotal = qty * unitPrice;
        const lineTax = (lineSubtotal * gstRate) / 100;
        itemsSubtotal += lineSubtotal;
        cgst += lineTax / 2;
        sgst += lineTax / 2;
        totalCount += qty;
    });

    const totalTax = Math.round((cgst + sgst) * 100) / 100;
    const grandTotal = Math.round(itemsSubtotal + totalTax);

    return {
        totalCount,
        itemsSubtotal: Math.round(itemsSubtotal * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        totalTax,
        grandTotal,
    };
}

export function formatINR(amount) {
    const n = Math.round(Number(amount) || 0);
    return `₹${n.toLocaleString('en-IN')}`;
}
