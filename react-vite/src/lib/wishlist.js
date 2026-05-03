/**
 * Wishlist/Favorites management utilities
 */

const WISHLIST_KEY = 'anyprint:wishlist';

export function loadWishlist() {
  try {
    const data = localStorage.getItem(WISHLIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(items) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('anyprint:wishlist-updated'));
  } catch {
    console.error('Failed to save wishlist');
  }
}

export function addToWishlist(product) {
  const wishlist = loadWishlist();
  const exists = wishlist.some(item => item.id === product.id);
  
  if (!exists) {
    wishlist.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      slug: product.slug,
      addedAt: new Date().toISOString(),
    });
    saveWishlist(wishlist);
  }
  
  return wishlist;
}

export function removeFromWishlist(productId) {
  const wishlist = loadWishlist();
  const filtered = wishlist.filter(item => item.id !== productId);
  saveWishlist(filtered);
  return filtered;
}

export function toggleWishlist(product) {
  const wishlist = loadWishlist();
  const exists = wishlist.some(item => item.id === product.id);
  
  if (exists) {
    return removeFromWishlist(product.id);
  } else {
    return addToWishlist(product);
  }
}

export function isInWishlist(productId) {
  const wishlist = loadWishlist();
  return wishlist.some(item => item.id === productId);
}

export function clearWishlist() {
  saveWishlist([]);
}
