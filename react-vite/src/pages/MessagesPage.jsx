import { Navigate, useNavigate } from "react-router-dom";
import AdminChatPanel from "../components/AdminChatPanel";
import ChatWindow from "../components/ChatWindow";
import { getStoredUser, roleCanManage } from "../lib/auth";

export default function MessagesPage() {
  const user = getStoredUser();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login?next=%2Fmessages" replace />;
  }

  const canManage = roleCanManage(user.role);

  return (
    <section className="dashboard-page">
      <div className="page-intro">
        <p className="page-kicker">Messages</p>
        <h2 className="page-title">Customer Chat</h2>
        <p className="page-lead">
          {canManage
            ? "View and reply to customer messages from a dedicated inbox."
            : "Send a message to admin or owner and follow the conversation here."}
        </p>
      </div>

      {canManage ? (
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <AdminChatPanel />
        </section>
      ) : (
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <ChatWindow currentUser={user} onClose={() => navigate("/account")} />
        </section>
      )}
    </section>
  );
}