# Stripe Integration Guide: Next.js + Node.js Backend

This guide explains how to build a **Next.js Frontend** that consumes your existing **Node.js Backend**.

## 1. Prerequisites (Next.js)

In your Next.js project folder, install the official Stripe libraries:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

## 2. The API Contract (Your Backend)

Your hosted backend (Node.js) already provides these 3 endpoints. Your Next.js app will make `POST` requests to these URLs.

| Option | User Action | Endpoint | Body Params |
| :--- | :--- | :--- | :--- |
| **1. Pay Now** | Pay £5.00 | `POST /create-payment-intent` | `{ amount: 500, currency: 'gbp', saveCard: boolean }` |
| **2. Reserve** | Pay £0 Confirm | `POST /create-setup-intent` | `{}` |
| **3. Save Card** | Save for Later | `POST /create-customer-setup-intent` | `{}` |

**Important:** Ensure your hosted backend URL is defined in your Next.js env variables (e.g., `NEXT_PUBLIC_API_URL=https://your-server.com`).

---

## 3. Important: Enable CORS on Backend

Before your Next.js app (running on `localhost:3000`) can talk to your Backend, you **must enable CORS** in your `server.js` file on the server.

**Run this on your Node.js Server:**
```bash
npm install cors
```

**Update `server.js`:**
```javascript
const cors = require('cors');

// Allow requests from your Localhost Next.js App
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-frontend-domain.com'],
    credentials: true
}));
```

---

## 4. Next.js Implementation

### A. The Checkout Component (`components/PaymentForm.tsx`)

This component handles the Stripe UI, radio buttons, and form submission.

```tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  useStripe,
  useElements,
  PaymentElement,
} from "@stripe/react-stripe-js";

export default function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // This helps us track if we are in "Pay Now" or "Setup" mode
  // We get this prop or context from the parent, but for simplicity, 
  // let's assume the parent handles the mode selection and passes the 'clientSecret'
  // Actually, Stripe Elements automatically knows what to do based on the 'clientSecret' 
  // (PaymentIntent vs SetupIntent).
  
  // However, we need to know WHICH confirm function to call.
  // We can infer this from the secret format:
  // pi_... = PaymentIntent
  // seti_... = SetupIntent
  const [intentType, setIntentType] = useState<'payment' | 'setup'>('payment');

  useEffect(() => {
    if (!elements) return;
    
    // Check the client secret from the elements instance to determine type
    // Note: React Stripe JS doesn't expose secret directly easily here, 
    // so it is better to pass 'mode' as a prop to this component.
  }, [elements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    // Get the client secret from the elements instance (internal access) 
    // OR allow the parent to pass the 'mode' prop. 
    // For this generic demo, we will try to detect or use a dual Confirm strategy.
    
    // SIMPLER STRATEGY:
    // We will use the prop passed down. Let's assume this component receives 'mode'.
    // BUT since we are inside the Elements provider, we can just look at the prop 'mode' 
    // passed to this component.
    
    // Let's assume we pass the intent type as a prop for clarity.
    // See the Page code below for how we pass this.
  };

  // ... (See Full Code in Page Section below for combined logic)
  return <div>Form is inside Page for simplicity</div>;
}
```

### B. The Full Page (`app/payment/page.tsx`)

This is a complete, copy-pasteable example using Next.js App Router.

