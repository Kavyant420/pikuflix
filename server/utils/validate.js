/**
 * Tiny, dependency-free input validation helpers.
 *
 * Kept intentionally small: we only need to validate auth payloads and a few
 * query params. Every helper returns a normalised value or throws an
 * `HttpError` (see middleware/errorHandler.js) with a user-safe message.
 */
import { HttpError } from '../middleware/errorHandler.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,24}$/;

export function requireString(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') {
    throw new HttpError(400, `"${field}" must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min) {
    throw new HttpError(400, `"${field}" must be at least ${min} characters.`);
  }
  if (trimmed.length > max) {
    throw new HttpError(400, `"${field}" must be at most ${max} characters.`);
  }
  return trimmed;
}

export function requireEmail(value) {
  const email = requireString(value, 'email', { max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, 'Please enter a valid email address.');
  }
  return email;
}

export function requireUsername(value) {
  const username = requireString(value, 'username', { min: 3, max: 24 });
  if (!USERNAME_RE.test(username)) {
    throw new HttpError(
      400,
      'Username may only contain letters, numbers, dots and underscores (3–24 chars).'
    );
  }
  return username;
}

export function requirePassword(value) {
  // NIST-style guidance: length over complexity. Enforce a sane minimum.
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters long.');
  }
  if (value.length > 200) {
    throw new HttpError(400, 'Password is too long.');
  }
  return value;
}
