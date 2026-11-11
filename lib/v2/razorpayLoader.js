/**
 * Shared client-side Razorpay script loader for /v2 Checkout and Customer Portal.
 */
export function loadRazorpayCheckoutScript() {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') return resolve(false);
        if (window.Razorpay) return resolve(true);

        const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(Boolean(window.Razorpay)), { once: true });
            existing.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(Boolean(window.Razorpay));
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}
