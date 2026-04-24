const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    roleLabel,
    showToast,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const trackForm = document.getElementById('trackForm');
const trackingResult = document.getElementById('trackingResult');
const trackingStatus = document.getElementById('trackingStatus');
const trackingHint = document.getElementById('trackingHint');

let currentUser = null;

const ORDER_PROGRESS_STEPS = [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Order Confirmed' },
    { key: 'SHIPPED', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Delivered' },
];

const STATUS_WEIGHT = {
    PENDING: 0,
    CONFIRMED: 1,
    PACKED: 1,
    SHIPPED: 2,
    OUT_FOR_DELIVERY: 2,
    DELIVERED: 3,
};

async function refreshAuthState() {
    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await response.json();
        currentUser = body && body.is_authenticated ? body.user : null;
    } catch (_error) {
        currentUser = null;
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

function renderOrder(order) {
    if (!trackingResult) return;

    const items = (order.items || []).map((item) => `
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

    const orderDate = formatDateTime(order.created_at);
    const statusLabel = formatStatusLabel(order.status || 'PENDING');

    trackingResult.innerHTML = `
        <section class="track-card pad tracking-result-stack">
            <div class="shopee-result-head">
                <div>
                    <h3>Order #${escapeHtml(String(order.id || ''))}</h3>
                    <p class="meta">Placed on ${escapeHtml(orderDate || 'N/A')}</p>
                </div>
                <span class="shopee-status-badge ${statusClassName(order.status)}">${escapeHtml(statusLabel)}</span>
            </div>
            ${renderProgress(order.status)}
            <div class="shopee-action-row" aria-label="Order actions">
                <a class="shopee-action-btn primary" href="mailto:anyprint.support@gmail.com?subject=${encodeURIComponent(`Order ${order.id} Support`)}&body=${encodeURIComponent(`Hi AnyPrint,\n\nI need help with order #${order.id} (${order.tracking_number || 'N/A'}).`)}">Contact Seller</a>
                <a class="shopee-action-btn" href="faq.html">Need Help?</a>
            </div>
        </section>

        <section class="track-card pad tracking-result-stack">
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
                    <p class="meta">Payment</p>
                    <strong>${escapeHtml(formatStatusLabel(order.payment_status || 'PENDING'))}</strong>
                </article>
            </div>
            <div class="shopee-total-wrap">
                <div class="quote-row"><span>Subtotal</span><strong>${formatPrice(order.subtotal_amount)}</strong></div>
                <div class="quote-row"><span>Shipping</span><strong>${formatPrice(order.shipping_fee)}</strong></div>
                <div class="quote-row"><span>Discounts</span><strong>-${formatPrice(Number(order.discount_amount || 0))}</strong></div>
                <div class="quote-row quote-total"><span>Total</span><strong>${formatPrice(order.total_amount)}</strong></div>
            </div>
        </section>

        <section class="track-card pad tracking-result-stack">
            <div class="section-head shopee-section-head">
                <h3>Items</h3>
                <span class="meta">${order.items.length} item${order.items.length === 1 ? '' : 's'}</span>
            </div>
            <div class="tracking-lines">${items}</div>
        </section>

        <section class="track-card pad tracking-result-stack">
            <div class="section-head shopee-section-head">
                <h3>Status timeline</h3>
                <span class="meta">Live updates after checkout</span>
            </div>
            ${renderTimeline(order)}
        </section>
    `;
}

async function trackOrder(formData) {
    const trackingNumber = String(formData.get('tracking_number') || '').trim();
    const orderId = String(formData.get('order_id') || '').trim();
    const email = String(formData.get('email') || '').trim();

    const params = new URLSearchParams();
    if (trackingNumber) params.set('tracking_number', trackingNumber);
    if (orderId) params.set('order_id', orderId);
    if (email) params.set('email', email);

    if (!trackingNumber && !orderId) {
        trackingStatus.textContent = 'Enter a tracking number or order ID.';
        return;
    }

    trackingStatus.textContent = 'Looking up order...';
    try {
        const response = await apiFetch(`${API_BASE}/orders/track/?${params.toString()}`);
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not find that order.');
        }
        trackingStatus.textContent = 'Order found.';
        renderOrder(body.order);
    } catch (error) {
        trackingStatus.textContent = error.message || 'Could not find that order.';
        trackingResult.innerHTML = '';
    }
}

if (trackForm) {
    trackForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(trackForm);
        await trackOrder(formData);
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

(function init() {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    const trackingNumber = params.get('tracking_number');
    if (orderId && trackForm) {
        trackForm.querySelector('[name="order_id"]').value = orderId;
    }
    if (trackingNumber && trackForm) {
        trackForm.querySelector('[name="tracking_number"]').value = trackingNumber;
    }
    if (trackingHint) {
        trackingHint.textContent = 'Use the tracking number from checkout or the order ID from your confirmation page.';
    }
    refreshAuthState();
})();
