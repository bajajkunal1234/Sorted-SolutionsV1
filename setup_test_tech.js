
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oqwvbwaqcdbggcqvzswv.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MjA2NjYsImV4cCI6MjA4NjQ5NjY2Nn0.GG_BoDTXCWUR5MF9Pa3sP6ex9Dmw4fAbYOzBb9Eq1ZU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupTechnician() {
    // 1. Check if any technician exists
    const { data: technicians, error } = await supabase
        .from('technicians')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching technicians:', error);
        return;
    }

    if (technicians && technicians.length > 0) {
        const tech = technicians[0];
        console.log(`Found technician: ${tech.name} (ID: ${tech.id})`);

        // 2. Update credentials for this technician
        const { data: updatedTech, error: updateError } = await supabase
            .from('technicians')
            .update({
                username: 'tech1',
                password_hash: 'password123', // In real app, this should be hashed. Using plain text for now as per current simple auth implementation
                is_active: true
            })
            .eq('id', tech.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating technician credentials:', updateError);
        } else {
            console.log('Successfully set credentials for technician:');
            console.log(`Username: tech1`);
            console.log(`Password: password123`);
        }
    } else {
        // Create a new technician if none exist
        console.log('No technicians found. Creating one...');
        const { data: newTech, error: createError } = await supabase
            .from('technicians')
            .insert({
                name: 'Demo Technician',
                phone: '+919999999999',
                email: 'demo@technician.com',
                username: 'tech1',
                password_hash: 'password123',
                is_active: true,
                skills: ['General']
            })
            .select()
            .single();

        if (createError) {
            console.error('Error creating technician:', createError);
        } else {
            console.log('Created new technician: Demo Technician');
            console.log(`Username: tech1`);
            console.log(`Password: password123`);
        }
    }
}

setupTechnician();
