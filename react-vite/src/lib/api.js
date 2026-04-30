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

  const auth = readAuth();
  const accessToken = auth.token || auth.access;
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  if (config.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
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

export async function apiRequest(pathOrUrl, options = {}) {
  const response = await requestRaw(pathOrUrl, options);
  if (response.status === 401) clearAuth();
  return response;
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
