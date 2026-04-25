import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser, roleCanManage } from "../lib/auth";
import { formatPrice } from "../lib/format";

const ORDER_STATUS_OPTIONS = [
  "PENDING",
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const ROLE_OPTIONS = ["OWNER", "ADMIN", "USER"];

export default function AdminPage() {
  const user = getStoredUser();
  const isOwner = String(user?.role || "").toUpperCase() === "OWNER";

  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [statusText, setStatusText] = useState("Loading admin dashboard...");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError("");
      setStatusText("Loading admin dashboard...");
      try {
        const [dashRes, usersRes] = await Promise.all([
          apiRequest("admin/dashboard/"),
          isOwner ? apiRequest("admin/users/") : Promise.resolve(null),
        ]);

        const dashBody = await readJsonSafe(dashRes);
        if (!dashRes.ok) {
          throw new Error(normalizeApiError(dashBody, "Could not load dashboard."));
        }

        let usersBody = { users: [] };
        if (usersRes) {
          usersBody = await readJsonSafe(usersRes);
          if (!usersRes.ok) {
            throw new Error(normalizeApiError(usersBody, "Could not load users."));
          }
        }

        if (!cancelled) {
          setDashboard(dashBody);
          setUsers(Array.isArray(usersBody.users) ? usersBody.users : []);
          setStatusText("Dashboard loaded.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load admin dashboard.");
          setStatusText("Could not load admin dashboard.");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  const filteredOrders = useMemo(() => {
    const items = dashboard?.recent_orders || [];
    return items.filter((order) => {
      if (statusFilter && String(order.status || "").toUpperCase() !== statusFilter) return false;
      if (!search.trim()) return true;
      const haystack = [
        order.id,
        order.full_name,
        order.tracking_number,
        order.payment_method,
        order.payment_status,
        order.email,
      ]
        .map((value) => String(value || "").toLowerCase())
        .join(" ");
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [dashboard, search, statusFilter]);

  if (!user || !roleCanManage(user.role)) {
    return <Navigate to="/login?next=%2Fadmin" replace />;
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const response = await apiRequest(`admin/orders/${orderId}/status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not update order status."));
      }

      const refresh = await apiRequest("admin/dashboard/");
      const refreshBody = await readJsonSafe(refresh);
      if (refresh.ok) {
        setDashboard(refreshBody);
      }
    } catch (orderError) {
      setError(orderError.message || "Could not update order status.");
    }
  }

  async function updateUserRole(userId, role) {
    try {
      const response = await apiRequest(`admin/users/${userId}/role/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not update role."));
      }
      setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, role } : item)));
    } catch (roleError) {
      setError(roleError.message || "Could not update role.");
    }
  }

  const metrics = dashboard?.metrics || {};

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <p className="status-text">{statusText}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="metrics-grid">
        <article className="metric-card"><span>Total Orders</span><strong>{metrics.total_orders || 0}</strong></article>
        <article className="metric-card"><span>Paid Orders</span><strong>{metrics.paid_orders || 0}</strong></article>
        <article className="metric-card"><span>Total Sales</span><strong>{formatPrice(metrics.total_sales || 0)}</strong></article>
        <article className="metric-card"><span>Low Stock Products</span><strong>{metrics.low_stock_products || 0}</strong></article>
        <article className="metric-card"><span>Low Stock Variants</span><strong>{metrics.low_stock_variants || 0}</strong></article>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Top Products</h3>
        {(dashboard?.top_products || []).length ? (
          <div className="orders-stack">
            {(dashboard?.top_products || []).map((item, index) => (
              <article className="checkout-item" key={`${item.product_id}-${index}`}>
                <div>
                  <strong>#{index + 1} {item.product__name || "Product"}</strong>
                  <p className="meta">{item.product__slug || ""}</p>
                </div>
                <strong>{item.quantity_sold || 0} sold</strong>
              </article>
            ))}
          </div>
        ) : <p className="meta">No sales data yet.</p>}
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="row-between">
          <h3>Recent Orders</h3>
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
              {ORDER_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className="orders-stack">
          {filteredOrders.length ? filteredOrders.map((order) => (
            <article className="checkout-item" key={order.id}>
              <div>
                <strong>#{order.id} {order.full_name}</strong>
                <p className="meta">{order.tracking_number || ""} • {order.payment_method || ""} • {order.payment_status || ""}</p>
                <p className="meta">{order.created_at || ""}</p>
              </div>
              <div className="inline-form wrap">
                <select defaultValue={order.status || "PENDING"} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                  {ORDER_STATUS_OPTIONS.map((status) => <option key={`${order.id}-${status}`} value={status}>{status}</option>)}
                </select>
                <strong>{formatPrice(order.total_amount || 0)}</strong>
              </div>
            </article>
          )) : <p className="meta">No recent orders.</p>}
        </div>
      </section>

      {isOwner ? (
        <section className="panel">
          <h3>Users</h3>
          <div className="orders-stack">
            {users.length ? users.map((item) => (
              <article className="checkout-item" key={item.id}>
                <div>
                  <strong>{item.username}</strong>
                  <p className="meta">{item.email || ""} • {item.order_count || 0} orders</p>
                </div>
                <div className="inline-form wrap">
                  <select defaultValue={item.role || "USER"} onChange={(event) => updateUserRole(item.id, event.target.value)}>
                    {ROLE_OPTIONS.map((role) => <option key={`${item.id}-${role}`} value={role}>{role}</option>)}
                  </select>
                </div>
              </article>
            )) : <p className="meta">No users found.</p>}
          </div>
        </section>
      ) : null}
    </section>
  );
}
