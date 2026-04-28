import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
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

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">User Dashboard</p>
        <h2 className="page-title">My Orders</h2>
        <p className="page-lead">Welcome, {displayName}. Review your recent purchases here.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

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
            </article>
          ))
        ) : (
          <div className="panel empty-panel">No orders yet. Browse products to start your first purchase.</div>
        )}
      </section>

      <div className="row-actions" style={{ marginTop: "1rem" }}>
        <Link className="btn secondary" to="/shop">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
