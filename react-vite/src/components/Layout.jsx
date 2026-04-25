import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearStoredSession, getStoredUser, roleCanManage } from "../lib/auth";

function navClass({ isActive }) {
  return isActive ? "nav-link active" : "nav-link";
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

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
