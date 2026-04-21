const {
    API_BASE,
    apiFetch,
    escapeHtml,
    formatPrice,
    loadRecentlyViewed,
    roleCanManage,
    roleLabel,
    renderStars,
    showToast,
} = window.AnyPrint;

const authButton = document.getElementById('authButton');
const logoutButton = document.getElementById('logoutButton');
const wishlistGrid = document.getElementById('wishlistGrid');
const wishlistStatus = document.getElementById('wishlistStatus');
const recentlyViewedGrid = document.getElementById('recentlyViewedGrid');
const recentlyViewedStatus = document.getElementById('recentlyViewedStatus');
const wishlistCount = document.getElementById('wishlistCount');

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

function renderProductCard(product) {
    const imageHtml = product.image_url
        ? `<img src="${product.image_url}" alt="${escapeHtml(product.name)}">`
        : '<div class="placeholder">No image</div>';

    return `
        <article class="product-card wishlist-card">
            <a class="product-link" href="product.html?slug=${encodeURIComponent(product.slug || '')}">
                ${imageHtml}
                <h3>${escapeHtml(product.name)}</h3>
            </a>
            <p class="meta">${escapeHtml(product.category || 'Uncategorized')} | ${escapeHtml(product.print_style || 'Classic')}</p>
            <div class="rating-row">${renderStars(product.average_rating || 0)}<span class="meta">${Number(product.review_count || 0)} review${Number(product.review_count || 0) === 1 ? '' : 's'}</span></div>
            <p><strong>${formatPrice(product.price)}</strong></p>
            <div class="card-actions">
                <button class="btn secondary wishlist-remove-btn" data-product-id="${product.id}">Remove</button>
                <a class="btn" href="product.html?slug=${encodeURIComponent(product.slug || '')}">View</a>
            </div>
        </article>
    `;
}

async function loadWishlist() {
    if (!wishlistGrid) return;

    if (!currentUser) {
        wishlistStatus.textContent = 'Login to view your wishlist.';
        wishlistGrid.innerHTML = '';
        if (wishlistCount) wishlistCount.textContent = '0 items';
        return;
    }

    wishlistStatus.textContent = 'Loading wishlist...';
    try {
        const response = await apiFetch(`${API_BASE}/wishlist/`);
        const body = await response.json();
        if (!response.ok) {
            throw new Error(body.error || 'Could not load wishlist.');
        }

        const items = body.items || [];
        wishlistStatus.textContent = items.length ? 'Your saved shirts.' : 'Your wishlist is empty.';
        if (wishlistCount) {
            wishlistCount.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;
        }

        wishlistGrid.innerHTML = items.length
            ? items.map((item) => renderProductCard(item.product)).join('')
            : '<div class="empty-state"><h4>No saved shirts yet.</h4><p class="meta">Tap Wishlist from a product to save it here.</p><a class="btn secondary" href="shop.html">Browse shirts</a></div>';

        wishlistGrid.querySelectorAll('.wishlist-remove-btn').forEach((button) => {
            button.addEventListener('click', async () => {
                const productId = Number(button.getAttribute('data-product-id'));
                try {
                    const responseRemove = await apiFetch(`${API_BASE}/wishlist/toggle/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ product_id: productId }),
                    });
                    const removeBody = await responseRemove.json();
                    if (!responseRemove.ok) {
                        throw new Error(removeBody.error || 'Could not update wishlist.');
                    }
                    showToast('Removed from wishlist.', 'success');
                    await loadWishlist();
                } catch (_error) {
                    showToast('Could not update wishlist.', 'error');
                }
            });
        });
    } catch (error) {
        wishlistStatus.textContent = error.message || 'Could not load wishlist.';
        wishlistGrid.innerHTML = '';
    }
}

function renderRecentlyViewed() {
    if (!recentlyViewedGrid) return;

    const items = loadRecentlyViewed();
    if (recentlyViewedStatus) {
        recentlyViewedStatus.textContent = items.length ? 'Recently viewed shirts.' : 'No recently viewed items yet.';
    }

    recentlyViewedGrid.innerHTML = items.length
        ? items.slice(0, 6).map((item) => `
            <article class="feature-card recent-card">
                <a class="product-link" href="${item.slug ? `product.html?slug=${encodeURIComponent(item.slug)}` : 'shop.html'}">
                    ${item.image_url ? `<img class="recent-thumb" src="${item.image_url}" alt="${escapeHtml(item.name || 'Recently viewed')}">` : '<div class="feature-thumb"></div>'}
                    <h4>${escapeHtml(item.name || 'Recently viewed')}</h4>
                </a>
                <p class="meta">${escapeHtml(item.category || item.print_style || 'Recently viewed')}</p>
                <p><strong>${formatPrice(item.price || 0)}</strong></p>
            </article>
        `).join('')
        : '<div class="empty-state"><h4>Nothing here yet.</h4><p class="meta">Browse a product to start tracking recently viewed items.</p><a class="btn secondary" href="shop.html">Browse shirts</a></div>';
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
            await loadWishlist();
            showToast('Logged out.', 'default');
        } catch (_error) {
            showToast('Could not log out right now.', 'error');
        }
    });
}

(async function init() {
    await refreshAuthState();
    renderRecentlyViewed();
    await loadWishlist();
})();
