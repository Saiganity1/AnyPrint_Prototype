const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    getCurrentUser,
    roleLabel,
    getLoginRedirectUrl,
    showToast,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const trackingResult = document.getElementById('trackingResult');
const ordersSummary = document.getElementById('ordersSummary');
const selectedTabTitle = document.getElementById('selectedTabTitle');
const selectedTabHint = document.getElementById('selectedTabHint');
const shortcutButtons = Array.from(document.querySelectorAll('.track-shortcut[data-tab]'));
const filterButtons = Array.from(document.querySelectorAll('.track-filter-btn[data-tab]'));
const shortcutCounts = Array.from(document.querySelectorAll('[data-count]'));

let currentUser = null;
let currentOrders = [];
let currentTab = 'to_pay';

const TAB_CONFIG = {
    to_pay: {
        label: 'To Pay',
        hint: 'Orders waiting for payment confirmation.',
        statuses: ['PENDING'],
    },
    to_ship: {
        label: 'To Ship',
        hint: 'Orders that are paid and ready for the admin to pack or ship.',
        statuses: ['CONFIRMED', 'PACKED'],
    },
    to_receive: {
        label: 'To Receive',
        hint: 'Orders already shipped and on the way to you.',
        statuses: ['SHIPPED', 'OUT_FOR_DELIVERY'],
    },
    to_rate: {
        label: 'To Rate',
        hint: 'Delivered orders that are ready for feedback.',
        statuses: ['DELIVERED'],
    },
];

const STATUS_WEIGHT = {
    PENDING: 0,
    CONFIRMED: 1,
    PACKED: 1,
    SHIPPED: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: 3,
};

const ORDER_PROGRESS_STEPS = ['Order Placed', 'To Ship', 'To Receive', 'To Rate'];

const STATUS_INDEX = {
    PENDING: 0,
    CONFIRMED: 1,
    PACKED: 1,
    SHIPPED: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: 3,
};

async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch (_error) {
        return { raw: text };
    }
}

function normalizeStatus(status) {
    return String(status || '').toUpperCase();
}

function getOrderTab(order) {
    const status = normalizeStatus(order.status);
    if (status === 'DELIVERED') return 'to_rate';
    if (status === 'SHIPPED' || status === 'OUT_FOR_DELIVERY') return 'to_receive';
    if (status === 'CONFIRMED' || status === 'PACKED') return 'to_ship';
    return 'to_pay';
}

function getTabOrders(tabKey) {
    return currentOrders.filter((order) => getOrderTab(order) === tabKey);
}

function updateShortcutCounts() {
    const counts = {
        to_pay: getTabOrders('to_pay').length,
        to_ship: getTabOrders('to_ship').length,
        to_receive: getTabOrders('to_receive').length,
        to_rate: getTabOrders('to_rate').length,
    };

    shortcutCounts.forEach((node) => {
        const tabKey = node.getAttribute('data-count');
        const count = counts[tabKey] || 0;
        node.textContent = `${count} order${count === 1 ? '' : 's'}`;
    });
}

function setActiveTab(tabKey) {
    currentTab = tabKey;
    shortcutButtons.forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tabKey));
    filterButtons.forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tabKey));

    const config = TAB_CONFIG[tabKey] || TAB_CONFIG.to_pay;
    if (selectedTabTitle) selectedTabTitle.textContent = config.label;
    if (selectedTabHint) selectedTabHint.textContent = config.hint;
    renderOrders();
}

async function refreshAuthState() {
    const fallbackUser = getCurrentUser ? getCurrentUser() : null;

    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await readJsonResponse(response);
        if (response.ok && body && body.is_authenticated) {
            currentUser = body.user;
        } else {
            currentUser = fallbackUser;
        }
    } catch (_error) {
        currentUser = fallbackUser;
    }

    if (authButton) {
        if (currentUser) {
            authButton.textContent = `Saved (${roleLabel(currentUser.role)})`;
            authButton.href = 'wishlist.html';
        } else {
            authButton.textContent = 'Login/Register';
            authButton.href = 'login.html';
        }
    }

    if (logoutButton) {
        logoutButton.classList.toggle('hidden', !currentUser);
    }
}

