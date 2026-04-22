const {
    API_BASE,
    apiFetch,
    buildVariantKey,
    ensureAuthForCart,
    escapeHtml,
    formatPrice,
    getColorOptions,
    getCurrentPageName,
    getLoginRedirectUrl,
    getSizeOptions,
    getVariantForSelection,
    loadCart,
    roleCanManage,
    roleLabel,
    renderStars,
    saveCart,
    showToast,
    trackEvent,
    addRecentlyViewed,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const cartCountEl = document.getElementById('cartCount');
const productStatusEl = document.getElementById('productStatus');
const productDetailEl = document.getElementById('productDetail');
const toastStack = document.getElementById('toastStack');

let currentUser = null;
let currentProduct = null;
let cart = loadCart();

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
}

function renderCartCount() {
    if (!cartCountEl) return;
    const count = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    cartCountEl.textContent = String(count);
}

function saveCurrentCart() {
    saveCart(cart);
    renderCartCount();
}

function showLocalToast(message, tone = 'default') {
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

async function apiFetchWithCsrf(url, options = {}) {
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

function setAuthButton() {
    if (!authButton) return;

    if (currentUser) {
        authButton.textContent = `Saved (${roleLabel(currentUser.role)})`;
        authButton.href = 'wishlist.html';
    } else {
        authButton.textContent = 'Login/Register';
        authButton.href = 'login.html';
    }

    if (logoutButton) {
        logoutButton.classList.toggle('hidden', !currentUser);
    }
}

function setExtraNavLinks() {
    const nav = document.querySelector('.top-actions');
    if (!nav) return;

    if (!document.getElementById('trackOrderLink')) {
        const trackLink = document.createElement('a');
        trackLink.id = 'trackOrderLink';
        trackLink.className = 'plain-btn';
        trackLink.href = 'tracking.html';
        trackLink.textContent = 'Track Order';
        nav.insertBefore(trackLink, nav.firstChild);
    }

    const existingAdminLink = document.getElementById('adminDashboardLink');
    if (currentUser && roleCanManage(currentUser.role)) {
        if (!existingAdminLink) {
            const adminLink = document.createElement('a');
            adminLink.id = 'adminDashboardLink';
            adminLink.className = 'plain-btn';
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Admin';
            nav.insertBefore(adminLink, nav.firstChild);
        }
    } else if (existingAdminLink) {
        existingAdminLink.remove();
    }
}

async function refreshAuthState() {
    try {
        const response = await apiFetchWithCsrf(`${API_BASE}/auth/me/`);
        const body = await response.json();
        currentUser = body && body.is_authenticated ? body.user : null;
    } catch (_error) {
        currentUser = null;
    }

    setAuthButton();
    setExtraNavLinks();
}

function getProductIdentifier() {
    const params = new URLSearchParams(window.location.search);
    const slug = String(params.get('slug') || '').trim();
    const id = String(params.get('id') || '').trim();
    return { slug, id };
}

function getDetailPath() {
    const { slug, id } = getProductIdentifier();
    if (slug) {
        return `products/${encodeURIComponent(slug)}/`;
    }
    if (id) {
        return `products/${encodeURIComponent(id)}/`;
    }
    return '';
}

function renderVariantOptions(product, selectedSize, selectedColor) {
    const sizes = getSizeOptions(product);
    const colors = getColorOptions(product);
    return `
        <div class="variant-row variant-row-large">
            <label>
                <span>Size</span>
                <select id="sizeSelect">${sizes.map((size) => `<option value="${escapeHtml(size)}" ${size === selectedSize ? 'selected' : ''}>${escapeHtml(size)}</option>`).join('')}</select>
            </label>
            <label>
                <span>Color</span>
                <select id="colorSelect">${colors.map((color) => `<option value="${escapeHtml(color)}" ${color === selectedColor ? 'selected' : ''}>${escapeHtml(color)}</option>`).join('')}</select>
            </label>
        </div>
    `;
}

function buildReviewCard(review) {
    return `
        <article class="review-card">
            <div class="review-head">
                <strong>${escapeHtml(review.username || 'Customer')}</strong>
                <span class="meta">${renderStars(review.rating)} ${review.rating}/5</span>
            </div>
            ${review.title ? `<h4>${escapeHtml(review.title)}</h4>` : ''}
            ${review.comment ? `<p class="meta">${escapeHtml(review.comment)}</p>` : '<p class="meta">No comment added.</p>'}
        </article>
    `;
}

function buildProductCard(product) {
    const imageHtml = product.image_url
        ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`
        : '<div class="placeholder">No image</div>';
    return `
        <article class="mini-product-card">
            <a class="product-link" href="product.html?slug=${encodeURIComponent(product.slug)}">
                ${imageHtml}
                <h4>${escapeHtml(product.name)}</h4>
            </a>
            <p class="meta">${escapeHtml(product.category || 'Uncategorized')}</p>
            <p><strong>${formatPrice(product.price)}</strong></p>
        </article>
    `;
}

function updateVariantSummary(product, sizeSelect, colorSelect) {
    const variant = getVariantForSelection(product, sizeSelect.value, colorSelect.value);
    const stockNode = document.getElementById('selectedVariantStock');
    const addButton = document.getElementById('addToCartButton');
    const buyButton = document.getElementById('buyNowButton');
    const wishlistButton = document.getElementById('wishlistButton');

    const stockQuantity = variant ? Number(variant.stock_quantity || 0) : Number(product.stock_quantity || 0);
    if (stockNode) {
        stockNode.textContent = stockQuantity > 0 ? `Variant stock: ${stockQuantity}` : 'Sold out';
    }
    if (addButton) {
        addButton.disabled = stockQuantity <= 0;
        addButton.textContent = stockQuantity <= 0 ? 'Sold Out' : currentUser ? 'Add to Cart' : 'Login to Add';
    }
    if (buyButton) {
        buyButton.disabled = stockQuantity <= 0;
    }
    if (wishlistButton) {
        wishlistButton.textContent = product.wishlist_saved ? 'Saved' : 'Wishlist';
    }
}

function addToCart(product, variant, size, color) {
    if (!ensureAuthForCart(currentUser, `product.html?slug=${encodeURIComponent(product.slug)}`)) return;

    const key = buildVariantKey(product.id, size, color, variant ? variant.id : null);
    const existing = cart.find((item) => item.key === key);
    const stockQuantity = variant ? Number(variant.stock_quantity || 0) : Number(product.stock_quantity || 0);
    const currentQuantity = existing ? Number(existing.quantity || 0) : 0;

    if (currentQuantity + 1 > stockQuantity) {
        showLocalToast('Not enough stock for this variant.', 'error');
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            key,
            product_id: product.id,
            variant_id: variant ? variant.id : null,
            quantity: 1,
            size,
            color,
            product_name: product.name,
            unit_price: product.price,
            image_url: product.image_url,
        });
    }

    saveCurrentCart();
    showLocalToast(`${product.name} added to cart.`, 'success');
    trackEvent('add_to_cart', {
        source: 'product_detail',
        productId: product.id,
        productName: product.name,
        size,
        color,
        hasVariant: Boolean(variant && variant.id),
    });
}

async function toggleWishlist(product) {
    if (!ensureAuthForCart(currentUser, getLoginRedirectUrl())) return;

    try {
        const response = await apiFetchWithCsrf(`${API_BASE}/wishlist/toggle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: product.id }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not update wishlist.');
        }
        product.wishlist_saved = body.saved;
        const button = document.getElementById('wishlistButton');
        if (button) {
            button.textContent = body.saved ? 'Saved' : 'Wishlist';
        }
        showLocalToast(body.saved ? 'Saved to wishlist.' : 'Removed from wishlist.', 'success');
    } catch (_error) {
        showLocalToast('Could not update wishlist.', 'error');
    }
}

