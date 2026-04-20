const API_BASE = window.API_BASE || 'http://127.0.0.1:8000/api';
const ANALYTICS_ENABLED = true;

let products = [];
let categories = [];
let selectedCategory = '';
let currentUser = null;

const productsEl = document.getElementById('products');
const productsStatusEl = document.getElementById('productsStatus');
const categoryChipsEl = document.getElementById('categoryChips');
const shopSection = document.getElementById('shopSection');
const goShopButton = document.getElementById('goShopButton');
const homeNavButton = document.getElementById('homeNavButton');
const shopNavButton = document.getElementById('shopNavButton');

const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const mobileCartCountEl = document.getElementById('mobileCartCount');
const cartPanel = document.getElementById('cartPanel');
const cartButton = document.getElementById('cartButton');
const mobileCartCta = document.getElementById('mobileCartCta');
const closeCart = document.getElementById('closeCart');
const cartCheckoutButton = document.getElementById('cartCheckoutButton');

const authButton = document.getElementById('authButton');
const authPanel = document.getElementById('authPanel');
const closeAuth = document.getElementById('closeAuth');
const authDialog = authPanel.querySelector('.auth-dialog');
const authState = document.getElementById('authState');
const authStatus = document.getElementById('authStatus');
const showLoginTab = document.getElementById('showLoginTab');
const showRegisterTab = document.getElementById('showRegisterTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const passwordStrength = document.getElementById('passwordStrength');

const quickViewPanel = document.getElementById('quickViewPanel');
const closeQuickView = document.getElementById('closeQuickView');
const quickViewContent = document.getElementById('quickViewContent');
const toastStack = document.getElementById('toastStack');

const LEGACY_CART = 'tt_cart';
const CART_KEY = 'tt_cart_v2';

function loadCart() {
    const cartV2 = localStorage.getItem(CART_KEY);
    if (cartV2) {
        try {
            const parsed = JSON.parse(cartV2);
            if (Array.isArray(parsed)) return parsed;
        } catch (_error) {
            return [];
        }
    }

    const legacy = localStorage.getItem(LEGACY_CART);
    if (!legacy) return [];

    try {
        const parsed = JSON.parse(legacy);
        const migrated = Object.entries(parsed).map(([productId, quantity]) => ({
            key: `${productId}|M|Black`,
            product_id: Number(productId),
            quantity,
            size: 'M',
            color: 'Black',
        }));
        localStorage.setItem(CART_KEY, JSON.stringify(migrated));
        return migrated;
    } catch (_error) {
        return [];
    }
}

let cart = loadCart();

function track(eventName, payload = {}) {
    if (!ANALYTICS_ENABLED) return;
    if (!window.dataLayer) {
        window.dataLayer = [];
    }
    window.dataLayer.push({ event: eventName, ...payload });
    console.info('[analytics]', eventName, payload);
}

async function apiFetch(url, options = {}) {
    const config = {
        credentials: 'include',
        ...options,
    };
    return fetch(url, config);
}

function getSizeOptions(_product) {
    return ['S', 'M', 'L', 'XL'];
}

function getColorOptions(product) {
    if ((product.category || '').toLowerCase().includes('graphic')) {
        return ['Black', 'Cream', 'Navy'];
    }
    return ['Black', 'White', 'Sand', 'Olive'];
}

function showToast(message, tone = 'default') {
    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountEl.textContent = String(count);
    mobileCartCountEl.textContent = String(count);
    renderCart();
}

function showShop() {
    shopSection.classList.remove('hidden-shop');
    shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showHome() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function buildVariantKey(productId, size, color) {
    return `${productId}|${size}|${color}`;
}

function addToCart(productId, size, color) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const key = buildVariantKey(productId, size, color);
    const existing = cart.find((item) => item.key === key);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty + 1 > product.stock_quantity) {
        showToast('Not enough stock for this variant.', 'error');
        return;
    }

    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            key,
            product_id: productId,
            quantity: 1,
            size,
            color,
        });
    }

    track('add_to_cart', { product_id: productId, size, color });
    showToast(`${product.name} added to cart.`, 'success');
    saveCart();
}

function removeFromCart(itemKey) {
    cart = cart.filter((item) => item.key !== itemKey);
    saveCart();
}

function renderLoadingSkeletons() {
    productsStatusEl.textContent = '';
    productsEl.innerHTML = '';
    for (let i = 0; i < 6; i += 1) {
        const skel = document.createElement('article');
        skel.className = 'product-card skeleton-card';
        skel.innerHTML = '<div class="skeleton-box"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div>';
        productsEl.appendChild(skel);
    }
}

function renderProductsError(message) {
    productsEl.innerHTML = '';
    productsStatusEl.innerHTML = '';
    const errorBox = document.createElement('div');
    errorBox.className = 'products-error';
    errorBox.innerHTML = `<p>${message}</p><button id="retryProducts" class="btn">Retry</button>`;
    productsStatusEl.appendChild(errorBox);
    document.getElementById('retryProducts').addEventListener('click', () => loadProducts(selectedCategory));
}

