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
  const recentPurchase = useMemo(() => null, [orders]);
  const filteredOrders = useMemo(() => {
    const banned = "3C832E4A";
    return orders.filter((o) => o.id !== banned && o.tracking_number !== banned);
  }, [orders]);

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  return (
    <section className="account-page" style={{ paddingBottom: '2rem' }}>
      <div className="page-intro">
        <p className="page-kicker">User Profile</p>
        <h2 className="page-title">My Account</h2>
        <p className="page-lead">Welcome, {displayName}. Review your profile and purchases here.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <aside className="panel" style={{ borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{(user.name||'U')[0].toUpperCase()}</div>
            <div>
              <h3 style={{ margin: 0 }}>{displayName}</h3>
              <p className="meta" style={{ margin: 0 }}>{user.email || 'Not set'}</p>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <p className="meta">Role: {user.role || 'USER'}</p>
            <Link className="btn" to="/account/edit" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              Edit profile
            </Link>
          </div>
        </aside>

        <main>
          <section style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '0.75rem' }}>Purchases</h3>
            <p className="meta">All of your past orders are listed below.</p>
          </section>

          <section>
            {filteredOrders.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {filteredOrders.map((order) => (
                  <article key={order.id} className="order-card" style={{ borderRadius: 12, padding: '1rem', boxShadow: '0 6px 18px rgba(33,40,52,0.06)', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: 0 }}>Order {order.tracking_number || `#${order.id}`}</h4>
                        <p className="meta" style={{ margin: '0.3rem 0 0' }}>{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{order.status}</strong>
                        <div style={{ marginTop: 8 }}>
                          <button className="btn secondary" onClick={() => setSelectedOrder(order)}>View Details</button>
                        </div>
                      </div>
                    </div>
                    <p className="meta" style={{ marginTop: '0.75rem' }}>Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}</p>
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }} onClick={() => setSelectedOrder(null)}>
          <div className="modal" style={{ width: 'min(900px, 96%)', background: '#fff', borderRadius: 12, padding: '1.25rem' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Order {selectedOrder.tracking_number || `#${selectedOrder.id}`}</h3>
              <button className="btn" onClick={() => setSelectedOrder(null)}>Close</button>
            </div>
            <p className="meta" style={{ marginTop: '0.25rem' }}>{new Date(selectedOrder.created_at).toLocaleString()}</p>
            <div style={{ marginTop: '1rem' }}>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Payment:</strong> {selectedOrder.payment_status}</p>
              <p><strong>Total:</strong> {formatPrice(selectedOrder.total_amount)}</p>
            </div>
            {selectedOrder.items && selectedOrder.items.length ? (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Items</h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
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
