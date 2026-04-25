import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";

const TAB_CONFIG = {
  to_pay: { label: "To Pay", statuses: ["PENDING"] },
  to_ship: { label: "To Ship", statuses: ["CONFIRMED", "PACKED"] },
  to_receive: { label: "To Receive", statuses: ["SHIPPED", "OUT_FOR_DELIVERY"] },
  to_rate: { label: "To Rate", statuses: ["DELIVERED"] },
};

function orderTab(order) {
  const status = String(order.status || "").toUpperCase();
  if (status === "DELIVERED") return "to_rate";
  if (status === "SHIPPED" || status === "OUT_FOR_DELIVERY") return "to_receive";
  if (status === "CONFIRMED" || status === "PACKED") return "to_ship";
  return "to_pay";
}

function statusLabel(status) {
  return String(status || "PENDING")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());
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
        const response = await apiRequest("orders/history/");
        const body = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load orders."));
        }
        const nextOrders = Array.isArray(body.orders) ? body.orders : [];
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
    <section className="tracking-page">
      <div className="page-intro">
        <p className="page-kicker">Track Orders</p>
        <h2 className="page-title">Order Tracking</h2>
        <p className="page-lead">{user ? "Track your order progress." : "Login recommended for full order history."}</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="tab-row">
        {Object.entries(TAB_CONFIG).map(([key, tab]) => (
          <button
            key={key}
            type="button"
            className={key === activeTab ? "tab-chip active" : "tab-chip"}
            onClick={() => setActiveTab(key)}
          >
            {tab.label} ({counts[key] || 0})
          </button>
        ))}
      </div>

      {!tabOrders.length ? (
        <div className="panel empty-panel">
          <p>No {TAB_CONFIG[activeTab].label.toLowerCase()} orders yet.</p>
        </div>
      ) : (
        <div className="orders-stack">
          {tabOrders.map((order) => (
            <article className="panel" key={order.id}>
              <div className="row-between">
                <div>
                  <h3 style={{ marginBottom: "0.2rem" }}>Order #{order.id}</h3>
                  <p className="meta">
                    {order.tracking_number || "No tracking yet"} • {statusLabel(order.status)}
                  </p>
                </div>
                <strong>{formatPrice(order.total_amount)}</strong>
              </div>

              <div className="order-meta-grid">
                <div>
                  <span className="meta">Payment</span>
                  <strong>{statusLabel(order.payment_status)}</strong>
                </div>
                <div>
                  <span className="meta">Delivery</span>
                  <strong>{order.estimated_delivery_date || "Pending"}</strong>
                </div>
                <div>
                  <span className="meta">Items</span>
                  <strong>{(order.items || []).length}</strong>
                </div>
              </div>

              <div className="row-actions">
                <button className="btn secondary" type="button" onClick={() => toggleDetails(order.id)}>
                  {expanded[order.id] ? "Hide Details" : "View Details"}
                </button>
              </div>

              {expanded[order.id] ? (
                <div className="panel" style={{ marginTop: "0.8rem" }}>
                  <h4>Items</h4>
                  {(order.items || []).map((item, index) => (
                    <p key={`${order.id}-${index}`} className="meta">
                      {item.product_name} x {item.quantity} • {item.color || "Default"} / {item.size || "M"} • {formatPrice(item.subtotal)}
                    </p>
                  ))}

                  <h4>Status Timeline</h4>
                  {(order.tracking_events || []).length ? (
                    (order.tracking_events || []).map((event, index) => (
                      <div className="timeline-row" key={`${order.id}-event-${index}`}>
                        <strong>{statusLabel(event.status)}</strong>
                        <p className="meta">{event.note || "Order status updated."}</p>
                        <p className="meta">{event.created_at}</p>
                      </div>
                    ))
                  ) : (
                    <p className="meta">No status updates yet.</p>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
