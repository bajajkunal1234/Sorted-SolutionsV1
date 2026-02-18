import { fetchAppContent } from '@/lib/fetchAppContent';
import { Mail, Phone } from 'lucide-react';

export const metadata = {
    title: 'Accessibility Statement | Sorted Solutions',
    description: 'Our commitment to digital accessibility for all users.',
};

export default async function AccessibilityPage() {
    const content = await fetchAppContent('static-pages-content');
    const accessibility = content?.accessibility;

    if (!accessibility || !accessibility.published) {
        return (
            <div className="container mx-auto px-4 py-12 text-center">
                <h1 className="text-2xl font-bold mb-4">Accessibility Statement</h1>
                <p>This content is currently unavailable.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Accessibility Statement</h1>
                <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span>Validation Level: <strong>WCAG 2.1 Level {accessibility.wcagLevel}</strong></span>
                    <span>Last Reviewed: {new Date(accessibility.lastReviewed).toLocaleDateString()}</span>
                </div>
            </div>

            <div className="prose prose-lg dark:prose-invert max-w-none mb-12" dangerouslySetInnerHTML={{ __html: accessibility.content }} />

            {accessibility.accessibilityContact && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold mb-4">Accessibility Contact</h3>
                    <p className="mb-4 text-gray-600 dark:text-gray-300">
                        If you encounter any accessibility barriers on our website, please contact us:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6">
                        {accessibility.accessibilityContact.email && (
                            <a href={`mailto:${accessibility.accessibilityContact.email}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <Mail size={18} />
                                {accessibility.accessibilityContact.email}
                            </a>
                        )}
                        {accessibility.accessibilityContact.phone && (
                            <a href={`tel:${accessibility.accessibilityContact.phone}`} className="flex items-center gap-2 text-blue-600 hover:text-blue-800">
                                <Phone size={18} />
                                {accessibility.accessibilityContact.phone}
                            </a>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
