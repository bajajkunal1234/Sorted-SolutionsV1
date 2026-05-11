const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
    },
    body: JSON.stringify({ sql_query: `
        ALTER TABLE inventory ADD COLUMN IF NOT EXISTS terms_conditions JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS invoice_show_gst BOOLEAN DEFAULT false;
        ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS quotation_show_gst BOOLEAN DEFAULT false;
        ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS rental_show_gst BOOLEAN DEFAULT false;
        ALTER TABLE print_settings ADD COLUMN IF NOT EXISTS amc_show_gst BOOLEAN DEFAULT false;
    ` })
};

fetch(url, options).then(res => res.json()).then(data => console.log(JSON.stringify(data))).catch(err => console.error(err));
