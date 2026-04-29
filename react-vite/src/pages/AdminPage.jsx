import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser, roleCanManage } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

const ORDER_STATUS_OPTIONS = ["pending", "packing", "shipped", "delivering", "delivered", "rate", "cancelled"];

export default function AdminPage() {
  const user = getStoredUser();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusText, setStatusText] = useState("Loading orders...");
  const [error, setError] = useState("");
  const [trackingInputs, setTrackingInputs] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setStatusText("Loading orders...");
      try {
        const response = await apiRequest("orders/");
        const body = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load orders."));
        }
        if (!cancelled) {
          const normalizedOrders = normalizeOrders(body);
          setOrders(normalizedOrders);
          setTrackingInputs(
            normalizedOrders.reduce((inputs, order) => {
              inputs[order.id] = order.tracking_number || "";
              return inputs;
            }, {}),
          );
          setStatusText("Orders loaded.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load admin dashboard.");
          setStatusText("Could not load orders.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (statusFilter && String(order.status || "").toLowerCase() !== statusFilter) return false;
        if (!search.trim()) return true;
        const haystack = [
          order.id,
          order.userId?.name,
          order.userId?.email,
          order.status,
          order.tracking_number,
        ]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");
        return haystack.includes(search.trim().toLowerCase());
      }),
    [orders, search, statusFilter],
  );

  if (!user || !roleCanManage(user.role)) {
    return <Navigate to="/login?next=%2Fadmin" replace />;
  }

  async function refreshOrders() {
    const response = await apiRequest("orders/");
    const body = await readJsonSafe(response);
    if (response.ok) {
      const normalizedOrders = normalizeOrders(body);
      setOrders(normalizedOrders);
      setTrackingInputs(
        normalizedOrders.reduce((inputs, order) => {
          inputs[order.id] = order.tracking_number || "";
          return inputs;
        }, {}),
      );
    }
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const response = await apiRequest(`orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not update order status."));
      }
      await refreshOrders();
    } catch (orderError) {
      setError(orderError.message || "Could not update order status.");
    }
  }

  async function setTrackingNumber(orderId, trackingNum) {
    if (!trackingNum.trim()) {
      setError("Tracking number cannot be empty");
      return;
    }

    try {
      setError("");
      const response = await apiRequest("tracking/set-tracking-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, tracking_number: trackingNum }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not set tracking number."));
      }
      setTrackingInputs({ ...trackingInputs, [orderId]: "" });
      await refreshOrders();
      setStatusText("Tracking number set. Gemini AI will automatically check status every hour.");
    } catch (err) {
      setError(err.message);
    }
  }

  const metrics = {
    total_orders: orders.length,
    paid_orders: orders.filter((order) =>
      ["paid", "shipped", "completed"].includes(String(order.status || "").toLowerCase()),
    ).length,
    total_sales: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
  };

  return (
    <section className="dashboard-page">
      <div className="page-intro">
        <p className="page-kicker">Management</p>
        <h2 className="page-title">Admin Dashboard</h2>
        <p className="page-lead">Manage orders and update customer order statuses.</p>
      </div>
      <p className="status-text">{statusText}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="metrics-grid">
        <article className="metric-card">
          <span>Total Orders</span>
          <strong>{metrics.total_orders}</strong>
        </article>
        <article className="metric-card">
          <span>Paid Orders</span>
          <strong>{metrics.paid_orders}</strong>
        </article>
        <article className="metric-card">
          <span>Total Sales</span>
          <strong>{formatPrice(metrics.total_sales)}</strong>
        </article>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="row-between">
          <h3>Orders</h3>
          <div className="inline-form wrap">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search orders"
              aria-label="Search orders"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">All statuses</option>
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="orders-stack">
          {filteredOrders.length ? (
            filteredOrders.map((order) => (
              <article className="checkout-item" key={order.id} style={{ borderLeft: `4px solid var(--brand)` }}>
                <div>
                  <strong>
                    #{order.id} {order.userId?.name || ""}
                  </strong>
                  <p className="meta">{order.userId?.email || "No email"}</p>
                  <p className="meta">{order.created_at || ""}</p>
                  <div style={{ marginTop: "0.75rem" }}>
                    <p className="meta">Tracking: <strong>{order.tracking_number || "Not set"}</strong></p>
                    {order.tracking_number && (
                      <p className="meta" style={{ fontSize: "0.85rem", color: "var(--brand)" }}>
                        ✓ Gemini AI checks status hourly
                      </p>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 280 }}>
                  <select
                    value={order.status || "pending"}
                    onChange={(event) => updateOrderStatus(order.id, event.target.value)}
                  >
                    {ORDER_STATUS_OPTIONS.map((status) => (
                      <option key={`${order.id}-${status}`} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <strong>{formatPrice(order.total_amount || 0)}</strong>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="JNT tracking #"
                      value={trackingInputs[order.id] ?? order.tracking_number ?? ""}
                      onChange={(e) => setTrackingInputs({ ...trackingInputs, [order.id]: e.target.value })}
                      style={{ flex: 1, fontSize: "0.9rem" }}
                      className="input"
                    />
                    <button
                      className="btn secondary"
                      onClick={() => setTrackingNumber(order.id, trackingInputs[order.id] ?? order.tracking_number ?? "")}
                      style={{ fontSize: "0.9rem", padding: "0.4rem 0.6rem" }}
                    >
                      {order.tracking_number ? "Update" : "Add"}
                    </button>
                  </div>
                  {order.tracking_number ? (
                    <p className="meta" style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      Edit the tracking number here if JNT issued a new one.
                    </p>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="meta">No orders found.</p>
          )}
        </div>
      </section>
    </section>
  );
}
