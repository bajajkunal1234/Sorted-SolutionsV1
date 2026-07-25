const url = 'https://oqwvbwaqcdbggcqvzswv.supabase.co/rest/v1/rpc/exec_sql';
const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xd3Zid2FxY2RiZ2djcXZ6c3d2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDkyMDY2NiwiZXhwIjoyMDg2NDk2NjY2fQ.TdS9UKZH4L0PQvlZxa4fCbYiILikhTbKEi0MRpu-9s4'
    },
    body: JSON.stringify({ sql_query: `
        -- Create technician_stock table to track current quantities
        CREATE TABLE IF NOT EXISTS public.technician_stock (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            CONSTRAINT unique_tech_product UNIQUE (technician_id, product_id)
        );

        ALTER TABLE public.technician_stock DISABLE ROW LEVEL SECURITY;

        -- Create technician_stock_transactions table to audit handovers/sales/returns
        CREATE TABLE IF NOT EXISTS public.technician_stock_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
            product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL, -- positive for refill, negative for sale
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('handover', 'sale', 'return', 'adjustment')),
            reference_id UUID,
            notes TEXT,
            created_by TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
        );

        ALTER TABLE public.technician_stock_transactions DISABLE ROW LEVEL SECURITY;
    ` })
};

console.log("Running SQL migration on Supabase...");
fetch(url, options)
    .then(async res => {
        const text = await res.text();
        console.log("Response Status:", res.status);
        console.log("Response Text:", text);
    })
    .catch(err => console.error("Fetch Error:", err));
