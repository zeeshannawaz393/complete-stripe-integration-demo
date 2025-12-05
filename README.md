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

## 5. How to Run

### Locally
1.  `npm install`
2.  `node server.js`
3.  Visit `http://localhost:4242`

### On Server (cPanel)
1.  Upload files to the domain folder.
2.  Run `nohup node server.js &` (to keep it running in background).
3.  The `.htaccess` file handles the rest!