function renderRelatedSection(title, items, targetId) {
    const container = document.getElementById(targetId);
    if (!container) return;

    if (!items || !items.length) {
        container.innerHTML = '<p class="meta">No recommendations yet.</p>';
        return;
    }

    container.innerHTML = items.map(buildProductCard).join('');
}

function renderReviewsSection(product) {
    const reviewList = document.getElementById('reviewList');
    const reviewSummary = document.getElementById('reviewSummary');
    const reviewPrompt = document.getElementById('reviewPrompt');
    const reviewForm = document.getElementById('reviewForm');

    if (reviewSummary) {
        reviewSummary.innerHTML = product.review_count
            ? `${renderStars(product.average_rating || 0)} <span class="meta">${Number(product.average_rating || 0).toFixed(1)} from ${product.review_count} review${product.review_count === 1 ? '' : 's'}</span>`
            : '<span class="meta">No ratings yet</span>';
    }

    if (reviewPrompt) {
        reviewPrompt.textContent = currentUser ? 'Share your experience with this shirt.' : 'Login to write a review.';
    }

    if (reviewForm) {
        reviewForm.classList.toggle('hidden', !currentUser);
    }

    if (reviewList) {
        reviewList.innerHTML = product.reviews && product.reviews.length
            ? product.reviews.map(buildReviewCard).join('')
            : '<p class="meta">No reviews yet. Be the first to leave one.</p>';
    }
}

