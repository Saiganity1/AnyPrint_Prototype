const { API_BASE, apiFetch, showToast, getCurrentUser, formatPrice, setCurrentUser } = window.AnyPrint;

let currentUser = null;
let savedAddresses = [];

async function initAccount() {
    currentUser = window.AnyPrint.getCurrentUser();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('userName').textContent = currentUser.username || 'User';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileName').value = currentUser.display_name || '';
    document.getElementById('profilePhone').value = currentUser.phone_number || '';
    
    loadOrderHistory();
    loadWishlist();
    loadSavedAddresses();
}

function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const tab = document.getElementById(tabName);
    if (tab) {
        tab.classList.add('active');
    }
    
    // Mark button as active
    event.target.classList.add('active');
}

async function loadOrderHistory() {
    try {
        const response = await apiFetch(`${API_BASE}/orders/history/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];
            
            if (orders.length === 0) {
                document.getElementById('ordersList').innerHTML = '<p>No orders yet.</p>';
                return;
            }
            
            let html = '';
            orders.forEach(order => {
                const itemsHtml = order.items.map(item => `
                    <div class="item-row">
                        <div class="item-name">${item.product_name} - ${item.size} / ${item.color}</div>
                        <div class="item-qty">Qty: ${item.quantity}</div>
                        <div class="item-price">${formatPrice(item.subtotal)}</div>
                    </div>
                `).join('');
                
                html += `
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <strong>Order ${order.tracking_number}</strong>
                                <p style="margin: 5px 0; color: #666; font-size: 14px;">${new Date(order.created_at).toLocaleDateString()}</p>
                            </div>
                            <div class="order-status">${order.status}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                            <p><strong>Address:</strong> ${order.address}</p>
                            <p><strong>Total:</strong> ${formatPrice(order.total_amount)}</p>
                            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
                        </div>
                        <div class="order-items">
                            ${itemsHtml}
                        </div>
                        <button class="btn btn-small" onclick="viewOrderDetails('${order.tracking_number}')">View Details</button>
                    </div>
                `;
            });
            
            document.getElementById('ordersList').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load orders:', error);
        showToast('Failed to load orders', 'error');
    }
}

async function loadWishlist() {
    try {
        const response = await apiFetch(`${API_BASE}/wishlist/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            const items = data.items || [];
            
            if (items.length === 0) {
                document.getElementById('wishlistList').innerHTML = '<p>Your wishlist is empty.</p>';
                return;
            }
            
            let html = '';
            items.forEach(item => {
                const product = item.product;
                html += `
                    <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; cursor: pointer;" onclick="viewProduct('${product.slug}')">
                        <img src="${product.image_url}" alt="${product.name}" style="width: 100%; height: 200px; object-fit: cover;">
                        <div style="padding: 15px;">
                            <h3 style="margin: 0 0 10px; font-size: 16px;">${product.name}</h3>
                            <p style="margin: 0 0 10px; color: #666;">${formatPrice(product.price)}</p>
                            <button class="btn btn-small danger" onclick="removeFromWishlist(event, ${product.id})">Remove</button>
                        </div>
                    </div>
                `;
            });
            
            document.getElementById('wishlistList').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load wishlist:', error);
    }
}

async function loadSavedAddresses() {
    try {
        const response = await apiFetch(`${API_BASE}/addresses/`, {
            method: 'GET',
        });
        
        if (response.ok) {
            const data = await response.json();
            savedAddresses = data.addresses || [];
            
            let html = '';
            if (savedAddresses.length === 0) {
                html = '<p>No saved addresses yet.</p>';
            } else {
                savedAddresses.forEach((addr, index) => {
                    html += `
                        <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: start;">
                                <div>
                                    <h3 style="margin-top: 0;">${addr.full_name}</h3>
                                    <p>${addr.address}</p>
                                    <p>Phone: ${addr.phone}</p>
                                    ${addr.is_default ? '<span style="background: #4caf50; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Default</span>' : ''}
                                </div>
                                <div style="display: flex; gap: 8px;">
                                    <button class="btn-small" onclick="editAddress(${addr.id})">Edit</button>
                                    <button class="btn-small danger" onclick="deleteAddress(${addr.id})">Delete</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
            
            document.getElementById('addressesList').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load addresses:', error);
        showToast('Failed to load addresses', 'error');
    }
}

function saveAddress(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const newAddress = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        is_default: false,
    };
    
    apiFetch(`${API_BASE}/addresses/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAddress),
    }).then(res => {
        if (res.ok) {
            event.target.reset();
            loadSavedAddresses();
            showToast('Address saved successfully', 'success');
        } else {
            showToast('Failed to save address', 'error');
        }
    }).catch(error => {
        console.error('Save address failed:', error);
        showToast('Error saving address', 'error');
    });
}

function editAddress(addressId) {
    const address = savedAddresses.find(a => a.id === addressId);
    if (!address) return;
    
    const fullName = prompt('Enter full name:', address.full_name);
    if (!fullName) return;
    
    const phone = prompt('Enter phone:', address.phone);
    if (!phone) return;
    
    const addressText = prompt('Enter address:', address.address);
    if (!addressText) return;
    
    apiFetch(`${API_BASE}/addresses/${addressId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            full_name: fullName,
            phone: phone,
            address: addressText,
        }),
    }).then(res => {
        if (res.ok) {
            loadSavedAddresses();
            showToast('Address updated successfully', 'success');
        } else {
            showToast('Failed to update address', 'error');
        }
    });
}

function deleteAddress(addressId) {
    if (confirm('Delete this address?')) {
        apiFetch(`${API_BASE}/addresses/${addressId}/delete/`, {
            method: 'POST',
        }).then(res => {
            if (res.ok) {
                loadSavedAddresses();
                showToast('Address deleted', 'success');
            } else {
                showToast('Failed to delete address', 'error');
            }
        });
    }
}

async function saveProfile(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const updates = {
        display_name: formData.get('display_name'),
        phone_number: formData.get('phone_number'),
    };
    
    try {
        const response = await apiFetch(`${API_BASE}/auth/me/`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        
        if (response.ok) {
            const data = await response.json();
            window.AnyPrint.setCurrentUser(data.user);
            showToast('Profile updated successfully', 'success');
        } else {
            showToast('Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Update failed:', error);
        showToast('Update failed', 'error');
    }
}

function viewOrderDetails(trackingNumber) {
    window.location.href = `tracking.html?tracking_number=${trackingNumber}`;
}

function viewProduct(slug) {
    window.location.href = `product.html?slug=${slug}`;
}

async function removeFromWishlist(event, productId) {
    event.stopPropagation();
    
    try {
        const response = await apiFetch(`${API_BASE}/wishlist/toggle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId }),
        });
        
        if (response.ok) {
            showToast('Removed from wishlist', 'success');
            loadWishlist();
        }
    } catch (error) {
        console.error('Failed to remove from wishlist:', error);
    }
}

async function logout() {
    window.AnyPrint.clearAuthToken();
    window.location.href = 'index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initAccount);
