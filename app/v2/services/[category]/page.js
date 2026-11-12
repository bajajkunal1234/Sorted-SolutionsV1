import { notFound, redirect } from 'next/navigation';
import { getCategoryBySlug } from '@/lib/v2/catalogConfig';
import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import CategoryStorefront from '@/components/v2/CategoryStorefront';

export const dynamic = 'force-dynamic';

export default async function V2CategoryPage({ params, searchParams }) {
    const slug = params.category || params.slug;
    const category = getCategoryBySlug(slug);
    if (!category) {
        notFound();
    }

    // Per user requirement: redirect category URLs to their primary subcategory page
    if (Array.isArray(category.subcategories) && category.subcategories.length > 0) {
        const primarySub = category.subcategories[0].slug;
        const q = searchParams?.q ? `?q=${encodeURIComponent(searchParams.q)}` : '';
        redirect(`/v2/services/${category.slug}/${primarySub}${q}`);
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
