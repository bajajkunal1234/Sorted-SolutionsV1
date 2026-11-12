import { notFound } from 'next/navigation';
import { getSubcategoryBySlug } from '@/lib/v2/catalogConfig';
import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import SubcategoryStorefront from '@/components/v2/SubcategoryStorefront';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
    const { category, subcategory } = getSubcategoryBySlug(params.category, params.subcategory) || {};
    if (!category || !subcategory) {
        return { title: 'Appliance Services | Sorted Doorstep Care' };
    }
    return {
        title: `${subcategory.headline || subcategory.name} in Mumbai | Sorted Doorstep Care`,
        description: subcategory.shortDesc || category.tagline,
        robots: { index: false, follow: false }
    };
}

export default async function V2SubcategoryPage({ params, searchParams }) {
    const result = getSubcategoryBySlug(params.category, params.subcategory);
    if (!result || !result.category || !result.subcategory) {
        notFound();
    }

    const { category, subcategory } = result;

    let data = { services: [], categoryCounts: {} };
    try {
        data = await fetchPublishedWebServices({ categorySlug: category.slug });
    } catch (err) {
        console.error('[V2SubcategoryPage] error:', err?.message);
    }

    return (
        <SubcategoryStorefront
            category={category}
            subcategory={subcategory}
            services={data.services}
            categoryCounts={data.categoryCounts}
            highlightId={searchParams?.highlight || null}
            initialQuery={searchParams?.q || ''}
        />
    );
}
