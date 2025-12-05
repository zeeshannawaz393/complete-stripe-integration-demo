// Stores instances to managing state
let stripe;
let elements;
let currentMode = 'pay_now'; // can be 'pay_now', 'setup_future', or 'save_card'

// -----------------------------------------------------------------------------
// 1. INITIALIZE STRIPE
// -----------------------------------------------------------------------------
async function initialize() {
    // We start the Stripe SDK. 
    // Important: We pass 'stripeAccount' which is the Connected Account ID injected from EJS.
    // This tells Stripe: "We are acting on behalf of this Connected Account."
    stripe = Stripe(STRIPE_PUBLISHABLE_KEY, {
        stripeAccount: STRIPE_CONNECTED_ACCOUNT_ID
    });

    // If the user was redirected back here after a payment (e.g., 3D Secure), show success.
    checkUrlForSuccess();

    // Check which payment mode is selected by default and load it.
    updatePaymentMode();
}

// -----------------------------------------------------------------------------
// CHECK FOR SUCCESS REDIRECT
// -----------------------------------------------------------------------------
// When a payment finishes, Stripe redirects back to 'return_url' with params.
// We look for 'redirect_status=succeeded'.
function checkUrlForSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectStatus = urlParams.get('redirect_status');

    if (redirectStatus === 'succeeded') {
        document.getElementById('payment-main-container').classList.add('hidden');
        document.getElementById('success-screen').classList.remove('hidden');
    }
}

// -----------------------------------------------------------------------------
// 2. HANDLE MODE SWITCHING & LOADING ELEMENTS
// -----------------------------------------------------------------------------
// This function runs every time the user clicks a Radio Button (Pay Now, Reserve, etc.)
// OR toggles the "Save Card" checkbox.
async function updatePaymentMode() {
    // A. Detect which Radio Button is selected
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
    // Check if the "Save Card" checkbox is ticked (Only applies to 'pay_now' mode)
    const isChecked = document.getElementById('save-card-checkbox').checked;

    // B. Logic for each Mode
    if (currentMode === 'pay_now') {
        // --- Mode 1: Pay Full Amount (£5.00) ---
        saveCardBox.classList.remove('hidden'); // Show the "Save Card" checkbox
        btnText.textContent = "Pay £5.00 Now";

        // Call Backend: Create PaymentIntent
        // We pass 'saveCard: isChecked' so the backend knows whether to save it for future.
        await loadPaymentElement('/create-payment-intent', { amount: 500, currency: 'gbp', saveCard: isChecked });

    } else if (currentMode === 'save_card') {
        // --- Mode 3: Save Card Only (£0) ---
        saveCardBox.classList.add('hidden'); // Hide checkbox (it's implicit here)
        btnText.textContent = "Save Card on File";

        // Call Backend: Create SetupIntent (Customer + Setup)
        await loadPaymentElement('/create-customer-setup-intent', {});

    } else {
        // --- Mode 2: Reserve Slot (Zero Auth) ---
        saveCardBox.classList.add('hidden');
        btnText.textContent = "Reserve Spot (Pay £0.00)";

        // Call Backend: Create SetupIntent
        await loadPaymentElement('/create-setup-intent', {});
    }
}

// -----------------------------------------------------------------------------
// 3. FETCH SECRET & MOUNT STRIPE ELEMENT
// -----------------------------------------------------------------------------
// This fetches the 'clientSecret' from our backend and mounts the UI.
async function loadPaymentElement(endpoint, body) {
    try {
        // A. Fetch the Client Secret from our Backend
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

        // B. Define Style/Theme (Premium Dark Mode)
        const appearance = {
            theme: 'night',
            labels: 'floating',
            variables: {
                colorPrimary: '#d4af37',
                colorBackground: '#222',
                colorText: '#ffffff',
            },
        };

        // C. Create the Stripe Elements Instance
        // We pass the 'clientSecret' so Elements knows which Intent it's handling.
        elements = stripe.elements({ appearance, clientSecret });

        // D. Create the Payment Element
        // This includes Credit Card inputs + Apple Pay + Google Pay automatically.
        const paymentElementOptions = {
            layout: 'tabs',
            wallets: {
                applePay: 'auto',
                googlePay: 'auto',
            }
        };

        const paymentElement = elements.create('payment', paymentElementOptions);

        // E. Mount it to the DIV in our HTML
        const container = document.getElementById('payment-element');
        container.innerHTML = ''; // Clear any existing form to prevent duplicates
        paymentElement.mount('#payment-element');

    } catch (e) {
        showMessage("Network Error: " + e.message);
    }
}

// -----------------------------------------------------------------------------
// 4. HANDLE FORM SUBMISSION
// -----------------------------------------------------------------------------
document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true); // Show spinner

    let result;

    if (currentMode === 'pay_now') {
        // CASE A: Processing a Payment (Charging Money)
        result = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // If payment succeeds, redirect here.
                return_url: window.location.origin + window.location.pathname,
            },
        });
    } else {
        // CASE B: Saving a Card (SetupIntent)
        // Used for "Reserve Slot" and "Save Card" modes.
        result = await stripe.confirmSetup({
            elements,
            confirmParams: {
                return_url: window.location.origin + window.location.pathname,
            },
        });
    }

    // Handle Errors (e.g. Card Declined)
    if (result.error) {
        showMessage(result.error.message);
    } else {
        // Note: Faster payment methods might redirect immediately, 
        // so this line might not be reached.
        showMessage("Success! Redirecting...");
    }

    setLoading(false);
});

// -----------------------------------------------------------------------------
// UI HELPER FUNCTIONS
// -----------------------------------------------------------------------------

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

// Start the App
initialize();
window.updatePaymentMode = updatePaymentMode; // Export function so HTML <input> can call it
