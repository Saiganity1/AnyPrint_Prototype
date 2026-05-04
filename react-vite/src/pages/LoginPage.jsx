import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { clearStoredSession, getStoredUser, setStoredSession } from "../lib/auth";
import LoadingSpinner from "../components/LoadingSpinner";

function useNextPath() {
  const { search } = useLocation();
  return useMemo(() => {
    const params = new URLSearchParams(search);
    const next = String(params.get("next") || "").trim();
    if (!next || next.startsWith("//") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(next)) {
      return "/";
    }
    return next;
  }, [search]);
}

export default function LoginPage() {
  const navigate = useNavigate();
  const nextPath = useNextPath();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      const role = String(user.role || "").toUpperCase();
      if (nextPath && nextPath !== "/") {
        navigate(nextPath, { replace: true });
      } else if (role === "OWNER") {
        navigate("/owner", { replace: true });
      } else if (role === "STAFF" || role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/account", { replace: true });
      }
    }
  }, [navigate, nextPath]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest("auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await readJsonSafe(response);

      if (!response.ok) {
        setError(normalizeApiError(body, "Login failed."));
        return;
      }

      setStoredSession({ user: body.user, token: body.token, tokens: body.tokens });
      setStatus("Welcome back. Redirecting...");
      const role = String((body.user && body.user.role) || "").toUpperCase();
      if (nextPath && nextPath !== "/") {
        navigate(nextPath, { replace: true });
      } else if (role === "OWNER") {
        navigate("/owner", { replace: true });
      } else if (role === "STAFF" || role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/account", { replace: true });
      }
    } catch {
      setError("Could not reach server.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    setStatus("");
    setError("");
    try {
      await apiRequest("auth/logout/", { method: "POST" });
    } catch {
      // Keep local logout reliable even if backend call fails.
    }
    clearStoredSession();
    setStatus("Logged out.");
  }

  return (
    <section className="auth-page auth-redesign">
      <div className="auth-shell">
        <aside className="auth-aside" aria-label="Account benefits">
          <p className="page-kicker">AnyPrint Account</p>
          <h2>Welcome back</h2>
          <p>
            Sign in to continue checkout, review order status, and keep your messages with support in one place.
          </p>
          <div className="auth-benefits">
            <span>Fast checkout</span>
            <span>Order tracking</span>
            <span>Support messages</span>
          </div>
        </aside>

        <section className="panel auth-panel">
          <div className="auth-panel-header">
            <p className="page-kicker">Login</p>
            <h1>Sign in</h1>
            <p className="meta">Use the email and password connected to your AnyPrint account.</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={onChange}
                placeholder="name@example.com"
                required
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                <button className="text-button" type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={form.password}
                onChange={onChange}
                placeholder="Enter your password"
                required
              />
            </div>

            {error ? <p className="auth-message error-text">{error}</p> : null}
            {status ? <p className="auth-message status-text">{status}</p> : null}

            <button type="submit" className="btn auth-submit" disabled={submitting}>
              {submitting ? (
                <>
                  <LoadingSpinner className="loading-spinner-inline" label="Signing in" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>

            <div className="auth-secondary-actions">
              <span>New to AnyPrint?</span>
              <Link to="/register">Create an account</Link>
            </div>
            <button type="button" className="text-button danger" onClick={onLogout}>
              Clear saved session
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
