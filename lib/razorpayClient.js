export const loadRazorpayScript = () => {
    return new Promise((resolve) => {
        if (window.Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
            resolve(true);
        };
        script.onerror = () => {
            resolve(false);
        };
        document.body.appendChild(script);
    });
};

/**
 * Initiates a Razorpay payment flow.
 * 
 * @param {Object} params
 * @param {number} params.amount - Amount in INR
 * @param {string} params.receiptId - Unique receipt ID (e.g. Job ID)
 * @param {string} [params.customerName] - Optional customer name
 * @param {string} [params.customerEmail] - Optional customer email
 * @param {string} [params.customerPhone] - Optional customer phone
 * @param {Function} [params.onSuccess] - Callback on successful payment
 * @param {Function} [params.onError] - Callback on failed checkout or API error
 */
export const initiateRazorpayPayment = async ({
    amount,
    receiptId,
    customerName = 'Customer',
    customerEmail = 'customer@example.com',
    customerPhone = '9999999999',
    onSuccess,
    onError
}) => {
    try {
        const resScript = await loadRazorpayScript();
        if (!resScript) {
            throw new Error('Razorpay SDK failed to load. Check your connection.');
        }

        // 1. Create Order on Server
        const orderRes = await fetch('/api/customer/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, receipt: receiptId })
        });
        
        const orderData = await orderRes.json();
        if (!orderData.success || !orderData.order) {
            throw new Error(orderData.error || 'Failed to initialize payment');
        }

        const { id: order_id } = orderData.order;
        const keyId = orderData.keyId;

        // 2. Open Razorpay Checkout
        const options = {
            key: keyId, 
            amount: Math.round(amount * 100), 
            currency: 'INR',
            name: 'Sorted Solutions',
            description: `Payment for ${receiptId}`,
            image: '/logo-dark.jpg',
            order_id: order_id,
            handler: async function (response) {
                try {
                    // 3. Verify Signature on Server
                    const verifyRes = await fetch('/api/customer/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature,
                            receipt: receiptId
                        })
                    });
                    
                    const verifyData = await verifyRes.json();
                    if (verifyData.success) {
                        if (onSuccess) onSuccess(verifyData, response.razorpay_payment_id);
                    } else {
                        throw new Error(verifyData.error || 'Verification failed');
                    }
                } catch (err) {
                    if (onError) onError(err);
                    else alert(err.message);
                }
            },
            prefill: {
                name: customerName,
                email: customerEmail,
                contact: customerPhone
            },
            theme: {
                color: '#6366f1'
            }
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.on('payment.failed', function (response) {
            if (onError) onError(new Error(response.error.description));
            else alert('Payment Failed: ' + response.error.description);
        });
        
        rzp1.open();

    } catch (err) {
        console.error('Razorpay Error:', err);
        if (onError) onError(err);
        else alert(err.message);
    }
};
