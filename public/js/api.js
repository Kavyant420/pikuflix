/**
 * API client.
 *
 * Thin wrapper around fetch that always sends cookies (so the httpOnly JWT is
 * included), normalises errors, and exposes typed helpers for each backend
 * route. Keeping all network access here makes it trivial to mock in tests.
 */
import { CONFIG } from './config.js';

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const res = await fetch(CONFIG.apiBase + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    payload = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, payload?.details);
  }
  return payload;
}

export const api = {
  ApiError,

  // --- Auth -----------------------------------------------------------------
  signup: (data) => request('/auth/signup', { method: 'POST', body: data }),
  login: (data) => request('/auth/login', { method: 'POST', body: data }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  updatePrefs: (prefs) =>
    request('/auth/prefs', { method: 'PATCH', body: prefs }),

  // --- Catalog (TMDB proxy) -------------------------------------------------
  /** Fetch a TMDB endpoint, e.g. tmdb('/movie/popular', { page: 2 }). */
  tmdb: (endpoint, params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v != null && v !== '')
    ).toString();
    return request(`/tmdb${endpoint}${qs ? '?' + qs : ''}`);
  },

  // --- AI assistant ---------------------------------------------------------
  chat: (message, history) =>
    request('/ai/chat', { method: 'POST', body: { message, history } }),

  // --- Health ---------------------------------------------------------------
  health: () => request('/health'),
};
