import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { loadRecentlyViewed } from "../lib/recent";

export default function WishlistPage() {
  const user = getStoredUser();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("Loading wishlist...");
  const [error, setError] = useState("");
  const recentlyViewed = loadRecentlyViewed();

  useEffect(() => {
    let cancelled = false;

    async function loadWishlist() {
      setError("");
      setStatus("Loading wishlist...");
      try {
        const response = await apiRequest("wishlist/");
        const body = await readJsonSafe(response);
        if (!response.ok) {
          throw new Error(normalizeApiError(body, "Could not load wishlist."));
        }

        const nextItems = Array.isArray(body.items) ? body.items : [];
        if (!cancelled) {
          setItems(nextItems);
          setStatus(nextItems.length ? "Your saved shirts." : "Your wishlist is empty.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load wishlist.");
          setStatus("Could not load wishlist.");
        }
      }
    }

    loadWishlist();
    return () => {
      cancelled = true;
    };
  }, []);

  async function removeItem(productId) {
    try {
      const response = await apiRequest("wishlist/toggle/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Could not update wishlist."));
      }

      setItems((prev) => prev.filter((item) => Number(item.product?.id) !== Number(productId)));
    } catch (toggleError) {
      setError(toggleError.message || "Could not update wishlist.");
    }
  }

  if (!user) {
    return <Navigate to="/login?next=%2Fwishlist" replace />;
  }

  return (
    <section>
      <div className="row-between">
        <h2>Wishlist</h2>
        <p className="status-text">{items.length} item{items.length === 1 ? "" : "s"}</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="product-grid">
        {items.map((entry) => {
          const product = entry.product || {};
          const stableKey = String(product.id || entry.id || entry.product_id || product.slug || "wishlist-item");
          return (
            <article className="product-card" key={stableKey}>
              <Link to={`/products/${encodeURIComponent(product.slug || "")}`} className="product-image-link">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name || "Product"} loading="lazy" />
                ) : (
                  <div className="image-fallback">No image</div>
                )}
              </Link>
              <div className="card-body">
                <h3>{product.name}</h3>
                <p className="meta">{product.category || "Uncategorized"}</p>
                <p className="price">{formatPrice(product.price)}</p>
                <div className="row-actions">
                  <button type="button" className="btn secondary" onClick={() => removeItem(product.id)}>
                    Remove
                  </button>
                  <Link className="btn" to={`/products/${encodeURIComponent(product.slug || "")}`}>
                    View
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!items.length ? (
        <div className="panel empty-panel">
          <h3>No saved shirts yet.</h3>
          <p className="lead">Tap wishlist from a product to save it here.</p>
          <Link className="btn secondary" to="/shop">
            Browse shirts
          </Link>
        </div>
      ) : null}

      <section className="panel" style={{ marginTop: "1rem" }}>
        <h3>Recently Viewed</h3>
        <div className="product-grid">
          {recentlyViewed.slice(0, 6).map((item) => (
            <article className="product-card" key={item.identifier || item.slug || item.id}>
              <Link to={item.slug ? `/products/${encodeURIComponent(item.slug)}` : "/shop"} className="product-image-link">
                {item.image_url ? <img src={item.image_url} alt={item.name || "Recently viewed"} loading="lazy" /> : <div className="image-fallback">No image</div>}
              </Link>
              <div className="card-body">
                <h3>{item.name || "Recently viewed"}</h3>
                <p className="meta">{item.category || item.print_style || "Recently viewed"}</p>
                <p className="price">{formatPrice(item.price)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
