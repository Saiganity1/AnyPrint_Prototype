import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { formatPrice } from "../lib/format";
import { normalizeProducts } from "../lib/normalize";
import AddToCartModal from "../components/AddToCartModal";
import SkeletonLoader from "../components/SkeletonLoader";
import Pagination from "../components/Pagination";
import { filterProducts, sortProducts, getUniqueCategories, getPriceRange } from "../lib/filters";
import { isInWishlist, toggleWishlist } from "../lib/wishlist";

const ITEMS_PER_PAGE = 12;

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [wishlistItems, setWishlistItems] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page") || "1"));

  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "newest");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "");
  const [priceRange, setPriceRange] = useState({
    min: parseInt(searchParams.get("minPrice") || "0"),
    max: parseInt(searchParams.get("maxPrice") || "10000"),
  });

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page_size: "100" });
        if (initialSearch.trim()) {
          query.set("search", initialSearch.trim());
        }

        const response = await apiRequest(`products/?${query.toString()}`);
        const body = await readJsonSafe(response);
        if (!response.ok) {
          setError(body.error || "Could not load products.");
          return;
        }

        const resultItems = normalizeProducts(body);
        if (!cancelled) {
          setProducts(resultItems);
          const wishlist = new Set(resultItems.filter(p => isInWishlist(p.id)).map(p => p.id));
          setWishlistItems(wishlist);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load products.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [initialSearch]);

  function submitSearch(event) {
    event.preventDefault();
    const nextParams = new URLSearchParams(searchParams);
    if (search.trim()) {
      nextParams.set("search", search.trim());
    } else {
      nextParams.delete("search");
    }
    setSearchParams(nextParams);
  }

  function handleWishlistToggle(product) {
    toggleWishlist(product);
    const newWishlist = new Set(wishlistItems);
    if (newWishlist.has(product.id)) {
      newWishlist.delete(product.id);
    } else {
      newWishlist.add(product.id);
    }
    setWishlistItems(newWishlist);
  }

  const navigate = useNavigate();

  function addToCart(product) {
    setSelectedProduct(product);
    setModalOpen(true);
  }

  function contactSeller(product) {
    navigate('/messages', { state: { productId: product.id, productName: product.name } });
  }

  const filteredAndSorted = useMemo(() => {
    const filtered = filterProducts(products, {
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      category: categoryFilter,
    });
    return sortProducts(filtered, sortBy);
  }, [products, priceRange, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredAndSorted.slice(start, end);
  }, [filteredAndSorted, currentPage]);

  const categories = useMemo(() => getUniqueCategories(products), [products]);

  const summary = useMemo(() => {
    if (loading) return "Loading products...";
    if (error) return error;
    if (!filteredAndSorted.length) return "No shirts found for this filter.";
    const start = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const end = Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSorted.length);
    return `Showing ${start}–${end} of ${filteredAndSorted.length} shirts.`;
  }, [loading, error, filteredAndSorted, currentPage]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="shop-page">
      <section className="page-intro shop-page-intro">
        <p className="page-kicker">All Products</p>
        <h2 className="page-title">Find the right tee faster.</h2>
        <p className="page-lead">
          Search the full catalog in one place, compare options quickly, and move straight into checkout.
        </p>
        <div className="shop-highlights">
          <article className="shop-highlight-card">
            <h3>Best sellers</h3>
            <p className="meta">Start with top-performing items first.</p>
          </article>
          <article className="shop-highlight-card">
            <h3>Easy filtering</h3>
            <p className="meta">Filter by category, price, and more.</p>
          </article>
          <article className="shop-highlight-card">
            <h3>Fast checkout</h3>
            <p className="meta">Go from browse to cart in fewer clicks.</p>
          </article>
        </div>
      </section>

      <section className="panel shop-panel">
        <div className="row-between shop-toolbar">
          <h3 className="shop-title">Shop Catalog</h3>
          <form className="inline-form" onSubmit={submitSearch}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, category, or style"
              aria-label="Search shirts"
            />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
        </div>

        <div className="shop-filters">
          {categories.length > 0 && (
            <div className="filter-group">
              <label htmlFor="category-filter">Category:</label>
              <select 
                id="category-filter"
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="sort-by">Sort by:</label>
            <select 
              id="sort-by"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="popularity">Popularity</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        <p className="status-text shop-summary">{summary}</p>

        {loading ? (
          <div className="product-grid">
            <SkeletonLoader type="card" count={12} />
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="product-grid">
              {paginatedProducts.map((product) => (
                <article className="product-card premium-card" key={product.id}>
                  <div className="product-card-media">
                    <Link to={`/products/${encodeURIComponent(product.id)}`} className="product-image-link">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} loading="lazy" />
                      ) : (
                        <div className="image-fallback">No image</div>
                      )}
                    </Link>
                    <button
                      type="button"
                      className={`wishlist-btn ${wishlistItems.has(product.id) ? 'active' : ''}`}
                      onClick={() => handleWishlistToggle(product)}
                      aria-label={wishlistItems.has(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    >
                      {wishlistItems.has(product.id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  <div className="card-body">
                    <p className="meta small">{product.category || "Uncategorized"}</p>
                    <h3>
                      <Link to={`/products/${encodeURIComponent(product.id)}`}>{product.name}</Link>
                    </h3>
                    <p className="price">{formatPrice(product.price)}</p>
                    <div className="row-actions compact">
                      <button type="button" className="btn" onClick={() => addToCart(product)}>
                        Add to Cart
                      </button>
                      <button type="button" className="btn secondary" onClick={() => contactSeller(product)}>
                        Contact Seller
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                itemsPerPage={ITEMS_PER_PAGE}
                totalItems={filteredAndSorted.length}
              />
            )}
          </>
        ) : null}

        {!loading && error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
      </section>

      <AddToCartModal
        product={selectedProduct}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedProduct(null);
        }}
      />
    </section>
  );
}
