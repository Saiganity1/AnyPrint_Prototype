import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <div className="footer-section footer-brand">
          <div className="footer-logo">
            <h3>AnyPrint</h3>
          </div>
          <p className="footer-tagline">
            More than just a brand.<br />
            It's a statement. Wear your attitude, express your style.
          </p>
          <div className="footer-socials">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">📷</a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">f</a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">𝕏</a>
            <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" aria-label="TikTok">🎵</a>
          </div>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">SHOP</h4>
          <ul className="footer-links">
            <li><Link to="/shop">All Products</Link></li>
            <li><Link to="/shop?category=graphic">Graphic Tees</Link></li>
            <li><Link to="/shop?category=plain">Plain Tees</Link></li>
            <li><Link to="/shop?category=oversized">Oversized Tees</Link></li>
            <li><Link to="/shop?category=custom">Custom Prints</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">CUSTOMER SERVICE</h4>
          <ul className="footer-links">
            <li><a href="#contact">Contact Us</a></li>
            <li><a href="#faq">FAQs</a></li>
            <li><a href="#shipping">Shipping & Delivery</a></li>
            <li><a href="#returns">Returns & Exchanges</a></li>
            <li><Link to="/tracking">Track Order</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4 className="footer-title">COMPANY</h4>
          <ul className="footer-links">
            <li><a href="#about">About Us</a></li>
            <li><a href="#story">Our Story</a></li>
            <li><a href="#careers">Careers</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
            <li><a href="#terms">Terms & Conditions</a></li>
          </ul>
        </div>

        <div className="footer-section footer-newsletter">
          <h4 className="footer-title">SUBSCRIBE TO OUR NEWSLETTER</h4>
          <p className="footer-newsletter-desc">
            Get updates on new collections and exclusive offers.
          </p>
          <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="newsletter-input"
              required
            />
            <button type="submit" className="btn newsletter-btn">SUBSCRIBE</button>
          </form>
          <div className="payment-methods">
            <span className="payment-label">We accept:</span>
            <div className="payment-icons">
              <span title="Visa">💳</span>
              <span title="Mastercard">💳</span>
              <span title="PayPal">🅿️</span>
              <span title="GCash">₱</span>
              <span title="Apple Pay">🍎</span>
            </div>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2024 AnyPrint. All rights reserved.</p>
      </div>
    </footer>
  );
}
