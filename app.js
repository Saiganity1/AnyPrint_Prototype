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
    loadRecentlyViewed,
    roleCanManage,
    roleLabel,
    renderStars,
    saveCart,
    saveRecentlyViewed,
    showToast,
    addRecentlyViewed,
} = window.AnyPrint;

const currentPage = getCurrentPageName();
const isShopPage = currentPage === 'shop.html';
const isHomePage = currentPage === 'index.html';

const state = {
    currentUser: null,
    products: [],
    categories: [],
    selectedCategory: '',
    searchTerm: '',
    sortOrder: 'featured',
    filters: {
        size: '',
        color: '',
        print_style: '',
        min_price: '',
        max_price: '',
    },
    pagination: {
        page: 1,
        page_size: 12,
        total_pages: 1,
        total_items: 0,
    },
    cart: loadCart(),
};

let searchTimer = null;

const homeNavButton = document.getElementById('homeNavButton');
const shopNavButton = document.getElementById('shopNavButton');
const goShopButton = document.getElementById('goShopButton');
const cartButton = document.getElementById('cartButton');
const mobileCartCta = document.getElementById('mobileCartCta');
const closeCart = document.getElementById('closeCart');
const cartPanel = document.getElementById('cartPanel');
const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const mobileCartCountEl = document.getElementById('mobileCartCount');
const cartCheckoutButton = document.getElementById('cartCheckoutButton');
const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const recentlyViewedGrid = document.getElementById('recentlyViewedGrid');
const recentlyViewedEmpty = document.getElementById('recentlyViewedEmpty');

const productsEl = document.getElementById('products');
const productsStatusEl = document.getElementById('productsStatus');
const shopSummaryEl = document.getElementById('shopSummary');
const paginationControlsEl = document.getElementById('paginationControls');
const categoryChipsEl = document.getElementById('categoryChips');
const productSearchEl = document.getElementById('productSearch');
const sortSelectEl = document.getElementById('sortSelect');
const sizeFilterEl = document.getElementById('sizeFilter');
const colorFilterEl = document.getElementById('colorFilter');
const printStyleFilterEl = document.getElementById('printStyleFilter');
const minPriceFilterEl = document.getElementById('minPriceFilter');
const maxPriceFilterEl = document.getElementById('maxPriceFilter');
const clearFiltersButton = document.getElementById('clearFiltersButton');
const shopSection = document.getElementById('shopSection');

