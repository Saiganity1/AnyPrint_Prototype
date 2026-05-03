import { Navigate, useNavigate, useLocation } from "react-router-dom";
import AdminChatPanel from "../components/AdminChatPanel";
import ChatWindow from "../components/ChatWindow";
import { getStoredUser, roleCanManage } from "../lib/auth";

export default function MessagesPage() {
  const user = getStoredUser();
  const navigate = useNavigate();
  const location = useLocation();
  const productContext = location.state?.productId ? { id: location.state.productId, name: location.state.productName } : null;

  if (!user) {
    return <Navigate to="/login?next=%2Fmessages" replace />;
  }

  const canManage = roleCanManage(user.role);

  return (
    <section className="messages-page">
      <div className="page-intro">
        <p className="page-kicker">Messages</p>
        <h2 className="page-title">Customer Support</h2>
        <p className="page-lead">
          {canManage
            ? "View and reply to customer messages. Customers can contact you through product inquiries."
            : "Chat with our support team about products or orders."}
        </p>
      </div>

      {canManage ? (
        <section className="panel messages-shell">
          <AdminChatPanel />
        </section>
      ) : (
        <section className="panel messages-shell">
          <ChatWindow currentUser={user} onClose={() => navigate("/account")} initialProduct={productContext} />
        </section>
      )}
    </section>
  );
}