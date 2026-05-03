import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { setStoredSession } from "../lib/auth";
import LoadingSpinner from "../components/LoadingSpinner";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setStatus("");
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.password || !form.confirm_password) {
      setError("Name, email, and password are required.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest("auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Registration failed."));
      }

      setStoredSession({ user: body.user, token: body.token, tokens: body.tokens });
      setStatus("Account created. Redirecting...");
      navigate("/account", { replace: true });
    } catch (registerError) {
      setError(registerError.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="page-intro">
        <p className="page-kicker">Create Account</p>
        <h2 className="page-title">Register</h2>
        <p className="page-lead">Create your account to save details and view your orders.</p>
      </div>

      <section className="panel auth-panel">

      <form className="form-grid" onSubmit={onSubmit}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={form.name} onChange={onChange} autoComplete="name" required />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={onChange} autoComplete="email" required />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={onChange}
          autoComplete="new-password"
          required
        />

        <label htmlFor="confirm_password">Confirm Password</label>
        <input
          id="confirm_password"
          name="confirm_password"
          type={showPassword ? "text" : "password"}
          value={form.confirm_password}
          onChange={onChange}
          autoComplete="new-password"
          required
        />

        <label className="password-toggle">
          <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
          Show password
        </label>

        {error ? <p className="error-text">{error}</p> : null}
        {status ? <p className="status-text">{status}</p> : null}

        <div className="row-actions">
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LoadingSpinner className="loading-spinner-inline" label="Creating account" />
                Creating...
              </>
            ) : (
              "Create Account"
            )}
          </button>
          <Link className="btn secondary" to="/login">
            I already have an account
          </Link>
        </div>
      </form>
      </section>
    </section>
  );
}
