# Luxe Salon - Professional Stripe Integration

## 1. Project Purpose
This project is a high-fidelity **Stripe Payment Integration** designed for a **Salon Booking System**. 

The primary goal was to create a flexible payment page that handles multiple scenarios—ranging from immediate booking fees to "pay later" reservations—while ensuring seamless support for modern wallets like **Google Pay** and **Apple Pay**.

It was built with **security**, **user experience**, **Stripe Connect support**, and **future-proofing** (saving cards for later charges) as the core priorities.

---

## 2. Key Features & Payment Modes

We implemented three distinct payment workflows to cover all business cases:

### 🔹 Option 1: "Pay Full Amount" (£5.00)
*   **User Experience:** Customer pays £5.00 immediately to confirm the booking.
*   **Technical:** Uses `Stripe PaymentIntent`.
*   **Advanced Feature:** Includes a **"Save this card" checkbox**.
    *   If checked, we attach the card to a new `Customer` profile and flag it for `off_session` usage.
    *   **Benefit:** Allows you to charge the remaining balance later without asking for card details again.

### 🔹 Option 2: "Reserve Spot" (£0 Upfront)
*   **User Experience:** Customer books a slot without paying anything today.
*   **Technical:** Uses `Stripe SetupIntent` + `Customer`.
*   **Benefit:** This performs a "Zero-Dollar Authorization" to verify the card is real and has funds. Crucially, **we save this card** to a Customer profile, protecting the salon against no-shows (you can charge a cancellation fee later if needed).

### 🔹 Option 3: "Save Card on File"
*   **User Experience:** Explicitly authorizes the salon to keep a card on file.
*   **Technical:** Pure `SetupIntent` flow.
*   **Benefit:** Ideal for recurring memberships or VIP clients who pay after service.

---

## 3. Stripe Connect Integration

This project is configured to work with **Stripe Connected Accounts**, allowing you to process payments on behalf of other businesses.

### How It Works:
*   All Stripe API calls include the `stripeAccount` parameter pointing to your connected account ID
*   Customers, PaymentIntents, and SetupIntents are created **on the connected account**, not your platform account
*   The connected account ID is stored in `.env` for easy configuration

### Direct Charges vs Destination Charges

This integration uses **Direct Charges**, which is the recommended approach for most platforms:

#### 🔹 Direct Charges (What We Use)
*   **How it works:** Payments are created directly on the connected account
*   **Money flow:** Funds go straight to the connected account's Stripe balance
*   **Customer relationship:** The connected account owns the customer and payment data
*   **Refunds:** Connected account handles refunds from their balance
*   **Best for:** Marketplaces, platforms where each business manages their own customers

**Implementation:**
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
    stripeAccount: process.env.STRIPE_CONNECTED_ACCOUNT_ID
});
```

#### 🔸 Destination Charges (Alternative)
*   **How it works:** Payments are created on the platform account, then transferred to connected account
*   **Money flow:** Funds go to platform first, then automatically transferred
*   **Customer relationship:** Platform owns the customer data
*   **Refunds:** Platform must handle refunds
*   **Best for:** When platform needs to control customer data or handle disputes centrally

**Why We Chose Direct Charges:**
1. **Simpler architecture** - No need to manage transfers
2. **Better for connected accounts** - They have full control over their customers
3. **Lower complexity** - Refunds and disputes are handled by the account owner
4. **Stripe Dashboard clarity** - All data appears in the connected account's dashboard

### Benefits:
*   Separate financial reporting per salon/business
*   Automatic fund routing to the connected account
*   Platform can take fees via application fees (if configured)

---

## 4. Technical Architecture

### 🛠 Tech Stack
*   **Backend:** Node.js + Express
*   **Frontend:** EJS (Embedded JavaScript Templates) + Vanilla CSS
*   **Payments:** Stripe Elements (Unified Payment Element)
*   **CORS:** Enabled for external frontend integration (Next.js, React, etc.)

### 💡 Key Technical Decisions

#### 1. Why EJS (Server-Side Rendering)?
Instead of a separate frontend (React) and backend, we used **EJS**.
*   **Security:** This allows us to inject correct API keys securely on the server side before the page even loads.
*   **Reliability:** It ensures the page cannot load unless the backend is running, preventing "phantom" UI errors where a page loads but payments fail.

#### 2. Why "Reverse Proxy" for Deployment?
We configured a custom `.htaccess` file for cPanel deployment.
*   **Problem:** cPanel's default Node.js selector can be restrictive and hide error logs.
*   **Solution:** We run the Node process on a dedicated port (`4242`) and use Apache to proxy traffic directly to it. This mimics the local development environment exactly, ensuring 100% stability and easing debugging.

#### 3. Google Pay / Apple Pay Strategy
We moved from a specific "Express Button" to the **Unified Payment Element**.
*   **Why:** This reduces timeouts and redirect issues. The unified element handles the complex logic of "Is this Google Pay configured correctly?" internally, ensuring high conversion rates.

#### 4. CORS Configuration

The backend is configured with CORS middleware to allow integration with external frontends (Next.js, React, Vue, etc.).

**Current Configuration (Development):**
```javascript
app.use(cors({
    origin: '*', // Allow all origins
    credentials: true
}));
```

**For Production - Restrict to Specific Domains:**

To secure your API in production, update `server.js` to only allow your frontend domain(s):

```javascript
// Single domain
app.use(cors({
    origin: 'https://yourdomain.com',
    credentials: true
}));

