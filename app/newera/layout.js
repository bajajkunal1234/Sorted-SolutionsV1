import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase-server';
import Login from './Login';
import MemberSelector from './MemberSelector';

export const metadata = {
    title: 'New Era Liabilities Tracker',
    description: 'Private dashboard for tracking family & group liabilities.',
    robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            'max-video-preview': -1,
            'max-image-preview': 'none',
            'max-snippet': -1,
        },
    },
};

export default async function NewEraLayout({ children }) {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('newera_session');
    
    let authenticated = false;
    let activeMember = null;
    let members = [];

    const supabase = createServerSupabase();
    
    if (supabase && sessionCookie?.value) {
        try {
            // Check session validity in database
            const { data: session } = await supabase
                .from('newera_sessions')
                .select('*')
                .eq('id', sessionCookie.value)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

            if (session) {
                authenticated = true;
                activeMember = session.member_name;

                // Load members list
                const { data: membersList } = await supabase
                    .from('newera_members')
                    .select('*')
                    .order('name');
                members = membersList || [];
            }
        } catch (e) {
            console.error('[newera-layout-auth-error]:', e);
        }
    }

    // 1. If not authenticated, render the Password Login screen
    if (!authenticated) {
        return <Login />;
    }

    // 2. If authenticated but has not selected a member, render the Member Selector screen
    if (!activeMember) {
        return <MemberSelector members={members} />;
    }

    // 3. Fully authenticated and member selected - render the dashboard Layout
    return (
        <div style={styles.appContainer}>
            {children}
        </div>
    );
}

const styles = {
    appContainer: {
        minHeight: '100vh',
        backgroundColor: '#0b0f19',
        color: '#f8fafc',
        fontFamily: 'var(--font-family, sans-serif)',
    }
};
