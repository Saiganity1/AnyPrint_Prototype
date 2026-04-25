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
        <div className="container nav-wrap">
          <Link className="brand" to="/">
            AnyPrint
          </Link>
          <nav className="site-nav">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/shop" className={navClass}>
              Shop
            </NavLink>
            <NavLink to="/wishlist" className={navClass}>
              Wishlist
            </NavLink>
            <NavLink to="/tracking" className={navClass}>
              Tracking
            </NavLink>
            <NavLink to="/checkout" className={navClass}>
              Checkout ({count})
            </NavLink>
            {currentUser && roleCanManage(currentUser.role) ? (
              <NavLink to="/analytics" className={navClass}>
                Analytics
              </NavLink>
            ) : null}
            {currentUser ? (
              <button type="button" className="btn secondary" onClick={logout}>
                Logout
              </button>
            ) : (
              <NavLink to="/login" className={navClass}>
                Login
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="container page-content">{children}</main>
    </div>
  );
}
