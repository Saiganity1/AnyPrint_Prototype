const RECENT_KEY = "tt_recently_viewed_v1";

export function loadRecentlyViewed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecentlyViewed(items) {
  localStorage.setItem(RECENT_KEY, JSON.stringify((items || []).slice(0, 8)));
}

export function addRecentlyViewed(product) {
  if (!product) return;
  const identifier = product.slug || product.id;
  if (!identifier) return;

  const current = loadRecentlyViewed().filter((item) => String(item.identifier) !== String(identifier));
  current.unshift({
    identifier,
    slug: product.slug || "",
    id: product.id || null,
    name: product.name || "",
    image_url: product.image_url || "",
    price: product.price || 0,
    category: product.category || "",
    print_style: product.print_style || "",
  });
  saveRecentlyViewed(current);
}
