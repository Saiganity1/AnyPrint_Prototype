import { STORAGE_KEYS } from "./config";

export function getStoredAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.auth) || "{}");
  } catch {
    return {};
  }
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null");
  } catch {
    return null;
  }
}

export function setStoredSession({ user, tokens }) {
  if (tokens) {
    localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(tokens));
  }
  if (user) {
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }
}

export function clearStoredSession() {
  localStorage.removeItem(STORAGE_KEYS.auth);
  localStorage.removeItem(STORAGE_KEYS.user);
}

export function roleCanManage(role) {
  const value = String(role || "").toUpperCase();
  return value === "OWNER" || value === "ADMIN";
}
