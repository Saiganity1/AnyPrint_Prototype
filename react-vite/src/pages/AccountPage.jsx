import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

const TABS = ["orders", "profile"];

export default function AccountPage() {
  const user = getStoredUser();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setStatus("Loading account data...");
      setError("");
      try {
        const ordersRes = await apiRequest("orders/me/");
        const ordersBody = await readJsonSafe(ordersRes);

        if (!ordersRes.ok) throw new Error(normalizeApiError(ordersBody, "Could not load orders."));

        if (!cancelled) {
          setOrders(normalizeOrders(ordersBody));
          setStatus("Account loaded.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load account.");
          setStatus("Could not load account.");
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => user?.name || user?.username || "User", [user]);

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">User Dashboard</p>
        <h2 className="page-title">My Account</h2>
        <p className="page-lead">Welcome, {displayName}</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="tab-row">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "tab-chip active" : "tab-chip"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "orders" ? (
        <section className="orders-stack">
          {orders.length ? (
            orders.map((order) => (
              <article className="panel" key={order.id}>
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: "0.2rem" }}>Order {order.tracking_number || `#${order.id}`}</h3>
                    <p className="meta">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong>{order.status}</strong>
                </div>
                <p className="meta">
                  Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}
                </p>
                <Link className="btn secondary" to="/tracking">
                  Track Order
                </Link>
              </article>
            ))
          ) : (
            <div className="panel empty-panel">No orders yet.</div>
          )}
        </section>
      ) : null}

      {activeTab === "profile" ? (
        <section className="panel">
          <h3>Profile</h3>
          <p className="meta">Name: {user.name || user.username}</p>
          <p className="meta">Email: {user.email || "Not set"}</p>
          <p className="meta">Role: {user.role || "USER"}</p>
          <p className="meta">Profile updates can be added after the main store flow is stable.</p>
        </section>
      ) : null}
    </section>
  );
}