// Multiple domains
app.use(cors({
    origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
    credentials: true
}));

// Dynamic based on environment
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? 'https://yourdomain.com' 
        : '*',
    credentials: true
}));
```

**Security Note:** 
- ⚠️ `origin: '*'` allows any website to call your API - only use for development
- ✅ Always restrict origins in production to prevent unauthorized access
- 🔒 The `credentials: true` setting allows cookies/auth headers to be sent

---

## 5. API Endpoints

The backend exposes the following endpoints for frontend integration:

### `GET /config`
Returns the Stripe configuration needed by the frontend.

**Response:**
```json
{
  "publishableKey": "pk_test_...",
  "connectedAccountId": "acct_..."
}
```

### `POST /create-payment-intent`
Creates a PaymentIntent for immediate payment.

**Request Body:**
```json
{
  "amount": 500,
  "currency": "gbp",
  "saveCard": true
}
```

**Response:**
```json
{
  "clientSecret": "pi_...",
  "customerId": "cus_...",
  "connectedAccountId": "acct_..."
}
```

### `POST /create-setup-intent`
Creates a SetupIntent for zero-upfront reservation.

**Request Body:** `{}`

**Response:**
```json
{
  "clientSecret": "seti_...",
  "customerId": "cus_...",
  "connectedAccountId": "acct_..."
}
```

### `POST /create-customer-setup-intent`
Creates a SetupIntent for explicitly saving a card.

**Request Body:** `{}`

**Response:**
```json
{
  "clientSecret": "seti_...",
  "customerId": "cus_...",
  "connectedAccountId": "acct_..."
}
```

---

## 6. Project Structure

```
stripeTest/
├── server.js            # The Brain. Handles Stripe API talk.
├── views/
│   └── index.ejs        # The UI. HTML with dynamic logic.
├── public/
│   ├── client.js        # The Logic. Talks to Stripe JS.
│   └── style.css        # The Look. Premium dark/gold theme.
├── .env                 # Secrets (API Keys & Connected Account ID).
├── .htaccess            # The Gateway. Routes web traffic to Node.
├── README.md            # This file
└── NEXTJS_GUIDE.md      # Integration guide for Next.js frontends
```

## 7. Environment Variables

Create a `.env` file in the root directory with the following:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CONNECTED_ACCOUNT_ID=acct_...
PORT=4242
```

**Important:** Never commit the `.env` file to version control. It's already in `.gitignore`.

---

## 8. How to Run

### Locally (Standalone)
1.  `npm install`
2.  Create `.env` file with your Stripe keys
3.  `node server.js`
4.  Visit `http://localhost:4242`

### With External Frontend (Next.js, React, etc.)
1.  Start the backend: `node server.js` (runs on port 4242)
2.  Update CORS origin in `server.js` if needed
3.  Start your frontend on a different port (e.g., 3005)
4.  Frontend should call `http://localhost:4242/config` to get keys
5.  See `NEXTJS_GUIDE.md` for detailed integration instructions

### On Server (cPanel)
1.  Upload files to the domain folder.
2.  Create `.env` file with production Stripe keys
3.  Run `nohup node server.js &` (to keep it running in background).
4.  The `.htaccess` file handles the rest!

---

## 9. Apple Pay Domain Verification

To enable Apple Pay on your live domain:

1.  Log into your Stripe Dashboard
2.  Go to Settings → Payment Methods → Apple Pay
3.  Add your domain (e.g., `yoursalon.com`)
4.  Download the verification file
5.  Upload it to `/.well-known/apple-developer-merchantid-domain-association` on your server
6.  Stripe will verify the domain automatically

**Note:** Apple Pay requires HTTPS and won't work on `localhost` (use Google Pay for local testing).

---

## 10. Testing

### Test Cards
Use Stripe's test cards for development:
*   **Success:** `4242 4242 4242 4242`
*   **Requires 3D Secure:** `4000 0025 0000 3155`
*   **Declined:** `4000 0000 0000 0002`

### Google Pay Testing
*   Works on `localhost` in test mode
*   Use Chrome browser
*   Must have a card saved in Google Pay

### Apple Pay Testing
*   Requires HTTPS domain
*   Use Safari browser on Mac/iOS
*   Must have a card in Apple Wallet

---

## 11. Deployment Checklist

- [ ] Update `.env` with production Stripe keys
- [ ] Set `STRIPE_CONNECTED_ACCOUNT_ID` to your production connected account
- [ ] Update CORS origins in `server.js` to match your production frontend domain
- [ ] Verify Apple Pay domain in Stripe Dashboard
- [ ] Test all three payment flows on production
- [ ] Monitor Stripe Dashboard for successful transactions

---

## 12. Support & Documentation

*   **Stripe Docs:** https://stripe.com/docs
*   **Stripe Connect:** https://stripe.com/docs/connect
*   **Payment Element:** https://stripe.com/docs/payments/payment-element
*   **Next.js Integration:** See `NEXTJS_GUIDE.md` in this repository

---

## 13. License

This project is open source and available for community use and learning.

