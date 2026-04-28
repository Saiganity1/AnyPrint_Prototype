export function normalizeProduct(product) {
  if (!product || typeof product !== "object") return null;
  const id = String(product._id || product.id || "");
  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : Array.isArray(product.imageUrls)
      ? product.imageUrls.filter(Boolean)
      : [];
  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant) => ({
        ...variant,
        size: String(variant?.size || "").trim(),
        color: String(variant?.color || "").trim(),
        stock: Number(variant?.stock || 0),
      }))
    : [];
  const stockFromVariants = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  return {
    ...product,
    id,
    slug: product.slug || id,
    image_url: product.image_url || product.imageUrl || images[0] || "",
    images,
    variants,
    stock_quantity: product.stock_quantity ?? product.stock ?? stockFromVariants,
    category: product.category || "T-shirt",
    print_style: product.print_style || "Standard",
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    colors: Array.isArray(product.colors) ? product.colors : [],
  };
}

export function normalizeProducts(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : Array.isArray(payload?.products)
        ? payload.products
        : [];
  return items.map(normalizeProduct).filter(Boolean);
}

export function normalizeOrder(order) {
  if (!order || typeof order !== "object") return null;
  const id = String(order._id || order.id || "");
  const items = (order.items || []).map((item) => ({
    ...item,
    product_name: item.product_name || item.productId?.name || "Product",
    subtotal: Number(item.subtotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0)),
  }));

  return {
    ...order,
    id,
    items,
    created_at: order.created_at || order.createdAt,
    total_amount: order.total_amount ?? order.totalPrice ?? 0,
    subtotal: order.subtotal ?? order.totalPrice ?? 0,
    payment_status: order.payment_status || order.status || "pending",
    tracking_number: order.tracking_number || id.slice(-8).toUpperCase(),
  };
}

export function normalizeOrders(payload) {
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.orders)
      ? payload.orders
      : [];
  return items.map(normalizeOrder).filter(Boolean);
}
