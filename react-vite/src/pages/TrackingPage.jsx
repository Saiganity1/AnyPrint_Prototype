import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";

// Shopee-style stepper config
const ORDER_STEPS = [
  { key: "placed", label: "Order Placed" },
  { key: "to_ship", label: "To Ship" },
  { key: "to_receive", label: "To Receive" },
  { key: "to_rate", label: "To Rate" },
];

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
        <p className="page-kicker">Orders waiting for payment confirmation.</p>
        <h2 className="page-title">To Pay</h2>
        <p className="page-lead">Orders waiting for payment confirmation.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      {/* Tabbed navigation */}
      <div className="tab-row" style={{ marginBottom: "1.2rem" }}>
        {Object.entries(TAB_CONFIG).map(([key, tab]) => (
          <button
            key={key}
            type="button"
            className={key === activeTab ? "tab-chip active" : "tab-chip"}
            onClick={() => setActiveTab(key)}
            style={{ minWidth: 120, fontWeight: 700, fontSize: "1.05rem" }}
          >
            {tab.label}
            <span style={{ color: "#c62828", fontWeight: 600, marginLeft: 6 }}>{counts[key] > 0 ? counts[key] : null}</span>
            <span style={{ color: "#aaa", fontWeight: 400, marginLeft: 4, fontSize: "0.95em" }}>orders</span>
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
            <article className="panel" key={order.id} style={{ padding: 0, overflow: "hidden" }}>
              {/* Order summary header */}
              <div style={{ background: "#f8fbff", borderBottom: "1px solid #e3e8f0", padding: "1.1rem 1.5rem 0.7rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>Order #{order.id}</span>
                  <span style={{ marginLeft: 12, color: "#888", fontSize: "0.98rem" }}>Placed {order.created_at || "-"}</span>
                  <span style={{ marginLeft: 12, color: "#c62828", fontWeight: 700, fontSize: "0.98rem", border: "1px solid #f5bcbc", borderRadius: 8, padding: "2px 10px" }}>{statusLabel(order.status)}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#0b62ff", fontSize: "1.1rem" }}>Total {formatPrice(order.total_amount)}</div>
                  <div style={{ color: "#888", fontSize: "0.97rem" }}>Items: {(order.items || []).length}</div>
                </div>
              </div>

              {/* Progress tracker */}
              <div style={{ padding: "0.7rem 1.5rem 0.7rem 1.5rem", borderBottom: "1px solid #e3e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                  {ORDER_STEPS.map((step, idx) => {
                    const isActive =
                      (step.key === "placed" && order.status) ||
                      (step.key === "to_ship" && ["CONFIRMED", "PACKED"].includes(String(order.status).toUpperCase())) ||
                      (step.key === "to_receive" && ["SHIPPED", "OUT_FOR_DELIVERY"].includes(String(order.status).toUpperCase())) ||
                      (step.key === "to_rate" && String(order.status).toUpperCase() === "DELIVERED");
                    return (
                      <div key={step.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: isActive ? "#0b62ff" : "#e3e8f0",
                          display: "inline-block",
                          border: isActive ? "2px solid #0b62ff" : "2px solid #e3e8f0",
                        }}></span>
                        <span style={{ fontWeight: isActive ? 700 : 500, color: isActive ? "#0b62ff" : "#888", fontSize: "0.98rem" }}>{step.label}</span>
                        {idx < ORDER_STEPS.length - 1 && (
                          <span style={{ width: 36, height: 2, background: isActive ? "#0b62ff" : "#e3e8f0", display: "inline-block", borderRadius: 2 }}></span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ padding: "0.7rem 1.5rem 0.7rem 1.5rem", borderBottom: "1px solid #e3e8f0", display: "flex", gap: 12 }}>
                <button className="btn secondary" type="button" onClick={() => toggleDetails(order.id)}>
                  View Details
                </button>
                <button className="btn secondary" type="button" style={{ background: "#fffbe7", color: "#b88a00", borderColor: "#ffe08a" }}>Contact Seller</button>
                <button className="btn secondary" type="button" style={{ background: "#f5f7fb", color: "#0b62ff", borderColor: "#dbeafe" }}>Need Help?</button>
              </div>

              {/* Order details expanded */}
              {expanded[order.id] && (
                <div style={{ padding: "1.2rem 1.5rem 1.2rem 1.5rem", background: "#fff" }}>
                  <div style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 16 }}>
                    <div>
                      <div style={{ color: "#888", fontSize: "0.97rem" }}>Tracking Number</div>
                      <div style={{ fontWeight: 700 }}>{order.tracking_number || "-"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#888", fontSize: "0.97rem" }}>Estimated Delivery</div>
                      <div style={{ fontWeight: 700 }}>{order.estimated_delivery_date || "-"}</div>
                    </div>
                    <div>
                      <div style={{ color: "#888", fontSize: "0.97rem" }}>Status</div>
                      <div style={{ fontWeight: 700 }}>{statusLabel(order.status)}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #e3e8f0", margin: "12px 0" }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem" }}>
                      <span>Subtotal</span>
                      <span>PHP {order.subtotal ? formatPrice(order.subtotal) : "-"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem" }}>
                      <span>Shipping</span>
                      <span>PHP {order.shipping_fee ? formatPrice(order.shipping_fee) : "0.00"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem" }}>
                      <span>Discounts</span>
                      <span>-PHP {order.discount_amount ? formatPrice(order.discount_amount) : "0.00"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, background: "#f5f7fb", padding: "6px 0", borderRadius: 6, fontSize: "1.09rem", marginTop: 4 }}>
                      <span>Total</span>
                      <span>PHP {formatPrice(order.total_amount)}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #e3e8f0", margin: "16px 0" }}></div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Items <span style={{ color: "#888", fontWeight: 400, fontSize: "0.97rem" }}>({(order.items || []).length} item{(order.items || []).length !== 1 ? "s" : ""})</span></div>
                    {(order.items || []).map((item, index) => (
                      <div key={`${order.id}-${index}`} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                        <div style={{ width: 36, height: 36, background: "#e3e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#0b62ff" }}>
                          {item.product_name ? item.product_name[0] : "?"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                          <div style={{ color: "#888", fontSize: "0.97rem" }}>Variation: {item.color || "Default"} - {item.size || "M"}</div>
                          <div style={{ color: "#888", fontSize: "0.97rem" }}>Quantity: {item.quantity}</div>
                        </div>
                        <div style={{ fontWeight: 700, color: "#c62828" }}>PHP {formatPrice(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid #e3e8f0", margin: "16px 0" }}></div>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Status timeline</div>
                    {(order.tracking_events || []).length ? (
                      (order.tracking_events || []).map((event, index) => (
                        <div className="timeline-row" key={`${order.id}-event-${index}`}>
                          <span style={{ color: event.status === "PENDING" ? "#c62828" : "#0b62ff", fontWeight: 700 }}>{statusLabel(event.status)}</span>
                          <span style={{ marginLeft: 8, color: "#888" }}>{event.note || "Order status updated."}</span>
                          <div style={{ color: "#888", fontSize: "0.97rem" }}>{event.created_at}</div>
                        </div>
                      ))
                    ) : (
                      <p className="meta">No status updates yet.</p>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
