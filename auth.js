const core = window.AnyPrintCore || {};
const API_BASE = core.API_BASE || window.API_BASE || 'https://anyprint-prototype-backend.onrender.com/api';
const authConfig = window.AnyPrintAuthConfig || {};
const USER_KEY = 'anyprint_user_v1';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');

const authState = document.getElementById('authState');
const authStatus = document.getElementById('authStatus');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const socialAuthError = document.getElementById('socialAuthError');
const phoneAuthError = document.getElementById('phoneAuthError');
const phoneAuthHint = document.getElementById('phoneAuthHint');
const passwordStrength = document.getElementById('passwordStrength');
const toastStack = document.getElementById('toastStack');
const phoneLoginForm = document.getElementById('phoneLoginForm');
const requestPhoneCodeButton = document.getElementById('requestPhoneCodeButton');
const googleLoginButton = document.getElementById('googleLoginButton');
const facebookLoginButton = document.getElementById('facebookLoginButton');
const showLoginPasswordToggle = document.getElementById('showLoginPassword');

const loginUsernameInput = loginForm ? loginForm.querySelector('[name="username"]') : null;
const loginPasswordInput = loginForm ? loginForm.querySelector('[name="password"]') : null;
const registerUsernameInput = registerForm ? registerForm.querySelector('[name="username"]') : null;
const registerEmailInput = registerForm ? registerForm.querySelector('[name="email"]') : null;
const registerPasswordInput = registerForm ? registerForm.querySelector('[name="password"]') : null;
const registerConfirmInput = registerForm ? registerForm.querySelector('[name="confirm_password"]') : null;

const loginUsernameError = document.getElementById('loginUsernameError');
const loginPasswordError = document.getElementById('loginPasswordError');
const registerUsernameError = document.getElementById('registerUsernameError');
const registerEmailError = document.getElementById('registerEmailError');
const registerPasswordError = document.getElementById('registerPasswordError');
const registerConfirmError = document.getElementById('registerConfirmError');

let currentUser = null;

async function apiFetch(url, options = {}) {
    if (core.request) {
        return core.request(url, options);
    }
    return fetch(url, { credentials: 'include', ...options });
}

function getCookie(name) {
    const cookieValue = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookieValue ? decodeURIComponent(cookieValue.split('=').slice(1).join('=')) : '';
}

function showToast(message, tone = 'default') {
    if (!toastStack) return;

    const toast = document.createElement('div');
    toast.className = `toast ${tone}`;
    toast.textContent = message;
    toastStack.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 180);
    }, 1800);
}

function getSafeNextUrl() {
    const params = new URLSearchParams(window.location.search);
    const next = String(params.get('next') || '').trim();

    if (!next) return 'index.html';

    // Reject absolute URLs (open redirect protection).
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(next)) return 'index.html';
    if (next.startsWith('//')) return 'index.html';

    return next;
}

function getPostAuthRedirect(user) {
    const next = getSafeNextUrl();
    if (next !== 'index.html') {
        return next;
    }

    const role = String((user && user.role) || '').toUpperCase();
    if (role === 'OWNER') return 'owner-dashboard.html';
    if (role === 'ADMIN') return 'admin.html';
    return 'index.html';
}

function getLoggedOutMessage() {
    if (registerForm && !loginForm) {
        return 'Create an account to continue.';
    }

    return 'Sign in to continue.';
}