function renderEmptyProducts() {
    productsStatusEl.innerHTML = '<p class="meta">No products found in this category yet.</p>';
    productsEl.innerHTML = '';
}

function openQuickView(product) {
    const sizes = getSizeOptions(product);
    const colors = getColorOptions(product);

    quickViewContent.innerHTML = `
        ${product.image_url ? `<img class="quick-image" src="${product.image_url}" alt="${product.name}">` : '<div class="placeholder">No image</div>'}
        <h4>${product.name}</h4>
        <p class="meta">${product.category || 'Uncategorized'} | Stock: ${product.stock_quantity}</p>
        <p>${product.description}</p>
        <label>Size</label>
        <select id="quickSize">${sizes.map((size) => `<option value="${size}">${size}</option>`).join('')}</select>
        <label>Color</label>
        <select id="quickColor">${colors.map((color) => `<option value="${color}">${color}</option>`).join('')}</select>
        <button id="quickAdd" class="btn">Add to Cart</button>
    `;

    document.getElementById('quickAdd').addEventListener('click', () => {
        const size = document.getElementById('quickSize').value;
        const color = document.getElementById('quickColor').value;
        addToCart(product.id, size, color);
        quickViewPanel.classList.add('hidden');
    });

    quickViewPanel.classList.remove('hidden');
    track('view_product', { product_id: product.id, source: 'quick_view' });
}

function renderProducts() {
    productsStatusEl.textContent = '';
    productsEl.innerHTML = '';

    if (!products.length) {
        renderEmptyProducts();
        return;
    }

    for (const product of products) {
        const card = document.createElement('article');
        card.className = 'product-card';
        const sizes = getSizeOptions(product);
        const colors = getColorOptions(product);
        const lowStockText = product.stock_quantity > 0 && product.stock_quantity <= 3
            ? `<p class="low-stock">Only ${product.stock_quantity} left</p>`
            : '';

        const imageHtml = product.image_url
            ? `<img src="${product.image_url}" alt="${product.name}">`
            : '<div class="placeholder">No image</div>';

        card.innerHTML = `
            ${imageHtml}
            <h3>${product.name}</h3>
            <p class="meta">${product.category || 'Uncategorized'} | Stock: ${product.stock_quantity}</p>
            ${lowStockText}
            <p>${product.description}</p>
            <p><strong>PHP ${product.price}</strong></p>
            <div class="variant-row">
                <select class="size-select">${sizes.map((size) => `<option value="${size}">${size}</option>`).join('')}</select>
                <select class="color-select">${colors.map((color) => `<option value="${color}">${color}</option>`).join('')}</select>
            </div>
            <div class="card-actions">
                <button class="plain-btn quick-btn">Quick View</button>
                <button class="btn add-btn" ${product.stock_quantity <= 0 ? 'disabled' : ''}>${product.stock_quantity <= 0 ? 'Sold Out' : 'Add to Cart'}</button>
            </div>
        `;

        const addButton = card.querySelector('.add-btn');
        const quickButton = card.querySelector('.quick-btn');
        const sizeSelect = card.querySelector('.size-select');
        const colorSelect = card.querySelector('.color-select');

        addButton.addEventListener('click', () => addToCart(product.id, sizeSelect.value, colorSelect.value));
        quickButton.addEventListener('click', () => openQuickView(product));

        productsEl.appendChild(card);
    }
}

function renderCategories() {
    categoryChipsEl.innerHTML = '';

    const all = document.createElement('button');
    all.className = `chip ${selectedCategory ? '' : 'active'}`;
    all.textContent = 'All';
    all.addEventListener('click', () => loadProducts(''));
    categoryChipsEl.appendChild(all);

    for (const category of categories) {
        const chip = document.createElement('button');
        chip.className = `chip ${selectedCategory === category.slug ? 'active' : ''}`;
        chip.textContent = category.name;
        chip.addEventListener('click', () => loadProducts(category.slug));
        categoryChipsEl.appendChild(chip);
    }
}

function renderCart() {
    cartItemsEl.innerHTML = '';

    if (!cart.length) {
        cartItemsEl.innerHTML = '<p class="meta">Cart is empty.</p>';
        cartCheckoutButton.classList.add('disabled-link');
        return;
    }

    cartCheckoutButton.classList.remove('disabled-link');

    for (const item of cart) {
        const product = products.find((p) => p.id === item.product_id);
        const name = product ? product.name : `Product #${item.product_id}`;
        const price = product ? product.price : '0.00';
        const node = document.createElement('div');
        node.className = 'cart-item';
        node.innerHTML = `
            <p><strong>${name}</strong></p>
            <p class="meta">${item.size} | ${item.color} | Qty: ${item.quantity} | PHP ${price}</p>
            <button class="plain-btn">Remove</button>
        `;
        node.querySelector('button').addEventListener('click', () => removeFromCart(item.key));
        cartItemsEl.appendChild(node);
    }
}

async function loadCategories() {
    const res = await apiFetch(`${API_BASE}/categories/`);
    if (!res.ok) {
        throw new Error('Failed to load categories.');
    }
    const body = await res.json();
    categories = body.categories || [];
    renderCategories();
}

