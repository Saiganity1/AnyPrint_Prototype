const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    getCurrentUser,
    loadCart,
    requireAuth,
    saveCart,
    showToast,
    trackEvent,
} = window.AnyPrint;

let cart = loadCart();
let quoteData = null;
let productsById = new Map();
let currentStep = 1;
let currentUser = null;
let savedAddresses = [];

const checkoutData = {
    full_name: '',
    email: '',
    phone: '',
    address: '',
    payment_method: '',
    promo_code: '',
    notes: '',
    save_address: false,
};

const stepMap = {
    1: document.getElementById('step1'),
    2: document.getElementById('step2'),
    3: document.getElementById('step3'),
    4: document.getElementById('step4'),
};

const labelMap = {
    1: document.getElementById('stepLabel1'),
    2: document.getElementById('stepLabel2'),
    3: document.getElementById('stepLabel3'),
    4: document.getElementById('stepLabel4'),
};

const checkoutCartItems = document.getElementById('checkoutCartItems');
const checkoutEmpty = document.getElementById('checkoutEmpty');
const reviewBlock = document.getElementById('reviewBlock');
const checkoutMessage = document.getElementById('checkoutMessage');
const checkoutQuote = document.getElementById('checkoutQuote');
const quoteStatus = document.getElementById('quoteStatus');
const promoCodeInput = document.getElementById('promoCode');
const paymentMethodInput = document.getElementById('paymentMethod');
const addressForm = document.getElementById('addressForm');
const paymentForm = document.getElementById('paymentForm');
const savedAddressBlock = document.getElementById('savedAddressBlock');
const savedAddressSelect = document.getElementById('savedAddressSelect');
const savedAddressHint = document.getElementById('savedAddressHint');
const saveAddressToggle = document.getElementById('saveAddressToggle');

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
}

