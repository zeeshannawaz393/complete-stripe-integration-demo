require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const app = express();
const { resolve } = require('path');

// -----------------------------------------------------------------------------
// STRIPE INITIALIZATION
// -----------------------------------------------------------------------------
// We initialize Stripe with:
// 1. STRIPE_SECRET_KEY: Our backend secret key (sk_test_...) to authenticate.
// 2. stripeAccount: The Connected Account ID (acct_...) we want to manipulate.
//    This ensures that all Customers, Payments, and Cards are created ON that account,
//    not on our Platform account.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    stripeAccount: process.env.STRIPE_CONNECTED_ACCOUNT_ID
});

// Middleware setup
app.use(express.static('public')); // Serve static files (client.js, style.css)
app.use(express.json()); // Allow server to parse JSON bodies from frontend
app.set('view engine', 'ejs'); // Use EJS for dynamic HTML rendering

// -----------------------------------------------------------------------------
// ROUTE: Render Main Page
// -----------------------------------------------------------------------------
app.get('/', (req, res) => {
    // We inject the Publishable Key and Account ID into the HTML.
    // This allows the Frontend to start Stripe Elements with the correct credentials.
    res.render('index', {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        connectedAccountId: process.env.STRIPE_CONNECTED_ACCOUNT_ID
    });
});

// -----------------------------------------------------------------------------
// ROUTE: Option 1 - PAY NOW (£5.00)
// -----------------------------------------------------------------------------
// Purpose: Charge the user immediately.
// Optional: Save the card for later use if they checked the box.
app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, saveCard } = req.body;

    try {
        // STEP A: Create a Stripe Customer
        // Why? It's best practice. It groups their payments and allows sending receipts.
        const customer = await stripe.customers.create();

        // STEP B: Prepare the PaymentIntent Options
        const options = {
            amount: amount, // e.g., 500 = £5.00
            currency: currency || 'gbp',
            customer: customer.id, // Attach the payment to this new customer
            payment_method_types: ['card'],
        };

        // STEP C: Conditional Logic for Saving Card
        // If the user checked "Save Card", we add 'setup_future_usage'.
        // This tells Stripe: "After you charge this, keep the card active for off-session payments later."
        if (saveCard) {
            options.setup_future_usage = 'off_session';
        }

        // STEP D: Create the PaymentIntent
        // This generates a 'client_secret' that the frontend needs to complete the payment.
        const paymentIntent = await stripe.paymentIntents.create(options);

        // Send the secret back to the frontend
        res.send({
            clientSecret: paymentIntent.client_secret,
            customerId: customer.id
        });
    } catch (e) {
        res.status(400).send({
            error: { message: e.message },
        });
    }
});

// -----------------------------------------------------------------------------
// ROUTE: Option 2 - RESERVE SPOT (£0 Upfront)
// -----------------------------------------------------------------------------
// Purpose: Verify the card is real and valid, but don't charge it yet.
// Key Difference: Uses 'setupIntents' instead of 'paymentIntents'.
app.post('/create-setup-intent', async (req, res) => {
    try {
        // STEP A: Create a Customer
        // Essential here because we want to attach the card to someone so we can charge it later (No-Show fee).
        const customer = await stripe.customers.create();

        // STEP B: Create a SetupIntent
        // This does a $0 or £0 authorization on the card banks.
        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card'],
        });

        res.send({
            clientSecret: setupIntent.client_secret,
            customerId: customer.id
        });
    } catch (e) {
        res.status(400).send({
            error: { message: e.message },
        });
    }
});

// -----------------------------------------------------------------------------
// ROUTE: Option 3 - SAVE CARD (Explicit)
// -----------------------------------------------------------------------------
// Purpose: Explicitly just save a card. Functionally identical to Option 2 internally
// but served as a distinct endpoint to keep logic clear/separate if requirements diverge.
app.post('/create-customer-setup-intent', async (req, res) => {
    try {
        const customer = await stripe.customers.create();

        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card'],
        });

        res.send({
            clientSecret: setupIntent.client_secret,
            customerId: customer.id
        });
    } catch (e) {
        res.status(400).send({
            error: { message: e.message },
        });
    }
});

// Start the Server
const PORT = process.env.PORT || 4242;
app.listen(PORT, () =>
    console.log(`Node server listening on port ${PORT}!`)
);
