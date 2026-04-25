import { API_BASE, STORAGE_KEYS } from "./config";

function getCookie(name) {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  return cookieValue ? decodeURIComponent(cookieValue.split("=").slice(1).join("=")) : "";
}

function readAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.auth) || "{}");
  } catch {
    return {};
  }
}

function writeAuth(tokens) {
  localStorage.setItem(STORAGE_KEYS.auth, JSON.stringify(tokens || {}));
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.auth);
}

function toAbsoluteUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const path = String(pathOrUrl || "").replace(/^\/+/, "");
  return `${API_BASE}/${path}`;
}

async function requestRaw(pathOrUrl, options = {}) {
  const config = { credentials: "include", ...options };
  const method = String(config.method || "GET").toUpperCase();
  const headers = new Headers(config.headers || {});

  const accessToken = readAuth().access;
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(method)) {
    const csrfToken = getCookie("csrftoken");
    if (csrfToken && !headers.has("X-CSRFToken")) {
      headers.set("X-CSRFToken", csrfToken);
    }
  }

  config.headers = headers;
  return fetch(toAbsoluteUrl(pathOrUrl), config);
}

async function refreshAccessToken() {
  const refresh = readAuth().refresh;
  if (!refresh) return false;

  try {
    const response = await requestRaw("auth/token/refresh/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.tokens || !body.tokens.access) {
      clearAuth();
      return false;
    }

    writeAuth(body.tokens);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

export async function apiRequest(pathOrUrl, options = {}, attemptRefresh = true) {
  const response = await requestRaw(pathOrUrl, options);
  if (response.status !== 401 || !attemptRefresh) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return response;
  }

  return requestRaw(pathOrUrl, options);
}

export async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export function normalizeApiError(body, fallback = "Request failed.") {
  if (!body || typeof body !== "object") return fallback;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  return fallback;
}
