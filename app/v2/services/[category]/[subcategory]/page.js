import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function V2SubcategoryRedirectPage({ params }) {
    const category = params?.category;
    const subcategory = params?.subcategory;
    const query = subcategory ? `?type=${subcategory}` : '';
    redirect(`/v2/services/${category}${query}`);
}
