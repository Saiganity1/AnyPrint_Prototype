(() => {
const API_BASE = window.API_BASE || 'https://anyprint-prototype-backend.onrender.com/api';
const ACCESS_TOKEN_KEY = 'ap_access_token';
const REFRESH_TOKEN_KEY = 'ap_refresh_token';
const AUTH_KEY = 'anyprint_auth_v1';

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
}

function getAccessToken() {
    const legacy = localStorage.getItem(ACCESS_TOKEN_KEY) || '';
    if (legacy) return legacy;

    try {
        const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        return String(auth.access || '');
    } catch (_error) {
        return '';
    }
}

function getRefreshToken() {
    const legacy = localStorage.getItem(REFRESH_TOKEN_KEY) || '';
    if (legacy) return legacy;

    try {
        const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
        return String(auth.refresh || '');
    } catch (_error) {
        return '';
    }
}

function setTokens(tokens = {}) {
    const merged = {
        access: String(tokens.access || ''),
        refresh: String(tokens.refresh || ''),
    };

    if (tokens.access) {
        localStorage.setItem(ACCESS_TOKEN_KEY, String(tokens.access));
    }
    if (tokens.refresh) {
        localStorage.setItem(REFRESH_TOKEN_KEY, String(tokens.refresh));
    }

    if (merged.access || merged.refresh) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(merged));
    }
}

function clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_KEY);
}

function toAbsoluteUrl(pathOrUrl) {
    if (/^https?:\/\//i.test(pathOrUrl)) {
        return pathOrUrl;
    }
    const path = String(pathOrUrl || '').replace(/^\/+/, '');
    return `${API_BASE}/${path}`;
}

async function requestRaw(pathOrUrl, options = {}) {
    const config = { credentials: 'include', ...options };
    const method = String(config.method || 'GET').toUpperCase();
    const headers = new Headers(config.headers || {});

    const accessToken = getAccessToken();
    if (accessToken && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${accessToken}`);
    }

    if (!['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken && !headers.has('X-CSRFToken')) {
            headers.set('X-CSRFToken', csrfToken);
        }
    }

    config.headers = headers;
    return fetch(toAbsoluteUrl(pathOrUrl), config);
}

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) return false;

    try {
        const res = await requestRaw('auth/token/refresh/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.tokens || !body.tokens.access) {
            clearTokens();
            return false;
        }
        setTokens(body.tokens);
        return true;
    } catch (_error) {
        clearTokens();
        return false;
    }
}

async function request(pathOrUrl, options = {}, attemptRefresh = true) {
    const res = await requestRaw(pathOrUrl, options);
    if (res.status !== 401 || !attemptRefresh) {
        return res;
    }

    const refreshed = await refreshAccessToken();
    if (!refreshed) {
        return res;
    }

    return requestRaw(pathOrUrl, options);
}

async function parseJson(res) {
    try {
        return await res.json();
    } catch (_error) {
        return {};
    }
}

function normalizeError(body, fallback = 'Request failed.') {
    if (!body || typeof body !== 'object') return fallback;
    if (body.error && typeof body.error === 'string') return body.error;
    if (body.message && typeof body.message === 'string') return body.message;
    if (body.errors && typeof body.errors === 'object') {
        const firstKey = Object.keys(body.errors)[0];
        if (firstKey && body.errors[firstKey]) {
            const value = body.errors[firstKey];
            if (Array.isArray(value)) return String(value[0]);
            return String(value);
        }
    }
    return fallback;
}

function trackEvent(eventName, payload = {}) {
    const eventData = {
        event: eventName,
        timestamp: new Date().toISOString(),
        ...payload,
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(eventData);
    window.dispatchEvent(new CustomEvent('anyprint:analytics', { detail: eventData }));
}

window.AnyPrintCore = {
    API_BASE,
    getCookie,
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    requestRaw,
    request,
    parseJson,
    normalizeError,
    trackEvent,
};
})();
