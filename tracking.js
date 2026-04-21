const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    getCurrentPageName,
    roleCanManage,
    roleLabel,
    renderStars,
    showToast,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const trackForm = document.getElementById('trackForm');
const trackingResult = document.getElementById('trackingResult');
const trackingStatus = document.getElementById('trackingStatus');
const trackingHint = document.getElementById('trackingHint');

let currentUser = null;

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
        <div class="timeline">
            ${order.tracking_events.map((event) => `
                <article class="timeline-item ${String(event.status || '').toLowerCase().replaceAll(' ', '-')}">
                    <div class="timeline-dot"></div>
                    <div>
                        <strong>${escapeHtml(event.status)}</strong>
                        <p class="meta">${escapeHtml(event.note || 'Status updated')}</p>
                        <p class="meta">${escapeHtml(event.created_at || '')}</p>
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderOrder(order) {
    if (!trackingResult) return;

    const items = (order.items || []).map((item) => `
        <article class="order-line">
            <div>
                <strong>${escapeHtml(item.product_name)}</strong>
                <p class="meta">${escapeHtml(item.size || 'M')} | ${escapeHtml(item.color || 'Black')} | Qty: ${item.quantity}</p>
            </div>
            <strong>${formatPrice(item.subtotal)}</strong>
        </article>
    `).join('');

    trackingResult.innerHTML = `
        <section class="panel-card pad soft tracking-summary">
            <div class="section-head">
                <h3>${escapeHtml(order.full_name)}</h3>
                <span class="badge-pill">${escapeHtml(order.status || 'PENDING')}</span>
            </div>
            <p class="meta">Tracking number: ${escapeHtml(order.tracking_number || '')}</p>
            <p class="meta">Payment: ${escapeHtml(order.payment_method || '')} • ${escapeHtml(order.payment_status || '')}</p>
            <p class="meta">Estimated delivery: ${escapeHtml(order.estimated_delivery_date || '')}</p>
            <div class="quote-row"><span>Subtotal</span><strong>${formatPrice(order.subtotal_amount)}</strong></div>
            <div class="quote-row"><span>Shipping</span><strong>${formatPrice(order.shipping_fee)}</strong></div>
            <div class="quote-row"><span>Discounts</span><strong>-${formatPrice(Number(order.discount_amount || 0))}</strong></div>
            <div class="quote-row quote-total"><span>Total</span><strong>${formatPrice(order.total_amount)}</strong></div>
        </section>
        <section class="panel-card pad soft tracking-summary">
            <div class="section-head">
                <h3>Items</h3>
                <span class="meta">${order.items.length} item${order.items.length === 1 ? '' : 's'}</span>
            </div>
            <div class="tracking-lines">${items}</div>
        </section>
        <section class="panel-card pad soft tracking-summary">
            <div class="section-head">
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
