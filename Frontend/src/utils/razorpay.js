/**
 * Razorpay Payment Utility
 * 
 * Handles Razorpay Checkout integration
 */

/**
 * Initialize Razorpay Checkout
 * @param {string} keyId - Razorpay Key ID
 * @returns {Object} Razorpay instance
 */
export function loadRazorpay(keyId) {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay SDK failed to load'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Razorpay SDK'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Open Razorpay Checkout
 * @param {Object} options - Razorpay options
 * @param {string} options.key - Razorpay Key ID
 * @param {number} options.amount - Amount in rupees
 * @param {string} options.currency - Currency (default: INR)
 * @param {string} options.order_id - Razorpay Order ID
 * @param {string} options.name - Company/App name
 * @param {string} options.description - Payment description
 * @param {string} options.prefill.name - Customer name
 * @param {string} options.prefill.email - Customer email
 * @param {string} options.prefill.contact - Customer phone
 * @param {Object} options.handler - Success handler
 * @param {Object} options.modal - Modal options
 * @returns {Promise<Object>} Payment response
 */
export async function openRazorpayCheckout(options) {
  try {
    // CHECK FOR TEST MODE BYPASS
    if (options.order_id && options.order_id.startsWith('order_test_')) {
      console.log('🧪 [Razorpay Bypass] Test order detected. Simulating successful payment...');

      return new Promise((resolve) => {
        setTimeout(() => {
          console.log('✅ [Razorpay Bypass] Payment simulated.');
          resolve({
            success: true,
            paymentId: `pay_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            orderId: options.order_id,
            signature: `sig_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          });
        }, 1500); // 1.5s delay to feel "real"
      });
    }

    const Razorpay = await loadRazorpay(options.key);

    // Validate required fields
    if (!options.order_id) {
      throw new Error('Razorpay order ID is required');
    }
    if (!options.amount || options.amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    return new Promise((resolve, reject) => {
      const razorpayOptions = {
        key: options.key,
        amount: Math.round(options.amount * 100), // Convert to paise (Razorpay expects amount in smallest currency unit)
        currency: options.currency || 'INR',
        order_id: options.order_id,
        name: options.name || 'Satpura Bio',
        description: options.description || 'Order Payment',
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
        },
        theme: {
          color: '#1b8f5b', // Match app theme
        },
        handler: function (response) {
          // Payment successful
          resolve({
            success: true,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            signature: response.razorpay_signature,
          });
        },
        modal: {
          ondismiss: function () {
            // User closed the modal
            reject({
              success: false,
              error: 'Payment cancelled by user',
            });
          },
        },
      };

      console.log('💳 Razorpay Checkout Options:', {
        key: razorpayOptions.key ? 'Present' : 'Missing',
        amount: razorpayOptions.amount,
        currency: razorpayOptions.currency,
        order_id: razorpayOptions.order_id,
        name: razorpayOptions.name,
        description: razorpayOptions.description,
        prefill: razorpayOptions.prefill,
      });

      const razorpayInstance = new Razorpay(razorpayOptions);

      razorpayInstance.on('payment.failed', function (response) {
        console.error('💳 Razorpay Payment Failed:', response);
        reject({
          success: false,
          error: response.error?.description || 'Payment failed',
          errorCode: response.error?.code,
          errorDetails: response.error,
        });
      });

      razorpayInstance.open();
    });
  } catch (error) {
    console.error('💳 Razorpay Checkout Error:', error);
    throw {
      success: false,
      error: error.message || 'Failed to initialize payment',
    };
  }
}