function cartCount() {
    return state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function syncCartUi() {
    const count = cartCount();
    if (cartCountEl) cartCountEl.textContent = String(count);
    if (mobileCartCountEl) mobileCartCountEl.textContent = String(count);
    renderCart();
}

function saveCurrentCart() {
    saveCart(state.cart);
    syncCartUi();
}

function openCartPanel() {
    if (cartPanel) {
        cartPanel.classList.remove('hidden');
    }
}

function closeCartPanel() {
    if (cartPanel) {
        cartPanel.classList.add('hidden');
    }
}

function goToHome() {
    if (isHomePage) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    window.location.href = 'index.html';
}

function goToShop() {
    if (isShopPage) {
        if (shopSection) {
            shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
    }
    window.location.href = 'shop.html';
}

function setAuthButton() {
    if (!authButton) return;

    if (state.currentUser) {
        authButton.textContent = `Saved (${roleLabel(state.currentUser.role)})`;
        authButton.href = 'wishlist.html';
        authButton.title = 'Open wishlist';
    } else {
        authButton.textContent = 'Login/Register';
        authButton.href = 'login.html';
        authButton.title = 'Login or register';
    }

    if (logoutButton) {
        logoutButton.classList.toggle('hidden', !state.currentUser);
    }
}

function setExtraNavLinks() {
    const nav = document.querySelector('.top-links');
    if (!nav) return;

    if (!document.getElementById('trackOrderLink')) {
        const trackLink = document.createElement('a');
        trackLink.id = 'trackOrderLink';
        trackLink.className = 'plain-btn';
        trackLink.href = 'tracking.html';
        trackLink.textContent = 'Track Order';
        nav.appendChild(trackLink);
    }

    const existingAdminLink = document.getElementById('adminDashboardLink');
    if (state.currentUser && roleCanManage(state.currentUser.role)) {
        if (!existingAdminLink) {
            const adminLink = document.createElement('a');
            adminLink.id = 'adminDashboardLink';
            adminLink.className = 'plain-btn';
            adminLink.href = 'admin.html';
            adminLink.textContent = 'Admin';
            nav.appendChild(adminLink);
        }
    } else if (existingAdminLink) {
        existingAdminLink.remove();
    }
}

async function refreshAuthState() {
    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await response.json();
        state.currentUser = body && body.is_authenticated ? body.user : null;
    } catch (_error) {
        state.currentUser = null;
    }

    setAuthButton();
    setExtraNavLinks();
    if (isShopPage && state.products.length) {
        renderProducts();
    }
}

function updateShopSummary() {
    if (!shopSummaryEl) return;

    if (!state.products.length) {
        const bits = [];
        if (state.selectedCategory) bits.push(`category ${state.selectedCategory}`);
        if (state.searchTerm) bits.push(`search "${state.searchTerm}"`);
        shopSummaryEl.textContent = bits.length ? `No shirts match your ${bits.join(' and ')} filters.` : 'No shirts available yet.';
        return;
    }

    const start = ((state.pagination.page - 1) * state.pagination.page_size) + 1;
    const end = Math.min(start + state.products.length - 1, state.pagination.total_items);
    shopSummaryEl.textContent = `Showing ${start}-${end} of ${state.pagination.total_items} shirts.`;
}

function renderPagination() {
    if (!paginationControlsEl) return;

    if (!state.pagination.total_pages || state.pagination.total_pages <= 1) {
        paginationControlsEl.innerHTML = '';
        return;
    }

    const prevDisabled = state.pagination.page <= 1 ? 'disabled' : '';
    const nextDisabled = state.pagination.page >= state.pagination.total_pages ? 'disabled' : '';
    paginationControlsEl.innerHTML = `
        <button class="pagination-btn" data-page="${state.pagination.page - 1}" ${prevDisabled}>Previous</button>
        <span class="pagination-label">Page ${state.pagination.page} of ${state.pagination.total_pages}</span>
        <button class="pagination-btn" data-page="${state.pagination.page + 1}" ${nextDisabled}>Next</button>
    `;

    paginationControlsEl.querySelectorAll('[data-page]').forEach((button) => {
        button.addEventListener('click', () => {
            const nextPage = Number(button.getAttribute('data-page'));
            if (Number.isFinite(nextPage) && nextPage >= 1 && nextPage <= state.pagination.total_pages) {
                loadProducts(state.selectedCategory, nextPage);
            }
        });
    });
}

function renderCategories() {
    if (!categoryChipsEl) return;

    categoryChipsEl.innerHTML = '';
    const allButton = document.createElement('button');
    allButton.className = `chip ${state.selectedCategory ? '' : 'active'}`;
    allButton.textContent = 'All';
    allButton.addEventListener('click', () => loadProducts('', 1));
    categoryChipsEl.appendChild(allButton);

    for (const category of state.categories) {
        const chip = document.createElement('button');
        chip.className = `chip ${state.selectedCategory === category.slug ? 'active' : ''}`;
        chip.textContent = category.name;
        chip.addEventListener('click', () => loadProducts(category.slug, 1));
        categoryChipsEl.appendChild(chip);
    }
}

function renderLoadingSkeletons() {
    if (!productsEl) return;
    productsStatusEl.textContent = '';
    productsEl.innerHTML = '';
    for (let index = 0; index < 6; index += 1) {
        const card = document.createElement('article');
        card.className = 'product-card skeleton-card';
        card.innerHTML = '<div class="skeleton-box"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
        productsEl.appendChild(card);
    }
}

function renderEmptyProducts() {
    if (!productsEl || !productsStatusEl) return;

    productsStatusEl.innerHTML = `
        <div class="empty-state">
            <h4>No shirts found.</h4>
            <p class="meta">Try a different search term, category, or filter combination.</p>
            <button id="resetShopFilters" class="btn secondary">Reset filters</button>
        </div>
    `;
    productsEl.innerHTML = '';
    const resetButton = document.getElementById('resetShopFilters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
}

function renderProductsError(message) {
    if (!productsEl || !productsStatusEl) return;
    productsEl.innerHTML = '';
    productsStatusEl.innerHTML = `
        <div class="products-error">
            <h4>We could not load shirts.</h4>
            <p class="meta">${escapeHtml(message)}</p>
            <button id="retryProducts" class="btn">Retry</button>
        </div>
    `;
    const retryButton = document.getElementById('retryProducts');
    if (retryButton) {
        retryButton.addEventListener('click', () => loadProducts(state.selectedCategory, state.pagination.page));
    }
}

function updateProductCard(card, product) {
    const sizeSelect = card.querySelector('.size-select');
    const colorSelect = card.querySelector('.color-select');
    const stockBadge = card.querySelector('.variant-stock');
    const addButton = card.querySelector('.add-btn');
    const wishlistButton = card.querySelector('.wishlist-btn');

    const refresh = () => {
        const selectedVariant = getVariantForSelection(product, sizeSelect.value, colorSelect.value);
        const stockQuantity = selectedVariant ? Number(selectedVariant.stock_quantity || 0) : Number(product.stock_quantity || 0);
        if (stockBadge) {
            stockBadge.textContent = stockQuantity > 0 ? `Variant stock: ${stockQuantity}` : 'Sold out';
        }
        if (addButton) {
            addButton.disabled = stockQuantity <= 0;
            addButton.textContent = stockQuantity <= 0 ? 'Sold Out' : state.currentUser ? 'Add to Cart' : 'Login to Add';
        }
        if (wishlistButton) {
            wishlistButton.textContent = product.wishlist_saved ? 'Saved' : 'Wishlist';
        }
    };

    sizeSelect.addEventListener('change', refresh);
    colorSelect.addEventListener('change', refresh);
    refresh();

    if (addButton) {
        addButton.addEventListener('click', () => {
            const selectedVariant = getVariantForSelection(product, sizeSelect.value, colorSelect.value);
            const stockQuantity = selectedVariant ? Number(selectedVariant.stock_quantity || 0) : Number(product.stock_quantity || 0);
            if (stockQuantity <= 0) {
                showToast('This variant is sold out.', 'error');
                return;
            }
            addToCart(product, selectedVariant, sizeSelect.value, colorSelect.value);
        });
    }

    if (wishlistButton) {
        wishlistButton.addEventListener('click', () => toggleWishlist(product, wishlistButton));
    }
}

function renderProducts() {
    if (!productsEl) return;

    productsEl.innerHTML = '';
    productsStatusEl.textContent = '';

    if (!state.products.length) {
        renderEmptyProducts();
        return;
    }

    for (const product of state.products) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const sizes = getSizeOptions(product);
        const colors = getColorOptions(product);
        const imageHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}">`
            : '<div class="placeholder">No image</div>';
        const stockLabel = Number(product.stock_quantity || 0) <= 3 && Number(product.stock_quantity || 0) > 0
            ? `<p class="low-stock">Only ${product.stock_quantity} left</p>`
            : '';
        const ratingHtml = product.review_count
            ? `<div class="rating-row">${renderStars(product.average_rating || 0)}<span class="meta">${product.review_count} review${product.review_count === 1 ? '' : 's'}</span></div>`
            : '<p class="meta">No ratings yet</p>';

        card.innerHTML = `
            <a class="product-link" href="${product.slug ? `product.html?slug=${encodeURIComponent(product.slug)}` : `product.html?id=${encodeURIComponent(String(product.id))}`}" aria-label="View ${escapeHtml(product.name)}">
                ${imageHtml}
                <h3>${escapeHtml(product.name)}</h3>
            </a>
            <p class="meta">${escapeHtml(product.category || 'Uncategorized')} | ${escapeHtml(product.print_style || 'Classic')}</p>
            ${ratingHtml}
            <p class="price-line"><strong>${formatPrice(product.price)}</strong></p>
            ${stockLabel}
            <div class="variant-row">
                <select class="size-select">${sizes.map((size) => `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`).join('')}</select>
                <select class="color-select">${colors.map((color) => `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`).join('')}</select>
            </div>
            <p class="variant-stock meta"></p>
            <div class="card-actions">
                <button class="plain-btn wishlist-btn">${product.wishlist_saved ? 'Saved' : 'Wishlist'}</button>
                <button class="btn add-btn" ${Number(product.stock_quantity || 0) <= 0 ? 'disabled' : ''}>${Number(product.stock_quantity || 0) <= 0 ? 'Sold Out' : state.currentUser ? 'Add to Cart' : 'Login to Add'}</button>
            </div>
        `;

        card.addEventListener('click', (event) => {
            if (event.target.closest('button, select, a')) return;
            addRecentlyViewed(product);
            window.location.href = product.slug ? `product.html?slug=${encodeURIComponent(product.slug)}` : `product.html?id=${encodeURIComponent(String(product.id))}`;
        });

        updateProductCard(card, product);
        productsEl.appendChild(card);
    }
}