async function apiFetchWithCsrf(url, options = {}) {
    const config = { credentials: 'include', ...options };
    const method = String(config.method || 'GET').toUpperCase();
    const authToken = window.AnyPrint && typeof window.AnyPrint.getAuthToken === 'function'
        ? window.AnyPrint.getAuthToken()
        : '';

    const headers = new Headers(config.headers || {});
    if (authToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${authToken}`);
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken && !headers.has('X-CSRFToken')) {
            headers.set('X-CSRFToken', csrfToken);
        }
    }
    config.headers = headers;

    return fetch(url, config);
}

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (_error) {
        return { raw: text };
    }
}

function setStep(step) {
    currentStep = step;
    for (const [index, node] of Object.entries(stepMap)) {
        if (node) {
            node.classList.toggle('hidden', Number(index) !== step);
        }
    }
    for (const [index, node] of Object.entries(labelMap)) {
        if (node) {
            node.classList.toggle('active', Number(index) === step);
        }
    }
}

function getCartItemName(item) {
    const product = productsById.get(item.product_id);
    return item.product_name || (product ? product.name : `Product #${item.product_id}`);
}

function getCartItemPrice(item) {
    const product = productsById.get(item.product_id);
    return item.unit_price || (product ? product.price : '0.00');
}

function buildOrderItems() {
    return cart.map((item) => ({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        size: item.size || '',
        color: item.color || '',
        quantity: Number(item.quantity || 1),
    }));
}

function renderCartStep() {
    if (!checkoutCartItems || !checkoutEmpty) return;

    checkoutCartItems.innerHTML = '';
    if (!cart.length) {
        checkoutEmpty.classList.remove('hidden');
        checkoutEmpty.innerHTML = `
            <div class="empty-state">
                <h4>Your cart is empty.</h4>
                <p class="meta">Browse shirts first, then return here to complete your order.</p>
                <a class="btn secondary" href="shop.html">Browse shirts</a>
            </div>
        `;
        return;
    }

    checkoutEmpty.classList.add('hidden');
    checkoutEmpty.innerHTML = '';

    for (const item of cart) {
        const row = document.createElement('div');
        row.className = 'cart-item checkout-cart-item';
        row.innerHTML = `
            <div>
                <p><strong>${escapeHtml(getCartItemName(item))}</strong></p>
                <p class="meta">${escapeHtml(item.size || 'M')} | ${escapeHtml(item.color || 'Black')} | Qty: ${item.quantity}</p>
                <p class="meta">${formatPrice(getCartItemPrice(item))}</p>
            </div>
            <button class="plain-btn">Remove</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
            cart = cart.filter((cartItem) => cartItem.key !== item.key);
            saveCart(cart);
            renderCartStep();
            updateQuote();
        });
        checkoutCartItems.appendChild(row);
    }
}

function renderQuote() {
    if (!checkoutQuote) return;

    if (!cart.length) {
        checkoutQuote.innerHTML = '<p class="meta">Add items to your cart to see shipping and delivery estimates.</p>';
        if (quoteStatus) quoteStatus.textContent = '';
        return;
    }

    if (!quoteData) {
        checkoutQuote.innerHTML = `
            <div class="quote-row">
                <span>Subtotal</span>
                <strong>${formatPrice(cart.reduce((sum, item) => sum + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0))}</strong>
            </div>
            <p class="meta">Enter your address to estimate delivery fee and ETA.</p>
        `;
        if (quoteStatus) quoteStatus.textContent = 'Fill in your address to calculate delivery.';
        return;
    }

    checkoutQuote.innerHTML = `
        <div class="quote-row"><span>Subtotal</span><strong>${formatPrice(quoteData.subtotal_amount)}</strong></div>
        <div class="quote-row"><span>Bundle discount</span><strong>-${formatPrice(quoteData.bundle_discount_amount)}</strong></div>
        <div class="quote-row"><span>Promo discount</span><strong>-${formatPrice(quoteData.promo_discount_amount)}</strong></div>
        <div class="quote-row"><span>Shipping fee</span><strong>${formatPrice(quoteData.shipping_fee)}</strong></div>
        <div class="quote-row quote-total"><span>Total</span><strong>${formatPrice(quoteData.total_amount)}</strong></div>
        <p class="meta">Estimated delivery: ${escapeHtml(quoteData.delivery_eta_text || `${quoteData.estimated_delivery_days} days`)}</p>
        <p class="meta">Delivery date: ${escapeHtml(quoteData.estimated_delivery_date || '')}</p>
    `;
    if (quoteStatus) {
        quoteStatus.textContent = quoteData.delivery_eta_text
            ? `Delivery estimate: ${quoteData.delivery_eta_text}`
            : 'Delivery estimate ready.';
    }
}

async function updateQuote() {
    if (!cart.length) {
        quoteData = null;
        renderQuote();
        return;
    }

    try {
        const response = await apiFetchWithCsrf(`${API_BASE}/checkout/quote/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: buildOrderItems(),
                address: checkoutData.address,
                promo_code: checkoutData.promo_code,
            }),
        });
        const body = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(body.error || body.raw || 'Could not calculate quote.');
        }
        quoteData = body.quote;
        renderQuote();
        renderReviewStep();
    } catch (error) {
        quoteData = null;
        renderQuote();
        if (quoteStatus) {
            quoteStatus.textContent = error.message || 'Could not calculate quote right now.';
        }
    }
}

function renderReviewStep() {
    if (!reviewBlock) return;

    if (!cart.length) {
        reviewBlock.innerHTML = '<p class="meta">Your cart is empty.</p>';
        return;
    }

    const orderRows = cart.map((item) => {
        const lineTotal = Number(item.unit_price || 0) * Number(item.quantity || 0);
        return `<p>${escapeHtml(getCartItemName(item))} x ${item.quantity} - ${escapeHtml(item.size || 'M')} / ${escapeHtml(item.color || 'Black')} - ${formatPrice(lineTotal)}</p>`;
    });

    reviewBlock.innerHTML = `
        <div class="review-summary">
            <p><strong>Name:</strong> ${escapeHtml(checkoutData.full_name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(checkoutData.email)}</p>
            <p><strong>Phone:</strong> ${escapeHtml(checkoutData.phone)}</p>
            <p><strong>Address:</strong> ${escapeHtml(checkoutData.address)}</p>
            <p><strong>Payment:</strong> ${escapeHtml(checkoutData.payment_method || 'Not set')}</p>
            <p><strong>Promo:</strong> ${escapeHtml(checkoutData.promo_code || 'None')}</p>
        </div>
        <div class="review-lines">
            ${orderRows.join('')}
        </div>
        ${quoteData ? `
            <div class="review-total-box">
                <p><strong>Shipping:</strong> ${formatPrice(quoteData.shipping_fee)}</p>
                <p><strong>Discounts:</strong> -${formatPrice(Number(quoteData.bundle_discount_amount || 0) + Number(quoteData.promo_discount_amount || 0))}</p>
                <p><strong>Total:</strong> ${formatPrice(quoteData.total_amount)}</p>
            </div>
        ` : ''}
    `;
}

