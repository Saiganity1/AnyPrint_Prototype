import { Link } from "react-router-dom";
import { loadRecentlyViewed } from "../lib/recent";
import { formatPrice } from "../lib/format";
import NewsletterSignup from "../components/NewsletterSignup";

export default function HomePage() {
  const recentItems = loadRecentlyViewed().slice(0, 4);

  return (
    <section className="home-page">
      <div className="offer-banner">
        <p className="offer-text">
          🎉 <strong>Limited Time:</strong> Get ₱200 OFF your first order with code <strong>TSHIRTLOVE</strong>
        </p>
      </div>

      <section className="hero premium-hero" id="why-choose-us">
        <div className="hero-copy">
          <p className="eyebrow">⭐ 5,000+ Happy Customers | Premium Quality Tees</p>
          <h1 className="display-heading">Express Yourself With Premium Tees</h1>
          <p className="hero-sub">
            High-quality, comfortable t-shirts for everyday wear. From minimalist to bold graphic designs-find your style today.
          </p>
          <div className="hero-cta-row">
            <Link to="/shop" className="btn main-cta">
              Shop Now
            </Link>
            <a className="btn secondary secondary-cta" href="#how-it-works">
              See How It Works
            </a>
            <span className="meta">✓ Free shipping on orders over ₱2,500 • ✓ 30-day returns</span>
          </div>
          <div className="trust-badges">
            <span>✓ Premium Quality</span>
            <span>✓ All Sizes Available</span>
            <span>✓ Fast Nationwide Delivery</span>
          </div>
        </div>
      </section>

      <nav className="category-rail" id="how-it-works">
        <button className="category-card" type="button">
          <span className="cat-icon minimal" />
          <span>Minimal</span>
        </button>
        <button className="category-card" type="button">
          <span className="cat-icon graphic" />
          <span>Graphic</span>
        </button>
        <button className="category-card" type="button">
          <span className="cat-icon street" />
          <span>Street</span>
        </button>
        <button className="category-card" type="button">
          <span className="cat-icon kids" />
          <span>Kids</span>
        </button>
      </nav>

      <section className="stats-section">
        <div className="stat-item">
          <h3 className="stat-number">50,000+</h3>
          <p className="stat-label">Tees Sold</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">98%</h3>
          <p className="stat-label">Satisfaction</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">24hrs</h3>
          <p className="stat-label">Processing</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">100+</h3>
          <p className="stat-label">Designs</p>
        </div>
      </section>

      <section className="trust-strip" id="contact">
        <div className="trust-item">🚚 Free Shipping Over ₱2,500</div>
        <div className="trust-item">🔒 100% Secure Checkout</div>
        <div className="trust-item">↩️ 30-Day Money Back</div>
      </section>

      <section className="recently-viewed-row">
        <h2>Recently Viewed</h2>
        <div className="recently-viewed-list">
          {recentItems.length ? (
            recentItems.map((item) => (
              <article className="recent-card" key={item.identifier || item.slug || item.id}>
                <Link to={`/products/${encodeURIComponent(item.slug || item.identifier || "")}`} className="recent-thumb" />
                <h4>{item.name || "Shirt Item"}</h4>
                <p className="meta">{item.category || item.print_style || "T-Shirt"}</p>
                <p className="price">{formatPrice(item.price || 0)}</p>
              </article>
            ))
          ) : (
            <div className="panel empty-panel">
              <p>No recently viewed items yet.</p>
              <Link className="btn" to="/shop">
                Browse shirts
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="newsletter-section">
        <div className="panel">
          <NewsletterSignup />
        </div>
      </section>
    </section>
  );
}
