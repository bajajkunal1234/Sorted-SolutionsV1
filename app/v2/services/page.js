import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import CategoryStorefront from '@/components/v2/CategoryStorefront';

export const dynamic = 'force-dynamic';

export default async function V2AllServicesPage({ searchParams }) {
    let data = { services: [], categoryCounts: {} };
    try {
        data = await fetchPublishedWebServices();
    } catch (err) {
        console.error('[V2AllServicesPage] error:', err?.message);
    }

    return (
        <CategoryStorefront
            activeCategory={null}
            services={data.services}
            categoryCounts={data.categoryCounts}
            highlightId={searchParams?.highlight || null}
            initialQuery={searchParams?.q || ''}
        />
    );
}
