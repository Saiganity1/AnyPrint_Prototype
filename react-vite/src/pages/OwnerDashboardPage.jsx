import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { normalizeOrders, normalizeProducts } from "../lib/normalize";

const ORDER_STATUS_OPTIONS = ["pending", "paid", "shipped", "completed", "cancelled"];

export default function OwnerDashboardPage() {
  const user = getStoredUser();
  const isOwner = String(user?.role || "").toUpperCase() === "OWNER";

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("Loading owner dashboard...");
  const [error, setError] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    sizes: "S,M,L,XL",
    colors: "Black,White",
  });
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setError("");
      setStatus("Loading owner dashboard...");
      try {
        const [ordersRes, productsRes] = await Promise.all([apiRequest("orders/"), apiRequest("products/")]);
        const [ordersBody, productsBody] = await Promise.all([readJsonSafe(ordersRes), readJsonSafe(productsRes)]);
        if (!ordersRes.ok) throw new Error(normalizeApiError(ordersBody, "Could not load orders."));
        if (!productsRes.ok) throw new Error(normalizeApiError(productsBody, "Could not load products."));

        if (!cancelled) {
          setOrders(normalizeOrders(ordersBody));
          setProducts(normalizeProducts(productsBody));
          setStatus("Owner dashboard ready.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load owner dashboard.");
          setStatus("Could not load owner dashboard.");
        }
      }
    }

    loadAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(
    () => ({
      total_revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
      total_orders: orders.length,
      completed_orders: orders.filter((order) => String(order.status || "").toLowerCase() === "completed").length,
      low_stock_products: products.filter((product) => Number(product.stock_quantity || 0) <= 5).length,
    }),
    [orders, products],
  );

  if (!isOwner) {
    return <Navigate to="/login?next=%2Fowner" replace />;
  }

  async function reloadData() {
    const [ordersRes, productsRes] = await Promise.all([apiRequest("orders/"), apiRequest("products/")]);
    const [ordersBody, productsBody] = await Promise.all([readJsonSafe(ordersRes), readJsonSafe(productsRes)]);
    if (ordersRes.ok) setOrders(normalizeOrders(ordersBody));
    if (productsRes.ok) setProducts(normalizeProducts(productsBody));
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const response = await apiRequest(`orders/${orderId}`, {
        method: "PUT",
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

  async function updateProduct(productId, updates) {
    try {
      const response = await apiRequest(`products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) throw new Error(normalizeApiError(body, "Could not update product."));
      await reloadData();
    } catch (stockError) {
      setError(stockError.message || "Could not update product.");
    }
  }

  async function createProduct(event) {
    event.preventDefault();
    setError("");

    if (!imageFile) {
      setError("Please choose an image file.");
      return;
    }

    const formData = new FormData();
    formData.append("name", newProduct.name.trim());
    formData.append("description", newProduct.description.trim());
    formData.append("price", String(Number(newProduct.price || 0)));
    formData.append("stock", String(Number(newProduct.stock || 0)));
    formData.append("sizes", newProduct.sizes);
    formData.append("colors", newProduct.colors);
    formData.append("image", imageFile);

    try {
      const response = await apiRequest("products/", {
        method: "POST",
        body: formData,
      });
      const body = await readJsonSafe(response);
      if (!response.ok) throw new Error(normalizeApiError(body, "Could not create product."));
      setNewProduct({
        name: "",
        description: "",
        price: "",
        stock: "",
        sizes: "S,M,L,XL",
        colors: "Black,White",
      });
      setImageFile(null);
      await reloadData();
    } catch (createError) {
      setError(createError.message || "Could not create product.");
    }
  }

  return (
    <section className="dashboard-page">
      <div className="page-intro">
        <p className="page-kicker">Owner Console</p>
        <h2 className="page-title">Owner Dashboard</h2>
        <p className="page-lead">Track sales, create products, and manage stock from one place.</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <section className="metrics-grid">
        <article className="metric-card"><span>Total Revenue</span><strong>{formatPrice(metrics.total_revenue)}</strong></article>
        <article className="metric-card"><span>Total Orders</span><strong>{metrics.total_orders}</strong></article>
        <article className="metric-card"><span>Completed Orders</span><strong>{metrics.completed_orders}</strong></article>
        <article className="metric-card"><span>Low Stock Products</span><strong>{metrics.low_stock_products}</strong></article>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Add Product</h3>
        <form className="form-grid" onSubmit={createProduct}>
          <div className="owner-form-grid">
            <input placeholder="Product name" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} required />
            <input placeholder="Price" type="number" min="1" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} required />
            <input placeholder="Initial stock" type="number" min="0" step="1" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} required />
            <input placeholder="Sizes: S,M,L,XL" value={newProduct.sizes} onChange={(e) => setNewProduct((p) => ({ ...p, sizes: e.target.value }))} />
            <input placeholder="Colors: Black,White" value={newProduct.colors} onChange={(e) => setNewProduct((p) => ({ ...p, colors: e.target.value }))} />
            <input
              key={imageFile ? imageFile.name : "empty"}
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              required
            />
          </div>
          <textarea rows={3} placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} required />
          <button className="btn" type="submit">Create Product</button>
        </form>
      </section>

      <section className="panel" style={{ marginBottom: "1rem" }}>
        <h3>Recent Orders</h3>
        <div className="orders-stack">
          {orders.length ? orders.map((order) => (
            <article className="checkout-item" key={order.id}>
              <div>
                <strong>#{order.id} {order.userId?.name || ""}</strong>
                <p className="meta">{order.userId?.email || ""}</p>
              </div>
              <div className="inline-form wrap">
                <select value={order.status || "pending"} onChange={(e) => updateOrderStatus(order.id, e.target.value)}>
                  {ORDER_STATUS_OPTIONS.map((statusOption) => <option key={`${order.id}-${statusOption}`} value={statusOption}>{statusOption}</option>)}
                </select>
                <strong>{formatPrice(order.total_amount || 0)}</strong>
              </div>
            </article>
          )) : <p className="meta">No orders yet.</p>}
        </div>
      </section>

      <section className="panel">
        <h3>Products and Stock</h3>
        <div className="orders-stack">
          {products.length ? products.map((product) => (
            <article className="checkout-item" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <p className="meta">{formatPrice(product.price)} / Stock: {product.stock_quantity}</p>
              </div>
              <div className="inline-form wrap">
                <button className="btn secondary" type="button" onClick={() => updateProduct(product.id, { stock: Number(product.stock_quantity || 0) + 1 })}>+1</button>
                <button className="btn secondary" type="button" onClick={() => updateProduct(product.id, { stock: Number(product.stock_quantity || 0) + 5 })}>+5</button>
                <button className="btn secondary" type="button" onClick={() => {
                  const qty = Number(prompt("Set stock quantity:", String(product.stock_quantity || 0)));
                  if (Number.isFinite(qty) && qty >= 0) updateProduct(product.id, { stock: qty });
                }}>Set</button>
              </div>
            </article>
          )) : <p className="meta">No products found.</p>}
        </div>
      </section>
    </section>
  );
}
