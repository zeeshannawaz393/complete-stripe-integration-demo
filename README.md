# Luxe Salon - Professional Stripe Integration

## 1. Project Purpose
This project is a high-fidelity **Stripe Payment Integration** designed for a **Salon Booking System**. 

The primary goal was to create a flexible payment page that handles multiple scenarios—ranging from immediate booking fees to "pay later" reservations—while ensuring seamless support for modern wallets like **Google Pay** and **Apple Pay**.

It was built with **security**, **user experience**, and **future-proofing** (saving cards for later charges) as the core priorities.

---

## 2. Key Features & Payment Modes

We implemented three distinct payment workflows to cover all business cases:

### 🔹 Option 1: "Pay Checking Fee" (£1.00)
*   **User Experience:** Customer pays £1.00 immediately to confirm the booking.
*   **Technical:** Uses `Stripe PaymentIntent`.
*   **Advanced Feature:** Includes a **"Save this card" checkbox**.
    *   If checked, we attach the card to a new `Customer` profile and flag it for `off_session` usage.
    *   **Benefit:** allows you to charge the remaining balance later without asking for card details again.

### 🔹 Option 2: "Reserve Spot" (£0 Upfront)
*   **User Experience:** Customer books a slot without paying anything today.
*   **Technical:** Uses `Stripe SetupIntent` + `Customer`.
*   **Benefit:** This performs a "Zero-Dollar Authorization" to verify the card is real and has funds. Crucially, **we save this card** to a Customer profile, protecting the salon against no-shows (you can charge a cancellation fee later if needed).

### 🔹 Option 3: "Save Card on File"
*   **User Experience:** Explicitly authorizes the salon to keep a card on file.
*   **Technical:** Pure `SetupIntent` flow.
*   **Benefit:** Ideal for recurring memberships or VIP clients who pay after service.

---

## 3. Technical Architecture

### 🛠 Tech Stack
*   **Backend:** Node.js + Express
*   **Frontend:** EJS (Embedded JavaScript Templates) + Vanilla CSS
*   **Payments:** Stripe Elements (Unified Payment Element)

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
*   **Why:** This reduces timeouts and redirect issues. The unified element handles the complex logic of "Is this Google Pay configured correctly?" internally, ensuring mostly high conversion rates.

---

## 4. Project Structure

```
stripeTest/
├── server.js            # The Brain. Handles Stripe API talk.
├── views/
│   └── index.ejs        # The UI. HTML with dynamic logic.
├── public/
│   ├── client.js        # The Logic. Talks to Stripe JS.
│   └── style.css        # The Look. Premium dark/gold theme.
├── .env                 # Secrets (API Keys).
└── .htaccess            # The Gateway. Routes web traffic to Node.
```

## 5. 🚀 Quick Start Guide

### Step 1: Clone and Install
```bash
git clone https://github.com/zeeshannawaz393/complete-stripe-integration-demo.git
cd complete-stripe-integration-demo
npm install
```

### Step 2: Configure Environment Variables
You **must** create a `.env` file in the root directory to store your keys.
1.  Create a file named `.env`
2.  Add the following lines (replace with your keys from [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys)):

```env
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
# PORT=4242 (Optional, defaults to 4242)
```

### Step 3: Run the Application
```bash
node server.js
```
Visit `http://localhost:4242` in your browser.

---

## 6. 🍎 Enabling Apple Pay & Google Pay (Crucial)

For these buttons to appear, specific conditions **must** be met.

### ✅ 1. HTTPS is Mandatory
*   **Live Mode:** Your site **must** be served over `https://`.
*   **Test Mode:** `http://localhost` works. If you deploy to a server (even for testing), it must have SSL (HTTPS).

### ✅ 2. Apple Pay Domain Verification (REQUIRED)
Apple Pay **will not appear** on a hosted domain (Live or Test) until you verify ownership.

1.  Go to **Stripe Dashboard** > **Settings** > **Payment Methods** > **Apple Pay** > **[Configure]**
    *   *Direct Link:* [https://dashboard.stripe.com/settings/payments/apple_pay](https://dashboard.stripe.com/settings/payments/apple_pay)
2.  Click **"Add new domain"**.
3.  Enter your domain name (e.g., `www.luxesalon.com`).
4.  **Download** the verification file (`apple-developer-merchantid-domain-association`).
5.  Upload this specific file to your server so it is accessible at:  
    `https://your-domain.com/.well-known/apple-developer-merchantid-domain-association`
6.  Click **"Verify"** in the Stripe Dashboard.

> **Note:** You must do this for **both** Test Mode and Live Mode domains independently.

### ✅ 3. Google Pay
*   Google Pay usually works automatically if you are on HTTPS.
*   Ensure "Google Pay" is enabled in your Stripe Dashboard Payment Methods settings.

---

## 7. Deployment (cPanel / Custom Server)

### Using the Reverse Proxy Method (Recommended for cPanel)
1.  Upload all files to your server.
2.  Run `npm install`.
3.  Start the server in the background:  
    `nohup node server.js &`
4.  The included `.htaccess` file handles the traffic routing, so you don't need to configure complex Nginx/Apache proxies manually.

