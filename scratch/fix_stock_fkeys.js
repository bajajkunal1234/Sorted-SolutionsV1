const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
    },
    body: JSON.stringify({ sql_query: `
        -- Drop existing foreign keys pointing to products table
        ALTER TABLE public.technician_stock DROP CONSTRAINT IF EXISTS technician_stock_product_id_fkey;
        ALTER TABLE public.technician_stock_transactions DROP CONSTRAINT IF EXISTS technician_stock_transactions_product_id_fkey;

        -- Add new foreign keys pointing to inventory table
        ALTER TABLE public.technician_stock 
            ADD CONSTRAINT technician_stock_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES public.inventory(id) ON DELETE CASCADE;

        ALTER TABLE public.technician_stock_transactions 
            ADD CONSTRAINT technician_stock_transactions_product_id_fkey 
            FOREIGN KEY (product_id) REFERENCES public.inventory(id) ON DELETE CASCADE;
    ` })
};

console.log("Running SQL migration to update foreign key references to inventory table...");
fetch(url, options)
    .then(async res => {
        const text = await res.text();
        console.log("Response Status:", res.status);
        console.log("Response Text:", text);
    })
    .catch(err => console.error("Fetch Error:", err));
