import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { upsertCartItem } from "../lib/cart";
import { formatPrice } from "../lib/format";

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

        const resultItems = Array.isArray(body.results) ? body.results : [];
        if (!cancelled) {
          setProducts(resultItems);
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
    <section>
      <div className="row-between">
        <h2>Shop</h2>
        <form className="inline-form" onSubmit={submitSearch}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search shirts"
            aria-label="Search shirts"
          />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
      </div>

      <p className="status-text">{summary}</p>

      {loading ? <div className="panel">Loading...</div> : null}

      {!loading && !error ? (
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <Link to={`/products/${encodeURIComponent(product.slug)}`} className="product-image-link">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} loading="lazy" />
                ) : (
                  <div className="image-fallback">No image</div>
                )}
              </Link>
              <div className="card-body">
                <h3>{product.name}</h3>
                <p className="meta">{product.category || "Uncategorized"}</p>
                <p className="price">{formatPrice(product.price)}</p>
                <div className="row-actions compact">
                  <button type="button" className="btn" onClick={() => addToCart(product)}>
                    Add to Cart
                  </button>
                  <Link className="btn secondary" to={`/products/${encodeURIComponent(product.slug)}`}>
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
