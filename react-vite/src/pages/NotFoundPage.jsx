import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="notfound-page">
      <div className="page-intro">
        <div className="page-error-code">404</div>
        <p className="page-kicker">Page Not Found</p>
        <h2 className="page-title">Oops! This page doesn't exist</h2>
        <p className="page-lead">
          The page you're looking for has moved or doesn't exist. Let's get you back on track.
        </p>
      </div>
      <section className="panel not-found-actions">
        <div className="not-found-grid">
          <div className="not-found-card">
            <h3>Browse Our Collection</h3>
            <p>Discover premium t-shirts in our full catalog</p>
            <Link className="btn" to="/shop">
              Shop All Products
            </Link>
          </div>
          <div className="not-found-card">
            <h3>Return Home</h3>
            <p>Go back to the homepage to explore</p>
            <Link className="btn secondary" to="/">
              Go Home
            </Link>
          </div>
          <div className="not-found-card">
            <h3>Need Help?</h3>
            <p>Contact our support team if you need assistance</p>
            <Link className="btn secondary" to="/messages">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </section>
  );
}