function renderCart() {
    if (!cartItemsEl) return;

    cartItemsEl.innerHTML = '';

    if (!state.cart.length) {
        cartItemsEl.innerHTML = `
            <div class="empty-state compact">
                <h4>Your cart is empty.</h4>
                <p class="meta">Add a shirt from the shop, then continue to checkout.</p>
                <a class="btn secondary small" href="shop.html">Browse shirts</a>
            </div>
        `;
        if (cartCheckoutButton) {
            cartCheckoutButton.classList.add('disabled-link');
        }
        return;
    }

    if (cartCheckoutButton) {
        cartCheckoutButton.classList.remove('disabled-link');
    }

    for (const item of state.cart) {
        const product = state.products.find((candidate) => candidate.id === item.product_id) || null;
        const name = item.product_name || (product ? product.name : `Product #${item.product_id}`);
        const price = item.unit_price || (product ? product.price : '0.00');
        const node = document.createElement('div');
        node.className = 'cart-item';
        node.innerHTML = `
            <p><strong>${escapeHtml(name)}</strong></p>
            <p class="meta">${escapeHtml(item.size || 'M')} | ${escapeHtml(item.color || 'Black')} | Qty: ${item.quantity} | ${formatPrice(price)}</p>
            <button class="plain-btn">Remove</button>
        `;
        node.querySelector('button').addEventListener('click', () => removeFromCart(item.key));
        cartItemsEl.appendChild(node);
    }
}