```tsx
"use client";

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

// REPLACE WITH YOUR PUBLISHABLE KEY
const stripePromise = loadStripe("pk_test_..."); 
const API_BASE_URL = "http://localhost:4242"; // Change to your hosted backend URL

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [mode, setMode] = useState<"pay_now" | "reserve" | "save_card">("pay_now");
  const [saveCard, setSaveCard] = useState(false);
  const [amount, setAmount] = useState(500); // £5.00

  // 1. Fetch Client Secret when Mode Changes
  const fetchSecret = async (selectedMode: string, isSaveCardChecked: boolean) => {
    let endpoint = "/create-payment-intent";
    let body: any = { amount: 500, currency: "gbp", saveCard: isSaveCardChecked };

    if (selectedMode === "reserve") {
      endpoint = "/create-setup-intent";
      body = {};
    } else if (selectedMode === "save_card") {
      endpoint = "/create-customer-setup-intent";
      body = {};
    }

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error("Error fetching secret:", error);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchSecret("pay_now", false);
  }, []);

  // Handle Radio Change
  const handleModeChange = (newMode: "pay_now" | "reserve" | "save_card") => {
    setMode(newMode);
    setClientSecret(""); // Clear old secret while loading
    fetchSecret(newMode, saveCard);
  };

  // Handle Checkbox Change
  const handleSaveCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSaveCard(checked);
    if (mode === "pay_now") {
      setClientSecret(""); 
      fetchSecret("pay_now", checked);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700">
        <h1 className="text-2xl font-serif text-yellow-500 mb-6 text-center">Luxe Salon</h1>
        
        {/* Mode Selector */}
        <div className="space-y-3 mb-6">
          <label className={`flex items-center p-3 rounded border ${mode === 'pay_now' ? 'border-yellow-500 bg-gray-700' : 'border-gray-600'}`}>
            <input type="radio" name="mode" className="mr-3" checked={mode === 'pay_now'} onChange={() => handleModeChange('pay_now')} />
            <div>
              <div className="font-bold">Pay Full Amount</div>
              <div className="text-sm text-gray-400">£5.00 Now</div>
            </div>
          </label>
          
          {mode === 'pay_now' && (
             <div className="ml-8 mt-2">
               <label className="flex items-center text-sm text-gray-400">
                 <input type="checkbox" className="mr-2" checked={saveCard} onChange={handleSaveCardChange} />
                 Save card for future
               </label>
             </div>
          )}

          <label className={`flex items-center p-3 rounded border ${mode === 'reserve' ? 'border-yellow-500 bg-gray-700' : 'border-gray-600'}`}>
            <input type="radio" name="mode" className="mr-3" checked={mode === 'reserve'} onChange={() => handleModeChange('reserve')} />
             <div>
              <div className="font-bold">Reserve Slot</div>
              <div className="text-sm text-gray-400">£0 Upfront</div>
            </div>
          </label>

          <label className={`flex items-center p-3 rounded border ${mode === 'save_card' ? 'border-yellow-500 bg-gray-700' : 'border-gray-600'}`}>
            <input type="radio" name="mode" className="mr-3" checked={mode === 'save_card'} onChange={() => handleModeChange('save_card')} />
             <div>
              <div className="font-bold">Save Card</div>
              <div className="text-sm text-gray-400">For future charges</div>
            </div>
          </label>
        </div>

        {/* Stripe Elements */}
        {clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret, theme: 'night', appearance: { theme: 'night', variables: { colorPrimary: '#d4af37' } } }}>
            <CheckoutForm mode={mode} />
          </Elements>
        ) : (
          <div className="text-center py-10">Loading payment details...</div>
        )}
      </div>
    </div>
  );
}

// Sub-component for the actual Form
function CheckoutForm({ mode }: { mode: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsLoading(true);

    const returnUrl = window.location.href; // Redirect back to same page

    let error;
    
    if (mode === 'pay_now') {
      // Confirm Payment
      const res = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      error = res.error;
    } else {
      // Confirm Setup (Reserve / Save Card)
      const res = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: returnUrl },
      });
      error = res.error;
    }

    if (error) {
      setMessage(error.message || "An unexpected error occurred.");
    } else {
      setMessage("Success!");
    }
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button 
        disabled={isLoading || !stripe || !elements} 
        className="w-full mt-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
      >
        {isLoading ? "Processing..." : mode === 'pay_now' ? "Pay £5.00" : "Confirm Setup"}
      </button>
      {message && <div className="mt-4 text-center text-red-400">{message}</div>}
    </form>
  );
}
```