function clearAuthMessages() {
    if (authStatus) authStatus.textContent = '';
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
    if (socialAuthError) socialAuthError.textContent = '';
    if (phoneAuthError) phoneAuthError.textContent = '';
    if (phoneAuthHint) phoneAuthHint.textContent = '';
    if (loginUsernameError) loginUsernameError.textContent = '';
    if (loginPasswordError) loginPasswordError.textContent = '';
    if (registerUsernameError) registerUsernameError.textContent = '';
    if (registerEmailError) registerEmailError.textContent = '';
    if (registerPasswordError) registerPasswordError.textContent = '';
    if (registerConfirmError) registerConfirmError.textContent = '';
    if (loginUsernameInput) loginUsernameInput.removeAttribute('aria-invalid');
    if (loginPasswordInput) loginPasswordInput.removeAttribute('aria-invalid');
    if (registerUsernameInput) registerUsernameInput.removeAttribute('aria-invalid');
    if (registerEmailInput) registerEmailInput.removeAttribute('aria-invalid');
    if (registerPasswordInput) registerPasswordInput.removeAttribute('aria-invalid');
    if (registerConfirmInput) registerConfirmInput.removeAttribute('aria-invalid');
}

function parseApiEnvelope(body) {
    if (!body || typeof body !== 'object') return body;
    if (body.ok && body.data && typeof body.data === 'object') {
        return body.data;
    }
    return body;
}

function persistCurrentUser(user) {
    if (!user || typeof user !== 'object') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearStoredUser() {
    localStorage.removeItem(USER_KEY);
}

async function readJsonSafe(res) {
    if (core.parseJson) {
        return core.parseJson(res);
    }

    try {
        return await res.json();
    } catch (_error) {
        return {};
    }
}

async function completeLoginWithPayload(payload, fallbackErrorMessage) {
    clearAuthMessages();

    let res;
    let body;
    try {
        res = await apiFetch(`${API_BASE}/auth/social/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        body = await readJsonSafe(res);
    } catch (_error) {
        showToast('Could not reach the server. Please try again.', 'error');
        return false;
    }

    if (!res.ok) {
        if (socialAuthError) {
            socialAuthError.textContent = core.normalizeError ? core.normalizeError(body, fallbackErrorMessage) : fallbackErrorMessage;
        }
        return false;
    }

    const data = parseApiEnvelope(body);
    if (data.tokens && core.setTokens) {
        core.setTokens(data.tokens);
    }
    currentUser = data.user;
    persistCurrentUser(currentUser);
    renderAuthState();
    const successText = registerForm && !loginForm
        ? 'Account created successfully.'
        : 'Signed in successfully.';
    showToast(successText, 'success');
    window.location.href = getPostAuthRedirect(currentUser);
    return true;
}

function getGoogleClientId() {
    return String(authConfig.googleClientId || window.ANYPRINT_GOOGLE_CLIENT_ID || '').trim();
}

function getFacebookAppId() {
    return String(authConfig.facebookAppId || window.ANYPRINT_FACEBOOK_APP_ID || '').trim();
}

function parseGoogleCredentialResponse(response) {
    if (response && response.credential) {
        return String(response.credential);
    }
    return '';
}

async function startGoogleLogin() {
    clearAuthMessages();
    const googleClientId = getGoogleClientId();
    if (!window.google || !window.google.accounts || !googleClientId) {
        if (socialAuthError) {
            socialAuthError.textContent = 'Google sign-in is not configured yet. Set ANYPRINT_GOOGLE_CLIENT_ID first.';
        }
        return;
    }

    window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
            const token = parseGoogleCredentialResponse(response);
            if (!token) {
                if (socialAuthError) socialAuthError.textContent = 'Google did not return a valid token.';
                return;
            }
            await completeLoginWithPayload({ provider: 'google', token }, 'Google login failed.');
        },
    });

    window.google.accounts.id.prompt();
}

function ensureFacebookSdkInitialized() {
    const appId = getFacebookAppId();
    if (!window.FB || !appId) {
        return false;
    }

    if (!window.__anyprintFacebookInitialized) {
        window.FB.init({
            appId,
            cookie: true,
            xfbml: false,
            version: 'v20.0',
        });
        window.__anyprintFacebookInitialized = true;
    }

    return true;
}

function startFacebookLogin() {
    clearAuthMessages();

    if (!ensureFacebookSdkInitialized()) {
        if (socialAuthError) {
            socialAuthError.textContent = 'Facebook sign-in is not configured yet. Set ANYPRINT_FACEBOOK_APP_ID first.';
        }
        return;
    }

    window.FB.login(async (response) => {
        if (!response || !response.authResponse || !response.authResponse.accessToken) {
            if (socialAuthError) socialAuthError.textContent = 'Facebook login was cancelled.';
            return;
        }

        await completeLoginWithPayload(
            { provider: 'facebook', token: response.authResponse.accessToken },
            'Facebook login failed.',
        );
    }, { scope: 'public_profile,email' });
}

async function requestPhoneOtpCode() {
    clearAuthMessages();
    if (!phoneLoginForm) return;

    const formData = new FormData(phoneLoginForm);
    const phoneNumber = String(formData.get('phone_number') || '').trim();

    if (!phoneNumber) {
        if (phoneAuthError) phoneAuthError.textContent = 'Phone number is required.';
        return;
    }

    let res;
    let body;
    try {
        res = await apiFetch(`${API_BASE}/auth/phone/request/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone_number: phoneNumber }),
        });
        body = await readJsonSafe(res);
    } catch (_error) {
        if (phoneAuthError) phoneAuthError.textContent = 'Could not reach the server. Please try again.';
        return;
    }

    if (!res.ok) {
        if (phoneAuthError) phoneAuthError.textContent = core.normalizeError ? core.normalizeError(body, 'Could not send OTP code.') : 'Could not send OTP code.';
        return;
    }

    const data = parseApiEnvelope(body);
    if (phoneAuthHint) {
        let hint = `Code sent. It expires in ${data.expires_in_seconds || 300} seconds.`;
        if (data.debug_code) {
            hint += ` Dev code: ${data.debug_code}`;
        }
        phoneAuthHint.textContent = hint;
    }
    showToast('OTP code sent.', 'success');
}

