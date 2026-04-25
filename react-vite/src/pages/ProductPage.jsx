import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest, readJsonSafe } from "../lib/api";
import { formatPrice } from "../lib/format";

export default function ProductPage() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");

      try {
        const response = await apiRequest(`products/${encodeURIComponent(slug)}/`);
        const body = await readJsonSafe(response);
        if (!response.ok) {
          setError(body.error || "Could not load product details.");
          return;
        }

        if (!cancelled) {
          setProduct(body);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load product details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <section className="panel">Loading product details...</section>;
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error-text">{error}</p>
        <Link className="btn" to="/shop">
          Back to Shop
        </Link>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <section className="panel product-detail-panel">
      <div className="product-detail-grid">
        <div>
          {product.image_url ? (
            <img className="product-detail-image" src={product.image_url} alt={product.name} />
          ) : (
            <div className="image-fallback">No image</div>
          )}
        </div>

        <div>
          <p className="kicker">{product.category || "Shirt"}</p>
          <h2>{product.name}</h2>
          <p className="price large">{formatPrice(product.price)}</p>
          <p className="lead">{product.description || "No description yet."}</p>
          <p className="meta">Print style: {product.print_style || "Standard"}</p>
          <p className="meta">Stock: {product.stock_quantity ?? 0}</p>
          <Link className="btn" to="/shop">
            Back to Shop
          </Link>
        </div>
      </div>
    </section>
  );
}
