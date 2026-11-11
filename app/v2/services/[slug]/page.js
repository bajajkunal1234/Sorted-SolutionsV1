import { notFound } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/v2/catalogConfig';
import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import CategoryStorefront from '@/components/v2/CategoryStorefront';

export const dynamic = 'force-dynamic';

export default async function V2CategoryPage({ params, searchParams }) {
    const category = getCategoryBySlug(params.slug);
    if (!category) {
        notFound();
    }

    let data = { services: [], categoryCounts: {} };
    try {
        data = await fetchPublishedWebServices({ categorySlug: category.slug });
    } catch (err) {
        console.error('[V2CategoryPage] error:', err?.message);
    }

    return (
        <CategoryStorefront
            activeCategory={category}
            services={data.services}
            categoryCounts={data.categoryCounts}
            highlightId={searchParams?.highlight || null}
            initialQuery={searchParams?.q || ''}
        />
    );
}