async function verifyPhoneOtpCode(event) {
    event.preventDefault();
    clearAuthMessages();
    if (!phoneLoginForm) return;

    const formData = new FormData(phoneLoginForm);
    const phoneNumber = String(formData.get('phone_number') || '').trim();
    const code = String(formData.get('code') || '').trim();
    const intent = registerForm && !loginForm ? 'register' : 'login';
    const registerUsername = String((registerForm ? new FormData(registerForm).get('username') : '') || '').trim();
    const registerEmail = String((registerForm ? new FormData(registerForm).get('email') : '') || '').trim();

    if (!phoneNumber || !code) {
        if (phoneAuthError) phoneAuthError.textContent = 'Phone number and code are required.';
        return;
    }

    if (intent === 'register' && !registerUsername) {
        if (phoneAuthError) phoneAuthError.textContent = 'Enter a username first to create a phone account.';
        return;
    }

    let res;
    let body;
    try {
        res = await apiFetch(`${API_BASE}/auth/phone/verify/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone_number: phoneNumber,
                code,
                intent,
                username: registerUsername,
                email: registerEmail,
            }),
        });
        body = await readJsonSafe(res);
    } catch (_error) {
        if (phoneAuthError) phoneAuthError.textContent = 'Could not reach the server. Please try again.';
        return;
    }

    if (!res.ok) {
        if (phoneAuthError) phoneAuthError.textContent = core.normalizeError ? core.normalizeError(body, 'Phone login failed.') : 'Phone login failed.';
        return;
    }

    const data = parseApiEnvelope(body);
    if (data.tokens && core.setTokens) {
        core.setTokens(data.tokens);
    }
    currentUser = data.user;
    persistCurrentUser(currentUser);
    renderAuthState();
    showToast('Signed in with phone number.', 'success');
    window.location.href = getPostAuthRedirect(currentUser);
}

function setInlineError(input, errorNode, message) {
    if (input) {
        if (message) {
            input.setAttribute('aria-invalid', 'true');
        } else {
            input.removeAttribute('aria-invalid');
        }
    }

    if (errorNode) {
        errorNode.textContent = message || '';
    }
}

function validateLoginForm(payload) {
    let isValid = true;

    if (!payload.username) {
        setInlineError(loginUsernameInput, loginUsernameError, 'Username is required.');
        isValid = false;
    }

    if (!payload.password) {
        setInlineError(loginPasswordInput, loginPasswordError, 'Password is required.');
        isValid = false;
    }

    return isValid;
}

function validateRegisterForm(payload) {
    let isValid = true;

    if (!payload.username) {
        setInlineError(registerUsernameInput, registerUsernameError, 'Username is required.');
        isValid = false;
    } else if (payload.username.length < 3) {
        setInlineError(registerUsernameInput, registerUsernameError, 'Username must be at least 3 characters.');
        isValid = false;
    }

    if (payload.email && registerEmailInput && !registerEmailInput.checkValidity()) {
        setInlineError(registerEmailInput, registerEmailError, 'Enter a valid email address.');
        isValid = false;
    }

    if (!payload.password) {
        setInlineError(registerPasswordInput, registerPasswordError, 'Password is required.');
        isValid = false;
    } else if (payload.password.length < 8) {
        setInlineError(registerPasswordInput, registerPasswordError, 'Password must be at least 8 characters.');
        isValid = false;
    }

    if (!payload.confirmPassword) {
        setInlineError(registerConfirmInput, registerConfirmError, 'Please confirm your password.');
        isValid = false;
    } else if (payload.password !== payload.confirmPassword) {
        setInlineError(registerConfirmInput, registerConfirmError, 'Passwords do not match.');
        isValid = false;
    }

    return isValid;
}

if (loginUsernameInput) {
    loginUsernameInput.addEventListener('input', () => setInlineError(loginUsernameInput, loginUsernameError, ''));
}

if (loginPasswordInput) {
    loginPasswordInput.addEventListener('input', () => setInlineError(loginPasswordInput, loginPasswordError, ''));
}

if (showLoginPasswordToggle && loginPasswordInput) {
    showLoginPasswordToggle.addEventListener('change', () => {
        loginPasswordInput.type = showLoginPasswordToggle.checked ? 'text' : 'password';
    });
}

if (registerUsernameInput) {
    registerUsernameInput.addEventListener('input', () => setInlineError(registerUsernameInput, registerUsernameError, ''));
}

if (registerEmailInput) {
    registerEmailInput.addEventListener('input', () => setInlineError(registerEmailInput, registerEmailError, ''));
}

if (registerPasswordInput) {
    registerPasswordInput.addEventListener('input', () => {
        setInlineError(registerPasswordInput, registerPasswordError, '');
        const level = evaluatePasswordStrength(registerPasswordInput.value);
        passwordStrength.textContent = registerPasswordInput.value ? `Password strength: ${level}` : '';
    });
}

if (registerConfirmInput) {
    registerConfirmInput.addEventListener('input', () => setInlineError(registerConfirmInput, registerConfirmError, ''));
}

function renderAuthState() {
    if (!authState || !logoutButton) return;

    if (currentUser) {
        authState.innerHTML = `<p><strong>Signed in as:</strong> ${currentUser.username}</p><p class="meta">Continue to the <a class="text-link" href="index.html">shop</a> or logout.</p>`;
        logoutButton.classList.remove('hidden');
        if (loginForm) loginForm.classList.add('hidden');
        if (registerForm) registerForm.classList.add('hidden');
        if (phoneLoginForm) phoneLoginForm.classList.add('hidden');
        if (googleLoginButton) googleLoginButton.classList.add('hidden');
        if (facebookLoginButton) facebookLoginButton.classList.add('hidden');
    } else {
        authState.innerHTML = `<p class="meta">${getLoggedOutMessage()}</p>`;
        logoutButton.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
        if (phoneLoginForm) phoneLoginForm.classList.remove('hidden');
        if (googleLoginButton) googleLoginButton.classList.remove('hidden');
        if (facebookLoginButton) facebookLoginButton.classList.remove('hidden');
    }
}

async function refreshAuthState() {
    try {
        const res = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await readJsonSafe(res);
        currentUser = body && body.is_authenticated ? body.user : null;
    } catch (_error) {
        currentUser = null;
    }

    renderAuthState();
}

function evaluatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return 'Weak';
    if (score <= 3) return 'Medium';
    return 'Strong';
}

if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearAuthMessages();

        const formData = new FormData(loginForm);
        const payload = {
            username: formData.get('username'),
            password: formData.get('password'),
        };

        if (!validateLoginForm(payload)) {
            if (loginError) loginError.textContent = 'Please fix the highlighted fields.';
            return;
        }

        let res;
        let body;
        try {
            res = await apiFetch(`${API_BASE}/auth/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            body = await readJsonSafe(res);
        } catch (_error) {
            showToast('Could not reach the server. Please try again.', 'error');
            return;
        }

        if (!res.ok) {
            if (loginError) loginError.textContent = (core.normalizeError ? core.normalizeError(body, 'Login failed.') : body.error || 'Login failed.');
            return;
        }

        if (body.tokens && core.setTokens) {
            core.setTokens(body.tokens);
        }
        currentUser = body.user;
        persistCurrentUser(currentUser);
        renderAuthState();
        showToast('Welcome back!', 'success');
        window.location.href = getPostAuthRedirect(currentUser);
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearAuthMessages();

        const formData = new FormData(registerForm);
        const password = String(formData.get('password') || '');
        const confirmPassword = String(formData.get('confirm_password') || '');

        if (password !== confirmPassword) {
            if (registerError) registerError.textContent = 'Passwords do not match.';
            return;
        }

        const payload = {
            username: formData.get('username'),
            email: formData.get('email'),
            password,
            confirmPassword,
        };

        if (!validateRegisterForm(payload)) {
            if (registerError) registerError.textContent = 'Please fix the highlighted fields.';
            return;
        }

        let res;
        let body;
        try {
            res = await apiFetch(`${API_BASE}/auth/register/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            body = await readJsonSafe(res);
        } catch (_error) {
            showToast('Could not reach the server. Please try again.', 'error');
            return;
        }

        if (!res.ok) {
            if (registerError) registerError.textContent = (core.normalizeError ? core.normalizeError(body, 'Registration failed.') : body.error || 'Registration failed.');
            return;
        }

        if (body.tokens && core.setTokens) {
            core.setTokens(body.tokens);
        }
        currentUser = body.user;
        persistCurrentUser(currentUser);
        renderAuthState();
        showToast('Account created successfully.', 'success');
        window.location.href = getPostAuthRedirect(currentUser);
    });
}

if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
        clearAuthMessages();

        let res;
        try {
            res = await apiFetch(`${API_BASE}/auth/logout/`, {
                method: 'POST',
            });
        } catch (_error) {
            showToast('Could not reach the server. Please try again.', 'error');
            return;
        }

        if (!res.ok) {
            showToast('Logout failed.', 'error');
            return;
        }

        if (core.clearTokens) {
            core.clearTokens();
        }
        currentUser = null;
        clearStoredUser();
        renderAuthState();
        showToast('Logged out.', 'default');

        if (passwordStrength) passwordStrength.textContent = '';
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    });
}

if (googleLoginButton) {
    googleLoginButton.addEventListener('click', startGoogleLogin);
}

if (facebookLoginButton) {
    facebookLoginButton.addEventListener('click', startFacebookLogin);
}

if (requestPhoneCodeButton) {
    requestPhoneCodeButton.addEventListener('click', requestPhoneOtpCode);
}

if (phoneLoginForm) {
    phoneLoginForm.addEventListener('submit', verifyPhoneOtpCode);
}

refreshAuthState();
