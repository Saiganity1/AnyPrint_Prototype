import { Navigate, useLocation } from "react-router-dom";
import { getStoredUser, roleCanManage } from "../lib/auth";

export default function RequireManager({ children }) {
  const location = useLocation();
  const user = getStoredUser();

  if (!user || !roleCanManage(user.role)) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return children;
}
