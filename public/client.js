// Stores instances to managing state
let stripe;
let elements;
let currentMode = 'pay_now'; // or 'setup_future'

// 1. Initialize Stripe
async function initialize() {
    // Key is injected directly into HTML by EJS
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

    // Check if we were redirected back from a payment
    checkUrlForSuccess();

    // Load the initial state based on the default checked radio button
    updatePaymentMode();
}

function checkUrlForSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectStatus = urlParams.get('redirect_status');

    if (redirectStatus === 'succeeded') {
        document.getElementById('payment-main-container').classList.add('hidden');
        document.getElementById('success-screen').classList.remove('hidden');
    }
}

// 2. Handle Mode Switching
async function updatePaymentMode() {
    const radios = document.getElementsByName('paymentMode');
    for (const radio of radios) {
        if (radio.checked) {
            currentMode = radio.value;
            break;
        }
    }

    const submitBtn = document.getElementById('submit');
    const btnText = document.getElementById('button-text');
    const saveCardBox = document.getElementById('save-card-option');
    const isChecked = document.getElementById('save-card-checkbox').checked;

    if (currentMode === 'pay_now') {
        saveCardBox.classList.remove('hidden'); // Show checkbox
        btnText.textContent = "Pay £1.00 Now";
        // Pass the checkbox state
        await loadPaymentElement('/create-payment-intent', { amount: 100, currency: 'gbp', saveCard: isChecked });

    } else if (currentMode === 'save_card') {
        saveCardBox.classList.add('hidden'); // Hide checkbox (redundant)
        btnText.textContent = "Save Card on File";
        await loadPaymentElement('/create-customer-setup-intent', {});

    } else {
        saveCardBox.classList.add('hidden'); // Hide checkbox
        btnText.textContent = "Reserve Spot (Pay £0.00)";
        await loadPaymentElement('/create-setup-intent', {});
    }
}

// 3. Load Payment Element
async function loadPaymentElement(endpoint, body) {
    // Show loading state if needed

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const { clientSecret, error } = await response.json();

        if (error) {
            showMessage(error.message);
            return;
        }

        // Define appearance
        const appearance = {
            theme: 'night',
            labels: 'floating',
            variables: {
                colorPrimary: '#d4af37',
                colorBackground: '#222',
                colorText: '#ffffff',
            },
        };

        // Create Elements instance (Only once)
        elements = stripe.elements({ appearance, clientSecret });

        /*** 1. Mount Standard Payment Element (Cards + Wallets) ***/
        const paymentElementOptions = {
            layout: 'tabs',
            wallets: {
                applePay: 'auto',
                googlePay: 'auto',
            }
        };

        const paymentElement = elements.create('payment', paymentElementOptions);

        // Safety: Clear previous element if any
        const container = document.getElementById('payment-element');
        container.innerHTML = '';

        // Mount
        paymentElement.mount('#payment-element');

    } catch (e) {
        showMessage("Network Error: " + e.message);
    }
}

// 4. Handle Submit
document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);

    let result;

    if (currentMode === 'pay_now') {
        // Confirm Payment
        result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL where the user is redirected after the payment.
                // explicitly use origin to ensure full path
                return_url: window.location.origin + window.location.pathname,
            },
        });
    } else {
        // Confirm Setup
        result = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: window.location.origin + window.location.pathname,
            },
        });
    }


    if (result.error) {
        // Show error to your customer (e.g., insufficient funds)
        showMessage(result.error.message);
    } else {
        // The payment UI will automatically close on success and redirect,
        // so this code might not be reached if redirect happens.
        showMessage("Success! Redirecting...");
    }

    setLoading(false);
});

// UI Helpers
function showMessage(messageText) {
    const messageContainer = document.querySelector('#payment-message');
    messageContainer.classList.remove('hidden');
    messageContainer.textContent = messageText;

    setTimeout(function () {
        messageContainer.classList.add('hidden');
        messageContainer.textContent = '';
    }, 4000);
}

function setLoading(isLoading) {
    if (isLoading) {
        document.querySelector('#submit').disabled = true;
        document.querySelector('#spinner').classList.remove('hidden');
        document.querySelector('#button-text').classList.add('hidden');
    } else {
        document.querySelector('#submit').disabled = false;
        document.querySelector('#spinner').classList.add('hidden');
        document.querySelector('#button-text').classList.remove('hidden');
    }
}

// Start
initialize();
window.updatePaymentMode = updatePaymentMode; // expose to window for radio onclick
