import { redirect } from 'next/navigation';

// /customer/login is a legacy URL — the unified login lives at /login
export default function CustomerLoginPage() {
    redirect('/login');
}
