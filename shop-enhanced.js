const { API_BASE, apiFetch, showToast, formatPrice, loadCart, saveCart, getSizeOptions, getColorOptions, renderStars, buildVariantKey } = window.AnyPrint;

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
const pageSize = 12;
let categories = [];
let sizes = ['S', 'M', 'L', 'XL', '2XL'];
let colors = [];

const filterState = {
    categories: [],
    sizes: [],
    colors: [],
    priceMin: 0,
    priceMax: 5000,
    featured: false,
    sort: 'featured',
};

async function initShop() {
    await loadCategories();
    await loadProducts();
    renderFilterOptions();
}

async function loadCategories() {
    try {
        const response = await apiFetch(`${API_BASE}/categories/`);
        if (response.ok) {
            const data = await response.json();
            categories = data.categories || [];
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

async function loadProducts() {
    try {
        document.getElementById('loadingMessage').style.display = 'block';
        
        const response = await apiFetch(`${API_BASE}/products/?page_size=500`);
        if (response.ok) {
            const data = await response.json();
            allProducts = data.results || [];
            
            // Extract unique colors from all products
            const colorSet = new Set();
            allProducts.forEach(product => {
                if (product.variants) {
                    product.variants.forEach(variant => {
                        if (variant.color) colorSet.add(variant.color);
                    });
                }
            });
            colors = Array.from(colorSet).sort();
            
            applyFilters();
        }
    } catch (error) {
        console.error('Failed to load products:', error);
        showToast('Failed to load products', 'error');
    } finally {
        document.getElementById('loadingMessage').style.display = 'none';
    }
}

function renderFilterOptions() {
    // Category filters
    let categoryHtml = '';
    categories.forEach(cat => {
        categoryHtml += `
            <div class="filter-option">
                <input type="checkbox" id="cat_${cat.id}" value="${cat.id}" onchange="applyFilters()">
                <label for="cat_${cat.id}">${cat.name}</label>
            </div>
        `;
    });
    document.getElementById('categoryFilter').innerHTML = categoryHtml;
    
    // Size filters
    let sizeHtml = '';
    sizes.forEach(size => {
        sizeHtml += `
            <div class="filter-option">
                <input type="checkbox" id="size_${size}" value="${size}" onchange="applyFilters()">
                <label for="size_${size}">${size}</label>
            </div>
        `;
    });
    document.getElementById('sizeFilter').innerHTML = sizeHtml;
    
    // Color filters
    let colorHtml = '';
    colors.forEach(color => {
        colorHtml += `
            <div class="filter-option">
                <input type="checkbox" id="color_${color}" value="${color}" onchange="applyFilters()">
                <label for="color_${color}">${color}</label>
            </div>
        `;
    });
    document.getElementById('colorFilter').innerHTML = colorHtml;
}

function applyFilters() {
    // Get selected categories
    filterState.categories = Array.from(document.querySelectorAll('#categoryFilter input:checked')).map(el => el.value);
    
    // Get selected sizes
    filterState.sizes = Array.from(document.querySelectorAll('#sizeFilter input:checked')).map(el => el.value);
    
    // Get selected colors
    filterState.colors = Array.from(document.querySelectorAll('#colorFilter input:checked')).map(el => el.value);
    
    // Get price range
    filterState.priceMin = parseInt(document.getElementById('priceMin').value) || 0;
    filterState.priceMax = parseInt(document.getElementById('priceMax').value) || 5000;
    
    // Get featured filter
    filterState.featured = document.getElementById('featuredOnly').checked;
    
    // Filter products
    filteredProducts = allProducts.filter(product => {
        // Category filter
        if (filterState.categories.length > 0 && !filterState.categories.includes(String(product.category_id))) {
            return false;
        }
        
        // Price filter
        if (product.price < filterState.priceMin || product.price > filterState.priceMax) {
            return false;
        }
        
        // Featured filter
        if (filterState.featured && !product.is_featured) {
            return false;
        }
        
        // Size filter
        if (filterState.sizes.length > 0 && product.variants) {
            const hasSize = product.variants.some(v => filterState.sizes.includes(v.size));
            if (!hasSize) return false;
        }
        
        // Color filter
        if (filterState.colors.length > 0 && product.variants) {
            const hasColor = product.variants.some(v => filterState.colors.includes(v.color));
            if (!hasColor) return false;
        }
        
        return true;
    });
    
    currentPage = 1;
    applySorting();
}

function applySorting() {
    const sortValue = document.getElementById('sortSelect').value;
    filterState.sort = sortValue;
    
    switch (sortValue) {
        case 'newest':
            filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'price_low':
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price_high':
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case 'popular':
            filteredProducts.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
            break;
        case 'featured':
        default:
            filteredProducts.sort((a, b) => {
                if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
                return new Date(b.created_at) - new Date(a.created_at);
            });
    }
    
    renderProducts();
}

function renderProducts() {
    if (filteredProducts.length === 0) {
        document.getElementById('productGrid').innerHTML = '<div class="empty-state"><p>No products found. Try adjusting your filters.</p></div>';
        document.getElementById('paginationContainer').innerHTML = '';
        return;
    }
    
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageProducts = filteredProducts.slice(start, end);
    
    let html = '';
    pageProducts.forEach(product => {
        const rating = product.average_rating || 0;
        const badge = product.is_featured ? '<div class="product-badge">Featured</div>' : '';
        
        html += `
            <div class="product-card" onclick="viewProduct('${product.slug}')">
                <div class="product-image">
                    <img src="${product.image_url}" alt="${product.name}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2216%22 fill=%22%23999%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'">
                    ${badge}
                </div>
                <div class="product-info">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div class="product-rating">${renderStars(rating)} (${product.review_count || 0} reviews)</div>
                    <div class="product-actions">
                        <button class="btn-small" onclick="event.stopPropagation(); viewProduct('${product.slug}')">View</button>
                        <button class="btn-small outline" onclick="event.stopPropagation(); addToWishlist(${product.id})">♥</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('productGrid').innerHTML = html;
    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    
    if (totalPages <= 1) {
        document.getElementById('paginationContainer').innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="goToPage(${currentPage - 1})">← Previous</button>`;
    }
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<button class="active">${i}</button>`;
        } else if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `<button onclick="goToPage(${i})">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<span>...</span>`;
        }
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="goToPage(${currentPage + 1})">Next →</button>`;
    }
    
    document.getElementById('paginationContainer').innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    renderProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFilters() {
    document.querySelectorAll('#categoryFilter input:checked').forEach(el => el.checked = false);
    document.querySelectorAll('#sizeFilter input:checked').forEach(el => el.checked = false);
    document.querySelectorAll('#colorFilter input:checked').forEach(el => el.checked = false);
    document.getElementById('priceMin').value = 0;
    document.getElementById('priceMax').value = 5000;
    document.getElementById('featuredOnly').checked = false;
    document.getElementById('sortSelect').value = 'featured';
    
    applyFilters();
}

function viewProduct(slug) {
    window.location.href = `product-detail.html?slug=${slug}`;
}

async function addToWishlist(productId) {
    try {
        const response = await apiFetch(`${API_BASE}/wishlist/toggle/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId }),
        });
        
        if (response.ok) {
            showToast('Added to wishlist', 'success');
        }
    } catch (error) {
        console.error('Failed to add to wishlist:', error);
    }
}

function toggleCart() {
    window.location.href = 'checkout.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initShop);
