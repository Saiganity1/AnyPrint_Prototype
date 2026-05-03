/**
 * SEO Helper utilities for dynamic meta tags and titles
 */

export function setSeoMeta(title, description, canonical, ogImage) {
  // Set title
  if (title) {
    document.title = title;
    updateMeta('og:title', title);
  }

  // Set description
  if (description) {
    updateMeta('description', description);
    updateMeta('og:description', description);
  }

  // Set canonical URL
  if (canonical) {
    updateCanonical(canonical);
    updateMeta('og:url', canonical);
  }

  // Set OG image
  if (ogImage) {
    updateMeta('og:image', ogImage);
  }
}

export function updateMeta(name, content) {
  let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    const isProperty = name.startsWith('og:');
    if (isProperty) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

export function updateCanonical(url) {
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', url);
}

export function generateProductMeta(product, baseUrl) {
  const title = `${product.name} - Premium T-Shirts | AnyPrint`;
  const description = product.description
    ? `${product.description.substring(0, 150)}... Browse premium t-shirts with ${product.category} style.`
    : `Premium ${product.category} t-shirt - ${product.name}. High-quality, comfortable fit.`;
  const canonical = `${baseUrl}/products/${encodeURIComponent(product.slug || product.id)}`;
  const ogImage = product.image_url;

  return { title, description, canonical, ogImage };
}

export function generateCategoryMeta(category, baseUrl) {
  const title = `${category} T-Shirts - Premium Quality | AnyPrint`;
  const description = `Shop our collection of ${category} t-shirts. Premium quality, comfortable fit, nationwide delivery.`;
  const canonical = `${baseUrl}/shop?category=${encodeURIComponent(category)}`;

  return { title, description, canonical };
}
