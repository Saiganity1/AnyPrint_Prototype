import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { upsertCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { normalizeProduct } from "../lib/normalize";
import { addRecentlyViewed } from "../lib/recent";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(`products/${encodeURIComponent(slug)}/`);
        const body = await readJsonSafe(response);
        if (!response.ok) {
          setError(body.error || "Could not load product details.");
          return;
        }

        const payload = normalizeProduct(body && typeof body === "object" && body.product ? body.product : body);

        if (!cancelled) {
          setProduct(payload);
          addRecentlyViewed(payload);

          setSelectedSize(payload?.sizes?.[0] || "M");
          setSelectedColor(payload?.colors?.[0] || "Black");
        }
      } catch {
        if (!cancelled) {
          setError("Could not load product details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <section className="panel">Loading product details...</section>;
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error-text">{error}</p>
        <Link className="btn" to="/shop">
          Back to Shop
        </Link>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  const sizes = product.sizes?.length ? product.sizes : ["M", "L", "XL"];
  const colors = product.colors?.length ? product.colors : ["Black", "White"];

  function addToCart() {
    const key = `${product.id}|${selectedSize || "M"}|${selectedColor || "Black"}`;

    upsertCartItem({
      key,
      product_id: product.id,
      variant_id: null,
      quantity: 1,
      size: selectedSize || "M",
      color: selectedColor || "Black",
      product_name: product.name,
      unit_price: product.price,
      image_url: product.image_url || "",
    });
    setMessage("Added to cart.");
  }

  return (
    <section className="product-page">
      <div className="page-intro">
        <p className="page-kicker">Product Detail</p>
        <h2 className="page-title">Product view</h2>
        <p className="page-lead">
          Check shirt details, choose your size and color, then add to cart or proceed to checkout.
        </p>
      </div>

      <Link className="plain-inline" to="/shop">
        ← Back to shop
      </Link>

      <section className="panel product-detail-shell">
        <div className="product-detail-grid">
          <div>
            {product.image_url ? (
              <img className="product-detail-image" src={product.image_url} alt={product.name} />
            ) : (
              <div className="image-fallback">No image</div>
            )}
          </div>

          <div>
            <p className="kicker">{product.category || "Shirt"}</p>
            <h2>{product.name}</h2>
            <p className="price large">{formatPrice(product.price)}</p>
            <p className="lead">{product.description || "No description yet."}</p>
            <p className="meta">Print style: {product.print_style || "Standard"}</p>
            <p className="meta">Stock: {product.stock_quantity ?? 0}</p>

            {sizes.length ? (
              <div className="variant-grid">
                <div className="form-grid">
                  <label htmlFor="size">Size</label>
                  <select id="size" value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>
                    {sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-grid">
                  <label htmlFor="color">Color</label>
                  <select id="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
                    {colors.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : null}

            <div className="row-actions">
              <button type="button" className="btn" onClick={addToCart}>
                Add to Cart
              </button>
              <Link className="btn secondary" to="/checkout">
                Go to Checkout
              </Link>
              <Link className="btn secondary" to="/shop">
                Back to Shop
              </Link>
            </div>
            {message ? <p className="status-text">{message}</p> : null}
          </div>
        </div>
      </section>
    </section>
  );
}
