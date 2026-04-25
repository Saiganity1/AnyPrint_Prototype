const CART_KEY = "tt_cart_v2";

function normalizeItem(item) {
  const productId = Number(item.product_id || item.productId || item.id);
  return {
    key: item.key || `${productId}|${item.size || "M"}|${item.color || "Black"}`,
    product_id: productId,
    variant_id: item.variant_id || item.variantId || null,
    quantity: Number(item.quantity || 1),
    size: item.size || "M",
    color: item.color || "Black",
    product_name: item.product_name || item.name || "",
    unit_price: item.unit_price || item.price || 0,
    image_url: item.image_url || "",
  };
}

export function loadCart() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeItem);
  } catch {
    return [];
  }
}

export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items || []));
  window.dispatchEvent(new CustomEvent("anyprint:cart-updated", { detail: { count: cartCount(items || []) } }));
}

export function cartCount(items) {
  return (items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

export function upsertCartItem(newItem) {
  const cart = loadCart();
  const normalized = normalizeItem(newItem);
  const found = cart.find((item) => item.key === normalized.key);
  if (found) {
    found.quantity = Number(found.quantity || 0) + Number(normalized.quantity || 1);
  } else {
    cart.push(normalized);
  }
  saveCart(cart);
  return cart;
}

export function removeCartItem(key) {
  const next = loadCart().filter((item) => item.key !== key);
  saveCart(next);
  return next;
}
