import { fetchPublishedWebServices } from '@/lib/v2/serverCatalog';
import { fetchProcessTemplatesConfig } from '@/lib/v2/processTemplatesServer';
import { resolveProcessForHomepage } from '@/lib/v2/processTemplates';
import V2HomeClient from '@/components/v2/V2HomeClient';

export const dynamic = 'force-dynamic';

export default async function V2HomePage() {
    let services = [];
    let categoryCounts = {};
    let categories = [];
    let logos = null;
    let homepageProcess = null;

    try {
        const [data, processConfig] = await Promise.all([
            fetchPublishedWebServices(),
            fetchProcessTemplatesConfig()
        ]);
        services = data.services;
        categoryCounts = data.categoryCounts;
        categories = data.categories || [];
        logos = data.logos || null;
        homepageProcess = resolveProcessForHomepage(processConfig);
    } catch (err) {
        console.error('[V2HomePage] Failed to load web services:', err?.message);
    }

    return (
        <V2HomeClient
            services={services}
            categoryCounts={categoryCounts}
            categories={categories}
            initialLogos={logos}
            homepageProcess={homepageProcess}
        />
    );
}
