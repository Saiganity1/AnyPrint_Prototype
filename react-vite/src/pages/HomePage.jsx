import { Link } from "react-router-dom";
import { loadRecentlyViewed } from "../lib/recent";
import { formatPrice } from "../lib/format";
import NewsletterSignup from "../components/NewsletterSignup";

export default function HomePage() {
  const recentItems = loadRecentlyViewed().slice(0, 6);

  return (
    <section className="home-page">
      <section className="hero hero-modern" id="why-choose-us">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">NEW COLLECTION 2024</p>
            <h1 className="display-heading">EXPRESS YOUR<br />STYLE</h1>
            <p className="hero-accent">With AnyPrint</p>
            <p className="hero-sub">
              Premium quality t-shirts for everyday wear. From minimalist to bold graphic designs—find your style today.
            </p>
            <div className="hero-cta-row">
              <Link to="/shop" className="btn main-cta">
                SHOP NOW
              </Link>
              <a className="btn secondary secondary-cta" href="#collections">
                EXPLORE COLLECTION
              </a>
            </div>
            <p className="hero-meta">✓ Free shipping on orders over ₱2,500 • ✓ 30-day returns</p>
          </div>
          <div className="hero-visual-placeholder" aria-hidden="true">
            <div className="hero-image-mock">
              <span className="hero-placeholder-text">Premium Product Photography</span>
            </div>
          </div>
        </div>
      </section>

      <section className="category-section" id="collections">
        <nav className="category-rail">
          <button className="category-card" type="button">
            <span className="category-icon">👕</span>
            <span className="category-label">Graphic Tees</span>
            <span className="category-link">Shop Now →</span>
          </button>
          <button className="category-card" type="button">
            <span className="category-icon">⚪</span>
            <span className="category-label">Plain Tees</span>
            <span className="category-link">Shop Now →</span>
          </button>
          <button className="category-card" type="button">
            <span className="category-icon">🎨</span>
            <span className="category-label">Custom Prints</span>
            <span className="category-link">Shop Now →</span>
          </button>
          <button className="category-card" type="button">
            <span className="category-icon">📏</span>
            <span className="category-label">Oversized Tees</span>
            <span className="category-link">Shop Now →</span>
          </button>
        </nav>
      </section>

      <section className="trending-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">TRENDING T-SHIRTS</p>
            <h2 className="section-title">New Collection</h2>
          </div>
          <Link className="view-all-link" to="/shop">
            View All →
          </Link>
        </div>

        <div className="product-grid home-product-grid">
          {recentItems.length ? (
            recentItems.map((item) => (
              <article className="product-card home-product-card" key={item.identifier || item.slug || item.id}>
                <div className="product-image-wrapper">
                  <Link to={`/products/${encodeURIComponent(item.slug || item.identifier || "")}`} className="product-image-link">
                    <div className="product-image-placeholder">
                      <div className="product-badge">NEW</div>
                    </div>
                  </Link>
                  <button className="wishlist-btn" title="Add to wishlist">♡</button>
                </div>
                <div className="card-body">
                  <p className="product-category">{item.category || item.print_style || "T-Shirt"}</p>
                  <h3 className="product-name">{item.name || "Shirt Item"}</h3>
                  <p className="product-price">{formatPrice(item.price || 0)}</p>
                  <button className="add-to-cart-btn">Add to Cart</button>
                </div>
              </article>
            ))
          ) : (
            <div className="empty-state">
              <p>No items to display.</p>
              <Link className="btn secondary" to="/shop">
                Browse Shop
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="why-choose-section" id="contact">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow muted">Why choose us?</p>
            <h2 className="section-title">Simple features, clean presentation, premium feel.</h2>
          </div>
        </div>
        <div className="feature-strip">
          <article className="feature-card">
            <span className="feature-icon">⚪</span>
            <h3>Premium Fabric</h3>
            <p>Soft, comfortable, and durable for everyday wear.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">◉</span>
            <h3>Vibrant Prints</h3>
            <p>High quality printing with sharp color and detail.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">$</span>
            <h3>Affordable Prices</h3>
            <p>Best value pricing without losing the premium look.</p>
          </article>
          <article className="feature-card">
            <span className="feature-icon">★</span>
            <h3>Unique Designs</h3>
            <p>Styles that stand out without feeling overdesigned.</p>
          </article>
        </div>
      </section>

      <section className="stats-section">
        <div className="stat-item">
          <h3 className="stat-number">50,000+</h3>
          <p className="stat-label">Happy Customers</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">98%</h3>
          <p className="stat-label">Satisfaction Rate</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">24hrs</h3>
          <p className="stat-label">Processing Time</p>
        </div>
        <div className="stat-item">
          <h3 className="stat-number">100+</h3>
          <p className="stat-label">Unique Designs</p>
        </div>
      </section>

      <section className="newsletter-section">
        <div className="panel newsletter-panel">
          <NewsletterSignup />
        </div>
      </section>
    </section>
  );
}
