import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearStoredSession, getStoredUser, roleCanManage } from "../lib/auth";
import { cartCount, loadCart } from "../lib/cart";
import Footer from "./Footer";

function navClass({ isActive }) {
  return isActive ? "nav-link active" : "nav-link";
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [count, setCount] = useState(() => cartCount(loadCart()));
  const isOwner = currentUser && String(currentUser.role || "").toUpperCase() === "OWNER";
  const canManage = currentUser && roleCanManage(currentUser.role);

  useEffect(() => {
    function syncCount() {
      setCount(cartCount(loadCart()));
    }

    syncCount();
    window.addEventListener("anyprint:cart-updated", syncCount);
    return () => window.removeEventListener("anyprint:cart-updated", syncCount);
  }, []);

  function logout() {
    clearStoredSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="topbar">
          <div className="container topbar-inner">
            <span className="topbar-item">
              <span className="topbar-truck" aria-hidden="true" /> Free shipping on orders over ₱2,500
            </span>
            <div className="topbar-right">
              <a className="topbar-link" href="#how-it-works">How it works</a>
              <a className="topbar-link" href="#why-choose-us">Why choose us</a>
              <a className="topbar-link" href="#contact">Contact</a>
              <a className="social-link" href="https://instagram.com" aria-label="Instagram">IG</a>
              <a className="social-link" href="https://facebook.com" aria-label="Facebook">f</a>
              <a className="social-link" href="https://twitter.com" aria-label="Twitter">t</a>
            </div>
          </div>
        </div>
        <div className="container nav-wrap">
          <div className="brand-block">
            <Link className="brand" to="/">
              Any<span>Print</span>
            </Link>
            <p className="brand-tag">T-Shirt Store</p>
          </div>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/" className={navClass} end>Home</NavLink>
            <NavLink to="/shop" className={navClass}>
              All Products <span className="nav-caret" aria-hidden="true">⌄</span>
            </NavLink>
            {currentUser && !canManage ? <NavLink to="/tracking" className={navClass}>Track Order</NavLink> : null}
            {currentUser ? <NavLink to="/messages" className={navClass}>Messages</NavLink> : null}
            {isOwner ? <NavLink to="/owner" className={navClass}>Owner</NavLink> : null}
            {canManage ? <NavLink to="/admin" className={navClass}>Admin</NavLink> : null}
            {canManage ? <NavLink to="/admin/tracking" className={navClass}>Tracking</NavLink> : null}
            {canManage ? <NavLink to="/analytics" className={navClass}>Analytics</NavLink> : null}
          </nav>
          <div className="top-actions">
            <span className="moon-icon" aria-hidden="true" />
            {currentUser ? (
              <button type="button" className="auth-btn secondary" onClick={logout}>Logout</button>
            ) : (
              <NavLink to="/login" className="auth-btn">Login</NavLink>
            )}
            <NavLink to="/checkout" className="cart-btn">
              <span className="cart-icon" aria-hidden="true" /> Cart ({count})
            </NavLink>
            {currentUser ? (
              <>
                <NavLink to="/account" className="user-chip">
                  {currentUser.name || currentUser.username || "User"}
                </NavLink>
                <span className="user-avatar" aria-hidden="true">M</span>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="container page-content">{children}</main>
      <Footer />
    </div>
  );
}
