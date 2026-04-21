(() => {
const API_BASE = window.API_BASE || 'http://127.0.0.1:8000/api';
const CART_KEY = 'tt_cart_v2';
const RECENT_KEY = 'tt_recently_viewed_v1';

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
}

async function apiFetch(url, options = {}) {
    const config = { credentials: 'include', ...options };
    const method = String(config.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        const headers = new Headers(config.headers || {});
        const csrfToken = getCookie('csrftoken');
        if (csrfToken && !headers.has('X-CSRFToken')) {
            headers.set('X-CSRFToken', csrfToken);
        }
        config.headers = headers;
    }
    return fetch(url, config);
}

function showToast(message, tone = 'default') {
    const toastStack = document.getElementById('toastStack');
    if (!toastStack) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function formatPrice(value) {
    const amount = Number(value || 0);
    return `PHP ${amount.toFixed(2)}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function renderStars(rating = 0) {
    const filled = Math.round(Number(rating) || 0);
    let output = '';
    for (let index = 1; index <= 5; index += 1) {
        output += index <= filled ? '★' : '☆';
    }
    return `<span class="rating-stars" aria-label="${filled} out of 5 stars">${output}</span>`;
}

function normalizeCartItem(item) {
    const productId = Number(item.product_id || item.productId || item.id);
    return {
        key: item.key || buildVariantKey(productId, item.size || 'M', item.color || 'Black', item.variant_id || item.variantId || null),
        product_id: productId,
        variant_id: item.variant_id || item.variantId || null,
        quantity: Number(item.quantity || 1),
        size: item.size || 'M',
        color: item.color || 'Black',
        product_name: item.product_name || item.name || '',
        unit_price: item.unit_price || item.price || '',
        image_url: item.image_url || '',
    };
}

function loadCart() {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.map(normalizeCartItem);
    } catch (_error) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function buildVariantKey(productId, size, color, variantId = null) {
    if (variantId) {
        return `variant:${variantId}`;
    }
    return `${productId}|${size}|${color}`;
}

function getSizeOptions(product) {
    if (Array.isArray(product?.available_sizes) && product.available_sizes.length) {
        return product.available_sizes;
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const sizes = [];
    for (const variant of variants) {
        if (variant.size && !sizes.includes(variant.size)) {
            sizes.push(variant.size);
        }
    }

    return sizes.length ? sizes : ['S', 'M', 'L', 'XL'];
}

function getColorOptions(product) {
    if (Array.isArray(product?.available_colors) && product.available_colors.length) {
        return product.available_colors;
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const colors = [];
    for (const variant of variants) {
        if (variant.color && !colors.includes(variant.color)) {
            colors.push(variant.color);
        }
    }

    if (colors.length) {
        return colors;
    }

    const style = String(product?.print_style || '').toLowerCase();
    if (style.includes('graphic')) {
        return ['Black', 'Cream', 'Navy'];
    }
    if (style.includes('kids')) {
        return ['White', 'Sky', 'Mint'];
    }
    if (style.includes('street')) {
        return ['Black', 'Sand', 'Olive'];
    }
    return ['Black', 'White', 'Sand'];
}

function getVariantForSelection(product, size, color) {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const selectedSize = String(size || '').trim();
    const selectedColor = String(color || '').trim();

    const exactMatch = variants.find((variant) => variant.size === selectedSize && String(variant.color || '').toLowerCase() === selectedColor.toLowerCase());
    if (exactMatch) return exactMatch;

    const sizeMatch = variants.find((variant) => variant.size === selectedSize);
    if (sizeMatch) return sizeMatch;

    const colorMatch = variants.find((variant) => String(variant.color || '').toLowerCase() === selectedColor.toLowerCase());
    if (colorMatch) return colorMatch;

    return variants.length ? variants[0] : null;
}

function ensureAuthForCart(currentUser, nextUrl = window.location.pathname + window.location.search + window.location.hash) {
    if (currentUser) return true;
    window.location.href = `login.html?next=${encodeURIComponent(nextUrl)}`;
    return false;
}

function getLoginRedirectUrl() {
    return `login.html?next=${encodeURIComponent(window.location.pathname + window.location.search + window.location.hash)}`;
}

function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function loadRecentlyViewed() {
    try {
        const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function saveRecentlyViewed(items) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, 8)));
}

function addRecentlyViewed(product) {
    if (!product) return;
    const identifier = product.slug || product.id;
    if (!identifier) return;

    const current = loadRecentlyViewed().filter((item) => String(item.identifier) !== String(identifier));
    current.unshift({
        identifier,
        slug: product.slug || '',
        id: product.id || null,
        name: product.name || '',
        image_url: product.image_url || '',
        price: product.price || '',
        category: product.category || '',
        print_style: product.print_style || '',
    });
    saveRecentlyViewed(current);
}

function roleLabel(role) {
    const value = String(role || 'USER').toUpperCase();
    if (value === 'OWNER') return 'Owner';
    if (value === 'ADMIN') return 'Admin';
    return 'User';
}

function roleCanManage(role) {
    const value = String(role || 'USER').toUpperCase();
    return value === 'OWNER' || value === 'ADMIN';
}

window.AnyPrint = {
    API_BASE,
    CART_KEY,
    RECENT_KEY,
    apiFetch,
    addRecentlyViewed,
    buildVariantKey,
    ensureAuthForCart,
    escapeHtml,
    formatPrice,
    getColorOptions,
    getCurrentPageName,
    getCookie,
    getLoginRedirectUrl,
    getSizeOptions,
    getVariantForSelection,
    loadCart,
    loadRecentlyViewed,
    roleCanManage,
    roleLabel,
    renderStars,
    saveCart,
    saveRecentlyViewed,
    showToast,
};
})();
