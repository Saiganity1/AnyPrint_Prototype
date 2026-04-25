import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
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

export default function OwnerDashboardPage() {
  const user = getStoredUser();
  const isOwner = String(user?.role || "").toUpperCase() === "OWNER";

  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("Loading owner homepage...");
  const [error, setError] = useState("");

  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    price: "",
    stock_quantity: "",
    print_style: "Classic",
    description: "",
    is_featured: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setError("");
      setStatus("Loading owner homepage...");
      try {
        const [dashRes, analyticsRes, productsRes] = await Promise.all([
          apiRequest("admin/dashboard/"),
          apiRequest("admin/analytics/"),
          apiRequest("admin/products/?page_size=200"),
        ]);

        const [dashBody, analyticsBody, productsBody] = await Promise.all([
          readJsonSafe(dashRes),
          readJsonSafe(analyticsRes),
          readJsonSafe(productsRes),
        ]);

        if (!dashRes.ok) throw new Error(normalizeApiError(dashBody, "Could not load owner dashboard."));
        if (!analyticsRes.ok) throw new Error(normalizeApiError(analyticsBody, "Could not load analytics."));
        if (!productsRes.ok) throw new Error(normalizeApiError(productsBody, "Could not load products."));

        if (!cancelled) {
          setDashboard(dashBody);
          setAnalytics(analyticsBody);
          setProducts(Array.isArray(productsBody.products) ? productsBody.products : []);
          setStatus("Owner homepage ready.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load owner homepage.");
          setStatus("Could not load owner homepage.");
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isOwner) {
    return <Navigate to="/login?next=%2Fowner" replace />;
  }

  const metrics = analytics?.metrics || {};

  const filteredOrders = (dashboard?.recent_orders || []).filter((order) => {
    if (orderStatus && String(order.status || "").toUpperCase() !== orderStatus) return false;
    if (!orderSearch.trim()) return true;
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
    return haystack.includes(orderSearch.toLowerCase());
  });

  async function reloadData() {
    const [dashRes, analyticsRes, productsRes] = await Promise.all([
      apiRequest("admin/dashboard/"),
      apiRequest("admin/analytics/"),
      apiRequest("admin/products/?page_size=200"),
    ]);
    const [dashBody, analyticsBody, productsBody] = await Promise.all([
      readJsonSafe(dashRes),
      readJsonSafe(analyticsRes),
      readJsonSafe(productsRes),
    ]);

    if (dashRes.ok) setDashboard(dashBody);
    if (analyticsRes.ok) setAnalytics(analyticsBody);
    if (productsRes.ok) setProducts(Array.isArray(productsBody.products) ? productsBody.products : []);
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const response = await apiRequest(`admin/orders/${orderId}/status/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) throw new Error(normalizeApiError(body, "Could not update order status."));
      await reloadData();
    } catch (orderError) {
      setError(orderError.message || "Could not update order status.");
    }
  }

  async function restockProduct(productId, quantity, mode) {
    try {
      const response = await apiRequest(`admin/products/${productId}/restock/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, mode }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) throw new Error(normalizeApiError(body, "Could not restock product."));
      await reloadData();
    } catch (stockError) {
      setError(stockError.message || "Could not restock product.");
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    setError("");

    const payload = {
      name: String(newProduct.name || "").trim(),
      category: String(newProduct.category || "").trim(),
      price: Number(newProduct.price || 0),
      stock_quantity: Number(newProduct.stock_quantity || 0),
      print_style: String(newProduct.print_style || "Classic").trim(),
      description: String(newProduct.description || "").trim(),
      is_featured: Boolean(newProduct.is_featured),
      is_active: true,
    };

    try {
      const response = await apiRequest("admin/products/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) throw new Error(normalizeApiError(body, "Could not create product."));
      setNewProduct({
        name: "",
        category: "",
        price: "",
        stock_quantity: "",
        print_style: "Classic",
        description: "",
        is_featured: false,
      });
      await reloadData();
    } catch (createError) {
      setError(createError.message || "Could not create product.");
    }
  }

  return (
    <section>
      <h2>Owner Dashboard</h2>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="metrics-grid">
        <article className="metric-card"><span>Total Revenue</span><strong>{formatPrice(metrics.total_revenue || 0)}</strong></article>
        <article className="metric-card"><span>Total Orders</span><strong>{metrics.total_orders || 0}</strong></article>
        <article className="metric-card"><span>Completed Orders</span><strong>{metrics.completed_orders || 0}</strong></article>
        <article className="metric-card"><span>Average Order Value</span><strong>{formatPrice(metrics.average_order_value || 0)}</strong></article>
        <article className="metric-card"><span>Low Stock Products</span><strong>{dashboard?.metrics?.low_stock_products || 0}</strong></article>
        <article className="metric-card"><span>Low Stock Variants</span><strong>{dashboard?.metrics?.low_stock_variants || 0}</strong></article>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Add Product</h3>
        <form className="form-grid" onSubmit={createProduct}>
          <div className="owner-form-grid">
            <input placeholder="Product name" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Category" value={newProduct.category} onChange={(e) => setNewProduct((p) => ({ ...p, category: e.target.value }))} />
            <input placeholder="Price" type="number" min="1" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} required />
            <input placeholder="Initial stock" type="number" min="0" step="1" value={newProduct.stock_quantity} onChange={(e) => setNewProduct((p) => ({ ...p, stock_quantity: e.target.value }))} required />
            <select value={newProduct.print_style} onChange={(e) => setNewProduct((p) => ({ ...p, print_style: e.target.value }))}>
              <option value="Classic">Classic</option>
              <option value="Minimal">Minimal</option>
              <option value="Graphic">Graphic</option>
              <option value="Street">Street</option>
              <option value="Kids">Kids</option>
            </select>
          </div>
          <textarea rows={3} placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
          <label className="password-toggle">
            <input type="checkbox" checked={newProduct.is_featured} onChange={(e) => setNewProduct((p) => ({ ...p, is_featured: e.target.checked }))} />
            Featured product
          </label>
          <button className="btn" type="submit">Create Product</button>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Sales Snapshot</h3>
        {(analytics?.top_products || []).length ? (
          <div className="orders-stack">
            {(analytics?.top_products || []).slice(0, 6).map((item, index) => (
              <article className="checkout-item" key={`${item.product_id}-${index}`}>
                <strong>#{index + 1} {item.product_name || item.product__name || "Product"}</strong>
                <span>{item.quantity_sold || 0} sold</span>
              </article>
            ))}
          </div>
        ) : <p className="meta">No top products yet.</p>}
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <div className="row-between">
          <h3>Recent Orders</h3>
          <div className="inline-form wrap">
            <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Search orders" />
            <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}>
              <option value="">All statuses</option>
              {ORDER_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </div>

        <div className="orders-stack">
          {filteredOrders.length ? filteredOrders.map((order) => (
            <article className="checkout-item" key={order.id}>
              <div>
                <strong>#{order.id} {order.full_name || ""}</strong>
                <p className="meta">{order.tracking_number || ""} • {order.payment_method || ""} • {order.payment_status || ""}</p>
                <p className="meta">{order.status || ""} • {order.created_at || ""}</p>
              </div>
              <div className="inline-form wrap">
                <select defaultValue={order.status || "PENDING"} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                  {ORDER_STATUS_OPTIONS.map((status) => <option key={`${order.id}-${status}`} value={status}>{status}</option>)}
                </select>
                <strong>{formatPrice(order.total_amount || 0)}</strong>
              </div>
            </article>
          )) : <p className="meta">No recent orders match your filters.</p>}
        </div>
      </section>

      <section className="panel">
        <h3>Products and Restock</h3>
        <div className="orders-stack">
          {products.length ? products.map((product) => (
            <article className="checkout-item" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p className="meta">{product.category || "Uncategorized"} • {formatPrice(product.price)}</p>
              </div>
              <div className="inline-form wrap">
                <strong>Stock: {product.stock_quantity}</strong>
                <button className="btn secondary" type="button" onClick={() => restockProduct(product.id, 1, "increment")}>+1</button>
                <button className="btn secondary" type="button" onClick={() => restockProduct(product.id, 5, "increment")}>+5</button>
                <button className="btn secondary" type="button" onClick={() => {
                  const qty = Number(prompt("Set stock quantity:", String(product.stock_quantity || 0)));
                  if (Number.isFinite(qty) && qty >= 0) {
                    restockProduct(product.id, qty, "set");
                  }
                }}>Set</button>
              </div>
            </article>
          )) : <p className="meta">No products found.</p>}
        </div>
      </section>
    </section>
  );
}
