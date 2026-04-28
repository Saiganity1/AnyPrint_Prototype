import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { cartCount, loadCart, removeCartItem, saveCart } from "../lib/cart";
import { formatPrice } from "../lib/format";

const steps = ["Cart", "Address", "Payment", "Review"];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState(() => loadCart());
  const [message, setMessage] = useState("");
  const [placing, setPlacing] = useState(false);

  const [addressForm, setAddressForm] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    address: "",
    save_address: false,
  });
  const [paymentForm, setPaymentForm] = useState({
    payment_method: "",
    promo_code: "",
    notes: "",
  });

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.unit_price || 0) * Number(item.quantity || 0), 0),
    [cart],
  );

  if (!user) {
    return <Navigate to="/login?next=%2Fcheckout" replace />;
  }

  function handleAddressChange(event) {
    const { name, value, type, checked } = event.target;
    setAddressForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  function handlePaymentChange(event) {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  }

  function removeItem(item) {
    const next = removeCartItem(item.key);
    setCart(next);
  }

  function validateStep2() {
    if (!addressForm.full_name || !addressForm.email || !addressForm.phone || !addressForm.address) {
      setMessage("Please complete all address fields.");
      return false;
    }
    return true;
  }

  function validateStep3() {
    if (!paymentForm.payment_method) {
      setMessage("Please choose a payment method.");
      return false;
    }
    return true;
  }

  async function placeOrder() {
    if (!cart.length) {
      setMessage("Your cart is empty.");
      return;
    }

    setPlacing(true);
    setMessage("Placing order...");

    const payload = {
      items: cart.map((item) => ({
        productId: item.product_id,
        size: item.size || "",
        color: item.color || "",
        quantity: Number(item.quantity || 1),
      })),
    };

    try {
      const response = await apiRequest("orders/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not place order."));
      }

      saveCart([]);
      setCart([]);
      const orderId = body._id || body.id || "";
      setMessage(`Order #${orderId} created successfully.`);
      navigate(`/tracking?placed_order=${encodeURIComponent(String(orderId))}`);
    } catch (orderError) {
      setMessage(orderError.message || "Could not place order.");
    } finally {
      setPlacing(false);
    }
  }

  return (
    <section className="checkout-page">
      <div className="page-intro">
        <p className="page-kicker">Secure Checkout</p>
        <h2 className="page-title">Checkout</h2>
        <p className="page-lead">{cartCount(cart)} item{cartCount(cart) === 1 ? "" : "s"} in cart</p>
      </div>

      <div className="stepper panel checkout-stepper" style={{ marginBottom: "1rem" }}>
        {steps.map((label, index) => (
          <span key={label} className={index + 1 === step ? "step-chip active" : "step-chip"}>
            {index + 1}. {label}
          </span>
        ))}
      </div>

      {step === 1 ? (
        <section className="panel">
          <h3>Cart Review</h3>
          {!cart.length ? (
            <div className="empty-panel">
              <p className="lead">Your cart is empty.</p>
              <Link className="btn secondary" to="/shop">
                Browse shirts
              </Link>
            </div>
          ) : (
            <div className="checkout-list">
              {cart.map((item) => (
                <article className="checkout-item" key={item.key}>
                  <div>
                    <strong>{item.product_name || `Product #${item.product_id}`}</strong>
                    <p className="meta">
                      {item.size || "M"} / {item.color || "Black"} / Qty {item.quantity}
                    </p>
                    <p className="meta">{formatPrice(item.unit_price)}</p>
                  </div>
                  <button className="btn secondary" type="button" onClick={() => removeItem(item)}>
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
          <div className="row-actions">
            <button className="btn" type="button" disabled={!cart.length} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="panel">
          <h3>Address</h3>
          <div className="form-grid" style={{ marginTop: "0.6rem" }}>
            <label htmlFor="full_name">Full Name</label>
            <input id="full_name" name="full_name" value={addressForm.full_name} onChange={handleAddressChange} required />
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" value={addressForm.email} onChange={handleAddressChange} required />
            <label htmlFor="phone">Phone</label>
            <input id="phone" name="phone" value={addressForm.phone} onChange={handleAddressChange} required />
            <label htmlFor="address">Delivery Address</label>
            <textarea id="address" name="address" rows={3} value={addressForm.address} onChange={handleAddressChange} required />
          </div>
          <div className="row-actions">
            <button className="btn secondary" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (validateStep2()) {
                  setMessage("");
                  setStep(3);
                }
              }}
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="panel">
          <h3>Payment Method</h3>
          <div className="form-grid">
            <label htmlFor="promo_code">Promo code</label>
            <input id="promo_code" name="promo_code" value={paymentForm.promo_code} onChange={handlePaymentChange} />
            <label htmlFor="payment_method">Payment method</label>
            <select id="payment_method" name="payment_method" value={paymentForm.payment_method} onChange={handlePaymentChange} required>
              <option value="">Select payment method</option>
              <option value="COD">Cash on Delivery</option>
              <option value="PAYMONGO">GCash / QR PH via PayMongo</option>
              <option value="STRIPE">Card via Stripe</option>
              <option value="BANK">Bank Transfer</option>
            </select>
            <label htmlFor="notes">Order notes</label>
            <textarea id="notes" name="notes" rows={2} value={paymentForm.notes} onChange={handlePaymentChange} />
          </div>
          <div className="row-actions">
            <button className="btn secondary" type="button" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (validateStep3()) {
                  setMessage("");
                  setStep(4);
                }
              }}
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="panel">
          <h3>Review and Place Order</h3>
          <div className="checkout-review">
            <p>
              <strong>Name:</strong> {addressForm.full_name}
            </p>
            <p>
              <strong>Email:</strong> {addressForm.email}
            </p>
            <p>
              <strong>Phone:</strong> {addressForm.phone}
            </p>
            <p>
              <strong>Address:</strong> {addressForm.address}
            </p>
            <p>
              <strong>Payment:</strong> {paymentForm.payment_method || "Not set"}
            </p>
            <p>
              <strong>Promo:</strong> {paymentForm.promo_code || "None"}
            </p>
            <p>
              <strong>Subtotal:</strong> {formatPrice(subtotal)}
            </p>
            <p>
              <strong>Total:</strong> {formatPrice(subtotal)}
            </p>
          </div>
          <div className="row-actions">
            <button className="btn secondary" type="button" onClick={() => setStep(3)}>
              Back
            </button>
            <button className="btn" type="button" onClick={placeOrder} disabled={placing}>
              {placing ? "Placing Order..." : "Place Order"}
            </button>
          </div>
        </section>
      ) : null}

      {message ? <p className="status-text">{message}</p> : null}

      <aside className="panel" style={{ marginTop: "1rem" }}>
        <h3>Order Total</h3>
        <p className="meta">Shipping and payment collection can be finalized by staff after order placement.</p>
        <p>
          <strong>Total:</strong> {formatPrice(subtotal)}
        </p>
      </aside>
    </section>
  );
}
