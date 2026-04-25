export const API_BASE =
  (import.meta.env.VITE_API_BASE_URL ||
    "https://anyprint-prototype-backend.onrender.com/api").replace(/\/+$/, "");

export const STORAGE_KEYS = {
  auth: "anyprint_auth_v1",
  user: "anyprint_user_v1",
};
