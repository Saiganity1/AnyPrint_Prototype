import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireManager from "./components/RequireManager";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPage from "./pages/AdminPage";
import AccountPage from "./pages/AccountPage";
import EditProfilePage from "./pages/EditProfilePage";
import TrackingManagementPage from "./pages/TrackingManagementPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import CheckoutPage from "./pages/CheckoutPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductPage from "./pages/ProductPage";
import ShopPage from "./pages/ShopPage";
import TrackingPage from "./pages/TrackingPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/edit" element={<EditProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route
          path="/admin/tracking"
          element={
            <RequireManager>
              <TrackingManagementPage />
            </RequireManager>
          }
        />
        <Route path="/owner" element={<OwnerDashboardPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/products/:slug" element={<ProductPage />} />
        <Route
          path="/analytics"
          element={
            <RequireManager>
              <AnalyticsPage />
            </RequireManager>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
