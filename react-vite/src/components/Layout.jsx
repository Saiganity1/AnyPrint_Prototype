import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearStoredSession, getStoredUser, roleCanManage } from "../lib/auth";
import { cartCount, loadCart } from "../lib/cart";

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
    return () => {
      window.removeEventListener("anyprint:cart-updated", syncCount);
    };
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
            <div className="topbar-left">
              <span className="topbar-item">T-shirt store • Metro Manila → Nationwide delivery</span>
            </div>
            <div className="topbar-right">
              <a className="topbar-link" href="#how-it-works">
                How it works
              </a>
              <a className="topbar-link" href="#why-choose-us">
                Why choose us
              </a>
              <a className="topbar-link" href="#contact">
                Contact
              </a>
            </div>
          </div>
        </div>
        <div className="container nav-wrap">
          <div className="brand-block">
            <Link className="brand" to="/">
              AnyPrint
            </Link>
            <p className="brand-tag">T-shirt Store</p>
          </div>
          <nav className="site-nav" aria-label="Primary">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/shop" className={navClass}>
              All Products
            </NavLink>
            {currentUser && !canManage ? (
              <NavLink to="/tracking" className={navClass}>
                Track Order
              </NavLink>
            ) : null}
            {isOwner ? (
              <NavLink to="/owner" className={navClass}>
                Owner
              </NavLink>
            ) : null}
            {canManage ? (
              <NavLink to="/admin" className={navClass}>
                Admin
              </NavLink>
            ) : null}
            {canManage ? (
              <NavLink to="/admin/tracking" className={navClass}>
                Tracking
              </NavLink>
            ) : null}
            {canManage ? (
              <NavLink to="/analytics" className={navClass}>
                Analytics
              </NavLink>
            ) : null}
          </nav>
          <div className="top-actions">
            {currentUser ? (
              <button type="button" className="auth-btn secondary" onClick={logout}>
                Logout
              </button>
            ) : (
              <NavLink to="/login" className="auth-btn">
                Login
              </NavLink>
            )}
            <NavLink to="/checkout" className="cart-btn">
              Cart ({count})
            </NavLink>
            {currentUser ? (
              <NavLink to="/account" className="user-chip">
                {currentUser.name || currentUser.username || "User"}
              </NavLink>
            ) : null}
          </div>
        </div>
      </header>
      <main className="container page-content">{children}</main>
    </div>
  );
}
