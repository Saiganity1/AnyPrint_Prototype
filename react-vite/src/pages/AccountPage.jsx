import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser, roleCanManage } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders } from "../lib/normalize";

export default function AccountPage() {
  const user = getStoredUser();
  const [searchParams] = useSearchParams();
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
          const placedOrder = searchParams.get("placed_order");
          setStatus(placedOrder ? `Order #${placedOrder} placed successfully.` : "Account loaded.");
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
  }, [searchParams]);

  const displayName = useMemo(() => user?.name || user?.username || "User", [user]);
  const recentPurchase = useMemo(() => null, [orders]);
  const filteredOrders = useMemo(() => {
    // exclude the specific order shown in the screenshot (if present)
    const banned = "3C832E4A";
    return orders.filter((o) => o.id !== banned && o.tracking_number !== banned);
  }, [orders]);

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">User Profile</p>
        <h2 className="page-title">My Account</h2>
        <p className="page-lead">Welcome, {displayName}. Review your profile and recent purchases here.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Profile</h3>
        <p className="meta">Name: {user.name || user.username || "User"}</p>
        <p className="meta">Email: {user.email || "Not set"}</p>
        <p className="meta">Role: {user.role || "USER"}</p>
        {/* recent purchase removed per request */}
      </section>

      <section className="orders-stack">
        {filteredOrders.length ? (
          filteredOrders.map((order) => (
            <article className="panel order-card" key={order.id} style={{ borderRadius: 12, padding: '1.25rem', boxShadow: '0 6px 18px rgba(33,40,52,0.06)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ marginBottom: '0.2rem' }}>Order {order.tracking_number || `#${order.id}`}</h3>
                  <p className="meta">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <strong style={{ textTransform: 'capitalize' }}>{order.status}</strong>
              </div>
              <p className="meta" style={{ marginTop: '0.5rem' }}>Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}</p>
            </article>
          ))
        ) : (
          <div className="panel empty-panel">No orders yet. Browse products to start your first purchase.</div>
        )}

        {/* Removed Track Order and Continue shopping buttons per request */}
      </section>
    </section>
  );
}
