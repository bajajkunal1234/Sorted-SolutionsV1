const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testPost() {
  const jobId = 'd4834205-69fb-4426-a110-80e8ecea3807'; // A valid job ID from earlier logs
  const interactionPayload = {
      job_id: jobId,
      customer_id: null,
      type: 'before-photos-uploaded',
      category: 'job',
      description: 'Before Photos uploaded.',
      performed_by_name: 'Test Technician',
      performed_by: null,
      source: 'Technician App',
      metadata: { attachments: ['https://example.com/test.jpg'] },
      timestamp: new Date().toISOString()
  };

  const result = await supabase
      .from('interactions')
      .insert([interactionPayload])
      .select()
      .single();

  console.log("Insert result:", result);
  
  if (result.data) {
      // Clean up
      await supabase.from('interactions').delete().eq('id', result.data.id);
      console.log("Cleanup done.");
  }
}

testPost();