function renderProduct(product) {
    currentProduct = product;
    addRecentlyViewed(product);

    const primaryVariant = Array.isArray(product.variants) && product.variants.length ? product.variants[0] : null;
    const selectedSize = primaryVariant ? primaryVariant.size : getSizeOptions(product)[0];
    const selectedColor = primaryVariant ? primaryVariant.color : getColorOptions(product)[0];
    const imageHtml = product.image_url
        ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async">`
        : '<div class="placeholder">No image</div>';
    const stockClass = Number(product.stock_quantity || 0) <= 3 && Number(product.stock_quantity || 0) > 0 ? 'low-stock' : '';
    const stockText = Number(product.stock_quantity || 0) <= 0
        ? 'Sold out'
        : Number(product.stock_quantity || 0) <= 3
            ? `Only ${product.stock_quantity} left`
            : 'In stock';

    productStatusEl.textContent = '';
    productDetailEl.innerHTML = `
        <div class="product-page-shell">
            <div class="product-detail-grid">
                <div class="product-detail-image">
                    ${imageHtml}
                </div>
                <div class="product-detail-info">
                    <p class="eyebrow">${escapeHtml(product.category || 'Uncategorized')} • ${escapeHtml(product.print_style || 'Classic')}</p>
                    <h3 class="product-title">${escapeHtml(product.name)}</h3>
                    <div class="product-meta-row">
                        <span class="meta ${stockClass}">${stockText}</span>
                        <span class="meta">Product ID: ${product.id}</span>
                    </div>
                    <div id="reviewSummary" class="rating-row"></div>
                    <p class="product-price">${formatPrice(product.price)}</p>
                    <p class="product-description">${escapeHtml(product.description)}</p>
                    <div class="product-highlights">
                        <div class="highlight-card">
                            <strong>Live variant stock</strong>
                            <p id="selectedVariantStock" class="meta">Checking variant stock...</p>
                        </div>
                        <div class="highlight-card">
                            <strong>Fast delivery</strong>
                            <p class="meta">Delivery fee and ETA are shown at checkout.</p>
                        </div>
                    </div>
                    ${renderVariantOptions(product, selectedSize, selectedColor)}
                    <div class="detail-actions">
                        <button id="addToCartButton" class="btn" ${Number(product.stock_quantity || 0) <= 0 ? 'disabled' : ''}>${Number(product.stock_quantity || 0) <= 0 ? 'Sold Out' : currentUser ? 'Add to Cart' : 'Login to Add'}</button>
                        <button id="buyNowButton" class="btn secondary" ${Number(product.stock_quantity || 0) <= 0 ? 'disabled' : ''}>Buy Now</button>
                        <button id="wishlistButton" class="btn secondary">${product.wishlist_saved ? 'Saved' : 'Wishlist'}</button>
                    </div>
                    <div class="detail-box">
                        <h3>Variant Details</h3>
                        <ul>
                            <li>Sizes: ${escapeHtml((product.available_sizes || []).join(', ') || 'S, M, L, XL')}</li>
                            <li>Colors: ${escapeHtml((product.available_colors || []).join(', ') || 'Black, White, Sand')}</li>
                            <li>Stock: ${product.stock_quantity}</li>
                            <li>Print style: ${escapeHtml(product.print_style || 'Classic')}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <section class="panel-card pad soft product-section">
                <div class="section-head">
                    <h3>Reviews</h3>
                    <span class="meta" id="reviewPrompt"></span>
                </div>
                <form id="reviewForm" class="checkout-form review-form ${currentUser ? '' : 'hidden'}">
                    <label>
                        <span>Rating</span>
                        <select name="rating" required>
                            <option value="5">5 - Excellent</option>
                            <option value="4">4 - Good</option>
                            <option value="3">3 - Okay</option>
                            <option value="2">2 - Fair</option>
                            <option value="1">1 - Poor</option>
                        </select>
                    </label>
                    <input name="title" placeholder="Review title (optional)" />
                    <textarea name="comment" rows="3" placeholder="Tell others what you think."></textarea>
                    <button type="submit" class="btn">Submit review</button>
                </form>
                <div id="reviewList" class="review-list"></div>
            </section>

            <section class="panel-card pad soft product-section">
                <div class="section-head">
                    <h3>Related products</h3>
                    <span class="meta">Similar shirts and styles</span>
                </div>
                <div id="relatedProducts" class="mini-grid"></div>
            </section>

            <section class="panel-card pad soft product-section">
                <div class="section-head">
                    <h3>Frequently bought together</h3>
                    <span class="meta">Easy bundle suggestions</span>
                </div>
                <div id="bundleProducts" class="mini-grid"></div>
            </section>
        </div>
    `;

    const sizeSelect = document.getElementById('sizeSelect');
    const colorSelect = document.getElementById('colorSelect');
    const addButton = document.getElementById('addToCartButton');
    const buyButton = document.getElementById('buyNowButton');
    const wishlistButton = document.getElementById('wishlistButton');
    const reviewForm = document.getElementById('reviewForm');

    const refreshSelection = () => updateVariantSummary(product, sizeSelect, colorSelect);
    sizeSelect.addEventListener('change', refreshSelection);
    colorSelect.addEventListener('change', refreshSelection);
    refreshSelection();

    if (addButton) {
        addButton.addEventListener('click', () => {
            const variant = getVariantForSelection(product, sizeSelect.value, colorSelect.value);
            addToCart(product, variant, sizeSelect.value, colorSelect.value);
        });
    }

    if (buyButton) {
        buyButton.addEventListener('click', () => {
            const variant = getVariantForSelection(product, sizeSelect.value, colorSelect.value);
            addToCart(product, variant, sizeSelect.value, colorSelect.value);
            window.location.href = 'checkout.html';
        });
    }

    if (wishlistButton) {
        wishlistButton.addEventListener('click', () => toggleWishlist(product));
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentUser) {
                window.location.href = getLoginRedirectUrl();
                return;
            }

            const formData = new FormData(reviewForm);
            try {
                const response = await apiFetchWithCsrf(`${API_BASE}/products/${encodeURIComponent(product.slug)}/reviews/create/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        rating: formData.get('rating'),
                        title: String(formData.get('title') || '').trim(),
                        comment: String(formData.get('comment') || '').trim(),
                    }),
                });
                const body = await response.json();
                if (!response.ok) {
                    throw new Error(body.error || 'Could not save review.');
                }
                showLocalToast('Review saved.', 'success');
                reviewForm.reset();
                await loadProduct();
            } catch (_error) {
                showLocalToast('Could not save review.', 'error');
            }
        });
    }

    renderReviewsSection(product);
    renderRelatedSection('relatedProducts', product.related_products || [], 'relatedProducts');
    renderRelatedSection('bundleProducts', product.frequently_bought_together || [], 'bundleProducts');
}

function renderProductSkeleton() {
    if (!productStatusEl || !productDetailEl) return;
    productStatusEl.textContent = 'Loading product...';
    productDetailEl.innerHTML = '';
}

function renderProductEmpty(message, detail = '') {
    if (!productStatusEl || !productDetailEl) return;
    productStatusEl.innerHTML = `
        <div class="products-error">
            <h4>${escapeHtml(message)}</h4>
            <p class="meta">${escapeHtml(detail)}</p>
        </div>
    `;
    productDetailEl.innerHTML = '<a class="plain-btn" href="shop.html">← Back to shop</a>';
}

async function loadProduct() {
    if (!productStatusEl || !productDetailEl) return;

    const detailPath = getDetailPath();
    if (!detailPath) {
        renderProductEmpty('No product selected.', 'Pick a shirt from the shop first.');
        return;
    }

    renderProductSkeleton();

    let product = null;
    try {
        const response = await apiFetchWithCsrf(`${API_BASE}/${detailPath}`);
        if (response.ok) {
            const body = await response.json();
            product = body && body.product ? body.product : null;
        } else if (response.status === 404) {
            const listResponse = await apiFetchWithCsrf(`${API_BASE}/products/?page_size=1000`);
            if (listResponse.ok) {
                const listBody = await listResponse.json();
                const list = listBody.products || [];
                const params = new URLSearchParams(window.location.search);
                const slug = String(params.get('slug') || '').trim();
                const id = String(params.get('id') || '').trim();
                product = slug
                    ? list.find((item) => item.slug === slug)
                    : list.find((item) => String(item.id) === id);
            }
        }
    } catch (_error) {
        renderProductEmpty('Could not reach the server.', 'Check your connection and try again.');
        return;
    }

    if (!product) {
        renderProductEmpty('Product not found.', 'Try another shirt from the shop.');
        return;
    }

    renderProduct(product);
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await apiFetchWithCsrf(`${API_BASE}/auth/logout/`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Logout failed.');
            }
            currentUser = null;
            setAuthButton();
            showLocalToast('Logged out.', 'default');
            if (currentProduct) {
                renderProduct(currentProduct);
            }
        } catch (_error) {
            showLocalToast('Could not log out right now.', 'error');
        }
    });
}

renderCartCount();
refreshAuthState();
loadProduct();
