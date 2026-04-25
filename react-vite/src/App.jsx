import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RequireManager from "./components/RequireManager";
import AnalyticsPage from "./pages/AnalyticsPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductPage from "./pages/ProductPage";
import ShopPage from "./pages/ShopPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/login" element={<LoginPage />} />
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
