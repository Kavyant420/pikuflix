/**
 * Authentication module.
 *
 * Owns the client-side session state. On boot it calls `/api/auth/me` to see if
 * a valid httpOnly cookie exists, then renders the header auth area and wires
 * the login/signup forms. Emits a `pikuflix:auth` event so other modules
 * (e.g. the ad-blocker banner) can react to sign-in/out.
 */
import { api } from './api.js';
import { $, el, toast, openModal, closeModal, escapeHtml } from './ui.js';

let currentUser = null;

export function getUser() {
  return currentUser;
}

function emit() {
  window.dispatchEvent(
    new CustomEvent('pikuflix:auth', { detail: { user: currentUser } })
  );
}

/** Restore session from the server cookie. */
export async function initAuth() {
  try {
    const { user } = await api.me();
    currentUser = user;
  } catch {
    currentUser = null;
  }
  renderAuthArea();
  emit();
  return currentUser;
}

/* ------------------------------ Header area ------------------------------- */
function renderAuthArea() {
  const area = $('#authArea');
  if (!area) return;
  area.innerHTML = '';

  if (currentUser) {
    const initial = (currentUser.username || 'U')[0].toUpperCase();
    const btn = el('button', {
      class: 'icon-btn',
      'aria-haspopup': 'menu',
      'aria-label': `Account menu for ${currentUser.username}`,
      title: currentUser.username,
      html: `<span class="avatar">${escapeHtml(initial)}</span>`,
      onclick: openAccountMenu,
    });
    area.appendChild(btn);
  } else {
    area.appendChild(
      el('button', {
        class: 'btn btn--ghost btn--sm',
        text: 'Sign in',
        onclick: () => openModal('authModal'),
      })
    );
    area.appendChild(
      el('button', {
        class: 'btn btn--primary btn--sm',
        text: 'Join free',
        onclick: () => openAuthModal('signup'),
      })
    );
  }
}

function openAccountMenu(e) {
  const menu = $('#accountMenu');
  if (!menu) return;
  const rect = e.currentTarget.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 8}px`;
  menu.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
  menu.classList.toggle('is-open');
  const onDoc = (ev) => {
    if (!menu.contains(ev.target)) {
      menu.classList.remove('is-open');
      document.removeEventListener('click', onDoc);
    }
  };
  setTimeout(() => document.addEventListener('click', onDoc), 0);
}

/* ------------------------------ Auth modal -------------------------------- */
let authMode = 'login';

export function openAuthModal(mode = 'login') {
  authMode = mode;
  syncAuthModal();
  openModal('authModal');
}

function syncAuthModal() {
  const isSignup = authMode === 'signup';
  $('#authTitle').textContent = isSignup ? 'Create your account' : 'Welcome back';
  $('#authSubtitle').textContent = isSignup
    ? 'Join PikuFlix — it only takes a moment.'
    : 'Sign in to continue to PikuFlix.';
  $('#authSubmit').textContent = isSignup ? 'Create account' : 'Sign in';
  $('#usernameField').classList.toggle('hidden', !isSignup);
  $('#authSwitchText').textContent = isSignup
    ? 'Already have an account?'
    : 'New to PikuFlix?';
  $('#authSwitchBtn').textContent = isSignup ? 'Sign in' : 'Create one';
  $('#authError').textContent = '';
}

/** Wire the auth modal + account menu. Call once on boot. */
export function initAuthUI() {
  const form = $('#authForm');
  const switchBtn = $('#authSwitchBtn');
  const logoutBtn = $('#logoutBtn');

  switchBtn?.addEventListener('click', () => {
    authMode = authMode === 'signup' ? 'login' : 'signup';
    syncAuthModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submit = $('#authSubmit');
    const errBox = $('#authError');
    errBox.textContent = '';
    submit.classList.add('is-loading');
    submit.disabled = true;

    const payload = {
      email: $('#authEmail').value.trim(),
      password: $('#authPassword').value,
    };
    if (authMode === 'signup') {
      payload.username = $('#authUsername').value.trim();
    }

    try {
      const res =
        authMode === 'signup'
          ? await api.signup(payload)
          : await api.login(payload);
      currentUser = res.user;
      renderAuthArea();
      emit();
      closeModal('authModal');
      form.reset();
      toast(`Welcome, ${currentUser.username}!`, 'success');
    } catch (err) {
      errBox.textContent = err.message;
    } finally {
      submit.classList.remove('is-loading');
      submit.disabled = false;
    }
  });

  logoutBtn?.addEventListener('click', async () => {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    currentUser = null;
    $('#accountMenu')?.classList.remove('is-open');
    renderAuthArea();
    emit();
    toast('Signed out.', 'info');
  });
}

/** Update a server-side preference for the logged-in user (best-effort). */
export async function updatePrefs(patch) {
  if (!currentUser) return;
  try {
    const { user } = await api.updatePrefs(patch);
    currentUser = user;
  } catch {
    /* non-fatal */
  }
}
