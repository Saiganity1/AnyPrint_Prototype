import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser, roleCanManage } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

export default function TrackingManagementPage() {
  const user = getStoredUser();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Loading orders...");
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      setError("");
      setStatus("Loading orders...");
      const response = await apiRequest("orders/");
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not load orders."));
      }
      setOrders(normalizeOrders(body));
      setStatus("Orders loaded.");
    } catch (err) {
      setError(err.message || "Could not load orders.");
      setStatus("Error loading orders");
    }
  }

  async function setTracking(orderId, trackNum) {
    if (!trackNum.trim()) {
      setError("Tracking number cannot be empty");
      return;
    }

    try {
      setError("");
      setStatus("Setting tracking number...");
      const response = await apiRequest("tracking/set-tracking-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, tracking_number: trackNum }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not set tracking number."));
      }
      setTrackingNumber("");
      setSelectedOrder(null);
      await loadOrders();
      setStatus("Tracking number set successfully!");
    } catch (err) {
      setError(err.message);
    }
  }

  async function checkAndUpdate(orderId) {
    try {
      setIsChecking(true);
      setError("");
      setStatus("Fetching status from JNT via Gemini AI...");
      const response = await apiRequest(`tracking/check-status/${orderId}`, {
        method: "POST",
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not check status."));
      }
      await loadOrders();
      setStatus(`Status updated: ${body.order.status}`);
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  }

  async function checkAllOrders() {
    try {
      setIsChecking(true);
      setError("");
      setStatus("Checking all orders...");
      const response = await apiRequest("tracking/check-all-orders", {
        method: "POST",
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not check orders."));
      }
      const successCount = body.results.filter((r) => r.status === "success").length;
      setStatus(`Checked ${body.results.length} orders. ${successCount} updated successfully.`);
      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (search) {
      const haystack = [
        order.id,
        order.tracking_number,
        order.status,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(search.toLowerCase());
    }
    return true;
  });

  if (!user || !roleCanManage(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">Fulfillment</p>
        <h2 className="page-title">Tracking Management</h2>
        <p className="page-lead">Manage order tracking and sync status with JNT via Gemini AI.</p>
      </div>

      {status && <p className="status-text">{status}</p>}
      {error && <p className="error-text">{error}</p>}

      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by order ID or tracking number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 250 }}
          className="input"
        />
        <button className="btn" onClick={checkAllOrders} disabled={isChecking}>
          {isChecking ? "Checking..." : "Check All Orders"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "1rem" }}>
        {filteredOrders.length ? (
          filteredOrders.map((order) => (
            <article
              key={order.id}
              className="panel"
              style={{ borderRadius: 12, padding: "1rem", borderLeft: `4px solid var(--brand)` }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "start" }}>
                <div>
                  <h4 style={{ margin: 0 }}>Order {order.id}</h4>
                  <p className="meta" style={{ margin: "0.25rem 0" }}>
                    Date: {new Date(order.created_at).toLocaleDateString()}
                  </p>
                  <p className="meta" style={{ margin: "0.25rem 0" }}>
                    Status: <strong>{order.status}</strong>
                  </p>
                  <p className="meta" style={{ margin: "0.25rem 0" }}>
                    Tracking: <strong>{order.tracking_number || "Not set"}</strong>
                  </p>
                  <p className="meta" style={{ margin: "0.25rem 0" }}>
                    Total: {formatPrice(order.total_amount)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexDirection: "column" }}>
                  {order.tracking_number ? (
                    <>
                      <button
                        className="btn secondary"
                        onClick={() => checkAndUpdate(order.id)}
                        disabled={isChecking}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        🔄 Check Status
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setSelectedOrder(order);
                        setTrackingNumber("");
                      }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      + Add Tracking
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="panel empty-panel">No orders found.</div>
        )}
      </div>

      {selectedOrder ? (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,12,20,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="modal"
            style={{
              width: "min(500px, 96%)",
              background: "#fff",
              borderRadius: 12,
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0 }}>Add Tracking Number</h3>
            <p className="meta" style={{ marginTop: "0.25rem" }}>Order {selectedOrder.id}</p>

            <div style={{ marginTop: "1rem" }}>
              <label className="label">JNT Tracking Number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g., 123456789"
                className="input"
              />
            </div>

            <div style={{ marginTop: "1rem", display: "flex", gap: "0.75rem" }}>
              <button
                className="btn"
                onClick={() => setTracking(selectedOrder.id, trackingNumber)}
                disabled={!trackingNumber.trim()}
              >
                Set & Sync
              </button>
              <button className="btn secondary" onClick={() => setSelectedOrder(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
