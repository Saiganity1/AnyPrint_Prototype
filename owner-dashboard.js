const { API_BASE, apiFetch, showToast, getCurrentUser, formatPrice } = window.AnyPrint;

let currentUser = null;

async function initDashboard() {
    currentUser = window.AnyPrint.getCurrentUser();
    
    if (!currentUser || !['OWNER', 'ADMIN'].includes(currentUser.role)) {
        window.location.href = 'login.html';
        return;
    }

    loadDashboardStats();
    setupMenuListeners();
}

function setupMenuListeners() {
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            switchSection(section);
        });
    });
}

function switchSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    
    // Show selected section
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Mark menu item as active
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
    
    // Load section content
    if (sectionId === 'dashboard') {
        loadDashboardStats();
    } else if (sectionId === 'products') {
        loadProductsTable();
    } else if (sectionId === 'orders') {
        loadOrdersTable();
    } else if (sectionId === 'users') {
        loadUsersTable();
    } else if (sectionId === 'analytics') {
        loadAnalytics();
    }
}

async function loadDashboardStats() {
    try {
        const response = await apiFetch(`${API_BASE}/admin/dashboard/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('totalSales').textContent = formatPrice(data.total_sales || 0);
            document.getElementById('totalOrders').textContent = data.total_orders || 0;
            document.getElementById('totalProducts').textContent = data.total_products || 0;
            document.getElementById('totalUsers').textContent = data.total_users || 0;
        }
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

async function loadProductsTable() {
    try {
        const response = await apiFetch(`${API_BASE}/products/?page_size=100`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            
            let html = '<table><thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>';
            
            products.forEach(product => {
                html += `
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.category || 'N/A'}</td>
                        <td>${formatPrice(product.price)}</td>
                        <td>${product.stock_quantity}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-small" onclick="editProduct(${product.id})">Edit</button>
                                <button class="btn-small danger" onclick="deleteProduct(${product.id})">Delete</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            document.getElementById('productsTable').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showToast('Failed to load products', 'error');
    }
}

async function loadOrdersTable() {
    try {
        const response = await apiFetch(`${API_BASE}/admin/orders/?page_size=50`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];
            
            let html = '<table><thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Payment</th><th>Actions</th></tr></thead><tbody>';
            
            orders.forEach(order => {
                html += `
                    <tr>
                        <td>${order.tracking_number}</td>
                        <td>${order.full_name}</td>
                        <td>${formatPrice(order.total_amount)}</td>
                        <td>${order.status}</td>
                        <td>${order.payment_status}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-small" onclick="updateOrderStatus(${order.id})">Update</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            document.getElementById('ordersTable').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

async function loadUsersTable() {
    try {
        const response = await apiFetch(`${API_BASE}/admin/users/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            const users = data.users || [];
            
            let html = '<table><thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead><tbody>';
            
            users.forEach(user => {
                html += `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.email}</td>
                        <td>${user.role}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn-small" onclick="updateUserRole(${user.id})">Change Role</button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
            document.getElementById('usersTable').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    }
}

async function loadAnalytics() {
    const content = document.getElementById('analyticsContent');
    content.innerHTML = `
        <div style="background: #fff; padding: 20px; border-radius: 8px;">
            <h3>Sales Analytics</h3>
            <canvas id="analyticsChart" width="400" height="100"></canvas>
            <div style="margin-top: 20px;">
                <h4>Top Selling Products</h4>
                <div id="topProducts"></div>
            </div>
        </div>
    `;
}

async function uploadCSV() {
    const file = document.getElementById('csvFile').files[0];
    if (!file) {
        showToast('Please select a file', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await apiFetch(`${API_BASE}/admin/products/bulk-upload/`, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': `Bearer ${window.AnyPrint.getAuthToken()}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('uploadStatus').innerHTML = `
                <div style="background: #e8f5e9; padding: 10px; border-radius: 4px; color: #2e7d32;">
                    ✓ Successfully uploaded ${data.count} products
                </div>
            `;
            showToast('Products uploaded successfully', 'success');
        } else {
            showToast('Failed to upload products', 'error');
        }
    } catch (error) {
        console.error('Upload failed:', error);
        showToast('Upload failed: ' + error.message, 'error');
    }
}

function showProductForm() {
    alert('Product form functionality to be implemented');
}

function editProduct(id) {
    alert(`Edit product ${id} functionality to be implemented`);
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        const response = await apiFetch(`${API_BASE}/admin/products/${id}/`, {
            method: 'DELETE',
        });
        
        if (response.ok) {
            showToast('Product deleted', 'success');
            loadProductsTable();
        } else {
            showToast('Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        showToast('Delete failed', 'error');
    }
}

function updateOrderStatus(id) {
    const newStatus = prompt('Enter new status (PENDING, CONFIRMED, PACKED, SHIPPED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED):');
    if (!newStatus) return;
    
    apiFetch(`${API_BASE}/admin/orders/${id}/status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
    }).then(res => {
        if (res.ok) {
            showToast('Order status updated', 'success');
            loadOrdersTable();
        } else {
            showToast('Failed to update order', 'error');
        }
    });
}

function updateUserRole(id) {
    const newRole = prompt('Enter new role (USER, ADMIN, OWNER):');
    if (!newRole) return;
    
    apiFetch(`${API_BASE}/admin/users/${id}/role/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
    }).then(res => {
        if (res.ok) {
            showToast('User role updated', 'success');
            loadUsersTable();
        } else {
            showToast('Failed to update user role', 'error');
        }
    });
}

async function logout() {
    window.AnyPrint.clearAuthToken();
    window.location.href = 'index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initDashboard);
