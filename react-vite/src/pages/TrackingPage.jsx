import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

// Shopee-style stepper config
const ORDER_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "to_ship", label: "To Ship" },
  { key: "to_receive", label: "To Receive" },
  { key: "to_rate", label: "To Rate" },
];

const TAB_CONFIG = {
  to_pay: { label: "Pending", statuses: ["PENDING"] },
  to_ship: { label: "Paid", statuses: ["PAID"] },
  to_receive: { label: "Shipped", statuses: ["SHIPPED"] },
  to_rate: { label: "Completed", statuses: ["COMPLETED"] },
};

function orderTab(order) {
  const status = String(order.status || "").toUpperCase();
  if (status === "COMPLETED") return "to_rate";
  if (status === "SHIPPED") return "to_receive";
  if (status === "PAID") return "to_ship";
  return "to_pay";
}

function statusLabel(status) {
  return String(status || "PENDING")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleString();
}

function orderStepIndex(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "COMPLETED") return 4;
  if (normalized === "SHIPPED") return 3;
  if (normalized === "PAID") return 2;
  return 1;
}

export default function TrackingPage() {
  const user = getStoredUser();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("to_pay");
  const [expanded, setExpanded] = useState({});
  const [status, setStatus] = useState("Loading orders...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      setError("");
      setStatus("Loading orders...");
      try {
        const response = await apiRequest("orders/me/");
        const body = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load orders."));
        }
        const nextOrders = normalizeOrders(body);
        if (!cancelled) {
          setOrders(nextOrders);
          setStatus(`Loaded ${nextOrders.length} orders.`);
          const placedOrder = searchParams.get("placed_order");
          if (placedOrder) {
            setActiveTab("to_pay");
            setStatus(`Order #${placedOrder} placed successfully.`);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load orders.");
          setStatus("Could not load orders.");
        }
      }
    }

    loadOrders();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const tabOrders = useMemo(
    () => orders.filter((order) => orderTab(order) === activeTab),
    [orders, activeTab],
  );

  const counts = useMemo(
    () => ({
      to_pay: orders.filter((order) => orderTab(order) === "to_pay").length,
      to_ship: orders.filter((order) => orderTab(order) === "to_ship").length,
      to_receive: orders.filter((order) => orderTab(order) === "to_receive").length,
      to_rate: orders.filter((order) => orderTab(order) === "to_rate").length,
    }),
    [orders],
  );

  function toggleDetails(orderId) {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  return (
    <section className="tracking-page tracking-redesign">
      <div className="page-intro tracking-hero">
        <p className="page-kicker">My Orders</p>
        <h2 className="page-title">Order Center</h2>
        <p className="page-lead">
          {user
            ? "Shopee-style order center for quick access to each stage of your order."
            : "Login required for full order history."}
        </p>
      </div>

      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="tracking-stage-grid" role="tablist" aria-label="Order stages">
        {Object.entries(TAB_CONFIG).map(([key, tab]) => {
          const isActive = key === activeTab;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? "tracking-stage-card is-active" : "tracking-stage-card"}
              onClick={() => setActiveTab(key)}
            >
              <span className="tracking-stage-icon" aria-hidden="true">
                {key === "to_pay" ? "💳" : key === "to_ship" ? "📦" : key === "to_receive" ? "🚚" : "⭐"}
              </span>
              <span className="tracking-stage-label">{tab.label}</span>
              <span className="tracking-stage-count">
                {counts[key]} order{counts[key] === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>

      {!tabOrders.length ? (
        <div className="panel empty-panel tracking-empty-state">
          <p>No {TAB_CONFIG[activeTab].label.toLowerCase()} orders yet.</p>
        </div>
      ) : (
        <div className="orders-stack tracking-order-list">
          {tabOrders.map((order) => {
            const stepIndex = orderStepIndex(order.status);
            const itemCount = (order.items || []).length;
            const summaryText =
              itemCount === 1 ? "1 item" : `${itemCount} items`;

            return (
              <article className="panel tracking-order-card" key={order.id}>
                <header className="tracking-order-header row-between">
                  <div>
                    <h3>Order #{order.id}</h3>
                    <p className="meta">Placed {formatDateTime(order.created_at)} · {order.tracking_number || "No tracking yet"}</p>
                  </div>
                  <span className="tracking-status-pill">{statusLabel(order.status)}</span>
                </header>

                <section className="tracking-summary-grid">
                  <div className="tracking-summary-cell">
                    <span className="meta">Payment</span>
                    <strong>{statusLabel(order.payment_status)}</strong>
                  </div>
                  <div className="tracking-summary-cell">
                    <span className="meta">Delivery</span>
                    <strong>{order.estimated_delivery_date || "Pending"}</strong>
                  </div>
                  <div className="tracking-summary-cell">
                    <span className="meta">Items</span>
                    <strong>{summaryText}</strong>
                  </div>
                  <div className="tracking-summary-cell">
                    <span className="meta">Total</span>
                    <strong>PHP {formatPrice(order.total_amount)}</strong>
                  </div>
                </section>

                <section className="tracking-stepper" aria-label="Order progress">
                  {ORDER_STEPS.map((step, index) => {
                    const active = index + 1 <= stepIndex;
                    return (
                      <div key={step.key} className={active ? "tracking-step is-active" : "tracking-step"}>
                        <span className="tracking-step-dot" />
                        <span className="tracking-step-label">{step.label}</span>
                      </div>
                    );
                  })}
                </section>

                <div className="tracking-actions row-actions">
                  <button className="btn secondary" type="button" onClick={() => toggleDetails(order.id)}>
                    {expanded[order.id] ? "Hide Details" : "View Details"}
                  </button>
                  <button className="btn secondary" type="button">Contact Seller</button>
                  <button className="btn secondary" type="button">Need Help?</button>
                </div>

                {expanded[order.id] ? (
                  <section className="tracking-detail-wrap">
                    <div className="tracking-micro-grid">
                      <div className="tracking-micro-cell">
                        <span className="meta">Tracking Number</span>
                        <strong>{order.tracking_number || "-"}</strong>
                      </div>
                      <div className="tracking-micro-cell">
                        <span className="meta">Estimated Delivery</span>
                        <strong>{order.estimated_delivery_date || "-"}</strong>
                      </div>
                      <div className="tracking-micro-cell">
                        <span className="meta">Status</span>
                        <strong>{statusLabel(order.status)}</strong>
                      </div>
                    </div>

                    <div className="tracking-amount-box">
                      <div className="tracking-amount-row">
                        <span>Subtotal</span>
                        <strong>PHP {order.subtotal ? formatPrice(order.subtotal) : "0.00"}</strong>
                      </div>
                      <div className="tracking-amount-row">
                        <span>Shipping</span>
                        <strong>PHP {order.shipping_fee ? formatPrice(order.shipping_fee) : "0.00"}</strong>
                      </div>
                      <div className="tracking-amount-row">
                        <span>Discounts</span>
                        <strong>-PHP {order.discount_amount ? formatPrice(order.discount_amount) : "0.00"}</strong>
                      </div>
                      <div className="tracking-amount-row tracking-total-row">
                        <span>Total</span>
                        <strong>PHP {formatPrice(order.total_amount)}</strong>
                      </div>
                    </div>

                    <div className="tracking-items-block">
                      <div className="row-between">
                        <h4>Items</h4>
                        <span className="meta">{summaryText}</span>
                      </div>
                      <div className="tracking-items-stack">
                        {(order.items || []).map((item, index) => (
                          <div className="tracking-item-row" key={`${order.id}-${index}`}>
                            <span className="tracking-item-avatar">
                              {item.product_name ? item.product_name[0] : "?"}
                            </span>
                            <div className="tracking-item-main">
                              <strong>{item.product_name}</strong>
                              <p className="meta">Variation: {item.color || "Default"} · {item.size || "M"}</p>
                              <p className="meta">Quantity: {item.quantity}</p>
                            </div>
                            <strong className="tracking-item-price">PHP {formatPrice(item.subtotal)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="tracking-timeline-block">
                      <div className="row-between">
                        <h4>Status timeline</h4>
                        <span className="meta">Live updates after checkout</span>
                      </div>
                      {(order.tracking_events || []).length ? (
                        <div className="tracking-timeline-stack">
                          {(order.tracking_events || []).map((event, index) => (
                            <div className="timeline-row" key={`${order.id}-event-${index}`}>
                              <span className="tracking-event-dot" aria-hidden="true" />
                              <div>
                                <strong>{statusLabel(event.status)}</strong>
                                <p className="meta">{event.note || "Order status updated."}</p>
                                <p className="meta">{formatDateTime(event.created_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="meta">No status updates yet.</p>
                      )}
                    </div>
                  </section>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
