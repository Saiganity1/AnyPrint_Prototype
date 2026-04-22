const core = window.AnyPrintCore || {};
const API_BASE = core.API_BASE || window.API_BASE || 'http://127.0.0.1:8000/api';

const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const logoutButton = document.getElementById('logoutButton');

const authState = document.getElementById('authState');
const authStatus = document.getElementById('authStatus');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const passwordStrength = document.getElementById('passwordStrength');
const toastStack = document.getElementById('toastStack');

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
    } else {
        authState.innerHTML = `<p class="meta">${getLoggedOutMessage()}</p>`;
        logoutButton.classList.add('hidden');
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.remove('hidden');
    }
}

async function refreshAuthState() {
    try {
        const res = await apiFetch(`${API_BASE}/auth/me/`);
        const body = await res.json();
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
            body = await res.json();
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
        renderAuthState();
        showToast('Welcome back!', 'success');
        window.location.href = getSafeNextUrl();
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
            body = await res.json();
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
        renderAuthState();
        showToast('Account created successfully.', 'success');
        window.location.href = getSafeNextUrl();
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
        renderAuthState();
        showToast('Logged out.', 'default');

        if (passwordStrength) passwordStrength.textContent = '';
        if (loginForm) loginForm.reset();
        if (registerForm) registerForm.reset();
    });
}

refreshAuthState();
