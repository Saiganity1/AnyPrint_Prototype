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
  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
          setActiveImageIndex(0);
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
  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
  const activeImage = images[activeImageIndex] || product.image_url || "";
  const selectedVariant =
    product.variants?.find((variant) => variant.size === selectedSize && variant.color === selectedColor) || null;
  const availableStock = selectedVariant?.stock ?? product.stock_quantity ?? 0;

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
          <div className="product-media-panel">
            {activeImage ? (
              <div className="product-detail-media">
                <img className="product-detail-image" src={activeImage} alt={product.name} />
              </div>
            ) : (
              <div className="product-detail-media image-fallback">No image</div>
            )}

            {images.length > 1 ? (
              <div className="image-rail">
                {images.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    className={`image-thumb ${index === activeImageIndex ? "active" : ""}`}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img src={image} alt={`${product.name} preview ${index + 1}`} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div>
            <p className="kicker">{product.category || "Shirt"}</p>
            <h2>{product.name}</h2>
            <p className="price large">{formatPrice(product.price)}</p>
            <p className="lead">{product.description || "No description yet."}</p>
            <p className="meta">Print style: {product.print_style || "Standard"}</p>
            <p className="meta">Stock: {availableStock}</p>

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
            {Array.isArray(product.variants) && product.variants.length ? (
              <div className="variant-table-wrap">
                <h3 className="variant-title">Variant Stock</h3>
                <div className="variant-table">
                  {product.variants.map((variant, index) => (
                    <div className="variant-row-view" key={`${variant.size}-${variant.color}-${index}`}>
                      <span>{variant.size || "-"}</span>
                      <span>{variant.color || "-"}</span>
                      <strong>{Number(variant.stock || 0)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {message ? <p className="status-text">{message}</p> : null}
          </div>
        </div>
      </section>
    </section>
  );
}
