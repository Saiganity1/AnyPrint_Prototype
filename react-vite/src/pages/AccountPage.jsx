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
  const [showAll, setShowAll] = useState(false);
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
  const recentPurchase = useMemo(() => {
    return [...orders].sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    })[0] || null;
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
        {recentPurchase ? (
          <div className="row-actions" style={{ marginTop: "1rem" }}>
            <Link className="btn" to={`/tracking?placed_order=${encodeURIComponent(recentPurchase.id)}`}>
              Recent Purchase
            </Link>
          </div>
        ) : null}
      </section>

      <section className="orders-stack">
        {recentPurchase ? (
          <article className="panel">
            <div className="row-between">
              <div>
                <h3 style={{ marginBottom: "0.2rem" }}>Recent Purchase</h3>
                <p className="meta">{new Date(recentPurchase.created_at).toLocaleDateString()}</p>
              </div>
              <strong>{recentPurchase.status}</strong>
            </div>
            <p className="meta">Total: {formatPrice(recentPurchase.total_amount)} • Payment: {recentPurchase.payment_status}</p>
            <div style={{ marginTop: "1rem" }}>
              <Link className="btn" to={`/tracking?placed_order=${encodeURIComponent(recentPurchase.id)}`}>
                View in Tracking
              </Link>
              <button className="btn secondary" style={{ marginLeft: "0.6rem" }} onClick={() => setShowAll(true)}>
                Show All Purchases
              </button>
            </div>
          </article>
        ) : null}

        {(!orders.length && !recentPurchase) ? (
          <div className="panel empty-panel">No orders yet. Browse products to start your first purchase.</div>
        ) : null}

        {showAll ? (
          orders
            .filter((o) => !(recentPurchase && o.id === recentPurchase.id))
            .map((order) => (
              <article className="panel" key={order.id}>
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: "0.2rem" }}>Order {order.tracking_number || `#${order.id}`}</h3>
                    <p className="meta">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong>{order.status}</strong>
                </div>
                <p className="meta">Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}</p>
              </article>
            ))
        ) : null}

        <div className="row-actions" style={{ marginTop: "1rem" }}>
          {!roleCanManage(user?.role) ? (
            <Link className="btn" to="/tracking">
              Track Order
            </Link>
          ) : null}
          <Link className="btn secondary" to="/shop">
            Continue shopping
          </Link>
        </div>
      </section>
    </section>
  );
}
