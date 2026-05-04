import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { setStoredSession } from "../lib/auth";
import LoadingSpinner from "../components/LoadingSpinner";

function passwordScore(password) {
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  return Math.min(score, 4);
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm_password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const score = useMemo(() => passwordScore(form.password), [form.password]);
  const passwordsMatch = form.confirm_password && form.password === form.confirm_password;
  const strengthLabel = ["Start typing", "Basic", "Fair", "Good", "Strong"][score];

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
    <section className="auth-page auth-redesign">
      <div className="auth-shell">
        <aside className="auth-aside" aria-label="Account benefits">
          <p className="page-kicker">Join AnyPrint</p>
          <h2>Create your account</h2>
          <p>
            Save your details, track every order, and message support directly about shirts, sizes, and delivery.
          </p>
          <div className="auth-benefits">
            <span>Saved checkout</span>
            <span>Purchase history</span>
            <span>Order updates</span>
          </div>
        </aside>

        <section className="panel auth-panel">
          <div className="auth-panel-header">
            <p className="page-kicker">Create Account</p>
            <h1>Register</h1>
            <p className="meta">Use an active email so staff can contact you about orders.</p>
          </div>

          <form className="auth-form" onSubmit={onSubmit}>
            <div className="auth-field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                name="name"
                value={form.name}
                onChange={onChange}
                autoComplete="name"
                placeholder="Juan Dela Cruz"
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                autoComplete="email"
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
                value={form.password}
                onChange={onChange}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                required
              />
              <div className="password-meter" aria-label={`Password strength: ${strengthLabel}`}>
                <span style={{ transform: `scaleX(${score / 4})` }} />
              </div>
              <p className="auth-hint">Strength: {strengthLabel}</p>
            </div>

            <div className="auth-field">
              <label htmlFor="confirm_password">Confirm password</label>
              <input
                id="confirm_password"
                name="confirm_password"
                type={showPassword ? "text" : "password"}
                value={form.confirm_password}
                onChange={onChange}
                autoComplete="new-password"
                placeholder="Re-enter your password"
                required
              />
              {form.confirm_password ? (
                <p className={passwordsMatch ? "auth-hint success" : "auth-hint error"}>
                  {passwordsMatch ? "Passwords match." : "Passwords do not match yet."}
                </p>
              ) : null}
            </div>

            {error ? <p className="auth-message error-text">{error}</p> : null}
            {status ? <p className="auth-message status-text">{status}</p> : null}

            <button className="btn auth-submit" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <LoadingSpinner className="loading-spinner-inline" label="Creating account" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </button>

            <div className="auth-secondary-actions">
              <span>Already have an account?</span>
              <Link to="/login">Login instead</Link>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
