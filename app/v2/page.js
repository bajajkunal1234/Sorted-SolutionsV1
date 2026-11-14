import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import V2HomeClient from '@/components/v2/V2HomeClient';

export const dynamic = 'force-dynamic';

export default async function V2HomePage() {
    let services = [];
    let categoryCounts = {};
    let categories = [];

    try {
        const data = await fetchPublishedWebServices();
        services = data.services;
        categoryCounts = data.categoryCounts;
        categories = data.categories || [];
    } catch (err) {
        console.error('[V2HomePage] Failed to load web services:', err?.message);
    }

    return <V2HomeClient services={services} categoryCounts={categoryCounts} categories={categories} />;
}
