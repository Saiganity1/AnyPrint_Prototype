import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { upsertCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { normalizeProduct } from "../lib/normalize";
import { addRecentlyViewed } from "../lib/recent";
import Breadcrumb from "../components/Breadcrumb";
import InventoryStatus from "../components/InventoryStatus";
import ImageGallery from "../components/ImageGallery";

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "3XL"];

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
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
  const images = product.images?.length ? product.images : product.image_url ? [product.image_url] : [];
  const selectedVariant =
    product.variants?.find((variant) => variant.size === selectedSize && variant.color === selectedColor) || null;
  const availableStock = selectedVariant?.stock ?? null;

  function addToCart() {
    if (!selectedVariant) {
      setMessage("Please choose a valid size and color combination first.");
      setMessageType("error");
      return;
    }

    if (selectedQuantity < 1) {
      setMessage("Please select a valid quantity.");
      setMessageType("error");
      return;
    }

    if (availableStock !== null && selectedQuantity > availableStock) {
      setMessage(`Cannot add more than ${availableStock} items available.`);
      setMessageType("error");
      return;
    }

    const key = `${product.id}|${selectedSize || "M"}|${selectedColor || "Black"}`;

    upsertCartItem({
      key,
      product_id: product.id,
      variant_id: null,
      quantity: selectedQuantity,
      size: selectedSize || "M",
      color: selectedColor || "Black",
      product_name: product.name,
      unit_price: product.price,
      image_url: product.image_url || "",
    });
    setMessage(`✓ Added ${selectedQuantity} item(s) to cart.`);
    setMessageType("success");
    setTimeout(() => setMessage(""), 3000);
    setSelectedQuantity(1);
  }

  function contactSeller() {
    navigate('/messages', { state: { productId: product.id, productName: product.name } });
  }

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Shop', href: '/shop' },
    { label: product?.category || 'Product', href: null },
    { label: product?.name || 'Detail', href: null },
  ];

  return (
    <section className="product-page">
      <Breadcrumb items={breadcrumbs} />
      
      <div className="page-intro">
        <p className="page-kicker">Product Detail</p>
        <h2 className="page-title">{product?.name || 'Product'}</h2>
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
            <ImageGallery images={images} productName={product.name} />
          </div>

          <div>
            <p className="kicker">{product.category || "Shirt"}</p>
            <h2>{product.name}</h2>
            <p className="price large">{formatPrice(product.price)}</p>
            
            <InventoryStatus stock={availableStock} />
            
            <p className="lead">{product.description || "No description yet."}</p>
            <p className="meta">Print style: {product.print_style || "Standard"}</p>

            {sizes.length ? (
              <div className="variant-grid">
                <div className="form-grid">
                  <label htmlFor="size">Size</label>
                  <div className="size-chip-row compact">
                    {(sizes.length ? sizes : SIZE_ORDER).map((sizeOption) => (
                      <button
                        type="button"
                        key={sizeOption}
                        className={`size-chip ${selectedSize === sizeOption ? "active" : ""}`}
                        onClick={() => setSelectedSize(sizeOption)}
                      >
                        {sizeOption}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-grid">
                  <label htmlFor="color">Color</label>
                  <div className="size-chip-row compact">
                    {colors.map((colorOption) => (
                      <button
                        type="button"
                        key={colorOption}
                        className={`size-chip ${selectedColor === colorOption ? "active" : ""}`}
                        onClick={() => setSelectedColor(colorOption)}
                      >
                        {colorOption}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="form-grid">
              <label htmlFor="quantity">Quantity</label>
              <div className="quantity-selector">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                >
                  -
                </button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max={availableStock ?? 999}
                  value={selectedQuantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      if (availableStock !== null) {
                        setSelectedQuantity(Math.min(val, availableStock));
                      } else {
                        setSelectedQuantity(val);
                      }
                    }
                  }}
                  className="qty-input"
                />
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => {
                    if (availableStock !== null) {
                      setSelectedQuantity(Math.min(selectedQuantity + 1, availableStock));
                    } else {
                      setSelectedQuantity(selectedQuantity + 1);
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div className="row-actions">
              <button type="button" className="btn" onClick={addToCart}>
                Add to Cart
              </button>
              <Link className="btn secondary" to="/checkout">
                Go to Checkout
              </Link>
              <button type="button" className="btn secondary" onClick={contactSeller}>
                Contact Seller
              </button>
              <Link className="btn secondary" to="/shop">
                Back to Shop
              </Link>
            </div>
            {selectedVariant ? (
              <div className="variant-stock-panel">
                <h3 className="variant-title">Selected Variant</h3>
                <div className="variant-row-view selected">
                  <span>{selectedVariant.size}</span>
                  <span>{selectedVariant.color}</span>
                  <strong>{Number(selectedVariant.stock || 0)}</strong>
                </div>
              </div>
            ) : null}
            {message && (
              <div className={`status-message ${messageType}`} role="alert">
                {message}
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
