import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }) {
    const { category } = params;
    redirect(`/v2/services/${category}`);
}
