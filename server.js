require('dotenv').config();
const express = require('express');
const app = express();
const { resolve } = require('path');
// Initialize Stripe with the secret key from .env
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.static('public'));
app.use(express.json());
app.set('view engine', 'ejs');

// Render the Main Page
app.get('/', (req, res) => {
    res.render('index', {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
});

// 1. OPTION 1: PAY NOW (Optional: Save Card)
app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, saveCard } = req.body; // <--- Read the Checkbox

    try {
        // A. Always Create/Get Customer (Good practice)
        const customer = await stripe.customers.create();

        // B. Prepare Intent Options
        const options = {
            amount: amount,
            currency: currency || 'gbp',
            customer: customer.id,
            payment_method_types: ['card'],
            // setup_future_usage: 'off_session', <--- REMOVING DEFAULT FORCE SAVE
        };

        // ONLY save if user asked for it
        if (saveCard) {
            options.setup_future_usage = 'off_session';
        }

        const paymentIntent = await stripe.paymentIntents.create(options);

        // Send the client_secret to the frontend
        res.send({
            clientSecret: paymentIntent.client_secret,
            customerId: customer.id
        });
    } catch (e) {
        res.status(400).send({
            error: {
                message: e.message,
            },
        });
    }
});

// 2. ZERO UPFRONT PAYMENT (Reserve Spot)
// This creates a setup intent to validate and save the card for future use.
// NOW: It also creates a Customer so you can charge them later.
app.post('/create-setup-intent', async (req, res) => {
    try {
        // A. Create Customer for the Reservation
        const customer = await stripe.customers.create();

        // B. Create SetupIntent linked to Customer
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
            error: {
                message: e.message,
            },
        });
    }
});

// 3. OPTION 3: SAVE CARD FOR FUTURE (Customer + SetupIntent)
// This validates the card AND saves it to a specific Customer ID in Stripe.
app.post('/create-customer-setup-intent', async (req, res) => {
    try {
        // 1. Create a Customer
        const customer = await stripe.customers.create();

        // 2. Create a SetupIntent linked to this Customer
        const setupIntent = await stripe.setupIntents.create({
            customer: customer.id,
            payment_method_types: ['card'],
        });

        res.send({
            clientSecret: setupIntent.client_secret,
            customerId: customer.id // returning this just for your debug info if needed
        });
    } catch (e) {
        res.status(400).send({
            error: {
                message: e.message,
            },
        });
    }
});

// Use the port provided by the cPanel/hosting environment, or fallback to 4242 for local dev
const PORT = process.env.PORT || 4242;
app.listen(PORT, () =>
    console.log(`Node server listening on port ${PORT}!`)
);
