import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
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
    <section className="auth-page">
      <div className="page-intro">
        <p className="page-kicker">Welcome Back</p>
        <h2 className="page-title">Login</h2>
        <p className="page-lead">Sign in with your AnyPrint account.</p>
      </div>

      <section className="panel auth-panel">

      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={onChange}
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          value={form.password}
          onChange={onChange}
          required
        />

        <label className="password-toggle">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
          />
          Show password
        </label>

        {error ? <p className="error-text">{error}</p> : null}
        {status ? <p className="status-text">{status}</p> : null}

        <div className="row-actions">
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? (
              <>
                <LoadingSpinner className="loading-spinner-inline" label="Signing in" />
                Signing in...
              </>
            ) : (
              "Login"
            )}
          </button>
          <Link className="btn secondary" to="/register">
            Create Account
          </Link>
          <button type="button" className="btn secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </form>
      </section>
    </section>
  );
}
