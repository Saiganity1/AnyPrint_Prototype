import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { clearStoredSession, getStoredUser, setStoredSession } from "../lib/auth";

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

  const [form, setForm] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      navigate(nextPath, { replace: true });
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

    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
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

      setStoredSession({ user: body.user, tokens: body.tokens });
      setStatus("Welcome back. Redirecting...");
      navigate(nextPath, { replace: true });
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
    <section className="panel auth-panel">
      <h2>Login</h2>
      <p className="lead">Sign in with your AnyPrint account.</p>

      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={form.username}
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
            {submitting ? "Signing in..." : "Login"}
          </button>
          <button type="button" className="btn secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </form>
    </section>
  );
}
