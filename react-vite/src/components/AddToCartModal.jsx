import { useEffect, useState } from "react";
import { upsertCartItem } from "../lib/cart";

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL", "3XL"];

export default function AddToCartModal({ product, isOpen, onClose }) {
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("Black");
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (product) {
      setSelectedSize(product.sizes?.[0] || "M");
      setSelectedColor(product.colors?.[0] || "Black");
      setSelectedQuantity(1);
      setMessage("");
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const sizes = product.sizes?.length ? product.sizes : ["M", "L", "XL"];
  const colors = product.colors?.length ? product.colors : ["Black", "White"];
  const selectedVariant =
    product.variants?.find((variant) => variant.size === selectedSize && variant.color === selectedColor) || null;
  const availableStock = selectedVariant?.stock ?? null;

  function handleAddToCart() {
    if (!selectedVariant) {
      setMessage("Please choose a valid size and color combination first.");
      return;
    }

    if (selectedQuantity < 1) {
      setMessage("Please select a valid quantity.");
      return;
    }

    if (availableStock !== null && selectedQuantity > availableStock) {
      setMessage(`Cannot add more than ${availableStock} items available.`);
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

    setMessage(`Added ${selectedQuantity} item(s) to cart.`);
    setTimeout(() => {
      onClose();
    }, 800);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add to Cart</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-product-info">
            <img src={product.image_url} alt={product.name} className="modal-product-image" />
            <div className="modal-product-details">
              <p className="meta">{product.category || "Shirt"}</p>
              <h3>{product.name}</h3>
              <p className="price">${(product.price || 0).toFixed(2)}</p>
            </div>
          </div>

          <div className="modal-options">
            {sizes.length ? (
              <div className="form-grid">
                <label>Size</label>
                <div className="size-chip-row">
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
            ) : null}

            {colors.length ? (
              <div className="form-grid">
                <label>Color</label>
                <div className="size-chip-row">
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

            {selectedVariant ? (
              <div className="variant-stock-info">
                <p className="meta">
                  {availableStock !== null && availableStock > 0
                    ? `${availableStock} in stock`
                    : "Out of stock"}
                </p>
              </div>
            ) : null}

            {message ? <p className={`status-text ${message.includes("Added") ? "success" : "error"}`}>{message}</p> : null}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            onClick={handleAddToCart}
            disabled={availableStock === 0}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