function renderTimeline(order) {
    if (!order.tracking_events || !order.tracking_events.length) {
        return '<p class="meta">No status updates yet.</p>';
    }

    return `
        <div class="timeline shopee-timeline">
            ${order.tracking_events.map((event) => `
                <article class="timeline-item shopee-timeline-item ${String(event.status || '').toLowerCase().replaceAll('_', '-')}">
                    <div class="timeline-dot shopee-timeline-dot"></div>
                    <div class="shopee-timeline-copy">
                        <strong>${escapeHtml(formatStatusLabel(event.status || 'Updated'))}</strong>
                        <p class="meta">${escapeHtml(event.note || 'Order status updated.')}</p>
                        <p class="meta">${escapeHtml(formatDateTime(event.created_at || ''))}</p>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function formatStatusLabel(status) {
    const raw = String(status || '').trim();
    if (!raw) return 'Pending';
    return raw
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function statusClassName(status) {
    return String(status || 'pending').toLowerCase().replaceAll('_', '-');
}

function getProductInitials(name) {
    const words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return 'AP';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function renderItemThumbnail(item) {
    const initials = getProductInitials(item.product_name);
    return `
        <div class="shopee-item-thumb" aria-hidden="true">
            <span>${escapeHtml(initials)}</span>
        </div>
    `;
}

function renderProgress(status) {
    const normalizedStatus = String(status || '').toUpperCase();
    const isCancelled = normalizedStatus === 'CANCELLED';
    const currentWeight = STATUS_WEIGHT[normalizedStatus] ?? 0;

    if (isCancelled) {
        return `
            <div class="shopee-cancelled-state">
                <strong>Order Cancelled</strong>
                <p class="meta">This order was cancelled before delivery.</p>
            </div>
        `;
    }

    return `
        <div class="shopee-progress-wrap" aria-label="Order progress">
            ${ORDER_PROGRESS_STEPS.map((step, index) => {
                const stepState = index < currentWeight ? 'done' : index === currentWeight ? 'active' : 'todo';
                return `
                    <div class="shopee-step ${stepState}">
                        <span class="shopee-step-dot" aria-hidden="true"></span>
                        <span class="shopee-step-label">${escapeHtml(step.label)}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderOrderCard(order) {
    const items = (order.items || []).slice(0, 2).map((item) => `
        <article class="order-line shopee-order-line">
            ${renderItemThumbnail(item)}
            <div class="shopee-item-main">
                <strong>${escapeHtml(item.product_name)}</strong>
                <p class="meta">Variation: ${escapeHtml(item.color || 'Default')} • ${escapeHtml(item.size || 'M')}</p>
                <p class="meta">Quantity: ${item.quantity}</p>
            </div>
            <strong class="shopee-item-price">${formatPrice(item.subtotal)}</strong>
        </article>
    `).join('');

    const statusKey = normalizeStatus(order.status);
    const statusLabel = formatStatusLabel(statusKey || 'Pending');
    const tabKey = getOrderTab(order);

    return `
        <article class="track-order-card">
            <div class="track-order-card-head">
                <div>
                    <h4>Order #${escapeHtml(String(order.id || ''))}</h4>
                    <p class="track-order-meta">Placed ${escapeHtml(formatDateTime(order.created_at) || 'recently')} • ${escapeHtml(order.tracking_number || 'No tracking yet')}</p>
                </div>
                <span class="shopee-status-badge ${statusClassName(statusKey)}">${escapeHtml(statusLabel)}</span>
            </div>

            <div class="track-order-summary">
                <div>
                    <span>Payment</span>
                    <strong>${escapeHtml(formatStatusLabel(order.payment_status || 'PENDING'))}</strong>
                </div>
                <div>
                    <span>Delivery</span>
                    <strong>${escapeHtml(order.estimated_delivery_date || 'Pending')}</strong>
                </div>
                <div>
                    <span>Items</span>
                    <strong>${(order.items || []).length}</strong>
                </div>
                <div>
                    <span>Total</span>
                    <strong>${formatPrice(order.total_amount)}</strong>
                </div>
            </div>

            <div class="shopee-progress-wrap" aria-label="Order progress">
                ${['Order Placed', 'To Ship', 'To Receive', 'To Rate'].map((label, index) => {
                    const activeIndex = STATUS_INDEX[statusKey] ?? 0;
                    const stepState = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo';
                    return `
                        <div class="shopee-step ${stepState}">
                            <span class="shopee-step-dot" aria-hidden="true"></span>
                            <span class="shopee-step-label">${escapeHtml(label)}</span>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="track-order-actions">
                <button class="track-order-action primary" type="button" data-view-order="${escapeHtml(String(order.id))}">View Details</button>
                <a class="track-order-action" href="mailto:anyprint.support@gmail.com?subject=${encodeURIComponent(`Order ${order.id} Support`)}&body=${encodeURIComponent(`Hi AnyPrint,\n\nI need help with order #${order.id} (${order.tracking_number || 'N/A'}).`)}">Contact Seller</a>
                <a class="track-order-action" href="faq.html">Need Help?</a>
            </div>

            <div class="track-order-details hidden" data-order-details="${escapeHtml(String(order.id))}">
                <section class="track-card pad soft tracking-summary">
                    <div class="shopee-info-grid">
                        <article class="shopee-info-card">
                            <p class="meta">Tracking Number</p>
                            <strong>${escapeHtml(order.tracking_number || 'N/A')}</strong>
                        </article>
                        <article class="shopee-info-card">
                            <p class="meta">Estimated Delivery</p>
                            <strong>${escapeHtml(order.estimated_delivery_date || 'Pending update')}</strong>
                        </article>
                        <article class="shopee-info-card">
                            <p class="meta">Status</p>
                            <strong>${escapeHtml(TAB_CONFIG[tabKey].label)}</strong>
                        </article>
                    </div>
                    <div class="shopee-total-wrap">
                        <div class="quote-row"><span>Subtotal</span><strong>${formatPrice(order.subtotal_amount)}</strong></div>
                        <div class="quote-row"><span>Shipping</span><strong>${formatPrice(order.shipping_fee)}</strong></div>
                        <div class="quote-row"><span>Discounts</span><strong>-${formatPrice(Number(order.discount_amount || 0))}</strong></div>
                        <div class="quote-row quote-total"><span>Total</span><strong>${formatPrice(order.total_amount)}</strong></div>
                    </div>
                </section>

                <section class="track-card pad soft tracking-summary">
                    <div class="section-head shopee-section-head">
                        <h3>Items</h3>
                        <span class="meta">${(order.items || []).length} item${(order.items || []).length === 1 ? '' : 's'}</span>
                    </div>
                    <div class="tracking-lines">${items}</div>
                </section>

                <section class="track-card pad soft tracking-summary">
                    <div class="section-head shopee-section-head">
                        <h3>Status timeline</h3>
                        <span class="meta">Live updates after checkout</span>
                    </div>
                    ${renderTimeline(order)}
                </section>
            </div>
        </article>
    `;
}

function renderOrders() {
    if (!trackingResult) return;

    const orders = getTabOrders(currentTab);
    const config = TAB_CONFIG[currentTab] || TAB_CONFIG.to_pay;

    if (ordersSummary) {
        ordersSummary.textContent = `${orders.length} order${orders.length === 1 ? '' : 's'} in ${config.label}`;
    }

    if (!orders.length) {
        trackingResult.innerHTML = `<div class="track-order-empty">No ${config.label.toLowerCase()} orders yet. When you place an order, the admin can move it through this flow from To Pay to To Ship, then To Receive, and finally To Rate.</div>`;
        return;
    }

    trackingResult.innerHTML = orders.map(renderOrderCard).join('');
}

async function loadOrders() {
    if (!currentUser) return;

    const response = await apiFetch(`${API_BASE}/orders/history/`);
    const body = await readJsonResponse(response);
    if (!response.ok) {
        throw new Error(body.error || body.raw || 'Could not load orders.');
    }

    currentOrders = Array.isArray(body.orders) ? body.orders : [];
    updateShortcutCounts();
    renderOrders();
}

function attachTabHandlers() {
    [...shortcutButtons, ...filterButtons].forEach((button) => {
        button.addEventListener('click', () => {
            if (!currentUser) {
                window.location.href = getLoginRedirectUrl();
                return;
            }
            setActiveTab(button.getAttribute('data-tab') || 'to_pay');
        });
    });
}

function attachOrderCardHandlers() {
    if (!trackingResult) return;

    trackingResult.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;

        const orderId = target.getAttribute('data-view-order');
        if (!orderId) return;

        const details = trackingResult.querySelector(`[data-order-details="${CSS.escape(orderId)}"]`);
        if (details) {
            details.classList.toggle('hidden');
        }
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        try {
            const response = await apiFetch(`${API_BASE}/auth/logout/`, { method: 'POST' });
            if (!response.ok) {
                throw new Error('Logout failed.');
            }
            currentUser = null;
            await refreshAuthState();
            showToast('Logged out.', 'default');
        } catch (_error) {
            showToast('Could not log out right now.', 'error');
        }
    });
}

attachTabHandlers();
attachOrderCardHandlers();

(async function init() {
    await refreshAuthState();

    if (!currentUser) {
        if (trackingResult) {
            trackingResult.innerHTML = '<div class="track-order-empty">Please log in to view your order statuses (To Pay, To Ship, To Receive, To Rate).</div>';
        }
        return;
    }

    try {
        await loadOrders();
        setActiveTab(currentTab);
    } catch (error) {
        if (trackingResult) {
            trackingResult.innerHTML = `<div class="track-order-empty">${escapeHtml(error.message || 'Could not load your orders right now.')}</div>`;
        }
        showToast('Could not load your orders right now.', 'error');
    }
})();
