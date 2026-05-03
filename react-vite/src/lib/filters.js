/**
 * Filtering and sorting utilities for products
 */

export function filterProducts(products, filters = {}) {
  let results = [...products];

  // Price range filter
  if (filters.minPrice !== undefined) {
    results = results.filter(p => p.price >= filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    results = results.filter(p => p.price <= filters.maxPrice);
  }

  // Category filter
  if (filters.category) {
    results = results.filter(p => p.category === filters.category);
  }

  // Size filter
  if (filters.sizes && filters.sizes.length > 0) {
    results = results.filter(p => 
      p.sizes && p.sizes.some(s => filters.sizes.includes(s))
    );
  }

  // Print style filter
  if (filters.printStyle) {
    results = results.filter(p => p.print_style === filters.printStyle);
  }

  return results;
}

export function sortProducts(products, sortBy) {
  const sorted = [...products];

  switch (sortBy) {
    case 'price-low':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price-high':
      return sorted.sort((a, b) => b.price - a.price);
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    case 'popularity':
      return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}

export function getUniqueCategories(products) {
  return [...new Set(products.map(p => p.category).filter(Boolean))];
}

export function getUniqueSizes(products) {
  const sizes = new Set();
  products.forEach(p => {
    if (p.sizes) p.sizes.forEach(s => sizes.add(s));
  });
  return Array.from(sizes).sort();
}

export function getUniquePrintStyles(products) {
  return [...new Set(products.map(p => p.print_style).filter(Boolean))];
}

export function getPriceRange(products) {
  const prices = products.map(p => p.price).filter(p => p);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
}