async function loadProducts(category = '') {
    selectedCategory = category;
    renderLoadingSkeletons();

    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    try {
        const res = await apiFetch(`${API_BASE}/products/${query}`);
        if (!res.ok) {
            throw new Error('Could not load products right now.');
        }
        const body = await res.json();
        products = body.products || [];
        renderCategories();
        renderProducts();
        renderCart();
    } catch (_error) {
        renderProductsError('Could not load products right now. Please try again.');
    }
}

function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return 'Weak';
    if (score <= 3) return 'Medium';
    return 'Strong';
}

function setAuthTab(isLogin) {
    loginForm.classList.toggle('hidden', !isLogin);
    registerForm.classList.toggle('hidden', isLogin);
    showLoginTab.classList.toggle('active', isLogin);
    showRegisterTab.classList.toggle('active', !isLogin);
    authStatus.textContent = '';
    loginError.textContent = '';
    registerError.textContent = '';
}

function renderAuthState() {
    if (currentUser) {
        authState.innerHTML = `<p><strong>Signed in as:</strong> ${currentUser.username}</p>`;
        authButton.textContent = currentUser.username;
        logoutButton.classList.remove('hidden');
    } else {
        authState.innerHTML = '<p class="meta">You are browsing as guest.</p>';
        authButton.textContent = 'Login/Register';
        logoutButton.classList.add('hidden');
    }
}

async function refreshAuthState() {
    const res = await apiFetch(`${API_BASE}/auth/me/`);
    const body = await res.json();
    currentUser = body.is_authenticated ? body.user : null;
    renderAuthState();
}

cartButton.addEventListener('click', () => cartPanel.classList.remove('hidden'));
mobileCartCta.addEventListener('click', () => cartPanel.classList.remove('hidden'));
closeCart.addEventListener('click', () => cartPanel.classList.add('hidden'));

authButton.addEventListener('click', () => {
    setAuthTab(true);
    authPanel.classList.remove('hidden');
});

closeAuth.addEventListener('click', () => authPanel.classList.add('hidden'));
authPanel.addEventListener('click', (event) => {
    if (!authDialog.contains(event.target)) {
        authPanel.classList.add('hidden');
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        authPanel.classList.add('hidden');
        quickViewPanel.classList.add('hidden');
    }
});

showLoginTab.addEventListener('click', () => setAuthTab(true));
showRegisterTab.addEventListener('click', () => setAuthTab(false));
closeQuickView.addEventListener('click', () => quickViewPanel.classList.add('hidden'));
quickViewPanel.addEventListener('click', (event) => {
    const dialog = quickViewPanel.querySelector('.quick-view-dialog');
    if (!dialog.contains(event.target)) {
        quickViewPanel.classList.add('hidden');
    }
});

goShopButton.addEventListener('click', showShop);
shopNavButton.addEventListener('click', showShop);
homeNavButton.addEventListener('click', showHome);

cartCheckoutButton.addEventListener('click', (event) => {
    if (!cart.length) {
        event.preventDefault();
        showToast('Your cart is empty.', 'error');
        return;
    }
    track('start_checkout', { item_count: cart.length });
});

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authStatus.textContent = '';
    loginError.textContent = '';

    const formData = new FormData(loginForm);
    const payload = {
        username: formData.get('username'),
        password: formData.get('password'),
    };

    const res = await apiFetch(`${API_BASE}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await res.json();

    if (!res.ok) {
        loginError.textContent = body.error || 'Login failed.';
        return;
    }

    currentUser = body.user;
    renderAuthState();
    authStatus.textContent = 'Login successful.';
    showToast('Welcome back!', 'success');
    loginForm.reset();
});

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    authStatus.textContent = '';
    registerError.textContent = '';

    const formData = new FormData(registerForm);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirm_password') || '');

    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match.';
        return;
    }

    const payload = {
        username: formData.get('username'),
        email: formData.get('email'),
        password,
    };

    const res = await apiFetch(`${API_BASE}/auth/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await res.json();

    if (!res.ok) {
        registerError.textContent = body.error || 'Registration failed.';
        return;
    }

    currentUser = body.user;
    renderAuthState();
    authStatus.textContent = 'Registration successful. You are now logged in.';
    showToast('Account created successfully.', 'success');
    registerForm.reset();
    passwordStrength.textContent = '';
    setAuthTab(true);
});

registerForm.password.addEventListener('input', () => {
    const level = evaluatePasswordStrength(registerForm.password.value);
    passwordStrength.textContent = registerForm.password.value ? `Password strength: ${level}` : '';
});

logoutButton.addEventListener('click', async () => {
    authStatus.textContent = '';
    const res = await apiFetch(`${API_BASE}/auth/logout/`, {
        method: 'POST',
    });
    if (!res.ok) {
        authStatus.textContent = 'Logout failed.';
        return;
    }

    currentUser = null;
    renderAuthState();
    authStatus.textContent = 'Logged out.';
    showToast('You have logged out.', 'default');
});

saveCart();
setAuthTab(true);
refreshAuthState()
    .then(() => loadCategories())
    .then(() => loadProducts(''));
