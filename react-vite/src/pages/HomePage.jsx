import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <section className="hero-panel">
      <p className="kicker">AnyPrint Storefront</p>
      <h1>Custom shirt ordering, rebuilt with React + Vite.</h1>
      <p className="lead">
        Browse shirts, sign in, view product details, and manage sales analytics from a
        modern frontend connected to your existing Django backend.
      </p>
      <div className="hero-actions">
        <Link className="btn" to="/shop">
          Browse Catalog
        </Link>
        <Link className="btn secondary" to="/login">
          Login
        </Link>
      </div>
    </section>
  );
}
