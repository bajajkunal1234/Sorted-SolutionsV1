const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixAudience() {
    // All existing articles that don't have audience set yet → default to 'all'
    const { data, error } = await supabase
        .from('support_articles')
        .update({ audience: 'all' })
        .is('audience', null)
        .select('title')

    if (error) {
        console.error('Error:', error.message)
        return
    }
    console.log(`Updated ${(data || []).length} articles to audience='all'`)
    if (data) data.forEach(a => console.log(' -', a.title))
}

fixAudience().catch(console.error)
