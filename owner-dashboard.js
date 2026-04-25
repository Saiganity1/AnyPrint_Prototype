const { API_BASE, apiFetch, escapeHtml, formatPrice, showToast } = window.AnyPrint;

const ownerKpis = document.getElementById('ownerKpis');
const ownerStatus = document.getElementById('ownerStatus');
const ownerAnalyticsSummary = document.getElementById('ownerAnalyticsSummary');
const ownerOrderSearch = document.getElementById('ownerOrderSearch');
const ownerOrderStatusFilter = document.getElementById('ownerOrderStatusFilter');
const ownerRecentOrdersList = document.getElementById('ownerRecentOrdersList');
const ownerProductsTable = document.getElementById('ownerProductsTable');
const ownerCreateProductForm = document.getElementById('ownerCreateProductForm');
const ownerLogoutButton = document.getElementById('ownerLogoutButton');

let currentUser = null;
let products = [];
let recentOrdersData = [];
const ORDER_STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];

async function readJsonSafe(res) {
    try {
        return await res.json();
    } catch (_error) {
        return {};
    }
}

async function refreshOwnerUser() {
    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await readJsonSafe(response);
        currentUser = body && body.is_authenticated ? body.user : null;
    } catch (_error) {
        currentUser = null;
    }

    if (!currentUser || currentUser.role !== 'OWNER') {
        window.location.href = 'login.html?next=owner-dashboard.html';
        return false;
    }
    return true;
}

function renderKpis(dashboardMetrics = {}, analyticsMetrics = {}) {
    if (!ownerKpis) return;
    ownerKpis.innerHTML = `
        <article class="owner-card"><h3>Total Revenue</h3><div class="owner-kpi">${formatPrice(analyticsMetrics.total_revenue || 0)}</div></article>
        <article class="owner-card"><h3>Total Orders</h3><div class="owner-kpi">${analyticsMetrics.total_orders || 0}</div></article>
        <article class="owner-card"><h3>Completed Orders</h3><div class="owner-kpi">${analyticsMetrics.completed_orders || 0}</div></article>
        <article class="owner-card"><h3>Average Order Value</h3><div class="owner-kpi">${formatPrice(analyticsMetrics.average_order_value || 0)}</div></article>
        <article class="owner-card"><h3>Low Stock Products</h3><div class="owner-kpi">${dashboardMetrics.low_stock_products || 0}</div></article>
        <article class="owner-card"><h3>Low Stock Variants</h3><div class="owner-kpi">${dashboardMetrics.low_stock_variants || 0}</div></article>
    `;
}

function renderAnalyticsSummary(payload = {}) {
    if (!ownerAnalyticsSummary) return;
    const topProducts = payload.top_products || [];
    ownerAnalyticsSummary.innerHTML = topProducts.length
        ? topProducts.slice(0, 6).map((item, index) => `
            <article class="table-row">
                <span class="rank-pill">#${index + 1}</span>
                <strong>${escapeHtml(item.product_name || item.product__name || 'Product')}</strong>
                <span>${item.quantity_sold || 0} sold</span>
            </article>
        `).join('')
        : '<p class="meta">No top products yet.</p>';
}

function getFilteredOwnerOrders() {
    const search = String((ownerOrderSearch && ownerOrderSearch.value) || '').trim().toLowerCase();
    const statusFilter = String((ownerOrderStatusFilter && ownerOrderStatusFilter.value) || '').trim().toUpperCase();

    return recentOrdersData.filter((order) => {
        if (statusFilter && String(order.status || '').toUpperCase() !== statusFilter) {
            return false;
        }

        if (!search) {
            return true;
        }

        const haystack = [
            order.id,
            order.full_name,
            order.tracking_number,
            order.payment_method,
            order.payment_status,
            order.email,
        ]
            .map((value) => String(value || '').toLowerCase())
            .join(' ');
        return haystack.includes(search);
    });
}

function buildOwnerStatusSelect(order) {
    return `
        <select class="status-select" data-order-id="${order.id}">
            ${ORDER_STATUS_OPTIONS.map((status) => `<option value="${status}" ${String(order.status || 'PENDING') === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
    `;
}

async function updateOrderStatus(orderId, status) {
    try {
        const response = await apiFetch(`${API_BASE}/admin/orders/${orderId}/status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not update order status.');
        }
        showToast('Order status updated.', 'success');
        await loadOwnerHomepage();
    } catch (_error) {
        showToast('Could not update order status.', 'error');
    }
}

function renderOwnerRecentOrders(items) {
    if (!ownerRecentOrdersList) return;
    ownerRecentOrdersList.innerHTML = items.length
        ? items.map((order) => `
            <article class="table-row order-row">
                <div>
                    <strong>#${order.id} • ${escapeHtml(order.full_name || '')}</strong>
                    <p class="meta">${escapeHtml(order.tracking_number || '')} • ${escapeHtml(order.payment_method || '')} • ${escapeHtml(order.payment_status || '')}</p>
                    <p class="meta">${escapeHtml(order.status || '')} • ${escapeHtml(order.created_at || '')}</p>
                </div>
                <div class="order-row-actions">
                    ${buildOwnerStatusSelect(order)}
                    <button class="btn small status-save-btn" data-order-id="${order.id}">Update</button>
                </div>
                <strong>${formatPrice(order.total_amount || 0)}</strong>
            </article>
        `).join('')
        : '<p class="meta">No recent orders match your filters.</p>';

    ownerRecentOrdersList.querySelectorAll('.status-save-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const orderId = Number(button.getAttribute('data-order-id'));
            const select = ownerRecentOrdersList.querySelector(`.status-select[data-order-id="${orderId}"]`);
            if (!select) return;
            await updateOrderStatus(orderId, select.value);
        });
    });
}

