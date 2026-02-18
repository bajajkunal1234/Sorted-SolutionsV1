import { fetchAppContent } from '@/lib/fetchAppContent';

export const metadata = {
    title: 'Privacy Policy | Sorted Solutions',
    description: 'Learn how we collect, use, and protect your data at Sorted Solutions.',
};

export default async function PrivacyPage() {
    const content = await fetchAppContent('static-pages-content');
    const privacy = content?.privacy;

    if (!privacy || !privacy.published) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
                <p>This content is currently unavailable.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: privacy.content }} />

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                    <p>Effective Date: {new Date(privacy.effectiveDate).toLocaleDateString()}</p>
                    {privacy.gdprCompliant && (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">
                            GDPR Compliant
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
