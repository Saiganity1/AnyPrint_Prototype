const API_BASE = window.API_BASE || 'http://127.0.0.1:8000/api';
const CART_KEY = 'tt_cart_v2';

let cart = [];
let products = [];
let currentStep = 1;
const checkoutData = {
    full_name: '',
    email: '',
    phone: '',
    address: '',
    payment_method: '',
    notes: '',
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

function track(eventName, payload = {}) {
    if (!window.dataLayer) window.dataLayer = [];
    window.dataLayer.push({ event: eventName, ...payload });
    console.info('[analytics]', eventName, payload);
}

async function apiFetch(url, options = {}) {
    return fetch(url, { credentials: 'include', ...options });
}

function loadCart() {
    try {
        const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
        return [];
    }
}

function setStep(step) {
    currentStep = step;
    for (const [index, node] of Object.entries(stepMap)) {
        node.classList.toggle('hidden', Number(index) !== step);
    }
    for (const [index, node] of Object.entries(labelMap)) {
        node.classList.toggle('active', Number(index) === step);
    }
}

function getProductById(productId) {
    return products.find((item) => item.id === productId);
}

function renderCartStep() {
    checkoutCartItems.innerHTML = '';
    if (!cart.length) {
        checkoutEmpty.classList.remove('hidden');
        return;
    }

    checkoutEmpty.classList.add('hidden');
    for (const item of cart) {
        const product = getProductById(item.product_id);
        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <p><strong>${product ? product.name : `Product #${item.product_id}`}</strong></p>
            <p class="meta">${item.size} | ${item.color} | Qty: ${item.quantity} | PHP ${product ? product.price : '0.00'}</p>
        `;
        checkoutCartItems.appendChild(row);
    }
}

function buildOrderItems() {
    const combined = new Map();
    for (const item of cart) {
        const existing = combined.get(item.product_id) || 0;
        combined.set(item.product_id, existing + item.quantity);
    }
    return Array.from(combined.entries()).map(([product_id, quantity]) => ({ product_id, quantity }));
}

function renderReviewStep() {
    const items = buildOrderItems();
    const rows = [];
    let total = 0;
    for (const item of items) {
        const product = getProductById(item.product_id);
        const price = Number(product ? product.price : 0);
        const subtotal = price * item.quantity;
        total += subtotal;
        rows.push(`<p>${product ? product.name : item.product_id} x ${item.quantity} - PHP ${subtotal.toFixed(2)}</p>`);
    }

    reviewBlock.innerHTML = `
        <p><strong>Name:</strong> ${checkoutData.full_name}</p>
        <p><strong>Email:</strong> ${checkoutData.email}</p>
        <p><strong>Phone:</strong> ${checkoutData.phone}</p>
        <p><strong>Address:</strong> ${checkoutData.address}</p>
        <p><strong>Payment:</strong> ${checkoutData.payment_method}</p>
        ${rows.join('')}
        <p><strong>Total:</strong> PHP ${total.toFixed(2)}</p>
    `;
}

async function loadProducts() {
    const res = await apiFetch(`${API_BASE}/products/`);
    if (!res.ok) {
        throw new Error('Failed to load products');
    }
    const body = await res.json();
    products = body.products || [];
}

document.getElementById('toStep2').addEventListener('click', () => {
    if (!cart.length) return;
    setStep(2);
});

document.getElementById('backTo1').addEventListener('click', () => setStep(1));
document.getElementById('backTo2').addEventListener('click', () => setStep(2));
document.getElementById('backTo3').addEventListener('click', () => setStep(3));

document.getElementById('addressForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    checkoutData.full_name = String(formData.get('full_name') || '').trim();
    checkoutData.email = String(formData.get('email') || '').trim();
    checkoutData.phone = String(formData.get('phone') || '').trim();
    checkoutData.address = String(formData.get('address') || '').trim();
    setStep(3);
});

document.getElementById('paymentForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    checkoutData.payment_method = String(formData.get('payment_method') || '').trim();
    checkoutData.notes = String(formData.get('notes') || '').trim();
    renderReviewStep();
    setStep(4);
});

document.getElementById('placeOrder').addEventListener('click', async () => {
    checkoutMessage.textContent = '';
    const payload = {
        ...checkoutData,
        items: buildOrderItems(),
    };

    if (!payload.items.length) {
        checkoutMessage.textContent = 'Your cart is empty.';
        return;
    }

    track('purchase_attempt', { items: payload.items.length, payment_method: payload.payment_method });

    const res = await apiFetch(`${API_BASE}/orders/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (!res.ok) {
        checkoutMessage.textContent = body.error || 'Failed to place order.';
        return;
    }

    localStorage.setItem(CART_KEY, JSON.stringify([]));

    if (body.redirect_url) {
        window.location.href = body.redirect_url;
        return;
    }

    checkoutMessage.textContent = `Order #${body.order_id} created successfully.`;
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1100);
});

(async function init() {
    cart = loadCart();
    await loadProducts();
    renderCartStep();
})();