function setProductsFromCart() {
    productsById = new Map();
    for (const item of cart) {
        productsById.set(item.product_id, {
            id: item.product_id,
            name: item.product_name || `Product #${item.product_id}`,
            price: item.unit_price || '0.00',
        });
    }
}

function setCurrentUserFromSession() {
    if (!currentUser) {
        currentUser = getCurrentUser() || null;
    }
}

function fillAddressForm(address) {
    if (!addressForm || !address) return;

    const fullNameInput = addressForm.querySelector('[name="full_name"]');
    const emailInput = addressForm.querySelector('[name="email"]');
    const phoneInput = addressForm.querySelector('[name="phone"]');
    const addressInput = addressForm.querySelector('[name="address"]');

    if (fullNameInput) fullNameInput.value = address.full_name || '';
    if (emailInput && currentUser && currentUser.email) emailInput.value = currentUser.email;
    if (phoneInput) phoneInput.value = address.phone || '';
    if (addressInput) addressInput.value = address.address || '';

    checkoutData.full_name = address.full_name || '';
    checkoutData.phone = address.phone || '';
    checkoutData.address = address.address || '';

    renderReviewStep();
    updateQuote();
}

function renderSavedAddressOptions() {
    if (!savedAddressSelect || !savedAddressBlock) return;

    if (!currentUser) {
        savedAddressBlock.classList.add('hidden');
        savedAddresses = [];
        return;
    }

    savedAddressBlock.classList.remove('hidden');
    const options = ['<option value="">Select a saved address</option>'];
    for (const address of savedAddresses) {
        const label = `${address.full_name} - ${address.address}`;
        options.push(`<option value="${escapeHtml(String(address.id))}">${escapeHtml(label)}</option>`);
    }
    savedAddressSelect.innerHTML = options.join('');

    const defaultAddress = savedAddresses.find((address) => address.is_default) || savedAddresses[0] || null;
    if (defaultAddress) {
        savedAddressSelect.value = String(defaultAddress.id);
        if (savedAddressHint) {
            savedAddressHint.textContent = defaultAddress.is_default
                ? 'Default saved address loaded.'
                : 'Select any saved address to auto-fill the form.';
        }
    } else if (savedAddressHint) {
        savedAddressHint.textContent = 'No saved addresses yet. Fill out the form and save it for next time.';
    }
}

async function loadSavedAddresses() {
    if (!currentUser) return;

    try {
        const response = await apiFetch(`${API_BASE}/addresses/`, { method: 'GET' });
        const body = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(body.error || 'Could not load saved addresses.');
        }

        savedAddresses = Array.isArray(body.addresses) ? body.addresses : [];
        renderSavedAddressOptions();
        const defaultAddress = savedAddresses.find((address) => address.is_default) || savedAddresses[0];
        if (defaultAddress) {
            fillAddressForm(defaultAddress);
        }
    } catch (_error) {
        savedAddresses = [];
        renderSavedAddressOptions();
    }
}