function applyOwnerOrderFilters() {
    renderOwnerRecentOrders(getFilteredOwnerOrders());
}

function renderProductsTable() {
    if (!ownerProductsTable) return;

    if (!products.length) {
        ownerProductsTable.innerHTML = '<p class="meta">No products found.</p>';
        return;
    }

    ownerProductsTable.innerHTML = `
        <table class="owner-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Restock</th>
                </tr>
            </thead>
            <tbody>
                ${products.map((product) => `
                    <tr>
                        <td>${escapeHtml(product.name)}</td>
                        <td>${escapeHtml(product.category || 'Uncategorized')}</td>
                        <td>${formatPrice(product.price)}</td>
                        <td><strong>${product.stock_quantity}</strong></td>
                        <td>
                            <div class="owner-stock-actions">
                                <input type="number" min="0" step="1" class="restock-qty" data-product-id="${product.id}" placeholder="Qty" />
                                <select class="restock-mode" data-product-id="${product.id}">
                                    <option value="increment">Add</option>
                                    <option value="set">Set</option>
                                </select>
                                <button class="btn small owner-restock-btn" data-product-id="${product.id}" type="button">Save</button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    ownerProductsTable.querySelectorAll('.owner-restock-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const productId = Number(button.getAttribute('data-product-id'));
            const qtyEl = ownerProductsTable.querySelector(`.restock-qty[data-product-id="${productId}"]`);
            const modeEl = ownerProductsTable.querySelector(`.restock-mode[data-product-id="${productId}"]`);
            if (!qtyEl || !modeEl) return;

            const quantity = Number(qtyEl.value || 0);
            if (!Number.isInteger(quantity) || quantity < 0) {
                showToast('Enter a valid restock quantity.', 'error');
                return;
            }

            await restockProduct(productId, quantity, modeEl.value);
            qtyEl.value = '';
        });
    });
}

async function loadProducts() {
    const response = await apiFetch(`${API_BASE}/admin/products/?page_size=200`);
    const body = await readJsonSafe(response);
    if (!response.ok) {
        throw new Error(body.error || 'Could not load products.');
    }
    products = body.products || [];
    renderProductsTable();
}

async function loadOwnerHomepage() {
    const [dashboardResponse, analyticsResponse] = await Promise.all([
        apiFetch(`${API_BASE}/admin/dashboard/`),
        apiFetch(`${API_BASE}/admin/analytics/`),
    ]);

    const dashboardBody = await readJsonSafe(dashboardResponse);
    const analyticsBody = await readJsonSafe(analyticsResponse);

    if (!dashboardResponse.ok) {
        throw new Error(dashboardBody.error || 'Could not load owner dashboard.');
    }
    if (!analyticsResponse.ok) {
        throw new Error(analyticsBody.error || 'Could not load analytics.');
    }

    renderKpis(dashboardBody.metrics || {}, analyticsBody.metrics || {});
    renderAnalyticsSummary(analyticsBody);
    recentOrdersData = dashboardBody.recent_orders || [];
    applyOwnerOrderFilters();
}

async function createProduct(payload) {
    const response = await apiFetch(`${API_BASE}/admin/products/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const body = await readJsonSafe(response);
    if (!response.ok) {
        throw new Error(body.error || 'Could not create product.');
    }
}

async function restockProduct(productId, quantity, mode) {
    const response = await apiFetch(`${API_BASE}/admin/products/${productId}/restock/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, mode }),
    });
    const body = await readJsonSafe(response);
    if (!response.ok) {
        throw new Error(body.error || 'Could not restock product.');
    }
    showToast('Stock updated.', 'success');
    await loadProducts();
}

if (ownerCreateProductForm) {
    ownerCreateProductForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(ownerCreateProductForm);
        const payload = {
            name: String(formData.get('name') || '').trim(),
            category: String(formData.get('category') || '').trim(),
            price: Number(formData.get('price') || 0),
            stock_quantity: Number(formData.get('stock_quantity') || 0),
            print_style: String(formData.get('print_style') || 'Classic').trim(),
            description: String(formData.get('description') || '').trim(),
            is_featured: !!formData.get('is_featured'),
            is_active: true,
        };

        try {
            await createProduct(payload);
            showToast('Product created.', 'success');
            ownerCreateProductForm.reset();
            await Promise.all([loadProducts(), loadOwnerHomepage()]);
        } catch (error) {
            showToast(error.message || 'Could not create product.', 'error');
        }
    });
}

if (ownerLogoutButton) {
    ownerLogoutButton.addEventListener('click', async () => {
        try {
            await apiFetch(`${API_BASE}/auth/logout/`, { method: 'POST' });
        } catch (_error) {
            // Best effort logout.
        }
        if (window.AnyPrintCore && window.AnyPrintCore.clearTokens) {
            window.AnyPrintCore.clearTokens();
        }
        window.AnyPrint.clearAuthToken();
        window.location.href = 'index.html';
    });
}

if (ownerOrderSearch) {
    ownerOrderSearch.addEventListener('input', applyOwnerOrderFilters);
}

if (ownerOrderStatusFilter) {
    ownerOrderStatusFilter.addEventListener('change', applyOwnerOrderFilters);
}

async function initOwnerDashboard() {
    const allowed = await refreshOwnerUser();
    if (!allowed) return;

    try {
        if (ownerStatus) ownerStatus.textContent = 'Loading owner homepage...';
        await Promise.all([loadOwnerHomepage(), loadProducts()]);
        if (ownerStatus) ownerStatus.textContent = 'Owner homepage ready.';
    } catch (error) {
        if (ownerStatus) ownerStatus.textContent = error.message || 'Could not load owner homepage.';
    }
}

document.addEventListener('DOMContentLoaded', initOwnerDashboard);
