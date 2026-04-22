const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    requireAuth,
    roleCanManage,
    roleLabel,
    showToast,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const adminAccessNotice = document.getElementById('adminAccessNotice');
const adminMetrics = document.getElementById('adminMetrics');
const topProductsList = document.getElementById('topProductsList');
const lowStockProductsList = document.getElementById('lowStockProductsList');
const lowStockVariantsList = document.getElementById('lowStockVariantsList');
const recentOrdersList = document.getElementById('recentOrdersList');
const adminUsersList = document.getElementById('adminUsersList');
const adminStatus = document.getElementById('adminStatus');

let currentUser = null;
let dashboardData = null;
let usersData = [];

const ORDER_STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
const ROLE_OPTIONS = ['OWNER', 'ADMIN', 'USER'];

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

function requireDashboardAccess() {
    if (!currentUser || !roleCanManage(currentUser.role)) {
        if (adminAccessNotice) {
            adminAccessNotice.classList.remove('hidden');
            adminAccessNotice.innerHTML = '<p class="meta">You need an Owner or Admin account to open this dashboard.</p>';
        }
        return false;
    }

    if (adminAccessNotice) {
        adminAccessNotice.classList.add('hidden');
        adminAccessNotice.innerHTML = '';
    }
    return true;
}

function renderMetrics(metrics) {
    if (!adminMetrics) return;

    const roleSummary = (metrics.role_counts || []).map((entry) => `<span class="badge-pill">${escapeHtml(entry.role)}: ${entry.total}</span>`).join(' ');
    adminMetrics.innerHTML = `
        <article class="metric-card panel-card pad"><strong>Total Orders</strong><p>${metrics.total_orders}</p></article>
        <article class="metric-card panel-card pad"><strong>Paid Orders</strong><p>${metrics.paid_orders}</p></article>
        <article class="metric-card panel-card pad"><strong>Total Sales</strong><p>${formatPrice(metrics.total_sales)}</p></article>
        <article class="metric-card panel-card pad"><strong>Low Stock Products</strong><p>${metrics.low_stock_products}</p></article>
        <article class="metric-card panel-card pad"><strong>Low Stock Variants</strong><p>${metrics.low_stock_variants}</p></article>
        <article class="metric-card panel-card pad"><strong>Roles</strong><div class="badge-row">${roleSummary}</div></article>
    `;
}

function renderTopProducts(items) {
    if (!topProductsList) return;

    topProductsList.innerHTML = items.length
        ? items.map((item, index) => `
            <article class="table-row">
                <span class="rank-pill">#${index + 1}</span>
                <div>
                    <strong>${escapeHtml(item.product__name || 'Product')}</strong>
                    <p class="meta">${escapeHtml(item.product__slug || '')}</p>
                </div>
                <strong>${item.quantity_sold || 0} sold</strong>
            </article>
        `).join('')
        : '<p class="meta">No sales data yet.</p>';
}

function renderLowStockProducts(items) {
    if (!lowStockProductsList) return;

    lowStockProductsList.innerHTML = items.length
        ? items.map((item) => `
            <article class="table-row">
                <div>
                    <strong>${escapeHtml(item.name)}</strong>
                    <p class="meta">${escapeHtml(item.category || 'Uncategorized')}</p>
                </div>
                <span class="low-stock">${item.stock_quantity} left</span>
            </article>
        `).join('')
        : '<p class="meta">No low stock products.</p>';
}

function renderLowStockVariants(items) {
    if (!lowStockVariantsList) return;

    lowStockVariantsList.innerHTML = items.length
        ? items.map((item) => `
            <article class="table-row">
                <div>
                    <strong>${escapeHtml(item.product_name)}</strong>
                    <p class="meta">${escapeHtml(item.size)} / ${escapeHtml(item.color)}</p>
                </div>
                <span class="low-stock">${item.stock_quantity} left</span>
            </article>
        `).join('')
        : '<p class="meta">No low stock variants.</p>';
}

