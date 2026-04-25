import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { upsertCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";
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

        if (!cancelled) {
          setProduct(body);
          addRecentlyViewed(body);

          const firstVariant = Array.isArray(body.variants) && body.variants.length ? body.variants[0] : null;
          if (firstVariant) {
            setSelectedSize(firstVariant.size || "M");
            setSelectedColor(firstVariant.color || "Black");
          }
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

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const sizes = [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
  const colors = [...new Set(variants.map((variant) => variant.color).filter(Boolean))];

  function getSelectedVariant() {
    const exact = variants.find(
      (variant) =>
        String(variant.size || "") === String(selectedSize || "") &&
        String(variant.color || "").toLowerCase() === String(selectedColor || "").toLowerCase(),
    );
    return exact || variants[0] || null;
  }

  function addToCart() {
    const variant = getSelectedVariant();
    const key = variant?.id
      ? `variant:${variant.id}`
      : `${product.id}|${selectedSize || "M"}|${selectedColor || "Black"}`;

    upsertCartItem({
      key,
      product_id: product.id,
      variant_id: variant?.id || null,
      quantity: 1,
      size: selectedSize || variant?.size || "M",
      color: selectedColor || variant?.color || "Black",
      product_name: product.name,
      unit_price: product.price,
      image_url: product.image_url || "",
    });
    setMessage("Added to cart.");
  }

  return (
    <section className="panel product-detail-panel">
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
            <div className="form-grid" style={{ marginTop: "0.7rem", maxWidth: "360px" }}>
              <label htmlFor="size">Size</label>
              <select id="size" value={selectedSize} onChange={(event) => setSelectedSize(event.target.value)}>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>

              <label htmlFor="color">Color</label>
              <select id="color" value={selectedColor} onChange={(event) => setSelectedColor(event.target.value)}>
                {colors.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
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
  );
}
