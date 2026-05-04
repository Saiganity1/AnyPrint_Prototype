import { Link } from "react-router-dom";
import OwnerHomepageEditor from "../components/OwnerHomepageEditor";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";
import { loadRecentlyViewed } from "../lib/recent";

const categoryCards = [
  { label: "Graphic Tees", tone: "black", art: "CHAOS" },
  { label: "Plain Tees", tone: "sand", art: "" },
  { label: "Custom Prints", tone: "white", art: "JAPAN" },
  { label: "Oversized Tees", tone: "black", art: "" },
  { label: "Kids", tone: "green", art: "KIDS" },
];

const fallbackProducts = [
  { id: "mindset", name: "Mindset Oversized Tee", price: 299, tone: "black", art: "MINDSET" },
  { id: "anime", name: "Anime Edition Tee", price: 259, tone: "white", art: "ANIME" },
  { id: "goku", name: "Goku Power Tee", price: 299, tone: "green", art: "GOKU" },
  { id: "essentials", name: "Essential Oversized Tee", price: 299, tone: "sand", art: "ESSENTIALS" },
];

const features = [
  { icon: "cotton", title: "Premium Fabric", text: "Soft, comfortable & durable." },
  { icon: "palette", title: "Vibrant Prints", text: "High quality printing." },
  { icon: "tag", title: "Affordable Prices", text: "Best value for money." },
  { icon: "star", title: "Unique Designs", text: "Stand out from the crowd." },
];

const stats = [
  ["50,000+", "Happy Customers"],
  ["98%", "Satisfaction Rate"],
  ["24hrs", "Processing Time"],
  ["100+", "Unique Designs"],
];

function loadFeatured() {
  try {
    return JSON.parse(localStorage.getItem("anyprint:homepage:featured") || "{}");
  } catch {
    return {};
  }
}

function ShirtMockup({ tone = "black", art = "", size = "md" }) {
  return (
    <div className={`shirt-mockup ${tone} ${size}`} aria-hidden="true">
      <div className="shirt-sleeve left" />
      <div className="shirt-sleeve right" />
      <div className="shirt-neck" />
      {art ? <div className="shirt-print">{art}</div> : null}
    </div>
  );
}

function FeatureIcon({ type }) {
  return <span className={`line-icon line-icon-${type}`} aria-hidden="true" />;
}

export default function HomePage() {
  const user = getStoredUser();
  const isOwner = user && String(user.role || "").toUpperCase() === "OWNER";
  const featured = loadFeatured();
  const items = (featured.trending && featured.trending.length ? featured.trending : loadRecentlyViewed()).slice(0, 4);
  const products = items.length ? items : fallbackProducts;

  return (
    <section className="home-page storefront-home">
      <section className="storefront-hero" id="how-it-works">
        <div className="hero-copy">
          <p className="hero-kicker">NEW COLLECTION 2024</p>
          <h1>
            EXPRESS YOUR
            <span>STYLE</span>
          </h1>
          <p className="script-line">With AnyPrint</p>
          <p className="hero-sub">
            Premium quality t-shirts for everyday wear. Minimalist to bold graphics-find your style today.
          </p>
          <div className="hero-actions">
            <Link to="/shop" className="hero-btn primary">
              SHOP NOW <span aria-hidden="true">-&gt;</span>
            </Link>
            <a className="hero-btn secondary" href="#collections">
              EXPLORE COLLECTION
            </a>
          </div>
          <div className="hero-benefits" aria-label="Store benefits">
            <span><FeatureIcon type="shield" /> Premium Quality</span>
            <span><FeatureIcon type="shirt" /> All Sizes Available</span>
            <span><FeatureIcon type="truck" /> Fast Nationwide Delivery</span>
            <span><FeatureIcon type="return" /> 30-Day Returns</span>
          </div>
        </div>
        <div className="hero-models" aria-hidden="true">
          <div className="model-card model-card-left">
            <div className="head" />
            <div className="hair" />
            <div className="glasses" />
            <ShirtMockup tone="black" art="CHAOS" size="lg" />
          </div>
          <div className="model-card model-card-right">
            <div className="head" />
            <div className="hair" />
            <div className="glasses" />
            <ShirtMockup tone="white" art="JAPAN" size="lg" />
          </div>
          <div className="hero-dots">
            <span className="active" />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="category-section" id="collections" aria-label="Shop by category">
        <div className="category-rail">
          {categoryCards.map((category) => (
            <Link className="category-card" to="/shop" key={category.label}>
              <ShirtMockup tone={category.tone} art={category.art} size="sm" />
              <strong>{category.label}</strong>
              <span>Shop Now -&gt;</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="home-main-grid">
        <div className="trending-section">
          <div className="section-header compact">
            <h2 className="section-title">TRENDING T-SHIRTS</h2>
            <Link className="view-all-link" to="/shop">
              View All -&gt;
            </Link>
          </div>
          <div className="product-grid home-product-grid">
            {products.map((item, index) => {
              const slug = item.slug || item.identifier || item.id || item.name || "shirt";
              const tone = item.tone || ["black", "white", "green", "sand"][index % 4];
              return (
                <article className="product-card home-product-card" key={slug}>
                  <Link to={`/products/${encodeURIComponent(slug)}`} className="product-image-link">
                    <div className="product-image-placeholder">
                      {item.image ? <img src={item.image} alt={item.name} /> : <ShirtMockup tone={tone} art={item.art || item.name?.split(" ")[0] || "TEE"} />}
                    </div>
                  </Link>
                  <button className="wishlist-btn" type="button" aria-label={`Add ${item.name || "shirt"} to wishlist`}>
                    <span aria-hidden="true">♡</span>
                  </button>
                  <div className="card-body">
                    <h3 className="product-name">{item.name || "Graphic Tee"}</h3>
                    <p className="product-price">
                      {item.price ? `₱${Number(item.price).toFixed(2)}` : formatPrice(item.price || 0)}
                    </p>
                    <button className="mini-cart-btn" type="button" aria-label={`Add ${item.name || "shirt"} to cart`}>
                      <span aria-hidden="true">▣</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="why-choose-section" id="why-choose-us">
          <h2 className="section-title">WHY CHOOSE ANYPRINT?</h2>
          <div className="feature-strip">
            {features.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <FeatureIcon type={feature.icon} />
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="stats-section">
            {stats.map(([value, label]) => (
              <div className="stat-item" key={label}>
                <FeatureIcon type="badge" />
                <div>
                  <h3 className="stat-number">{value}</h3>
                  <p className="stat-label">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      {isOwner ? <OwnerHomepageEditor onChange={() => window.location.reload()} /> : null}
    </section>
  );
}
