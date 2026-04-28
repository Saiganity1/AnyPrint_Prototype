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

  const createVariantRow = () => ({ size: "", color: "Black", stock: "" });

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("Loading owner dashboard...");
  const [error, setError] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
  });
  const [variants, setVariants] = useState([createVariantRow()]);
  const [imageFiles, setImageFiles] = useState([]);

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

    const normalizedVariants = variants
      .map((variant) => ({
        size: String(variant.size || "").trim(),
        color: String(variant.color || "").trim(),
        stock: Number(variant.stock || 0),
      }))
      .filter((variant) => variant.size && variant.color && Number.isFinite(variant.stock));

    if (!normalizedVariants.length) {
      setError("Add at least one variant with size, color, and stock.");
      return;
    }

    if (!imageFiles.length) {
      setError("Please choose at least one image file.");
      return;
    }

    const totalStock = normalizedVariants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
    const sizes = [...new Set(normalizedVariants.map((variant) => variant.size))].join(",");
    const colors = [...new Set(normalizedVariants.map((variant) => variant.color))].join(",");

    const formData = new FormData();
    formData.append("name", newProduct.name.trim());
    formData.append("description", newProduct.description.trim());
    formData.append("price", String(Number(newProduct.price || 0)));
    formData.append("stock", String(totalStock));
    formData.append("sizes", sizes);
    formData.append("colors", colors);
    formData.append("variants", JSON.stringify(normalizedVariants));
    imageFiles.forEach((file) => formData.append("images", file));

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
      });
      setVariants([createVariantRow()]);
      setImageFiles([]);
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
          </div>
          <textarea rows={3} placeholder="Description" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} required />

          <div className="variant-builder">
            <div className="row-between">
              <h4>Variant Stock</h4>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setVariants((current) => [...current, createVariantRow()])}
              >
                Add Variant
              </button>
            </div>

            <div className="variant-builder-list">
              {variants.map((variant, index) => (
                <div className="variant-builder-row" key={`variant-${index}`}>
                  <input
                    placeholder="Size"
                    value={variant.size}
                    onChange={(e) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, size: e.target.value } : item)))}
                    required
                  />
                  <input
                    placeholder="Color"
                    value={variant.color}
                    onChange={(e) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, color: e.target.value } : item)))}
                    required
                  />
                  <input
                    placeholder="Stock"
                    type="number"
                    min="0"
                    step="1"
                    value={variant.stock}
                    onChange={(e) => setVariants((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, stock: e.target.value } : item)))}
                    required
                  />
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setVariants((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    disabled={variants.length === 1}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="upload-panel">
            <label className="upload-label" htmlFor="product-images">Product Images</label>
            <input
              id="product-images"
              key={imageFiles.length ? imageFiles.map((file) => file.name).join("|") : "empty"}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
              required
            />
            <p className="meta">You can upload multiple images. The first image becomes the cover image.</p>
          </div>

          {imageFiles.length ? <p className="status-text">{imageFiles.length} image(s) selected.</p> : null}
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
