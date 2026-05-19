async function run() {
    const payload = {
        id: '242dc116-b1db-4122-ac01-9a8f7c351fd9',
        name: 'Juhu Customer Test Edit',
        type: 'customer',
        under: 'customers',
        mobile: '+91-99998 83145',
        purchase_date: '', // Test empty string coercion
        as_on_date: '',     // Test empty string coercion
        mailing_address: 'cx contacted from google for commercial oven and a regular OTG repair',
        properties: [
            {
                id: 1778235127706,
                lat: 19.111266,
                lng: 72.82950749999999,
                name: 'Vraj Building',
                address: 'N S Rd Number 10, near Union Bank, Vithal Nagar',
                pincode: '400049',
                locality: 'Juhu',
                flat_number: '0',
                contactPhone: '',
                building_name: 'Vraj Building',
                contactPerson: ''
            }
        ]
    };

    console.log('Sending PUT request with empty dates to http://localhost:3000/api/admin/accounts...');
    try {
        const response = await fetch('http://localhost:3000/api/admin/accounts', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        console.log('HTTP Status:', response.status);
        const text = await response.text();
        console.log('Response Body:', text);
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
run();
