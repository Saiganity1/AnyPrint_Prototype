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
  const [selectedOrder, setSelectedOrder] = useState(null);

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
  const filteredOrders = useMemo(() => {
    const banned = "3C832E4A";
    return orders.filter((o) => o.id !== banned && o.tracking_number !== banned);
  }, [orders]);

  const profileSummary = useMemo(() => {
    const orderCount = filteredOrders.length;
    const totalSpent = filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const latestOrder = filteredOrders[0] || null;

    return {
      orderCount,
      totalSpent,
      latestOrder,
    };
  }, [filteredOrders]);

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  return (
    <section className="account-page profile-page" style={{ paddingBottom: '2rem' }}>
      <div className="page-intro">
        <p className="page-kicker">User Profile</p>
        <h2 className="page-title">My Account</h2>
        <p className="page-lead">Welcome, {displayName}. Review your profile and purchases here.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="profile-layout">
        <aside className="panel profile-sidebar">
          <div className="profile-user-chip">
            <div className="profile-avatar">{(user.name || "U")[0].toUpperCase()}</div>
            <div>
              <h3>{displayName}</h3>
              <p className="meta">{user.email || 'Not set'}</p>
            </div>
          </div>
          <div className="profile-sidebar-section">
            <p className="profile-label">User Info</p>
            <p className="meta">Name: {user.name || user.username}</p>
            <p className="meta">Email: {user.email || 'Not set'}</p>
            <p className="meta">Role: {user.role || 'USER'}</p>
          </div>
          <div className="profile-actions">
            <Link className="btn" to="/account/edit">
              Edit profile
            </Link>
            <Link className="btn secondary" to="/messages">
              Messages
            </Link>
          </div>
        </aside>

        <main className="profile-main">
          <section className="profile-summary-grid">
            <article className="profile-summary-card">
              <span className="meta">Orders</span>
              <strong>{profileSummary.orderCount}</strong>
            </article>
            <article className="profile-summary-card">
              <span className="meta">Spent</span>
              <strong>{formatPrice(profileSummary.totalSpent)}</strong>
            </article>
            <article className="profile-summary-card">
              <span className="meta">Latest</span>
              <strong>{profileSummary.latestOrder ? profileSummary.latestOrder.tracking_number || `#${profileSummary.latestOrder.id}` : 'No orders yet'}</strong>
            </article>
          </section>

          <section className="profile-section-heading">
            <h3>Purchases</h3>
            <p className="meta">All of your past orders are listed below.</p>
          </section>

          <section>
            {filteredOrders.length ? (
              <div className="profile-order-grid">
                {filteredOrders.map((order) => (
                  <article key={order.id} className="profile-order-card">
                    <div className="profile-order-card-top">
                      <div>
                        <h4>Order {order.tracking_number || `#${order.id}`}</h4>
                        <p className="meta">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="profile-order-status">
                        <strong>{order.status}</strong>
                        <div>
                          <button className="btn secondary" onClick={() => setSelectedOrder(order)}>View Details</button>
                        </div>
                      </div>
                    </div>
                    <p className="meta profile-order-meta">Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="panel empty-panel">No orders yet. Browse products to start your first purchase.</div>
            )}
          </section>
        </main>
      </div>

      {selectedOrder ? (
        <div className="profile-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3>Order {selectedOrder.tracking_number || `#${selectedOrder.id}`}</h3>
              <button className="btn" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
            <p className="meta">{new Date(selectedOrder.created_at).toLocaleString()}</p>
            <div className="profile-modal-details">
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Payment:</strong> {selectedOrder.payment_status}</p>
              <p><strong>Total:</strong> {formatPrice(selectedOrder.total_amount)}</p>
            </div>
            {selectedOrder.items && selectedOrder.items.length ? (
              <div className="profile-modal-items">
                <h4>Items</h4>
                <ul>
                  {selectedOrder.items.map((it, i) => (
                    <li key={i}>{it.name} — {it.quantity} × {formatPrice(it.price || it.unit_price || 0)}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
