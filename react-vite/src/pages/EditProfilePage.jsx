import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStoredUser, setStoredSession } from "../lib/auth";
import { apiRequest, readJsonSafe, normalizeApiError } from "../lib/api";

export default function EditProfilePage() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setStatus("Saving...");
    setError("");
    try {
      // Attempt server update if endpoint exists
      const res = await apiRequest("users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const body = await readJsonSafe(res);
      if (!res.ok) throw new Error(normalizeApiError(body, "Could not update profile."));

      // If server returns user, update stored session
      const newUser = body.user || { ...user, name, email };
      setStoredSession({ user: newUser });
      setStatus("Profile updated.");
      navigate("/account");
    } catch (err) {
      // Fallback: update local storage only
      try {
        setStoredSession({ user: { ...user, name, email } });
        setStatus("Profile updated locally.");
        navigate("/account");
      } catch (err2) {
        setError(err.message || "Could not save profile.");
        setStatus("");
      }
    }
  }

  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">Edit Profile</p>
        <h2 className="page-title">Edit your profile</h2>
        <p className="page-lead">Update your name and email address.</p>
      </div>

      <form onSubmit={save} style={{ maxWidth: 640 }}>
        <label className="label">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" />

        <label className="label">Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />

        {error ? <p className="error-text">{error}</p> : null}
        <div style={{ marginTop: '1rem' }}>
          <button className="btn" type="submit">Save</button>
        </div>
      </form>
    </section>
  );
}
