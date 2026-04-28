import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { upsertCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { normalizeProducts } from "../lib/normalize";

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const initialSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(initialSearch);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams({ page_size: "60" });
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
        const filteredItems = initialSearch.trim()
          ? resultItems.filter((product) => {
              const needle = initialSearch.trim().toLowerCase();
              return [product.name, product.description, product.category, product.print_style]
                .map((value) => String(value || "").toLowerCase())
                .join(" ")
                .includes(needle);
            })
          : resultItems;
        if (!cancelled) {
          setProducts(filteredItems);
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

  function addToCart(product) {
    upsertCartItem({
      key: `${product.id}|M|Black`,
      product_id: product.id,
      variant_id: null,
      quantity: 1,
      size: "M",
      color: "Black",
      product_name: product.name,
      unit_price: product.price,
      image_url: product.image_url || "",
    });
  }

  const summary = useMemo(() => {
    if (loading) return "Loading products...";
    if (error) return error;
    if (!products.length) return "No shirts found for this filter.";
    return `Showing ${products.length} shirts.`;
  }, [loading, error, products]);

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
            <p className="meta">Search by shirt name, category, or style.</p>
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

        <p className="status-text shop-summary">{summary}</p>

        {loading ? <div className="panel">Loading...</div> : null}

        {!loading && !error ? (
          <div className="product-grid old-product-grid">
            {products.map((product) => (
              <article className="product-card premium-card" key={product.id}>
                <Link to={`/products/${encodeURIComponent(product.id)}`} className="product-image-link">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" />
                  ) : (
                    <div className="image-fallback">No image</div>
                  )}
                </Link>
                <div className="card-body">
                  <p className="meta small">{product.category || "Uncategorized"}</p>
                  <h3>{product.name}</h3>
                  <p className="price">{formatPrice(product.price)}</p>
                  <div className="row-actions compact">
                    <button type="button" className="btn" onClick={() => addToCart(product)}>
                      Add to Cart
                    </button>
                    <Link className="btn secondary" to={`/products/${encodeURIComponent(product.id)}`}>
                      View
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