async function saveAddressForNextTime(formData) {
    if (!currentUser) return;
    if (!checkoutData.save_address) return;

    const payload = {
        full_name: String(formData.get('full_name') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        address: String(formData.get('address') || '').trim(),
        is_default: savedAddresses.length === 0,
    };

    const existing = savedAddresses.find((address) =>
        address.full_name === payload.full_name &&
        address.phone === payload.phone &&
        address.address === payload.address
    );
    if (existing) {
        return;
    }

    const response = await apiFetchWithCsrf(`${API_BASE}/addresses/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await readJsonResponse(response);
    if (!response.ok) {
        throw new Error(body.error || body.raw || 'Could not save the address.');
    }

    await loadSavedAddresses();
    showToast('Address saved for next time.', 'success');
}

function validateAddressForm(formData) {
    checkoutData.full_name = String(formData.get('full_name') || '').trim();
    checkoutData.email = String(formData.get('email') || '').trim();
    checkoutData.phone = String(formData.get('phone') || '').trim();
    checkoutData.address = String(formData.get('address') || '').trim();

    if (!checkoutData.full_name || !checkoutData.email || !checkoutData.phone || !checkoutData.address) {
        showToast('Please complete the address details first.', 'error');
        return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(checkoutData.email)) {
        showToast('Please enter a valid email address.', 'error');
        return false;
    }

    const phoneDigits = checkoutData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        showToast('Please enter a valid phone number.', 'error');
        return false;
    }

    if (checkoutData.address.length < 10) {
        showToast('Please provide a more complete delivery address.', 'error');
        return false;
    }

    return true;
}

function validatePaymentForm(formData) {
    checkoutData.payment_method = String(formData.get('payment_method') || '').trim();
    checkoutData.promo_code = String(formData.get('promo_code') || '').trim();
    checkoutData.notes = String(formData.get('notes') || '').trim();

    if (!checkoutData.payment_method) {
        showToast('Please choose a payment method.', 'error');
        return false;
    }

    return true;
}

async function placeOrder() {
    if (!cart.length) {
        checkoutMessage.textContent = 'Your cart is empty.';
        return;
    }

    const payload = {
        full_name: checkoutData.full_name,
        email: checkoutData.email,
        phone: checkoutData.phone,
        address: checkoutData.address,
        payment_method: checkoutData.payment_method,
        promo_code: checkoutData.promo_code,
        notes: checkoutData.notes,
        items: buildOrderItems(),
    };

    try {
        checkoutMessage.textContent = 'Placing order...';
        try {
            await saveAddressForNextTime(new FormData(addressForm));
        } catch (_error) {
            showToast('Could not save address right now. Continuing order.', 'error');
        }

        const response = await apiFetchWithCsrf(`${API_BASE}/orders/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const body = await readJsonResponse(response);
        if (!response.ok) {
            throw new Error(body.error || body.raw || 'Failed to place order.');
        }

        saveCart([]);
        cart = [];
        trackEvent('checkout_success', { orderId: body.order_id, paymentMethod: checkoutData.payment_method });
        renderCartStep();
        renderQuote();
        checkoutMessage.textContent = `Order #${body.order_id} created successfully. Tracking number: ${body.tracking_number}.`;
        if (body.redirect_url) {
            window.location.href = body.redirect_url;
            return;
        }

        setTimeout(() => {
            window.location.href = 'tracking.html?order_id=' + encodeURIComponent(String(body.order_id)) + '&placed_order=' + encodeURIComponent(String(body.order_id));
        }, 1400);
    } catch (error) {
        checkoutMessage.textContent = error.message || 'Could not place order right now.';
    }
}

async function ensureCheckoutAuth() {
    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await readJsonResponse(response);
        if (body && body.is_authenticated) {
            currentUser = body.user || null;
            return true;
        }
    } catch (_error) {
        // Fall through to guard redirect.
    }
    return requireAuth(null, 'checkout.html');
}

function bindEvents() {
    document.getElementById('toStep2').addEventListener('click', () => {
        if (!cart.length) return;
        setStep(2);
    });

    document.getElementById('backTo1').addEventListener('click', () => setStep(1));
    document.getElementById('backTo2').addEventListener('click', () => setStep(2));
    document.getElementById('backTo3').addEventListener('click', () => setStep(3));

    addressForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(addressForm);
        if (!validateAddressForm(formData)) return;
        setStep(3);
        await updateQuote();
    });

    if (savedAddressSelect) {
        savedAddressSelect.addEventListener('change', () => {
            const selectedId = String(savedAddressSelect.value || '');
            if (!selectedId) return;
            const selectedAddress = savedAddresses.find((address) => String(address.id) === selectedId);
            if (selectedAddress) {
                fillAddressForm(selectedAddress);
                showToast('Saved address loaded.', 'default');
            }
        });
    }

    if (saveAddressToggle) {
        saveAddressToggle.addEventListener('change', () => {
            checkoutData.save_address = saveAddressToggle.checked;
        });
    }

    paymentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(paymentForm);
        if (!validatePaymentForm(formData)) return;
        await updateQuote();
        renderReviewStep();
        setStep(4);
    });

    if (promoCodeInput) {
        promoCodeInput.addEventListener('input', () => {
            checkoutData.promo_code = String(promoCodeInput.value || '').trim();
            updateQuote();
        });
    }

    if (paymentMethodInput) {
        paymentMethodInput.addEventListener('change', () => {
            checkoutData.payment_method = String(paymentMethodInput.value || '').trim();
            renderReviewStep();
        });
    }

    document.getElementById('placeOrder').addEventListener('click', placeOrder);
}

(async function init() {
    const allowed = await ensureCheckoutAuth();
    if (!allowed) return;

    setCurrentUserFromSession();
    cart = loadCart();
    if (cart.length) {
        trackEvent('checkout_start', { items: cart.length });
    }
    setProductsFromCart();
    renderCartStep();
    renderQuote();
    renderReviewStep();
    bindEvents();
    setStep(1);
    await loadSavedAddresses();
    if (cart.length) {
        updateQuote();
    }
})();
