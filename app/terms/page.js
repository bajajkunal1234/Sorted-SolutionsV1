import { fetchAppContent } from '@/lib/fetchAppContent';

export const metadata = {
    title: 'Terms & Conditions | Sorted Solutions',
    description: 'Read our terms and conditions for using Sorted Solutions services.',
};

export default async function TermsPage() {
    const content = await fetchAppContent('static-pages-content');
    const terms = content?.terms;

    if (!terms || !terms.published) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Terms & Conditions</h1>
                <p>This content is currently unavailable.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-lg dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: terms.content }} />

            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500">
                <p>Effective Date: {new Date(terms.effectiveDate).toLocaleDateString()}</p>
                {terms.versions && terms.versions.length > 0 && (
                    <p>Last Updated: {new Date(terms.versions[terms.versions.length - 1].date).toLocaleDateString()}</p>
                )}
            </div>
        </div>
    );
}