function addToCart(product, variant, size, color) {
    if (!ensureAuthForCart(state.currentUser)) return;

    const key = buildVariantKey(product.id, size, color, variant ? variant.id : null);
    const existing = state.cart.find((item) => item.key === key);
    const currentQuantity = existing ? Number(existing.quantity || 0) : 0;
    const stockQuantity = variant ? Number(variant.stock_quantity || 0) : Number(product.stock_quantity || 0);

    if (currentQuantity + 1 > stockQuantity) {
        showToast('Not enough stock for this variant.', 'error');
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
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
    showToast(`${product.name} added to cart.`, 'success');
}

function removeFromCart(itemKey) {
    state.cart = state.cart.filter((item) => item.key !== itemKey);
    saveCurrentCart();
}

async function toggleWishlist(product, buttonNode) {
    if (!ensureAuthForCart(state.currentUser, getLoginRedirectUrl())) return;

    try {
        const response = await apiFetch(`${API_BASE}/wishlist/toggle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: product.id }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not update wishlist.');
        }
        product.wishlist_saved = body.saved;
        if (buttonNode) {
            buttonNode.textContent = body.saved ? 'Saved' : 'Wishlist';
        }
        showToast(body.saved ? 'Saved to wishlist.' : 'Removed from wishlist.', 'success');
    } catch (_error) {
        showToast('Could not update wishlist.', 'error');
    }
}

function getShopFiltersFromInputs() {
    return {
        size: sizeFilterEl ? String(sizeFilterEl.value || '').trim() : '',
        color: colorFilterEl ? String(colorFilterEl.value || '').trim() : '',
        print_style: printStyleFilterEl ? String(printStyleFilterEl.value || '').trim() : '',
        min_price: minPriceFilterEl ? String(minPriceFilterEl.value || '').trim() : '',
        max_price: maxPriceFilterEl ? String(maxPriceFilterEl.value || '').trim() : '',
    };
}

function resetFilters() {
    state.searchTerm = '';
    state.sortOrder = 'featured';
    state.selectedCategory = '';
    state.filters = {
        size: '',
        color: '',
        print_style: '',
        min_price: '',
        max_price: '',
    };
    state.pagination.page = 1;
    if (productSearchEl) productSearchEl.value = '';
    if (sortSelectEl) sortSelectEl.value = 'featured';
    if (sizeFilterEl) sizeFilterEl.value = '';
    if (colorFilterEl) colorFilterEl.value = '';
    if (printStyleFilterEl) printStyleFilterEl.value = '';
    if (minPriceFilterEl) minPriceFilterEl.value = '';
    if (maxPriceFilterEl) maxPriceFilterEl.value = '';
    loadProducts('', 1);
}

async function loadCategories() {
    try {
        const response = await apiFetch(`${API_BASE}/categories/`);
        if (!response.ok) {
            throw new Error('Failed to load categories.');
        }
        const body = await response.json();
        state.categories = body.categories || [];
        renderCategories();
    } catch (_error) {
        state.categories = [];
        renderCategories();
    }
}

async function loadProducts(category = state.selectedCategory, page = 1) {
    state.selectedCategory = category;
    state.pagination.page = page;
    if (isShopPage) {
        renderLoadingSkeletons();
    }

    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (state.searchTerm) params.set('search', state.searchTerm);
    if (state.sortOrder) params.set('sort', state.sortOrder);
    if (state.filters.size) params.set('size', state.filters.size);
    if (state.filters.color) params.set('color', state.filters.color);
    if (state.filters.print_style) params.set('print_style', state.filters.print_style);
    if (state.filters.min_price) params.set('min_price', state.filters.min_price);
    if (state.filters.max_price) params.set('max_price', state.filters.max_price);
    if (page > 1) params.set('page', String(page));
    params.set('page_size', '12');

    try {
        const response = await apiFetch(`${API_BASE}/products/?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Could not load products right now.');
        }
        const body = await response.json();
        state.products = body.products || [];
        state.pagination = body.pagination || state.pagination;
        renderCategories();
        renderProducts();
        renderCart();
        updateShopSummary();
        renderPagination();
    } catch (_error) {
        renderProductsError('Could not load products right now. Please try again.');
        if (shopSummaryEl) {
            shopSummaryEl.textContent = 'Product loading failed.';
        }
        if (paginationControlsEl) {
            paginationControlsEl.innerHTML = '';
        }
    }
}

async function renderRecentlyViewedSection() {
    if (!recentlyViewedGrid) return;

    const items = loadRecentlyViewed();
    recentlyViewedGrid.innerHTML = '';

    if (!items.length) {
        if (recentlyViewedEmpty) {
            recentlyViewedEmpty.textContent = 'Recently viewed shirts will appear here after you open a product.';
        }
        return;
    }

    if (recentlyViewedEmpty) {
        recentlyViewedEmpty.textContent = '';
    }

    for (const item of items.slice(0, 6)) {
        const card = document.createElement('article');
        card.className = 'feature-card recent-card';
        card.innerHTML = `
            <a class="product-link" href="${item.slug ? `product.html?slug=${encodeURIComponent(item.slug)}` : 'shop.html'}">
                ${item.image_url ? `<img class="recent-thumb" src="${item.image_url}" alt="${escapeHtml(item.name || 'Recently viewed product')}">` : '<div class="feature-thumb"></div>'}
                <h4>${escapeHtml(item.name || 'Recently viewed product')}</h4>
            </a>
            <p class="meta">${escapeHtml(item.category || item.print_style || 'Recently viewed')}</p>
            <p><strong>${formatPrice(item.price || 0)}</strong></p>
        `;
        recentlyViewedGrid.appendChild(card);
    }
}

async function loadAuthAndPageData() {
    await refreshAuthState();
    syncCartUi();

    if (isShopPage) {
        await loadCategories();
        await loadProducts();
    } else if (isHomePage) {
        await renderRecentlyViewedSection();
    }
}

function bindEvents() {
    if (homeNavButton) {
        homeNavButton.addEventListener('click', goToHome);
    }
    if (shopNavButton) {
        shopNavButton.addEventListener('click', goToShop);
    }
    if (goShopButton) {
        goShopButton.addEventListener('click', goToShop);
    }
    if (cartButton) {
        cartButton.addEventListener('click', openCartPanel);
    }
    if (mobileCartCta) {
        mobileCartCta.addEventListener('click', openCartPanel);
    }
    if (closeCart) {
        closeCart.addEventListener('click', closeCartPanel);
    }
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await apiFetch(`${API_BASE}/auth/logout/`, { method: 'POST' });
                if (!response.ok) {
                    throw new Error('Logout failed.');
                }
                state.currentUser = null;
                setAuthButton();
                setExtraNavLinks();
                if (isShopPage && state.products.length) {
                    renderProducts();
                }
                showToast('Logged out.', 'default');
            } catch (_error) {
                showToast('Could not log out right now.', 'error');
            }
        });
    }

    if (isShopPage && productSearchEl) {
        productSearchEl.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                state.searchTerm = String(productSearchEl.value || '').trim();
                loadProducts(state.selectedCategory, 1);
            }, 220);
        });
    }

    if (isShopPage && sortSelectEl) {
        sortSelectEl.addEventListener('change', () => {
            state.sortOrder = String(sortSelectEl.value || 'featured');
            loadProducts(state.selectedCategory, 1);
        });
    }

    if (isShopPage) {
        const filterInputs = [sizeFilterEl, colorFilterEl, printStyleFilterEl, minPriceFilterEl, maxPriceFilterEl].filter(Boolean);
        for (const input of filterInputs) {
            input.addEventListener('change', () => {
                state.filters = getShopFiltersFromInputs();
                loadProducts(state.selectedCategory, 1);
            });
        }

        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', resetFilters);
        }
    }
}

bindEvents();
loadAuthAndPageData();
