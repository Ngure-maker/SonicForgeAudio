"use client";

import Link from "next/link";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";

import { apiRequest } from "@/lib/api";
import { Address, Cart } from "@/lib/types";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type CheckoutStep = 1 | 2 | 3 | 4 | 5;

function PaymentForm({ clientSecret, onDone }: { clientSecret: string; onDone: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();

  async function submit() {
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;
    const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
    if (result.error) {
      onDone(result.error.message || "Payment failed.");
      return;
    }
    onDone("Payment submitted. Order status will update after webhook confirmation.");
  }

  return (
    <div className="cart-payment-form">
      <CardElement />
      <button onClick={submit}>Pay now</button>
    </div>
  );
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [selectedBillingId, setSelectedBillingId] = useState<number | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<"standard" | "express">("standard");
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [clientSecret, setClientSecret] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>(1);

  async function loadCart() {
    try {
      setLoading(true);
      const data = await apiRequest<Cart>("/cart/");
      setCart(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }

  async function loadAddresses() {
    try {
      const data = await apiRequest<{ results?: Address[] } | Address[]>("/auth/addresses/");
      const list = Array.isArray(data) ? data : data.results || [];
      setAddresses(list);

      const shipping = list.find((addr) => addr.address_type === "shipping" && addr.is_default) || list.find((a) => a.address_type === "shipping") || null;
      const billing = list.find((addr) => addr.address_type === "billing" && addr.is_default) || list.find((a) => a.address_type === "billing") || null;
      setSelectedShippingId(shipping?.id || null);
      setSelectedBillingId(billing?.id || shipping?.id || null);
    } catch {
      setAddresses([]);
    }
  }

  useEffect(() => {
    loadCart();
    loadAddresses();
  }, []);

  async function removeItem(id: number) {
    await apiRequest(`/cart/items/${id}/`, { method: "DELETE" });
    await loadCart();
  }

  async function updateQuantity(id: number, quantity: number) {
    if (quantity < 1) return;
    await apiRequest(`/cart/items/${id}/update/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    await loadCart();
  }

  function applyPromo() {
    if (promoCode.trim().toUpperCase() === "SAVE5") {
      setPromoDiscount(0.05);
      setMessage("Promo code applied: 5% off subtotal.");
      setError("");
    } else {
      setPromoDiscount(0);
      setError("Invalid promo code.");
    }
  }

  async function createPaymentIntent() {
    if (!selectedShippingId) {
      setError("Select a shipping address first.");
      return;
    }

    try {
      const res = await apiRequest<{ order: { id: number }; payment_intent: { client_secret: string } }>("/payments/intent/", {
        method: "POST",
        body: JSON.stringify({
          provider: "stripe",
          currency: "usd",
          shipping_address_id: selectedShippingId,
          billing_address_id: selectedBillingId || selectedShippingId,
        }),
      });
      setClientSecret(res.payment_intent.client_secret);
      setMessage(`Order #${res.order.id} created. Complete payment below.`);
      setError("");
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment");
    }
  }

  const subtotal = useMemo(() => Number(cart?.total || 0), [cart]);
  const shippingCost = useMemo(() => (deliveryOption === "express" ? 420 : 180), [deliveryOption]);
  const discountAmount = useMemo(() => subtotal * promoDiscount, [subtotal, promoDiscount]);
  const grandTotal = useMemo(() => Math.max(0, subtotal + shippingCost - discountAmount), [subtotal, shippingCost, discountAmount]);

  function nextStep() {
    if (step === 1 && !cart?.items.length) {
      setError("Your cart is empty.");
      return;
    }
    if (step === 2 && !selectedShippingId) {
      setError("Select a shipping address.");
      return;
    }
    if (step === 3) {
      createPaymentIntent();
      return;
    }
    setError("");
    const nextMap: Record<CheckoutStep, CheckoutStep> = {
      1: 2,
      2: 3,
      3: 4,
      4: 5,
      5: 5,
    };
    setStep((prev) => nextMap[prev]);
  }

  function prevStep() {
    const prevMap: Record<CheckoutStep, CheckoutStep> = {
      1: 1,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
    };
    setStep((prev) => prevMap[prev]);
  }

  function onPaymentDone(msg: string) {
    setMessage(msg);
    setStep(5);
  }

  return (
    <section className="cart-shell">
      <div className="checkout-steps">
        {["Cart", "Address", "Delivery", "Payment", "Confirm"].map((label, idx) => (
          <span key={label} className={step >= idx + 1 ? "active" : ""}>{label}</span>
        ))}
      </div>

      {loading && <p>Loading your cart...</p>}
      {error && <p className="state-error">{error}</p>}
      {message && <p className="state-success">{message}</p>}

      {!loading && !cart?.items.length && step === 1 && (
        <div className="collection-empty">
          <p>Your cart is empty.</p>
          <Link href="/marketplace">Go to marketplace</Link>
        </div>
      )}

      {step === 1 && !!cart?.items.length && (
        <div className="cart-main-card">
          {cart.items.map((item) => (
            <article key={item.id} className="cart-item-row">
              <div className="cart-item-meta">
                <h3>{item.product_name}</h3>
                <p>{item.variant_label || "Standard"}</p>
                <div className="cart-qty-controls">
                  <button type="button" onClick={() => removeItem(item.id)}>🗑</button>
                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
              </div>
              <div className="cart-item-price">KES {Number(item.line_total).toLocaleString()}</div>
            </article>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="cart-main-card">
          <h3>Shipping Address</h3>
          <div className="cart-address-row">
            <select value={selectedShippingId ?? ""} onChange={(e) => setSelectedShippingId(Number(e.target.value))}>
              <option value="">Select shipping address</option>
              {addresses.filter((a) => a.address_type === "shipping").map((addr) => (
                <option key={addr.id} value={addr.id}>{addr.full_name} - {addr.line1}, {addr.city}</option>
              ))}
            </select>
            <h3>Billing Address</h3>
            <select value={selectedBillingId ?? ""} onChange={(e) => setSelectedBillingId(Number(e.target.value))}>
              <option value="">Select billing address</option>
              {addresses.filter((a) => a.address_type === "billing" || a.address_type === "shipping").map((addr) => (
                <option key={addr.id} value={addr.id}>{addr.full_name} - {addr.line1}, {addr.city}</option>
              ))}
            </select>
            <p style={{ margin: 0 }}>
              Need an address? <Link href="/account/addresses">Add one here</Link>
            </p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="cart-main-card">
          <h3>Delivery & Promo</h3>
          <div className="delivery-option-grid">
            <label className={deliveryOption === "standard" ? "active" : ""}>
              <input type="radio" checked={deliveryOption === "standard"} onChange={() => setDeliveryOption("standard")} />
              Standard (KES 180)
            </label>
            <label className={deliveryOption === "express" ? "active" : ""}>
              <input type="radio" checked={deliveryOption === "express"} onChange={() => setDeliveryOption("express")} />
              Express (KES 420)
            </label>
          </div>

          <div className="promo-row">
            <input value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Promo code (try SAVE5)" />
            <button type="button" onClick={applyPromo}>Apply</button>
          </div>
        </div>
      )}

      {step === 4 && clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm clientSecret={clientSecret} onDone={onPaymentDone} />
        </Elements>
      )}

      {step === 5 && (
        <div className="cart-main-card">
          <h3>Order Confirmed</h3>
          <p>Your checkout flow is complete. Track progress from your orders page.</p>
          <div className="hero-cta-row">
            <Link href="/orders" className="hero-cta">Track Orders</Link>
            <Link href="/marketplace" className="hero-ghost">Continue Shopping</Link>
          </div>
        </div>
      )}

      <aside className="checkout-summary-card">
        <h3>Order Summary</h3>
        <div className="cart-summary-row"><span>Subtotal</span><strong>KES {subtotal.toLocaleString()}</strong></div>
        <div className="cart-summary-row"><span>Shipping</span><strong>KES {shippingCost.toLocaleString()}</strong></div>
        <div className="cart-summary-row"><span>Discount</span><strong>- KES {discountAmount.toLocaleString()}</strong></div>
        <div className="cart-summary-row cart-grand"><span>Total</span><strong>KES {grandTotal.toLocaleString()}</strong></div>

        <div className="checkout-actions">
          {step > 1 && step < 5 && <button type="button" onClick={prevStep}>Back</button>}
          {step < 4 && <button type="button" onClick={nextStep}>Continue</button>}
        </div>
      </aside>
    </section>
  );
}
