import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiRequest, normalizeApiError, readJsonSafe } from "../lib/api";
import { getStoredUser } from "../lib/auth";
import { formatPrice } from "../lib/format";

const TABS = ["orders", "addresses", "profile"];

export default function AccountPage() {
  const user = getStoredUser();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [addressForm, setAddressForm] = useState({ full_name: "", phone: "", address: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setStatus("Loading account data...");
      setError("");
      try {
        const [ordersRes, addressesRes] = await Promise.all([
          apiRequest("orders/history/"),
          apiRequest("addresses/"),
        ]);

        const [ordersBody, addressesBody] = await Promise.all([
          readJsonSafe(ordersRes),
          readJsonSafe(addressesRes),
        ]);

        if (!ordersRes.ok) throw new Error(normalizeApiError(ordersBody, "Could not load orders."));
        if (!addressesRes.ok) throw new Error(normalizeApiError(addressesBody, "Could not load addresses."));

        if (!cancelled) {
          setOrders(Array.isArray(ordersBody.orders) ? ordersBody.orders : []);
          setAddresses(Array.isArray(addressesBody.addresses) ? addressesBody.addresses : []);
          setStatus("Account loaded.");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load account.");
          setStatus("Could not load account.");
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = useMemo(() => user?.username || "User", [user]);

  if (!user) {
    return <Navigate to="/login?next=%2Faccount" replace />;
  }

  async function addAddress(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await apiRequest("addresses/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Failed to save address."));
      }
      setAddresses((prev) => [...prev, body.address]);
      setAddressForm({ full_name: "", phone: "", address: "" });
      setStatus("Address saved.");
    } catch (addressError) {
      setError(addressError.message || "Failed to save address.");
    }
  }

  async function deleteAddress(addressId) {
    try {
      const response = await apiRequest(`addresses/${addressId}/delete/`, { method: "POST" });
      const body = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(normalizeApiError(body, "Failed to delete address."));
      }
      setAddresses((prev) => prev.filter((item) => item.id !== addressId));
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete address.");
    }
  }



  return (
    <section className="account-page">
      <div className="page-intro">
        <p className="page-kicker">User Dashboard</p>
        <h2 className="page-title">My Account</h2>
        <p className="page-lead">Welcome, {displayName}</p>
      </div>
      <p className="status-text">{status}</p>
      {error ? <p className="error-text">{error}</p> : null}

      <div className="tab-row">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? "tab-chip active" : "tab-chip"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "orders" ? (
        <section className="orders-stack">
          {orders.length ? (
            orders.map((order) => (
              <article className="panel" key={order.id}>
                <div className="row-between">
                  <div>
                    <h3 style={{ marginBottom: "0.2rem" }}>Order {order.tracking_number || `#${order.id}`}</h3>
                    <p className="meta">{new Date(order.created_at).toLocaleDateString()}</p>
                  </div>
                  <strong>{order.status}</strong>
                </div>
                <p className="meta">
                  Total: {formatPrice(order.total_amount)} • Payment: {order.payment_status}
                </p>
                <Link className="btn secondary" to="/tracking">
                  Track Order
                </Link>
              </article>
            ))
          ) : (
            <div className="panel empty-panel">No orders yet.</div>
          )}
        </section>
      ) : null}

      {activeTab === "addresses" ? (
        <section className="panel">
          <h3>Saved Addresses</h3>
          {addresses.length ? (
            <div className="orders-stack">
              {addresses.map((address) => (
                <article className="checkout-item" key={address.id}>
                  <div>
                    <strong>{address.full_name}</strong>
                    <p className="meta">{address.phone}</p>
                    <p className="meta">{address.address}</p>
                  </div>
                  <button className="btn secondary" type="button" onClick={() => deleteAddress(address.id)}>
                    Delete
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="meta">No saved addresses yet.</p>
          )}

          <form className="form-grid" style={{ marginTop: "0.9rem" }} onSubmit={addAddress}>
            <input
              name="full_name"
              placeholder="Full Name"
              value={addressForm.full_name}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, full_name: event.target.value }))}
              required
            />
            <input
              name="phone"
              placeholder="Phone"
              value={addressForm.phone}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, phone: event.target.value }))}
              required
            />
            <textarea
              name="address"
              rows={3}
              placeholder="Address"
              value={addressForm.address}
              onChange={(event) => setAddressForm((prev) => ({ ...prev, address: event.target.value }))}
              required
            />
            <button className="btn" type="submit">
              Save Address
            </button>
          </form>
        </section>
      ) : null}



      {activeTab === "profile" ? (
        <section className="panel">
          <h3>Profile</h3>
          <p className="meta">Username: {user.username}</p>
          <p className="meta">Email: {user.email || "Not set"}</p>
          <p className="meta">Phone: {user.phone_number || "Not set"}</p>
          <p className="meta">Role: {user.role || "USER"}</p>
          <p className="meta">Profile updates are managed by the backend auth profile endpoint.</p>
        </section>
      ) : null}
    </section>
  );
}
