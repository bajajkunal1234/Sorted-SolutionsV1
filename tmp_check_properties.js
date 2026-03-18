import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Looking for Gajanan Desai account...")
    const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .ilike('name', '%Gajanan%Desai%')

    if (error) {
        console.error('Error fetching accounts:', error)
        return
    }

    console.log('Accounts found:', accounts.length)
    if (accounts.length === 0) return

    const account = accounts[0]
    console.log('Account Details:')
    console.table([{ id: account.id, name: account.name, sku: account.sku, type: account.type }])

    console.log("\nLooking for properties linked to account.id in customer_properties...")
    const { data: props1, error: e1 } = await supabase
        .from('customer_properties')
        .select('*, properties(*)')
        .eq('account_id', account.id)

    console.log(`Found ${props1?.length || 0} properties linked via account_id`)
    if (props1?.length) {
        console.log(JSON.stringify(props1, null, 2))
    }

    console.log("\nLooking for properties linked to account.id in customer_id field of customer_properties...")
    const { data: props2, error: e2 } = await supabase
        .from('customer_properties')
        .select('*, properties(*)')
        .eq('customer_id', account.id)

    console.log(`Found ${props2?.length || 0} properties linked via customer_id`)
    if (props2?.length) {
        console.log(JSON.stringify(props2, null, 2))
    }

    console.log("\nChecking 'customers' table for this account...")
    const { data: cData } = await supabase
        .from('customers')
        .select('*')
        .eq('ledger_id', account.id)
    
    if (cData && cData.length > 0) {
        console.log("Customer record found! ID:", cData[0].id)
        
        console.log("\nChecking properties linked to this customer record ID...")
        const { data: props3 } = await supabase
            .from('customer_properties')
            .select('*, properties(*)')
            .eq('customer_id', cData[0].id)
            
        console.log(`Found ${props3?.length || 0} properties linked via customer table ID`)
        if (props3?.length) {
            console.log(JSON.stringify(props3, null, 2))
        }
    } else {
        console.log("No record in customers table.")
    }

    console.log("\nSearching for property 'Babu Bhuvan' directly...")
    const { data: propData } = await supabase
        .from('properties')
        .select('id, address')
        .ilike('address', '%Babu%Bhuvan%')
        
    console.log('Matching properties:', propData?.length)
    if (propData?.length) {
        const pId = propData[0].id
        console.log(`Property ID: ${pId}. Checking who it is linked to in customer_properties...`)
        const { data: links } = await supabase
            .from('customer_properties')
            .select('*')
            .eq('property_id', pId)
        console.table(links)
    }
}

run()