function buildStatusSelect(order) {
    return `
        <select class="status-select" data-order-id="${order.id}">
            ${ORDER_STATUS_OPTIONS.map((status) => `<option value="${status}" ${String(order.status || 'PENDING') === status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
    `;
}

function renderRecentOrders(items) {
    if (!recentOrdersList) return;

    recentOrdersList.innerHTML = items.length
        ? items.map((order) => `
            <article class="table-row order-row">
                <div>
                    <strong>#${order.id} • ${escapeHtml(order.full_name)}</strong>
                    <p class="meta">${escapeHtml(order.tracking_number || '')} • ${escapeHtml(order.payment_method || '')} • ${escapeHtml(order.payment_status || '')}</p>
                    <p class="meta">${escapeHtml(order.created_at || '')}</p>
                </div>
                <div class="order-row-actions">
                    ${buildStatusSelect(order)}
                    <button class="btn small status-save-btn" data-order-id="${order.id}">Update</button>
                </div>
                <strong>${formatPrice(order.total_amount)}</strong>
            </article>
        `).join('')
        : '<p class="meta">No recent orders.</p>';

    recentOrdersList.querySelectorAll('.status-save-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            const orderId = Number(button.getAttribute('data-order-id'));
            const select = recentOrdersList.querySelector(`.status-select[data-order-id="${orderId}"]`);
            if (!select) return;
            await updateOrderStatus(orderId, select.value);
        });
    });
}

function renderUsers(items) {
    if (!adminUsersList) return;

    adminUsersList.innerHTML = items.length
        ? items.map((user) => `
            <article class="table-row user-row">
                <div>
                    <strong>${escapeHtml(user.username)}</strong>
                    <p class="meta">${escapeHtml(user.email || '')} • ${user.order_count || 0} orders</p>
                </div>
                <div class="order-row-actions">
                    <select class="role-select" data-user-id="${user.id}" ${currentUser && currentUser.role !== 'OWNER' ? 'disabled' : ''}>
                        ${ROLE_OPTIONS.map((role) => `<option value="${role}" ${String(user.role || 'USER') === role ? 'selected' : ''}>${role}</option>`).join('')}
                    </select>
                    <button class="btn small role-save-btn" data-user-id="${user.id}" ${currentUser && currentUser.role !== 'OWNER' ? 'disabled' : ''}>Update</button>
                </div>
            </article>
        `).join('')
        : '<p class="meta">No users found.</p>';

    adminUsersList.querySelectorAll('.role-save-btn').forEach((button) => {
        button.addEventListener('click', async () => {
            if (!currentUser || currentUser.role !== 'OWNER') {
                showToast('Only the Owner can change roles.', 'error');
                return;
            }
            const userId = Number(button.getAttribute('data-user-id'));
            const select = adminUsersList.querySelector(`.role-select[data-user-id="${userId}"]`);
            if (!select) return;
            await updateUserRole(userId, select.value);
        });
    });
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
        await loadDashboard();
    } catch (_error) {
        showToast('Could not update order status.', 'error');
    }
}

async function updateUserRole(userId, role) {
    try {
        const response = await apiFetch(`${API_BASE}/admin/users/${userId}/role/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
        });
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not update user role.');
        }
        showToast('Role updated.', 'success');
        await loadUsers();
        await refreshAuthState();
    } catch (error) {
        showToast(error.message || 'Could not update user role.', 'error');
    }
}

async function loadDashboard() {
    if (!requireDashboardAccess()) return;

    try {
        const response = await apiFetch(`${API_BASE}/admin/dashboard/`);
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not load dashboard.');
        }
        dashboardData = body;
        renderMetrics(body.metrics || {});
        renderTopProducts(body.top_products || []);
        renderLowStockProducts(body.low_stock_products || []);
        renderLowStockVariants(body.low_stock_variants || []);
        renderRecentOrders(body.recent_orders || []);
        if (adminStatus) {
            adminStatus.textContent = 'Dashboard loaded.';
        }
    } catch (error) {
        if (adminStatus) {
            adminStatus.textContent = error.message || 'Could not load dashboard.';
        }
    }
}

async function loadUsers() {
    if (!requireDashboardAccess()) return;

    try {
        const response = await apiFetch(`${API_BASE}/admin/users/`);
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not load users.');
        }
        usersData = body.users || [];
        renderUsers(usersData);
    } catch (error) {
        if (adminStatus) {
            adminStatus.textContent = error.message || 'Could not load users.';
        }
    }
}

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
            if (adminAccessNotice) {
                adminAccessNotice.classList.remove('hidden');
                adminAccessNotice.innerHTML = '<p class="meta">You need an Owner or Admin account to open this dashboard.</p>';
            }
        } catch (_error) {
            showToast('Could not log out right now.', 'error');
        }
    });
}

(async function init() {
    await refreshAuthState();
    if (!currentUser) {
        requireAuth(currentUser, 'admin.html');
        return;
    }
    if (!requireDashboardAccess()) return;
    await loadDashboard();
    await loadUsers();
})();
